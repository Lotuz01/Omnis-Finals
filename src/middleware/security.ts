import { NextRequest, NextResponse } from 'next/server';

// Configurações de rate limiting
const rateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // máximo 100 requests por janela
  message: {
    error: 'Muitas tentativas. Tente novamente em alguns minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
  skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED_REQUESTS === 'true'
};

// Rate limiting específico para login
const loginRateLimit = {
  ...rateLimitConfig,
  windowMs: 900000, // 15 minutos
  max: 5, // máximo 5 tentativas de login por IP
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  }
};

// Headers de segurança
const SECURITY_HEADERS = {
  // Proteção XSS
  'X-XSS-Protection': '1; mode=block',
  
  // Prevenção de MIME sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Proteção contra clickjacking
  'X-Frame-Options': 'DENY',
  
  // Política de referrer
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissões de recursos
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()',
  
  // Cross-Origin Policies
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  
  // HSTS - Strict Transport Security
  'Strict-Transport-Security': `max-age=${process.env.HSTS_MAX_AGE || '31536000'}; includeSubDomains; preload`,
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Ajustar conforme necessário
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "media-src 'self'"
  ].join('; '),
  
  // Cache Control
  'Cache-Control': 'no-cache, no-store, must-revalidate, private',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Lista de IPs bloqueados (em produção, usar Redis ou banco)
const blockedIPs = new Set<string>();
const suspiciousIPs = new Map<string, { count: number; lastSeen: number }>();

// Padrões de ataques comuns
const attackPatterns = [
  // SQL Injection
  /('|(\-\-)|;|\||\*|%|<|>|\[|\]|\{|\}|`|\\|\^|~)/i,
  /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,
  
  // XSS
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  
  // Path Traversal
  /\.\.[\/\\]/g,
  /(etc\/passwd|etc\/shadow|boot\.ini)/gi,
  
  // Command Injection
  /[;&|`$(){}\[\]]/g,
  /(cat|ls|pwd|id|whoami|uname|wget|curl)/gi
];

// Função para detectar ataques
function detectAttack(request: NextRequest): string | null {
  const url = request.url;
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  
  // Verificar URL
  for (const pattern of attackPatterns) {
    if (pattern.test(url)) {
      return `Suspicious URL pattern: ${pattern.source}`;
    }
  }
  
  // Verificar User-Agent suspeito
  const suspiciousUserAgents = [
    /sqlmap/i,
    /nikto/i,
    /nessus/i,
    /burp/i,
    /nmap/i,
    /masscan/i,
    /zap/i
  ];
  
  for (const pattern of suspiciousUserAgents) {
    if (pattern.test(userAgent)) {
      return `Suspicious User-Agent: ${userAgent}`;
    }
  }
  
  // Verificar tamanho excessivo de headers
  const headerSize = Array.from(request.headers.entries())
    .reduce((size, [key, value]) => size + key.length + value.length, 0);
  
  if (headerSize > 8192) { // 8KB
    return 'Excessive header size';
  }
  
  return null;
}

// Função para obter IP real do cliente
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || remoteAddr || 'unknown';
}

// Função para registrar atividade suspeita
function logSuspiciousActivity(ip: string, reason: string, request: NextRequest) {
  console.warn(`[SECURITY] Suspicious activity from ${ip}: ${reason}`, {
    url: request.url,
    method: request.method,
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString()
  });
  
  // Incrementar contador de atividades suspeitas
  const current = suspiciousIPs.get(ip) || { count: 0, lastSeen: 0 };
  suspiciousIPs.set(ip, {
    count: current.count + 1,
    lastSeen: Date.now()
  });
  
  // Bloquear IP após muitas atividades suspeitas
  if (current.count >= 5) {
    blockedIPs.add(ip);
    console.error(`[SECURITY] IP ${ip} blocked due to repeated suspicious activity`);
  }
}

// Middleware principal de segurança
export function securityMiddleware(request: NextRequest) {
  const clientIP = getClientIP(request);
  const url = new URL(request.url);
  
  // Verificar IP bloqueado
  if (blockedIPs.has(clientIP)) {
    console.warn(`[SECURITY] Blocked IP ${clientIP} attempted access`);
    return new NextResponse('Access Denied', { 
      status: 403,
      headers: {
        'Content-Type': 'text/plain',
        'X-Blocked-Reason': 'IP_BLOCKED'
      }
    });
  }
  
  // Detectar ataques
  const attackDetected = detectAttack(request);
  if (attackDetected) {
    logSuspiciousActivity(clientIP, attackDetected, request);
    return new NextResponse('Bad Request', { 
      status: 400,
      headers: {
        'Content-Type': 'text/plain',
        'X-Attack-Detected': 'true'
      }
    });
  }
  
  // Verificar métodos HTTP permitidos
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
  if (!allowedMethods.includes(request.method)) {
    return new NextResponse('Method Not Allowed', { 
      status: 405,
      headers: {
        'Allow': allowedMethods.join(', ')
      }
    });
  }
  
  // Verificar tamanho do corpo da requisição
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
    return new NextResponse('Payload Too Large', { status: 413 });
  }
  
  // Rate limiting aprimorado com múltiplas janelas de tempo
  const now = Date.now();
  
  // Rate limiting global por IP
  const globalKey = `global:${clientIP}`;
  let globalRateLimit = suspiciousIPs.get(globalKey);
  if (!globalRateLimit) {
    globalRateLimit = { count: 0, lastSeen: now };
    suspiciousIPs.set(globalKey, globalRateLimit);
  }
  
  // Reset contador global se passou da janela de tempo
  if (now - globalRateLimit.lastSeen > rateLimitConfig.windowMs) {
    globalRateLimit.count = 0;
    globalRateLimit.lastSeen = now;
  }
  
  globalRateLimit.count++;
  globalRateLimit.lastSeen = now;
  
  // Rate limiting específico por rota
  const routeKey = `route:${clientIP}:${url.pathname}`;
  let routeRateLimit = suspiciousIPs.get(routeKey);
  if (!routeRateLimit) {
    routeRateLimit = { count: 0, lastSeen: now };
    suspiciousIPs.set(routeKey, routeRateLimit);
  }
  
  // Reset contador de rota se passou da janela de tempo
  if (now - routeRateLimit.lastSeen > rateLimitConfig.windowMs) {
    routeRateLimit.count = 0;
    routeRateLimit.lastSeen = now;
  }
  
  routeRateLimit.count++;
  routeRateLimit.lastSeen = now;
  
  // Rate limiting específico para rotas sensíveis
  if (url.pathname.includes('/api/auth/') || url.pathname.includes('/login')) {
    if (routeRateLimit.count > loginRateLimit.max) {
      logSuspiciousActivity(clientIP, `Login rate limit exceeded: ${routeRateLimit.count} attempts`, request);
      return new NextResponse(JSON.stringify(loginRateLimit.message), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '900',
          'X-RateLimit-Limit': loginRateLimit.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(now + loginRateLimit.windowMs).toISOString()
        }
      });
    }
  }
  
  // Rate limiting para APIs sensíveis (movements, products, etc.)
  if (url.pathname.startsWith('/api/')) {
    const apiLimit = url.pathname.includes('/movements') ? 50 : 100; // Limite menor para movements
    if (routeRateLimit.count > apiLimit) {
      logSuspiciousActivity(clientIP, `API rate limit exceeded: ${routeRateLimit.count} requests to ${url.pathname}`, request);
      return new NextResponse(JSON.stringify({
        error: 'Rate limit exceeded for this API endpoint',
        code: 'API_RATE_LIMIT_EXCEEDED'
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(rateLimitConfig.windowMs / 1000).toString(),
          'X-RateLimit-Limit': apiLimit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(now + rateLimitConfig.windowMs).toISOString()
        }
      });
    }
  }
  
  // Rate limiting geral
  if (globalRateLimit.count > rateLimitConfig.max) {
    logSuspiciousActivity(clientIP, `Global rate limit exceeded: ${globalRateLimit.count} requests`, request);
    return new NextResponse(JSON.stringify(rateLimitConfig.message), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil(rateLimitConfig.windowMs / 1000).toString(),
        'X-RateLimit-Limit': rateLimitConfig.max.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(now + rateLimitConfig.windowMs).toISOString()
      }
    });
  }
  
  // Continuar com a requisição, adicionando headers de segurança
  const response = NextResponse.next();
  
  // Adicionar headers de segurança
  if (process.env.SECURITY_HEADERS_ENABLED !== 'false') {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  // Adicionar headers de CORS se configurado
  if (process.env.CORS_ORIGIN) {
    response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
    response.headers.set('Access-Control-Allow-Credentials', process.env.CORS_CREDENTIALS || 'false');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }
  
  // Remover headers que expõem informações do servidor
  response.headers.delete('X-Powered-By');
  response.headers.delete('Server');
  
  return response;
}

// Função para limpar IPs suspeitos antigos (executar periodicamente)
export function cleanupSuspiciousIPs() {
  const now = Date.now();
  const oneHour = 3600000;
  
  for (const [ip, data] of suspiciousIPs.entries()) {
    if (now - data.lastSeen > oneHour) {
      suspiciousIPs.delete(ip);
    }
  }
}

// Função para desbloquear IP (para administradores)
export function unblockIP(ip: string) {
  blockedIPs.delete(ip);
  suspiciousIPs.delete(ip);
  console.info(`[SECURITY] IP ${ip} unblocked by administrator`);
}

// Função para obter estatísticas de segurança
export function getSecurityStats() {
  return {
    blockedIPs: Array.from(blockedIPs),
    suspiciousIPs: Object.fromEntries(suspiciousIPs),
    totalBlocked: blockedIPs.size,
    totalSuspicious: suspiciousIPs.size
  };
}

// Executar limpeza a cada hora
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupSuspiciousIPs, 3600000);
}