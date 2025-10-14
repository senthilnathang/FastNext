import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from './src/lib/security/rate-limit';
import { validateRequest } from './src/lib/security/request-validator';
import { detectXSSAttempts } from './src/lib/security/xss-protection';
import { SecureCookieManager } from './src/lib/auth/secure-cookies';

// Route protection configuration
const ROUTE_CONFIG = {
  // Routes requiring authentication
  protected: [
    '/dashboard',
    '/admin',
    '/settings',
    '/projects',
    '/workflows',
  ],

  // Admin-only routes
  admin: [
    '/admin',
    '/admin/*',
    '/api/v1/admin/*',
    '/api/v1/users',
    '/api/v1/roles',
    '/api/v1/permissions'
  ],

  // API routes requiring authentication
  apiProtected: [
    '/api/v1/projects',
    '/api/v1/workflows',
    '/api/v1/profile',
    '/api/v1/settings'
  ],

  // Public routes (no authentication required)
  public: [
    '/',
    '/login',
    '/register',
    '/api/health',
    '/api-docs',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml'
  ],

  // Development-only routes
  development: [
    '/storybook',
    '/__dev__',
    '/test'
  ],

  // Rate-limited routes with custom limits
  rateLimited: {
    '/api/v1/auth/login': { requests: 5, window: 15 * 60 * 1000 },
    '/api/v1/auth/register': { requests: 3, window: 60 * 60 * 1000 },
    '/api/v1/auth/reset-password': { requests: 3, window: 60 * 60 * 1000 },
    '/api/v1/contact': { requests: 5, window: 60 * 60 * 1000 }
  }
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  const clientIP = getClientIP(request);
  const method = request.method;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Generate unique request ID for tracking
  const requestId = generateRequestId();

  // Performance tracking
  const startTime = Date.now();

  try {
    // Skip middleware for static files, favicon, and Next.js internals
    if (shouldSkipMiddleware(pathname)) {
      return NextResponse.next();
    }

    // Block development routes in production
    if (!isDevelopment && isDevelopmentRoute(pathname)) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Cookie security validation
    const cookieValidation = SecureCookieManager.validateCookieSecurity(request);
    if (!cookieValidation.isValid) {
      logSecurityViolation('cookie_security', {
        requestId,
        clientIP,
        userAgent,
        issues: cookieValidation.issues,
        warnings: cookieValidation.warnings
      });

      return createSecurityResponse('Invalid cookie security', 'COOKIE_SECURITY_VIOLATION', 400, requestId);
    }

    // Security checks first
    const securityCheck = await performSecurityChecks(request, requestId, clientIP, userAgent);
    if (securityCheck) return securityCheck;

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

    // Route-based authorization
    const authResult = await handleRouteAuthorization(request, pathname, requestId);
    if (authResult) return authResult;

    // For public routes, add security headers and continue
    const response = NextResponse.next();
    const processingTime = Date.now() - startTime;

    // Add performance and security headers
    response.headers.set('X-Request-ID', requestId);
    response.headers.set('X-Processing-Time', processingTime.toString());

    Object.entries(getSecurityHeaders(request)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Log successful requests
    logRequest(requestId, method, pathname, 200, processingTime, clientIP, userAgent);

    return response;

  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error('Middleware error:', error, {
      requestId,
      method,
      pathname,
      clientIP,
      userAgent,
      processingTime
    });

    // Log error
    logRequest(requestId, method, pathname, 500, processingTime, clientIP, userAgent, error);

    return new NextResponse(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An error occurred processing your request',
        code: 'MIDDLEWARE_ERROR',
        requestId
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          ...getSecurityHeaders(request)
        }
      }
    );
  }
}

// Enhanced helper functions
function shouldSkipMiddleware(pathname: string): boolean {
  const skipPatterns = [
    '/_next/',
    '/static/',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.json',
    '/.well-known/',
    '/sw.js',
    '/workbox-'
  ];

  return skipPatterns.some(pattern => pathname.startsWith(pattern)) ||
         pathname.includes('.') && !pathname.startsWith('/api/');
}

function isDevelopmentRoute(pathname: string): boolean {
  return ROUTE_CONFIG.development.some(route =>
    pathname.startsWith(route) || pathname === route
  );
}

async function performSecurityChecks(
  request: NextRequest,
  requestId: string,
  clientIP: string,
  userAgent: string
): Promise<NextResponse | null> {
  // Request validation
  const validationResult = validateRequest(request);
  if (!validationResult.isValid) {
    logSecurityViolation('request_validation', {
      requestId,
      clientIP,
      userAgent,
      reason: validationResult.reason,
      severity: validationResult.severity
    });

    return createSecurityResponse('Request blocked', 'SECURITY_VIOLATION', 403, requestId);
  }

  // XSS detection
  const xssDetection = await detectXSSAttempts(request);
  if (xssDetection.detected) {
    logSecurityViolation('xss_attempt', {
      requestId,
      clientIP,
      userAgent,
      patterns: xssDetection.patterns,
      severity: xssDetection.severity
    });

    return createSecurityResponse('Malicious content detected', 'XSS_DETECTED', 403, requestId);
  }

  return null;
}

async function handleRouteAuthorization(
  request: NextRequest,
  pathname: string,
  requestId: string
): Promise<NextResponse | null> {
  const isAuthenticated = await checkAuthentication(request);

  // Check if route requires authentication
  if (requiresAuthentication(pathname)) {
    if (!isAuthenticated.isAuthenticated) {
      return handleUnauthenticated(request, pathname, requestId);
    }

    // Check admin access
    if (requiresAdminAccess(pathname)) {
      if (!isAuthenticated.roles?.includes('admin') && !isAuthenticated.isAdmin) {
        return createSecurityResponse(
          'Admin access required',
          'INSUFFICIENT_PERMISSIONS',
          403,
          requestId
        );
      }
    }

    // Add user context headers
    const response = NextResponse.next();
    response.headers.set('X-User-ID', isAuthenticated.userId || '');
    response.headers.set('X-User-Roles', JSON.stringify(isAuthenticated.roles || []));
    response.headers.set('X-Request-ID', requestId);

    Object.entries(getSecurityHeaders(request)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  return null;
}

function requiresAuthentication(pathname: string): boolean {
  return [...ROUTE_CONFIG.protected, ...ROUTE_CONFIG.admin, ...ROUTE_CONFIG.apiProtected]
    .some(route => pathname.startsWith(route) || matchesPattern(pathname, route));
}

function requiresAdminAccess(pathname: string): boolean {
  return ROUTE_CONFIG.admin.some(route =>
    pathname.startsWith(route) || matchesPattern(pathname, route)
  );
}

function matchesPattern(pathname: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) {
    return pathname.startsWith(pattern.slice(0, -2));
  }
  return pathname === pattern;
}

function handleUnauthenticated(
  request: NextRequest,
  pathname: string,
  requestId: string
): NextResponse {
  const isAPIRequest = pathname.startsWith('/api/');
  const acceptsHTML = request.headers.get('accept')?.includes('text/html');

  if (isAPIRequest || !acceptsHTML) {
    return createSecurityResponse(
      'Authentication required',
      'AUTH_REQUIRED',
      401,
      requestId
    );
  }

  // Redirect to login for browser requests
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  loginUrl.searchParams.set('reason', 'authentication_required');

  return NextResponse.redirect(loginUrl);
}

function createSecurityResponse(
  message: string,
  code: string,
  status: number,
  requestId: string
): NextResponse {
  return new NextResponse(
    JSON.stringify({
      success: false,
      error: message,
      code,
      requestId,
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    }
  );
}



async function checkAuthentication(request: NextRequest): Promise<{
  isAuthenticated: boolean;
  userId?: string;
  roles?: string[];
  isAdmin?: boolean;
  permissions?: string[];
}> {
  // Use secure cookie manager to get auth token
  const token = SecureCookieManager.getAuthToken(request) ||
                request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return { isAuthenticated: false };
  }

  try {
    // Validate JWT token structure
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { isAuthenticated: false };
    }

    // Decode payload
    const payload = JSON.parse(atob(parts[1]));

    // Check expiration
    const isExpired = payload.exp * 1000 < Date.now();
    if (isExpired) {
      return { isAuthenticated: false };
    }

    // Check token issued time (not too old)
    const issuedAt = payload.iat * 1000;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - issuedAt > maxAge) {
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: true,
      userId: payload.sub || payload.user_id,
      roles: payload.roles || [],
      isAdmin: payload.is_superuser || payload.roles?.includes('admin'),
      permissions: payload.permissions || []
    };
  } catch {
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

// Logging and monitoring functions
function logRequest(
  requestId: string,
  method: string,
  pathname: string,
  status: number,
  processingTime: number,
  clientIP: string,
  userAgent: string,
  error?: any
): void {
  const logData = {
    requestId,
    method,
    pathname,
    status,
    processingTime,
    clientIP,
    userAgent: userAgent.substring(0, 200), // Truncate long user agents
    timestamp: new Date().toISOString(),
    error: error ? (error instanceof Error ? error.message : String(error)) : undefined
  };

  if (status >= 400) {
    console.error('Request failed:', logData);
  } else if (processingTime > 1000) {
    console.warn('Slow request:', logData);
  }

  // Send to monitoring service in production
  if (process.env.NODE_ENV === 'production' && (status >= 400 || processingTime > 2000)) {
    sendToMonitoring('request_log', logData);
  }
}

function logSecurityViolation(type: string, details: any): void {
  const violationData = {
    type,
    details,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  };

  console.warn(`Security violation [${type}]:`, violationData);

  // Send to security monitoring service
  sendToMonitoring('security_violation', violationData);
}

function sendToMonitoring(eventType: string, data: any): void {
  // In production, send to your monitoring service (Sentry, DataDog, etc.)
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to external monitoring service
    fetch('/api/monitoring/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, data })
    }).catch(error => {
      console.error('Failed to send monitoring data:', error);
    });
  }
}

// Enhanced matcher configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico and other static assets
     * - public folder files
     * - manifest and service worker files
     */
    '/((?!_next/static|_next/image|favicon.ico|public|static|manifest.json|sw.js|workbox-.*\\.js).*)',
  ],
};
