import { type NextRequest, NextResponse } from "next/server";
import { SecureCookieManager } from "@/lib/auth/secure-cookies";
import { logSecurityEvent } from "@/lib/monitoring/security-monitor";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = SecureCookieManager.getRefreshToken(request);

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token not found" },
        { status: 401 },
      );
    }

    // Validate refresh token
    const validation = await validateRefreshToken(refreshToken);
    if (!validation.isValid) {
      // Clear invalid refresh token
      const response = NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 },
      );

      SecureCookieManager.clearAuthCookies(response);

      logSecurityEvent(
        "authentication_failure",
        {
          reason: validation.reason,
          clientIP: getClientIP(request),
        },
        "medium",
      );

      return response;
    }

    // Generate new tokens
    if (!validation.userId) {
      return NextResponse.json(
        { error: "Invalid token data" },
        { status: 401 },
      );
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(
      validation.userId,
    );

    // Set secure cookies
    const response = NextResponse.json({
      success: true,
      message: "Session refreshed",
    });

    SecureCookieManager.setAuthCookie(response, accessToken, "session");
    SecureCookieManager.setAuthCookie(response, newRefreshToken, "refresh");

    logSecurityEvent(
      "authentication_failure",
      {
        userId: validation.userId,
        clientIP: getClientIP(request),
        reason: "session_refreshed",
      },
      "low",
    );

    return response;
  } catch (error) {
    console.error("Session refresh error:", error);

    const response = NextResponse.json(
      { error: "Failed to refresh session" },
      { status: 500 },
    );

    // Clear cookies on error
    SecureCookieManager.clearAuthCookies(response);

    return response;
  }
}

async function validateRefreshToken(token: string): Promise<{
  isValid: boolean;
  userId?: string;
  reason?: string;
}> {
  try {
    // Validate JWT structure
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { isValid: false, reason: "invalid_structure" };
    }

    // Decode payload
    const payload = JSON.parse(atob(parts[1]));

    // Check expiration
    if (payload.exp * 1000 < Date.now()) {
      return { isValid: false, reason: "expired" };
    }

    // Check if it's a refresh token
    if (payload.type !== "refresh") {
      return { isValid: false, reason: "wrong_token_type" };
    }

    // Additional validation (check against database, blacklist, etc.)
    // This would typically involve a database call to verify the token
    // For now, we'll just validate the structure

    return {
      isValid: true,
      userId: payload.sub || payload.user_id,
    };
  } catch {
    return { isValid: false, reason: "decode_error" };
  }
}

async function generateTokens(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  // This would typically call your backend auth service
  // For now, we'll create mock tokens

  const accessTokenPayload = {
    sub: userId,
    type: "access",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
    roles: ["user"], // Would come from database
  };

  const refreshTokenPayload = {
    sub: userId,
    type: "refresh",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
  };

  // Create mock JWT tokens (in production, use proper JWT signing)
  const accessToken =
    btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })) +
    "." +
    btoa(JSON.stringify(accessTokenPayload)) +
    "." +
    "mock_signature";

  const refreshToken =
    btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })) +
    "." +
    btoa(JSON.stringify(refreshTokenPayload)) +
    "." +
    "mock_signature";

  return { accessToken, refreshToken };
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return realIP || "unknown";
}
