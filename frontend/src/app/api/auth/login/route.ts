import { NextRequest, NextResponse } from 'next/server';
import { SecureCookieManager, createCSRFToken } from '@/lib/auth/secure-cookies';
import { logSecurityEvent } from '@/lib/monitoring/security-monitor';
import { rateLimit } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  try {
    // Rate limiting for login attempts
    const rateLimitResult = await rateLimit(clientIP, '/api/auth/login');

    if (!rateLimitResult.allowed) {
      logSecurityEvent('rate_limit_exceeded', {
        clientIP,
        remaining: rateLimitResult.remaining,
        limit: rateLimitResult.limit
      }, 'medium');

      return NextResponse.json(
        { 
          error: 'Too many login attempts',
          retryAfter: rateLimitResult.retryAfter
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, rememberMe = false } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Authenticate user (this would call your backend service)
    const authResult = await authenticateUser(email, password, clientIP);
    
    if (!authResult.success) {
      logSecurityEvent('authentication_failure', {
        email: email.substring(0, 3) + '***', // Partial email for privacy
        clientIP,
        reason: authResult.reason,
        userAgent: request.headers.get('user-agent')
      }, 'medium');

      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // Ensure user exists in successful authentication
    if (!authResult.user) {
      return NextResponse.json(
        { error: 'Authentication failed: user data missing' },
        { status: 500 }
      );
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(
      authResult.user.id,
      authResult.user.roles,
      rememberMe
    );

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: authResult.user.id,
        email: authResult.user.email,
        name: authResult.user.name,
        roles: authResult.user.roles,
        permissions: authResult.user.permissions
      }
    });

    // Set secure auth cookies
    SecureCookieManager.setAuthCookie(response, accessToken, 'session');
    SecureCookieManager.setAuthCookie(response, refreshToken, 'refresh');
    
    // Set CSRF token
    const csrfToken = createCSRFToken();
    SecureCookieManager.setCSRFToken(response, csrfToken);

    // Log successful login (for audit purposes)
    // Note: Successful logins are typically logged separately from security events
    console.log('Successful login:', {
      userId: authResult.user.id,
      email: email.substring(0, 3) + '***',
      clientIP,
      rememberMe,
      timestamp: new Date().toISOString()
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    
    logSecurityEvent('suspicious_request', {
      clientIP,
      error: error instanceof Error ? error.message : 'Unknown error',
      userAgent: request.headers.get('user-agent')
    }, 'high');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function authenticateUser(
  email: string,
  password: string
): Promise<{
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    permissions: string[];
  };
  error?: string;
  reason?: string;
}> {
  try {
    // This would typically call your backend authentication service
    // For demo purposes, we'll create a mock authentication
    
    // Mock user database
    const mockUsers = [
      {
        id: '1',
        email: 'admin@example.com',
        password: 'admin123', // In reality, this would be hashed
        name: 'Admin User',
        roles: ['admin', 'user'],
        permissions: ['read', 'write', 'delete', 'admin']
      },
      {
        id: '2',
        email: 'user@example.com',
        password: 'user123',
        name: 'Regular User',
        roles: ['user'],
        permissions: ['read', 'write']
      }
    ];

    const user = mockUsers.find(u => u.email === email);
    
    if (!user) {
      return { 
        success: false, 
        error: 'Invalid email or password',
        reason: 'user_not_found'
      };
    }

    // In production, use proper password hashing comparison
    if (user.password !== password) {
      return { 
        success: false, 
        error: 'Invalid email or password',
        reason: 'invalid_password'
      };
    }

    // Check for account lockout, suspicious activity, etc.
    const securityCheck = await checkAccountSecurity();
    if (!securityCheck.allowed) {
      return {
        success: false,
        error: securityCheck.reason,
        reason: 'security_block'
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        permissions: user.permissions
      }
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication service unavailable',
      reason: 'service_error'
    };
  }
}

async function checkAccountSecurity(): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  try {
    // Check for account lockout
    // Check for suspicious IP addresses
    // Check for unusual login patterns
    // etc.
    
    // Mock implementation
    return { allowed: true };
    
  } catch (error) {
    // On error, allow login but log the issue
    console.error('Security check error:', error);
    return { allowed: true };
  }
}

async function generateTokens(
  userId: string, 
  roles: string[], 
  rememberMe: boolean
): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const now = Math.floor(Date.now() / 1000);
  
  // Access token (short-lived)
  const accessTokenPayload = {
    sub: userId,
    type: 'access',
    iat: now,
    exp: now + (60 * 60), // 1 hour
    roles,
    permissions: roles.includes('admin') ? ['read', 'write', 'delete', 'admin'] : ['read', 'write']
  };

  // Refresh token (longer-lived, even longer if "remember me")
  const refreshTokenExpiry = rememberMe ? 
    now + (60 * 60 * 24 * 30) : // 30 days if remember me
    now + (60 * 60 * 24 * 7);   // 7 days normally

  const refreshTokenPayload = {
    sub: userId,
    type: 'refresh',
    iat: now,
    exp: refreshTokenExpiry
  };

  // Create mock JWT tokens (in production, use proper JWT library with signing)
  const accessToken = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' +
                     btoa(JSON.stringify(accessTokenPayload)) + '.' +
                     'mock_signature_' + Date.now();

  const refreshToken = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' +
                      btoa(JSON.stringify(refreshTokenPayload)) + '.' +
                      'mock_signature_' + Date.now();

  return { accessToken, refreshToken };
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || 'unknown';
}