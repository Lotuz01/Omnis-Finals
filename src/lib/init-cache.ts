import { cache } from './redis';
import { logger } from '../utils/logger';

// Inicializar cache Redis
export async function initializeCache(): Promise<void> {
  try {
    console.log('[CACHE] Initializing Redis cache...');
    await cache.init();
    console.log('[CACHE] Redis cache initialized successfully');
  } catch (error) {
    console.error('[CACHE] Failed to initialize Redis cache:', error);
    // Não falhar a aplicação se o Redis não estiver disponível
    // A aplicação deve funcionar sem cache
  }
}

// Verificar se o Redis está disponível
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

export default {
  initializeCache,
  checkCacheHealth
};