import { NextRequest } from 'next/server';

interface ValidationResult {
  isValid: boolean;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

// Malicious patterns to detect
const MALICIOUS_PATTERNS = {
  xss: [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
    /data:.*base64/gi,
    /vbscript:/gi
  ],
  sqlInjection: [
    /union\s+select/gi,
    /drop\s+table/gi,
    /delete\s+from/gi,
    /insert\s+into/gi,
    /update\s+.*\s+set/gi,
    /exec\s*\(/gi,
    /sp_\w+/gi,
    /xp_\w+/gi
  ],
  pathTraversal: [
    /\.\.\//g,
    /\.\.\\/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi
  ],
  commandInjection: [
    /;\s*(rm|del|format|shutdown)/gi,
    /\|\s*(nc|netcat|curl|wget)/gi,
    /`.*`/g,
    /\$\(.*\)/g
  ]
};

// Suspicious user agents
const SUSPICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /zap/i,
  /burp/i,
  /acunetix/i,
  /nessus/i
];

// Rate limiting bypass attempts
const BYPASS_PATTERNS = [
  /x-forwarded-for.*,.*,/i, // Multiple IPs in header
  /x-real-ip.*\s/i, // Spaces in IP header
  /x-originating-ip/i, // Less common IP header
];

export function validateRequest(request: NextRequest): ValidationResult {
  // Skip request validation in development or if explicitly bypassed
  const bypassValidation = process.env.NODE_ENV === 'development' || 
                          process.env.DISABLE_SECURITY_MONITORING === 'true';
  
  if (bypassValidation) {
    return { isValid: true };
  }

  const url = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';
  
  // Check for suspicious user agents
  for (const pattern of SUSPICIOUS_USER_AGENTS) {
    if (pattern.test(userAgent)) {
      return {
        isValid: false,
        reason: 'Suspicious user agent detected',
        severity: 'high'
      };
    }
  }

  // Validate URL path
  const pathValidation = validatePath(url.pathname);
  if (!pathValidation.isValid) {
    return pathValidation;
  }

  // Validate query parameters
  const queryValidation = validateQueryParams(url.searchParams);
  if (!queryValidation.isValid) {
    return queryValidation;
  }

  // Check for header manipulation attempts
  const headerValidation = validateHeaders(request.headers);
  if (!headerValidation.isValid) {
    return headerValidation;
  }

  // Validate request size
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
    return {
      isValid: false,
      reason: 'Request size exceeds limit',
      severity: 'medium'
    };
  }

  // Check for rapid-fire requests (simple detection)
  const rateLimitValidation = validateRequestTiming(request);
  if (!rateLimitValidation.isValid) {
    return rateLimitValidation;
  }

  return { isValid: true };
}

function validatePath(pathname: string): ValidationResult {
  // Check for path traversal
  for (const pattern of MALICIOUS_PATTERNS.pathTraversal) {
    if (pattern.test(pathname)) {
      return {
        isValid: false,
        reason: 'Path traversal attempt detected',
        severity: 'high'
      };
    }
  }

  // Check for suspicious file extensions
  const suspiciousExtensions = ['.php', '.asp', '.jsp', '.cgi', '.pl'];
  const extension = pathname.split('.').pop()?.toLowerCase();
  if (extension && suspiciousExtensions.includes(`.${extension}`)) {
    return {
      isValid: false,
      reason: 'Suspicious file extension',
      severity: 'medium'
    };
  }

  // Check for excessively long paths
  if (pathname.length > 2048) {
    return {
      isValid: false,
      reason: 'Path length exceeds limit',
      severity: 'medium'
    };
  }

  return { isValid: true };
}

function validateQueryParams(searchParams: URLSearchParams): ValidationResult {
  for (const [key, value] of searchParams.entries()) {
    // Check for XSS in query parameters
    for (const pattern of MALICIOUS_PATTERNS.xss) {
      if (pattern.test(value) || pattern.test(key)) {
        return {
          isValid: false,
          reason: 'XSS attempt in query parameters',
          severity: 'high'
        };
      }
    }

    // Check for SQL injection
    for (const pattern of MALICIOUS_PATTERNS.sqlInjection) {
      if (pattern.test(value) || pattern.test(key)) {
        return {
          isValid: false,
          reason: 'SQL injection attempt in query parameters',
          severity: 'critical'
        };
      }
    }

    // Check for command injection
    for (const pattern of MALICIOUS_PATTERNS.commandInjection) {
      if (pattern.test(value)) {
        return {
          isValid: false,
          reason: 'Command injection attempt in query parameters',
          severity: 'critical'
        };
      }
    }

    // Check parameter length
    if (key.length > 100 || value.length > 1000) {
      return {
        isValid: false,
        reason: 'Query parameter length exceeds limit',
        severity: 'medium'
      };
    }
  }

  return { isValid: true };
}

function validateHeaders(headers: Headers): ValidationResult {
  // Check for header injection attempts
  for (const [name, value] of headers.entries()) {
    // Check for CRLF injection
    if (value.includes('\r') || value.includes('\n')) {
      return {
        isValid: false,
        reason: 'Header injection attempt detected',
        severity: 'high'
      };
    }

    // Check for suspicious header values
    if (name.toLowerCase() === 'host' && value.includes('..')) {
      return {
        isValid: false,
        reason: 'Suspicious host header',
        severity: 'high'
      };
    }

    // Check for bypass attempts
    for (const pattern of BYPASS_PATTERNS) {
      if (pattern.test(`${name}: ${value}`)) {
        return {
          isValid: false,
          reason: 'Rate limiting bypass attempt',
          severity: 'medium'
        };
      }
    }
  }

  // Validate critical headers
  const host = headers.get('host');
  if (host && !isValidHost(host)) {
    return {
      isValid: false,
      reason: 'Invalid host header',
      severity: 'high'
    };
  }

  return { isValid: true };
}

function validateRequestTiming(request: NextRequest): ValidationResult {
  // Skip timing validation in development or if explicitly bypassed
  const bypassTimingCheck = process.env.NODE_ENV === 'development' || 
                           process.env.BYPASS_RATE_LIMIT === 'true' ||
                           process.env.DISABLE_SECURITY_MONITORING === 'true';
  
  if (bypassTimingCheck) {
    return { isValid: true };
  }

  // This is a simplified check - in production, you'd use a more sophisticated system
  // Check for suspiciously short intervals between requests from same IP
  
  const clientIP = getClientIP(request);
  const now = Date.now();
  const key = `timing:${clientIP}`;
  
  // Simple in-memory store (use Redis in production)
  if (typeof globalThis !== 'undefined') {
    const store = (globalThis as any).__requestTimingStore || new Map();
    (globalThis as any).__requestTimingStore = store;
    
    const lastRequest = store.get(key);
    if (lastRequest && (now - lastRequest) < 100) { // Less than 100ms between requests
      return {
        isValid: false,
        reason: 'Rapid-fire requests detected',
        severity: 'medium'
      };
    }
    
    store.set(key, now);
  }

  return { isValid: true };
}

function isValidHost(host: string): boolean {
  // Define allowed hosts
  const allowedHosts = [
    'localhost',
    '127.0.0.1',
    process.env.NEXT_PUBLIC_DOMAIN,
    process.env.VERCEL_URL
  ].filter(Boolean);

  return allowedHosts.some(allowedHost => 
    host === allowedHost || host.startsWith(`${allowedHost}:`)
  );
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || 'unknown';
}

// Additional validation for specific content types
export async function validateRequestBody(request: NextRequest): Promise<ValidationResult> {
  // Skip body validation in development or if explicitly bypassed
  const bypassValidation = process.env.NODE_ENV === 'development' || 
                          process.env.DISABLE_SECURITY_MONITORING === 'true';
  
  if (bypassValidation) {
    return { isValid: true };
  }

  const contentType = request.headers.get('content-type');
  
  if (!contentType) {
    return { isValid: true };
  }

  try {
    if (contentType.includes('application/json')) {
      const body = await request.json();
      return validateJsonPayload(body);
    }
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      return validateFormData(formData);
    }
  } catch {
    return {
      isValid: false,
      reason: 'Invalid request body format',
      severity: 'medium'
    };
  }

  return { isValid: true };
}

function validateJsonPayload(payload: any): ValidationResult {
  const jsonString = JSON.stringify(payload);
  
  // Check for XSS in JSON values
  for (const pattern of MALICIOUS_PATTERNS.xss) {
    if (pattern.test(jsonString)) {
      return {
        isValid: false,
        reason: 'XSS attempt in JSON payload',
        severity: 'high'
      };
    }
  }

  // Check JSON size
  if (jsonString.length > 1024 * 1024) { // 1MB limit
    return {
      isValid: false,
      reason: 'JSON payload too large',
      severity: 'medium'
    };
  }

  return { isValid: true };
}

function validateFormData(formData: FormData): ValidationResult {
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      // Check for malicious patterns in form data
      for (const pattern of MALICIOUS_PATTERNS.xss) {
        if (pattern.test(value) || pattern.test(key)) {
          return {
            isValid: false,
            reason: 'XSS attempt in form data',
            severity: 'high'
          };
        }
      }
    }
  }

  return { isValid: true };
}