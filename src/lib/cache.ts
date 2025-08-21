// Cache em memória
import { createPool, RowDataPacket, FieldPacket } from 'mysql2/promise';

// Configuração do banco de dados (reutilizando dbConfig de outros arquivos, assumindo que está disponível)
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

class MySQLCache {
  private pool;
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.pool = createPool(dbConfig);
    this.initializeTable();
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private async initializeTable() {
    const connection = await this.pool.getConnection();
    try {
      await connection.query(
        'CREATE TABLE IF NOT EXISTS cache (' +
        'cache_key VARCHAR(255) PRIMARY KEY, ' +
        'value TEXT, ' +
        'expiry BIGINT)'
      );
    } finally {
      connection.release();
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const expiry = Date.now() + (ttlSeconds * 1000);
    const connection = await this.pool.getConnection();
    try {
      await connection.query(
        'INSERT INTO cache (cache_key, value, expiry) VALUES (?, ?, ?) ' +
        'ON DUPLICATE KEY UPDATE value = ?, expiry = ?',
        [key, JSON.stringify(value), expiry, JSON.stringify(value), expiry]
      );
    } finally {
      connection.release();
    }
  }

  async get(key: string): Promise<any | null> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.query<RowDataPacket[]>('SELECT value, expiry FROM cache WHERE cache_key = ?', [key]);
      if (rows.length === 0) return null;
      const { value, expiry } = rows[0];
      if (Date.now() > expiry) {
        await this.del(key);
        return null;
      }
      return JSON.parse(value);
    } finally {
      connection.release();
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const connection = await this.pool.getConnection();
    try {
      const likePattern = pattern.replace(/\*/g, '%');
      const [rows] = await connection.query<RowDataPacket[]>('SELECT cache_key FROM cache WHERE cache_key LIKE ?', [likePattern]);
      return rows.map(row => row.cache_key);
    } finally {
      connection.release();
    }
  }

  async getSize(): Promise<number> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM cache');
      return parseInt(rows[0].count);
    } finally {
      connection.release();
    }
  }

  async ttl(key: string): Promise<number> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.query<RowDataPacket[]>('SELECT expiry FROM cache WHERE cache_key = ?', [key]);
      if (rows.length === 0) return -2;
      const { expiry } = rows[0];
      const remaining = Math.floor((expiry - Date.now()) / 1000);
      return remaining > 0 ? remaining : -1;
    } finally {
      connection.release();
    }
  }

  async del(key: string): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.query('DELETE FROM cache WHERE cache_key = ?', [key]);
    } finally {
      connection.release();
    }
  }

  private async cleanup(): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.query('DELETE FROM cache WHERE expiry < ?', [Date.now()]);
    } finally {
      connection.release();
    }
  }

  async clear(): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      await connection.query('TRUNCATE TABLE cache');
    } finally {
      connection.release();
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.pool.end();
  }
}

// Instância
let mysqlCache: MySQLCache | null = null;

// Inicializar cache em MySQL
export const connectCache = async (): Promise<MySQLCache> => {
  if (!mysqlCache) {
    mysqlCache = new MySQLCache();
    console.log('[CACHE] MySQL cache initialized');
  }
  return mysqlCache;
};

// Obter instância do cache
export const getCache = (): MySQLCache | null => {
  return mysqlCache;
};

// Cache helper functions
export class CacheService {
  private static instance: CacheService;
  private cache: MySQLCache | null = null;

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  public async init(): Promise<void> {
    try {
      this.cache = await connectCache();
    } catch (error) {
      console.error('[CACHE] Failed to initialize cache service:', error);
    }
  }

  private isMySQLCache(cache: any): cache is MySQLCache {
    return cache && typeof cache.set === 'function' && typeof cache.get === 'function' && typeof cache.del === 'function';
  }

  // Definir cache com TTL
  public async set(key: string, value: any, ttl: number = 300): Promise<boolean> {
    try {
      if (!this.cache || !this.isMySQLCache(this.cache)) return false;
      await this.cache.set(key, value, ttl);
      return true;
    } catch (error) {
      console.error('[CACHE] Error setting cache:', error);
      return false;
    }
  }

  // Obter do cache
  public async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.cache || !this.isMySQLCache(this.cache)) return null;
      return await this.cache.get(key) as T;
    } catch (error) {
      console.error('[CACHE] Error getting cache:', error);
      return null;
    }
  }

  // Deletar do cache
  public async del(key: string): Promise<boolean> {
    try {
      if (!this.cache || !this.isMySQLCache(this.cache)) return false;
      await this.cache.del(key);
      return true;
    } catch (error) {
      console.error('[CACHE] Error deleting cache:', error);
      return false;
    }
  }

  // Deletar múltiplas chaves
  public async delPattern(pattern: string): Promise<boolean> {
    try {
      if (!this.cache || !this.isMySQLCache(this.cache)) return false;
      const keys = await this.cache.keys(pattern);
      for (const key of keys) {
        await this.cache.del(key);
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
      if (!this.cache || !this.isMySQLCache(this.cache)) return false;
      return await this.cache.get(key) !== null;
    } catch (error) {
      console.error('[CACHE] Error checking cache existence:', error);
      return false;
    }
  }

  // Incrementar contador
  public async incr(key: string, ttl: number = 300): Promise<number> {
    try {
      if (!this.cache || !this.isMySQLCache(this.cache)) return 0;
      const current = await this.cache.get(key) || 0;
      const newValue = typeof current === 'number' ? current + 1 : 1;
      await this.cache.set(key, newValue, ttl);
      return newValue;
    } catch (error) {
      console.error('[CACHE] Error incrementing cache:', error);
      return 0;
    }
  }

  // Obter TTL
  public async ttl(key: string): Promise<number> {
    try {
      if (!this.cache || !this.isMySQLCache(this.cache)) return -1;
      return await this.cache.ttl(key);
    } catch (error) {
      console.error('[CACHE] Error getting TTL:', error);
      return -1;
    }
  }

  // Limpar todo o cache
  public async flush(): Promise<boolean> {
    try {
      if (!this.cache || !this.isMySQLCache(this.cache)) return false;
      await this.cache.clear();
      return true;
    } catch (error) {
      console.error('[CACHE] Error flushing cache:', error);
      return false;
    }
  }

  public async getStats(): Promise<any> {
    try {
      if (!this.cache || !this.isMySQLCache(this.cache)) return null;
      const size = await this.cache.getSize();
      return {
        memory: 'MySQL cache',
        keyspace: `keys=${size}`,
        connected: true
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