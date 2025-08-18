import { NextRequest, NextResponse } from 'next/server';

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100'); // requests per window
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '900000'); // 15 minutes

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return true;
  }
  
  record.count++;
  return false;
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);
  
  // HSTS for HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

function securityMiddleware(request: NextRequest): NextResponse {
  const rateLimitKey = getRateLimitKey(request);
  
  if (isRateLimited(rateLimitKey)) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  
  const response = NextResponse.next();
  response.headers.set('x-middleware-next', 'true');
  return addSecurityHeaders(response);
}

function logInfo(message: string, data?: any) {
  console.info(`[INFO] ${new Date().toISOString()} - ${message}`, data);
}

function isPublicRoute(pathname: string): boolean {
  const publicRoutes = ['/', '/login', '/api/health', '/api/status', '/api/metrics'];
  const authRoutes = ['/api/auth/'];
  
  // Check exact matches and auth routes with trailing slash
  return publicRoutes.some(route => pathname === route) || 
         authRoutes.some(route => pathname.startsWith(route));
}

function isStaticResource(pathname: string): boolean {
  return pathname.startsWith('/_next/static/') || 
         pathname.startsWith('/_next/image/') || 
         pathname === '/favicon.ico' ||
         /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`[MIDDLEWARE] *** MIDDLEWARE EXECUTED *** Processing request for: ${pathname}`);
  console.log(`[MIDDLEWARE] Request URL: ${request.url}`);
  console.log(`[MIDDLEWARE] Request method: ${request.method}`);
  
  // Skip middleware for static resources
  if (isStaticResource(pathname)) {
    console.log(`[MIDDLEWARE] Skipping static resource: ${pathname}`);
    return NextResponse.next();
  }

  // Apply security middleware first
  const securityResponse = securityMiddleware(request);
  if (securityResponse.status !== 200 && securityResponse.headers.get('x-middleware-next') !== 'true') {
    console.log(`[MIDDLEWARE] Security middleware blocked request: ${securityResponse.status}`);
    return addSecurityHeaders(securityResponse);
  }

  // Skip authentication for public routes
  if (isPublicRoute(pathname)) {
    console.log(`[MIDDLEWARE] Public route, skipping auth: ${pathname}`);
    return addSecurityHeaders(securityResponse);
  }

  console.log(`[MIDDLEWARE] Checking authentication for: ${pathname}`);
  
  // Check for authentication token
  const authToken = request.cookies.get('auth_token');
  
  if (!authToken) {
    console.log(`[MIDDLEWARE] No auth token found for: ${pathname}`);
    logInfo('Unauthorized access attempt', { 
      pathname,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent')
    });
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return addSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
  }

  // Validate auth token format
  try {
    const tokenValue = authToken.value;
    if (!tokenValue || typeof tokenValue !== 'string' || tokenValue.trim().length === 0) {
      throw new Error('Invalid auth token format');
    }
    
    // Extract username from token (remove timestamp if present)
    const username = tokenValue.includes('_') ? tokenValue.split('_')[0] : tokenValue;
    
    if (!username || username.trim().length === 0) {
      throw new Error('Invalid username in token');
    }
    
    console.log(`[MIDDLEWARE] Valid auth token found for user: ${username}`);
  } catch (error) {
    console.log(`[MIDDLEWARE] Invalid auth token format for: ${pathname}`);
    logInfo('Invalid auth token format', { pathname, error: (error as Error).message });
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return addSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
  }

  console.log(`[MIDDLEWARE] Authentication passed for: ${pathname}`);
  
  // Continue with the security response that includes all security headers
  return addSecurityHeaders(securityResponse);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/api/(.*)',
  ],
};