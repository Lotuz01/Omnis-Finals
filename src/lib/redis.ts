import Redis from 'ioredis';

// Cache em memória como fallback
interface MemoryCacheItem {
  value: any;
  expiry: number;
}

class MemoryCache {
  private cache = new Map<string, MemoryCacheItem>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Limpar cache expirado a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set(key: string, value: any, ttlSeconds: number = 300): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  del(key: string): void {
    this.cache.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Configuração do Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
};

// Instâncias
let redis: Redis | null = null;
let memoryCache: MemoryCache | null = null;
let useMemoryCache = false;

// Conectar ao Redis
export const connectRedis = async (): Promise<Redis | MemoryCache> => {
  // Se já estamos usando cache em memória, retornar ele
  if (useMemoryCache && memoryCache) {
    return memoryCache;
  }

  // Se Redis já está conectado, retornar ele
  if (redis && redis.status === 'ready') {
    return redis;
  }

  try {
    redis = new Redis(redisConfig);
    
    redis.on('connect', () => {
      console.log('[CACHE] Connected to Redis server');
      useMemoryCache = false;
    });

    redis.on('error', (error) => {
      console.warn('[CACHE] Redis connection error, falling back to memory cache:', error.message);
      useMemoryCache = true;
      if (!memoryCache) {
        memoryCache = new MemoryCache();
        console.log('[CACHE] Memory cache initialized as fallback');
      }
    });

    redis.on('close', () => {
      console.log('[CACHE] Redis connection closed, using memory cache');
      useMemoryCache = true;
      if (!memoryCache) {
        memoryCache = new MemoryCache();
      }
    });

    await redis.ping();
    useMemoryCache = false;
    return redis;
  } catch (error) {
    console.warn('[CACHE] Failed to connect to Redis, using memory cache:', error);
    useMemoryCache = true;
    if (!memoryCache) {
      memoryCache = new MemoryCache();
      console.log('[CACHE] Memory cache initialized as fallback');
    }
    return memoryCache;
  }
};

// Obter instância do cache (Redis ou Memory)
export const getCache = (): Redis | MemoryCache | null => {
  if (useMemoryCache) {
    return memoryCache;
  }
  return redis;
};

// Cache helper functions
export class CacheService {
  private static instance: CacheService;
  private cache: Redis | MemoryCache | null = null;

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public async init(): Promise<void> {
    try {
      this.cache = await connectRedis();
    } catch (error) {
      console.error('[CACHE] Failed to initialize cache service:', error);
    }
  }

  // Verificar se é Redis ou MemoryCache
  private isRedis(cache: any): cache is Redis {
    return cache && typeof cache.setex === 'function';
  }

  private isMemoryCache(cache: any): cache is MemoryCache {
    return cache && typeof cache.set === 'function' && typeof cache.get === 'function';
  }

  // Definir cache com TTL
  public async set(key: string, value: any, ttl: number = 300): Promise<boolean> {
    try {
      if (!this.cache) return false;
      
      if (this.isRedis(this.cache)) {
        const serializedValue = JSON.stringify(value);
        await this.cache.setex(key, ttl, serializedValue);
      } else if (this.isMemoryCache(this.cache)) {
        this.cache.set(key, value, ttl);
      }
      return true;
    } catch (error) {
      console.error('[CACHE] Error setting cache:', error);
      return false;
    }
  }

  // Obter do cache
  public async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.cache) return null;
      
      if (this.isRedis(this.cache)) {
        const value = await this.cache.get(key);
        if (!value) return null;
        return JSON.parse(value) as T;
      } else if (this.isMemoryCache(this.cache)) {
        return this.cache.get(key) as T;
      }
      
      return null;
    } catch (error) {
      console.error('[CACHE] Error getting cache:', error);
      return null;
    }
  }

  // Deletar do cache
  public async del(key: string): Promise<boolean> {
    try {
      if (!this.cache) return false;
      
      if (this.isRedis(this.cache)) {
        await this.cache.del(key);
      } else if (this.isMemoryCache(this.cache)) {
        this.cache.del(key);
      }
      return true;
    } catch (error) {
      console.error('[CACHE] Error deleting cache:', error);
      return false;
    }
  }

  // Deletar múltiplas chaves
  public async delPattern(pattern: string): Promise<boolean> {
    try {
      if (!this.cache) return false;
      
      if (this.isRedis(this.cache)) {
        const keys = await this.cache.keys(pattern);
        if (keys.length > 0) {
          await this.cache.del(...keys);
        }
      } else if (this.isMemoryCache(this.cache)) {
        // Para MemoryCache, simular pattern matching
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        const keysToDelete: string[] = [];
        
        // Acessar as chaves privadas através de reflexão
        const cacheMap = (this.cache as any).cache;
        for (const key of cacheMap.keys()) {
          if (regex.test(key)) {
            keysToDelete.push(key);
          }
        }
        
        keysToDelete.forEach(key => this.cache!.del(key));
      }
      return true;
    } catch (error) {
      console.error('[CACHE] Error deleting cache pattern:', error);
      return false;
    }
  }

  // Verificar se existe
  public async exists(key: string): Promise<boolean> {
    try {
      if (!this.cache) return false;
      
      if (this.isRedis(this.cache)) {
        const result = await this.cache.exists(key);
        return result === 1;
      } else if (this.isMemoryCache(this.cache)) {
        return this.cache.get(key) !== null;
      }
      
      return false;
    } catch (error) {
      console.error('[CACHE] Error checking cache existence:', error);
      return false;
    }
  }

  // Incrementar contador
  public async incr(key: string, ttl: number = 300): Promise<number> {
    try {
      if (!this.cache) return 0;
      
      if (this.isRedis(this.cache)) {
        const result = await this.cache.incr(key);
        if (result === 1) {
          await this.cache.expire(key, ttl);
        }
        return result;
      } else if (this.isMemoryCache(this.cache)) {
        // Para MemoryCache, simular incremento
        const current = this.cache.get(key) || 0;
        const newValue = typeof current === 'number' ? current + 1 : 1;
        this.cache.set(key, newValue, ttl);
        return newValue;
      }
      
      return 0;
    } catch (error) {
      console.error('[CACHE] Error incrementing cache:', error);
      return 0;
    }
  }

  // Obter TTL
  public async ttl(key: string): Promise<number> {
    try {
      if (!this.cache) return -1;
      
      if (this.isRedis(this.cache)) {
        return await this.cache.ttl(key);
      } else if (this.isMemoryCache(this.cache)) {
        // Para MemoryCache, calcular TTL baseado no expiry
        const cacheMap = (this.cache as any).cache;
        const item = cacheMap.get(key);
        if (!item) return -2; // Chave não existe
        
        const remaining = Math.floor((item.expiry - Date.now()) / 1000);
        return remaining > 0 ? remaining : -1;
      }
      
      return -1;
    } catch (error) {
      console.error('[CACHE] Error getting TTL:', error);
      return -1;
    }
  }

  // Limpar todo o cache
  public async flush(): Promise<boolean> {
    try {
      if (!this.cache) return false;
      
      if (this.isRedis(this.cache)) {
        await this.cache.flushdb();
      } else if (this.isMemoryCache(this.cache)) {
        this.cache.clear();
      }
      return true;
    } catch (error) {
      console.error('[CACHE] Error flushing cache:', error);
      return false;
    }
  }

  // Obter estatísticas
  public async getStats(): Promise<any> {
    try {
      if (!this.cache || !this.isRedis(this.cache)) return null;
      
      const info = await this.cache.info('memory');
      const keyspace = await this.cache.info('keyspace');
      
      return {
        memory: info,
        keyspace: keyspace,
        connected: this.cache.status === 'ready'
      };
    } catch (error) {
      console.error('[CACHE] Error getting stats:', error);
      return null;
    }
  }
}

// Instância global do cache
export const cache = CacheService.getInstance();

// Chaves de cache padronizadas
export const CACHE_KEYS = {
  PRODUCTS: 'products:all',
  PRODUCT: (id: string) => `product:${id}`,
  CLIENTS: 'clients:all',
  CLIENT: (id: string) => `client:${id}`,
  MOVEMENTS: 'movements:all',
  MOVEMENT: (id: string) => `movement:${id}`,
  ACCOUNTS: 'accounts:all',
  ACCOUNT: (id: string) => `account:${id}`,
  USER_SESSION: (userId: string) => `session:${userId}`,
  USER_STATS: (userId: string) => `user:${userId}:stats`,
  USER_ACTIVITIES: (userId: string) => `user:${userId}:activities`,
  RATE_LIMIT: (ip: string) => `rate_limit:${ip}`,
  BRUTE_FORCE: (ip: string) => `brute_force:${ip}`,
  STATS: 'stats:dashboard',
  HEALTH: 'health:status'
};

// TTL padrões (em segundos)
export const CACHE_TTL = {
  SHORT: 60,        // 1 minuto
  MEDIUM: 300,      // 5 minutos
  LONG: 1800,       // 30 minutos
  VERY_LONG: 3600,  // 1 hora
  SESSION: 86400    // 24 horas
};

export default cache;