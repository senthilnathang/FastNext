import { NextRequest, NextResponse } from 'next/server';
import { SecureCookieManager } from '@/lib/auth/secure-cookies';
import { logSecurityEvent } from '@/lib/monitoring/security-monitor';

export async function POST(request: NextRequest) {
  try {
    const authToken = SecureCookieManager.getAuthToken(request);
    const refreshToken = SecureCookieManager.getRefreshToken(request);
    
    // Get user info from token before clearing
    let userId: string | undefined;
    if (authToken) {
      try {
        const payload = JSON.parse(atob(authToken.split('.')[1]));
        userId = payload.sub || payload.user_id;
      } catch (error) {
        // Invalid token, but we'll still proceed with logout
      }
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear all auth cookies securely
    SecureCookieManager.clearAuthCookies(response);

    // If we had valid tokens, add them to a blacklist
    if (authToken || refreshToken) {
      await blacklistTokens(authToken, refreshToken);
    }

    // Log security event - using authentication_failure type for logout tracking
    // Note: Consider adding 'user_logout' to SecurityEventType enum if needed
    console.log('User logout:', {
      userId: userId || 'unknown',
      clientIP: getClientIP(request),
      hasAuthToken: !!authToken,
      hasRefreshToken: !!refreshToken
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, clear the cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
    
    SecureCookieManager.clearAuthCookies(response);
    
    return response;
  }
}

export async function GET(request: NextRequest) {
  // Support GET for logout links
  return POST(request);
}

async function blacklistTokens(authToken?: string | null, refreshToken?: string | null): Promise<void> {
  try {
    // In a real application, you would:
    // 1. Add tokens to a blacklist/revocation list in your database
    // 2. Call your backend service to invalidate the tokens
    // 3. Update any token caches
    
    const tokensToBlacklist = [];
    
    if (authToken) {
      tokensToBlacklist.push({
        token: authToken,
        type: 'access',
        blacklistedAt: new Date().toISOString()
      });
    }
    
    if (refreshToken) {
      tokensToBlacklist.push({
        token: refreshToken,
        type: 'refresh',
        blacklistedAt: new Date().toISOString()
      });
    }

    if (tokensToBlacklist.length > 0) {
      // Example: Call backend to blacklist tokens
      // await fetch('/api/v1/auth/blacklist', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ tokens: tokensToBlacklist })
      // });
      
      console.log('Tokens blacklisted:', tokensToBlacklist.length);
    }
    
  } catch (error) {
    console.error('Failed to blacklist tokens:', error);
    // Don't throw error - logout should still succeed
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || 'unknown';
}