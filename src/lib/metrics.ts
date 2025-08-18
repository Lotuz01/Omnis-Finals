// Simples contador de requisições (em produção, usar banco ou cache persistente)
let requestCount = 0;
let totalResponseTime = 0;
let activeConnections = 0;

export function trackRequest(responseTime: number) {
  requestCount++;
  totalResponseTime += responseTime;
}

export function incrementActiveConnections() {
  activeConnections++;
}

export function decrementActiveConnections() {
  activeConnections--;
}

export function getApiMetrics() {
  return {
    totalRequests: requestCount,
    activeConnections,
    averageResponseTime: requestCount > 0 ? totalResponseTime / requestCount : 0,
  };
}