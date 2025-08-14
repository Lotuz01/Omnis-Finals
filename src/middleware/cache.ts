import { NextRequest, NextResponse } from 'next/server';
import { cache, CACHE_KEYS, CACHE_TTL } from '../lib/redis';

// Configuração de cache por rota
const CACHE_CONFIG = {
  '/api/products': {
    ttl: CACHE_TTL.MEDIUM,
    key: CACHE_KEYS.PRODUCTS,
    methods: ['GET']
  },
  '/api/clients': {
    ttl: CACHE_TTL.MEDIUM,
    key: CACHE_KEYS.CLIENTS,
    methods: ['GET']
  },
  '/api/movements': {
    ttl: CACHE_TTL.SHORT,
    key: CACHE_KEYS.MOVEMENTS,
    methods: ['GET']
  },
  '/api/health': {
    ttl: CACHE_TTL.SHORT,
    key: CACHE_KEYS.HEALTH,
    methods: ['GET']
  },
  '/api/stats': {
    ttl: CACHE_TTL.SHORT,
    key: CACHE_KEYS.STATS,
    methods: ['GET']
  }
};

// Gerar chave de cache baseada na requisição
function generateCacheKey(request: NextRequest): string {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const searchParams = url.searchParams.toString();
  const method = request.method;
  
  // Incluir parâmetros de query na chave para cache específico
  const baseKey = pathname.replace('/api/', '');
  const queryKey = searchParams ? `?${searchParams}` : '';
  
  return `api:${baseKey}:${method}${queryKey}`;
}

// Verificar se a rota deve ser cacheada
function shouldCache(pathname: string, method: string): boolean {
  const config = CACHE_CONFIG[pathname as keyof typeof CACHE_CONFIG];
  return config && config.methods.includes(method);
}

// Obter configuração de cache para a rota
function getCacheConfig(pathname: string) {
  return CACHE_CONFIG[pathname as keyof typeof CACHE_CONFIG];
}

// Middleware de cache para responses
export async function cacheMiddleware(request: NextRequest, response: NextResponse) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // Só cachear rotas GET configuradas
  if (!shouldCache(pathname, method)) {
    return response;
  }

  try {
    const cacheKey = generateCacheKey(request);
    const config = getCacheConfig(pathname);
    
    if (!config) return response;

    // Se é uma resposta de sucesso, cachear
    if (response.status === 200) {
      const responseBody = await response.text();
      
      // Cachear a resposta
      await cache.set(cacheKey, {
        body: responseBody,
        headers: Object.fromEntries(response.headers.entries()),
        status: response.status,
        timestamp: Date.now()
      }, config.ttl);

      // Retornar nova response com o body
      return new NextResponse(responseBody, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'X-Cache': 'MISS',
          'X-Cache-TTL': config.ttl.toString()
        }
      });
    }
  } catch (error) {
    console.error('[CACHE] Error in cache middleware:', error);
  }

  return response;
}

// Verificar cache antes de processar a requisição
export async function checkCache(request: NextRequest): Promise<NextResponse | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // Só verificar cache para rotas GET configuradas
  if (!shouldCache(pathname, method)) {
    return null;
  }

  try {
    const cacheKey = generateCacheKey(request);
    const cachedData = await cache.get<{
      body: string;
      headers: Record<string, string>;
      status: number;
      timestamp: number;
    }>(cacheKey);

    if (cachedData) {
      const age = Math.floor((Date.now() - cachedData.timestamp) / 1000);
      const config = getCacheConfig(pathname);
      const maxAge = config?.ttl || CACHE_TTL.MEDIUM;

      return new NextResponse(cachedData.body, {
        status: cachedData.status,
        headers: {
          ...cachedData.headers,
          'X-Cache': 'HIT',
          'X-Cache-Age': age.toString(),
          'X-Cache-TTL': maxAge.toString(),
          'Cache-Control': `public, max-age=${maxAge}`
        }
      });
    }
  } catch (error) {
    console.error('[CACHE] Error checking cache:', error);
  }

  return null;
}

// Invalidar cache por padrão
export async function invalidateCache(pattern: string): Promise<boolean> {
  try {
    await cache.delPattern(`api:${pattern}*`);
    console.log(`[CACHE] Invalidated cache pattern: api:${pattern}*`);
    return true;
  } catch (error) {
    console.error('[CACHE] Error invalidating cache:', error);
    return false;
  }
}

// Invalidar cache específico por rota
export async function invalidateCacheByRoute(pathname: string): Promise<boolean> {
  try {
    const route = pathname.replace('/api/', '');
    await cache.delPattern(`api:${route}*`);
    console.log(`[CACHE] Invalidated cache for route: ${pathname}`);
    return true;
  } catch (error) {
    console.error('[CACHE] Error invalidating route cache:', error);
    return false;
  }
}

// Pré-aquecer cache com dados frequentemente acessados
export async function warmupCache(): Promise<void> {
  try {
    console.log('[CACHE] Starting cache warmup...');
    
    // Aqui você pode adicionar lógica para pré-carregar dados importantes
    // Por exemplo, produtos mais vendidos, clientes ativos, etc.
    
    console.log('[CACHE] Cache warmup completed');
  } catch (error) {
    console.error('[CACHE] Error during cache warmup:', error);
  }
}

// Estatísticas de cache
export async function getCacheStats(): Promise<any> {
  try {
    const stats = await cache.getStats();
    return {
      ...stats,
      routes: Object.keys(CACHE_CONFIG),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[CACHE] Error getting cache stats:', error);
    return null;
  }
}

export default {
  cacheMiddleware,
  checkCache,
  invalidateCache,
  invalidateCacheByRoute,
  warmupCache,
  getCacheStats
};