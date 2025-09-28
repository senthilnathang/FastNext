import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './src/lib/security/rate-limit';
import { validateRequest } from './src/lib/security/request-validator';
import { detectXSSAttempts } from './src/lib/security/xss-protection';

// Define protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/admin',
  '/settings',
  '/projects',
  '/workflows',
  '/api/v1'
];

// Define public routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/api/health',
  '/api-docs'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const clientIP = getClientIP(request);
  
  // Generate unique request ID for tracking
  const requestId = generateRequestId();
  
  try {
    // Skip middleware for static files, favicon, and Next.js internals
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/static/') ||
      pathname.includes('.') ||
      pathname === '/favicon.ico' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml'
    ) {
      return NextResponse.next();
    }

    // Rate limiting check
    const rateLimitResult = await rateLimit(clientIP, pathname);
    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests from this IP',
          retryAfter: rateLimitResult.retryAfter
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': rateLimitResult.retryAfter.toString(),
            ...getSecurityHeaders(request)
          }
        }
      );
    }

    // Request validation
    const validationResult = validateRequest(request);
    if (!validationResult.isValid) {
      console.warn(`Security violation detected: ${validationResult.reason}`, {
        requestId,
        clientIP,
        userAgent,
        pathname,
        violation: validationResult.reason
      });

      return new NextResponse(
        JSON.stringify({
          error: 'Request blocked',
          message: 'Security violation detected',
          code: 'SECURITY_VIOLATION'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...getSecurityHeaders(request)
          }
        }
      );
    }

    // XSS detection for query parameters and body
    const xssDetection = await detectXSSAttempts(request);
    if (xssDetection.detected) {
      console.warn(`XSS attempt detected: ${xssDetection.patterns.join(', ')}`, {
        requestId,
        clientIP,
        userAgent,
        pathname,
        patterns: xssDetection.patterns
      });

      return new NextResponse(
        JSON.stringify({
          error: 'Request blocked',
          message: 'Malicious content detected',
          code: 'XSS_DETECTED'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...getSecurityHeaders(request)
          }
        }
      );
    }

    // Authentication check for protected routes
    if (isProtectedRoute(pathname)) {
      const authResult = await checkAuthentication(request);
      
      if (!authResult.isAuthenticated) {
        // Redirect to login for browser requests
        if (request.headers.get('accept')?.includes('text/html')) {
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('from', pathname);
          return NextResponse.redirect(loginUrl);
        }
        
        // Return JSON for API requests
        return new NextResponse(
          JSON.stringify({
            error: 'Authentication required',
            message: 'Please log in to access this resource',
            code: 'AUTH_REQUIRED'
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...getSecurityHeaders(request)
            }
          }
        );
      }

      // Add user context to request headers for downstream handlers
      const response = NextResponse.next();
      response.headers.set('X-User-ID', authResult.userId);
      response.headers.set('X-User-Roles', JSON.stringify(authResult.roles));
      response.headers.set('X-Request-ID', requestId);
      
      // Add security headers
      Object.entries(getSecurityHeaders(request)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    }

    // For public routes, just add security headers
    const response = NextResponse.next();
    response.headers.set('X-Request-ID', requestId);
    
    Object.entries(getSecurityHeaders(request)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('Middleware error:', error, {
      requestId,
      clientIP,
      userAgent,
      pathname
    });

    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An error occurred processing your request',
        code: 'MIDDLEWARE_ERROR'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getSecurityHeaders(request)
        }
      }
    );
  }
}

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route));
}

async function checkAuthentication(request: NextRequest): Promise<{
  isAuthenticated: boolean;
  userId?: string;
  roles?: string[];
}> {
  const token = request.cookies.get('access_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return { isAuthenticated: false };
  }

  try {
    // Validate JWT token (simplified - you should use proper JWT verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isExpired = payload.exp * 1000 < Date.now();
    
    if (isExpired) {
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: true,
      userId: payload.sub || payload.user_id,
      roles: payload.roles || []
    };
  } catch (error) {
    return { isAuthenticated: false };
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || remoteAddr || 'unknown';
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getSecurityHeaders(request: NextRequest): Record<string, string> {
  const isDev = process.env.NODE_ENV === 'development';
  const isHTTPS = request.nextUrl.protocol === 'https:';
  
  return {
    // CSP Nonce for dynamic content
    'X-CSP-Nonce': generateCSPNonce(),
    
    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // HSTS only for HTTPS
    ...(isHTTPS && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    
    // Permissions Policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), gyroscope=(), magnetometer=(), payment=(), usb=()',
    
    // Cross-Origin policies
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    
    // Cache control for sensitive pages
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

function generateCSPNonce(): string {
  return Buffer.from(Math.random().toString()).toString('base64').slice(0, 16);
}

// Configure which paths this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/health (health check endpoint)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public|static).*)',
  ],
};