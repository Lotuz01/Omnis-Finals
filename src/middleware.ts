import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from './middleware/security';

function logInfo(message: string, data?: any) {
  console.info(`[INFO] ${new Date().toISOString()} - ${message}`, data);
}

function logError(message: string, error?: any) {
  console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
}

function isPublicRoute(pathname: string): boolean {
  const publicRoutes = ['/login', '/api/auth', '/api/health', '/api/status', '/api/metrics', '/api/vite-client'];
  return publicRoutes.some(route => pathname === route || pathname.startsWith(route));
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
    return securityResponse;
  }

  // Skip authentication for public routes
  if (isPublicRoute(pathname)) {
    console.log(`[MIDDLEWARE] Public route, skipping auth: ${pathname}`);
    return securityResponse;
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
    return NextResponse.redirect(new URL('/login', request.url));
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
    return NextResponse.redirect(new URL('/login', request.url));
  }

  console.log(`[MIDDLEWARE] Authentication passed for: ${pathname}`);
  
  // Continue with the security response that includes all security headers
  return securityResponse;
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