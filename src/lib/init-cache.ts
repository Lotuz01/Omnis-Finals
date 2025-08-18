import { cache } from './cache';

// Inicializar cache em memória
export async function initializeCache(): Promise<void> {
  try {
    console.log('[CACHE] Initializing memory cache...');
    await cache.init();
    console.log('[CACHE] Memory cache initialized successfully');
  } catch (error) {
    console.error('[CACHE] Failed to initialize memory cache:', error);
    // Não falhar a aplicação se o cache não puder ser inicializado
    // A aplicação deve funcionar sem cache
  }
}

// Verificar se o cache está disponível
export async function checkCacheHealth(): Promise<boolean> {
  try {
    await cache.set('health_check', 'ok', 10);
    const result = await cache.get('health_check');
    await cache.del('health_check');
    return result === 'ok';
  } catch (error) {
    console.error('[CACHE] Health check failed:', error);
    return false;
  }
}

const cacheUtils = {
  initializeCache,
  checkCacheHealth
};
export default cacheUtils;