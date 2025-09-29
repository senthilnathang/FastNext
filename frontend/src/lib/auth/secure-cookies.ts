import { NextRequest, NextResponse } from 'next/server';

export interface CookieSecurityOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
  domain?: string;
  expires?: Date;
}

export const SECURE_COOKIE_DEFAULTS: Required<Omit<CookieSecurityOptions, 'expires' | 'domain'>> = {
  httpOnly: true,
  secure: (process.env.NODE_ENV === 'production' && process.env.BYPASS_HTTPS_CHECK !== 'true') || process.env.FORCE_SECURE_COOKIES === 'true',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/'
};

export const SESSION_COOKIE_CONFIG: CookieSecurityOptions = {
  ...SECURE_COOKIE_DEFAULTS,
  maxAge: 60 * 60 * 24, // 24 hours for session cookies
  sameSite: 'lax' // Allow some cross-site for OAuth flows
};

export const REFRESH_TOKEN_CONFIG: CookieSecurityOptions = {
  ...SECURE_COOKIE_DEFAULTS,
  maxAge: 60 * 60 * 24 * 30, // 30 days for refresh tokens
  sameSite: 'strict' // Strict for refresh tokens
};

export const CSRF_TOKEN_CONFIG: CookieSecurityOptions = {
  httpOnly: false, // CSRF tokens need to be readable by client
  secure: (process.env.NODE_ENV === 'production' && process.env.BYPASS_HTTPS_CHECK !== 'true') || process.env.FORCE_SECURE_COOKIES === 'true',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24, // 24 hours
  path: '/'
};

export class SecureCookieManager {
  private static validateCookieName(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Cookie name must be a non-empty string');
    }
    
    // Prevent cookie injection attacks
    if (name.includes(';') || name.includes('=') || name.includes('\n') || name.includes('\r')) {
      throw new Error('Cookie name contains invalid characters');
    }
  }

  private static validateCookieValue(value: string): void {
    if (typeof value !== 'string') {
      throw new Error('Cookie value must be a string');
    }
    
    // Prevent cookie injection attacks
    if (value.includes(';') || value.includes('\n') || value.includes('\r')) {
      throw new Error('Cookie value contains invalid characters');
    }
  }

  private static serializeCookieOptions(options: CookieSecurityOptions): string {
    const parts: string[] = [];
    
    if (options.httpOnly) parts.push('HttpOnly');
    if (options.secure) parts.push('Secure');
    if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
    if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
    if (options.path) parts.push(`Path=${options.path}`);
    if (options.domain) parts.push(`Domain=${options.domain}`);
    if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
    
    return parts.join('; ');
  }

  static setSecureCookie(
    response: NextResponse,
    name: string,
    value: string,
    options: CookieSecurityOptions = SECURE_COOKIE_DEFAULTS
  ): void {
    this.validateCookieName(name);
    this.validateCookieValue(value);

    const cookieOptions = { ...SECURE_COOKIE_DEFAULTS, ...options };
    const serializedOptions = this.serializeCookieOptions(cookieOptions);
    
    const cookieString = `${name}=${value}; ${serializedOptions}`;
    response.headers.append('Set-Cookie', cookieString);
  }

  static setAuthCookie(
    response: NextResponse,
    token: string,
    type: 'session' | 'refresh' = 'session'
  ): void {
    const config = type === 'session' ? SESSION_COOKIE_CONFIG : REFRESH_TOKEN_CONFIG;
    const cookieName = type === 'session' ? 'auth-token' : 'refresh-token';
    
    this.setSecureCookie(response, cookieName, token, config);
  }

  static setCSRFToken(response: NextResponse, token: string): void {
    this.setSecureCookie(response, 'csrf-token', token, CSRF_TOKEN_CONFIG);
  }

  static clearCookie(response: NextResponse, name: string, path: string = '/'): void {
    this.validateCookieName(name);
    
    const expiredCookieOptions: CookieSecurityOptions = {
      ...SECURE_COOKIE_DEFAULTS,
      path,
      maxAge: 0,
      expires: new Date(0)
    };
    
    this.setSecureCookie(response, name, '', expiredCookieOptions);
  }

  static clearAuthCookies(response: NextResponse): void {
    this.clearCookie(response, 'auth-token');
    this.clearCookie(response, 'refresh-token');
    this.clearCookie(response, 'csrf-token');
  }

  static getCookie(request: NextRequest, name: string): string | null {
    this.validateCookieName(name);
    
    const cookieValue = request.cookies.get(name)?.value;
    return cookieValue || null;
  }

  static getAuthToken(request: NextRequest): string | null {
    return this.getCookie(request, 'auth-token');
  }

  static getRefreshToken(request: NextRequest): string | null {
    return this.getCookie(request, 'refresh-token');
  }

  static getCSRFToken(request: NextRequest): string | null {
    return this.getCookie(request, 'csrf-token');
  }

  static validateCookieSecurity(request: NextRequest): SecurityValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    // Check if running over HTTPS in production (unless bypassed for dev)
    const bypassHttpsCheck = process.env.BYPASS_HTTPS_CHECK === 'true';
    
    if (process.env.NODE_ENV === 'production' && !bypassHttpsCheck) {
      const forwardedProto = request.headers.get('x-forwarded-proto');
      const urlProtocol = request.nextUrl.protocol;
      const isHttps = forwardedProto === 'https' || urlProtocol === 'https:';
      
      if (!isHttps) {
        issues.push('Secure cookies require HTTPS in production');
      }
    } else if (bypassHttpsCheck && process.env.NODE_ENV === 'production') {
      warnings.push('HTTPS check bypassed - not recommended for production');
    }

    // Validate cookie headers
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      // Check for potential cookie injection
      if (cookieHeader.includes('\n') || cookieHeader.includes('\r')) {
        issues.push('Cookie header contains invalid characters');
      }

      // Check for oversized cookies
      if (cookieHeader.length > 4096) {
        warnings.push('Cookie header exceeds 4KB limit');
      }
    }

    // Validate specific auth cookies
    const authToken = this.getAuthToken(request);
    if (authToken) {
      // Basic token validation
      if (authToken.length < 32) {
        warnings.push('Auth token appears to be too short');
      }
      
      if (!/^[A-Za-z0-9+/=_-]+$/.test(authToken)) {
        issues.push('Auth token contains invalid characters');
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }
}

export interface SecurityValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
}

export function generateSecureRandomString(length: number = 32): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for environments without crypto
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createCSRFToken(): string {
  return generateSecureRandomString(32);
}

export const CookieSecurityHeaders = {
  // Prevent cookie tampering
  'Set-Cookie': [
    '__Secure-ID=123; Secure; HttpOnly; SameSite=Strict',
    '__Host-SessionID=abc; Secure; HttpOnly; SameSite=Strict; Path=/'
  ].join(', '),
  
  // Additional security headers for cookie protection
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};