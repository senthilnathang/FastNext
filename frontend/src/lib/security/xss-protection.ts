import { NextRequest } from 'next/server';

interface XSSDetectionResult {
  detected: boolean;
  patterns: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  locations: string[];
}

// Comprehensive XSS patterns
const XSS_PATTERNS = {
  // Script-based XSS
  script: [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<script[\s\S]*?>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /data:text\/javascript/gi
  ],

  // Event handler XSS (in HTML context, not React props)
  events: [
    /on\w+\s*=\s*["']?javascript:/gi,
    /on\w+\s*=\s*["']?alert\s*\(/gi,
    /on\w+\s*=\s*["']?eval\s*\(/gi,
    /on\w+\s*=\s*["']?document\./gi,
    /on\w+\s*=\s*["']?window\./gi,
    /<[^>]+\son\w+\s*=/gi, // HTML tags with event handlers
  ],

  // HTML injection
  html: [
    /<iframe[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
    /<applet[\s\S]*?>/gi,
    /<meta[\s\S]*?>/gi,
    /<link[\s\S]*?>/gi,
    /<style[\s\S]*?>/gi,
    /<form[\s\S]*?>/gi
  ],

  // Encoded XSS
  encoded: [
    /%3Cscript/gi,
    /%3C%2Fscript/gi,
    /&lt;script/gi,
    /&lt;\/script/gi,
    /&#60;script/gi,
    /&#x3C;script/gi,
    /\x3Cscript/gi
  ],

  // Advanced XSS
  advanced: [
    /data:[\w\/]+;base64/gi,
    /eval\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /Function\s*\(/gi,
    /document\.write/gi,
    /document\.writeln/gi,
    /innerHTML/gi,
    /outerHTML/gi
  ],

  // CSS-based XSS
  css: [
    /expression\s*\(/gi,
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    /livescript\s*:/gi,
    /mocha\s*:/gi,
    /@import/gi,
    /binding\s*:/gi
  ],

  // Protocol-based XSS
  protocols: [
    /data:/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /livescript:/gi,
    /mocha:/gi,
    /feed:/gi,
    /disk:/gi,
    /about:/gi
  ]
};

// Pattern severity mapping
const PATTERN_SEVERITY: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  script: 'critical',
  events: 'high',
  html: 'high',
  encoded: 'medium',
  advanced: 'critical',
  css: 'medium',
  protocols: 'medium'
};

export async function detectXSSAttempts(request: NextRequest): Promise<XSSDetectionResult> {
  // Skip XSS detection in development or if explicitly bypassed
  const bypassXSSDetection = process.env.NODE_ENV === 'development' || process.env.BYPASS_XSS_DETECTION === 'true';

  if (bypassXSSDetection) {
    return {
      detected: false,
      patterns: [],
      severity: 'low',
      locations: []
    };
  }

  const detectedPatterns: string[] = [];
  const locations: string[] = [];
  let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // Check URL and query parameters
  const url = request.nextUrl;
  const urlString = url.toString();

  // Analyze URL
  const urlResults = analyzeText(urlString, 'url');
  if (urlResults.detected) {
    detectedPatterns.push(...urlResults.patterns);
    locations.push('url');
    maxSeverity = getMaxSeverity(maxSeverity, urlResults.severity);
  }

  // Analyze query parameters individually
  for (const [key, value] of url.searchParams.entries()) {
    const keyResults = analyzeText(key, 'query_key');
    const valueResults = analyzeText(value, 'query_value');

    if (keyResults.detected) {
      detectedPatterns.push(...keyResults.patterns);
      locations.push(`query_key:${key}`);
      maxSeverity = getMaxSeverity(maxSeverity, keyResults.severity);
    }

    if (valueResults.detected) {
      detectedPatterns.push(...valueResults.patterns);
      locations.push(`query_value:${key}`);
      maxSeverity = getMaxSeverity(maxSeverity, valueResults.severity);
    }
  }

  // Check headers
  const headerResults = await analyzeHeaders(request);
  if (headerResults.detected) {
    detectedPatterns.push(...headerResults.patterns);
    locations.push(...headerResults.locations);
    maxSeverity = getMaxSeverity(maxSeverity, headerResults.severity);
  }

  // Check request body if present
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const bodyResults = await analyzeRequestBody(request);
    if (bodyResults.detected) {
      detectedPatterns.push(...bodyResults.patterns);
      locations.push(...bodyResults.locations);
      maxSeverity = getMaxSeverity(maxSeverity, bodyResults.severity);
    }
  }

  return {
    detected: detectedPatterns.length > 0,
    patterns: [...new Set(detectedPatterns)], // Remove duplicates
    severity: maxSeverity,
    locations: [...new Set(locations)] // Remove duplicates
  };
}

function analyzeText(text: string, location: string): XSSDetectionResult {
  const detectedPatterns: string[] = [];
  let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // Test against all pattern categories
  for (const [category, patterns] of Object.entries(XSS_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        detectedPatterns.push(`${category}:${pattern.source}`);
        const severity = PATTERN_SEVERITY[category];
        maxSeverity = getMaxSeverity(maxSeverity, severity);
      }
    }
  }

  // Additional heuristic checks
  const heuristicResults = performHeuristicAnalysis(text);
  if (heuristicResults.detected) {
    detectedPatterns.push(...heuristicResults.patterns);
    maxSeverity = getMaxSeverity(maxSeverity, heuristicResults.severity);
  }

  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    severity: maxSeverity,
    locations: [location]
  };
}

async function analyzeHeaders(request: NextRequest): Promise<XSSDetectionResult> {
  const detectedPatterns: string[] = [];
  const locations: string[] = [];
  let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // Check specific headers that are commonly targeted
  const headersToCheck = [
    'user-agent',
    'referer',
    'x-forwarded-for',
    'x-real-ip',
    'x-custom-header',
    'accept',
    'accept-language',
    'cookie'
  ];

  for (const headerName of headersToCheck) {
    const headerValue = request.headers.get(headerName);
    if (headerValue) {
      const results = analyzeText(headerValue, `header:${headerName}`);
      if (results.detected) {
        detectedPatterns.push(...results.patterns);
        locations.push(`header:${headerName}`);
        maxSeverity = getMaxSeverity(maxSeverity, results.severity);
      }
    }
  }

  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    severity: maxSeverity,
    locations
  };
}

async function analyzeRequestBody(request: NextRequest): Promise<XSSDetectionResult> {
  const detectedPatterns: string[] = [];
  const locations: string[] = [];
  let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // Clone request to avoid consuming the body
      const clonedRequest = request.clone();
      const bodyText = await clonedRequest.text();

      const results = analyzeText(bodyText, 'json_body');
      if (results.detected) {
        detectedPatterns.push(...results.patterns);
        locations.push('json_body');
        maxSeverity = getMaxSeverity(maxSeverity, results.severity);
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const clonedRequest = request.clone();
      const formData = await clonedRequest.formData();

      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          const keyResults = analyzeText(key, `form_key:${key}`);
          const valueResults = analyzeText(value, `form_value:${key}`);

          if (keyResults.detected) {
            detectedPatterns.push(...keyResults.patterns);
            locations.push(`form_key:${key}`);
            maxSeverity = getMaxSeverity(maxSeverity, keyResults.severity);
          }

          if (valueResults.detected) {
            detectedPatterns.push(...valueResults.patterns);
            locations.push(`form_value:${key}`);
            maxSeverity = getMaxSeverity(maxSeverity, valueResults.severity);
          }
        }
      }
    } else if (contentType.includes('text/')) {
      const clonedRequest = request.clone();
      const bodyText = await clonedRequest.text();

      const results = analyzeText(bodyText, 'text_body');
      if (results.detected) {
        detectedPatterns.push(...results.patterns);
        locations.push('text_body');
        maxSeverity = getMaxSeverity(maxSeverity, results.severity);
      }
    }
  } catch (_error) {
    // If we can't read the body, it's not necessarily an XSS attempt
    console.warn('Failed to analyze request body for XSS:', _error);
  }

  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    severity: maxSeverity,
    locations
  };
}

function performHeuristicAnalysis(text: string): XSSDetectionResult {
  const detectedPatterns: string[] = [];
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  // Check for excessive HTML entities (potential encoding bypass)
  const entityCount = (text.match(/&#?\w+;/g) || []).length;
  if (entityCount > 10) {
    detectedPatterns.push('heuristic:excessive_html_entities');
    severity = 'medium';
  }

  // Check for suspicious character combinations
  const suspiciousChars = /[<>\"']/g;
  const suspiciousCount = (text.match(suspiciousChars) || []).length;
  if (suspiciousCount > 20) {
    detectedPatterns.push('heuristic:excessive_special_chars');
    severity = 'medium';
  }

  // Check for base64 encoded content that might contain scripts
  const base64Pattern = /[A-Za-z0-9+/]{20,}={0,2}/g;
  const base64Matches = text.match(base64Pattern) || [];
  for (const match of base64Matches) {
    try {
      const decoded = Buffer.from(match, 'base64').toString('utf8');
      if (/<script|javascript:|eval\(/i.test(decoded)) {
        detectedPatterns.push('heuristic:base64_encoded_script');
        severity = 'high';
      }
    } catch {
      // Invalid base64, ignore
    }
  }

  // Check for URL encoding of suspicious characters
  const encodedPatterns = [
    /%3C/gi, // <
    /%3E/gi, // >
    /%22/gi, // "
    /%27/gi, // '
    /%2F/gi  // /
  ];

  let encodedCount = 0;
  for (const pattern of encodedPatterns) {
    encodedCount += (text.match(pattern) || []).length;
  }

  if (encodedCount > 5) {
    detectedPatterns.push('heuristic:excessive_url_encoding');
    severity = 'medium';
  }

  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    severity,
    locations: ['heuristic']
  };
}

function getMaxSeverity(
  current: 'low' | 'medium' | 'high' | 'critical',
  newSeverity: 'low' | 'medium' | 'high' | 'critical'
): 'low' | 'medium' | 'high' | 'critical' {
  const severityOrder = ['low', 'medium', 'high', 'critical'];
  const currentIndex = severityOrder.indexOf(current);
  const newIndex = severityOrder.indexOf(newSeverity);

  return newIndex > currentIndex ? newSeverity : current;
}

// Client-side XSS protection utilities
export class ClientXSSProtection {
  // Sanitize HTML content
  static sanitizeHTML(html: string): string {
    // This is a basic implementation - consider using DOMPurify for production
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<iframe[\s\S]*?>/gi, '')
      .replace(/<object[\s\S]*?>/gi, '')
      .replace(/<embed[\s\S]*?>/gi, '')
      .replace(/<[^>]+\son\w+\s*=/gi, '') // Remove HTML event handlers, not React props
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '');
  }

  // Escape HTML entities
  static escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Validate and sanitize URLs
  static sanitizeURL(url: string): string {
    try {
      const urlObj = new URL(url);

      // Block dangerous protocols
      const dangerousProtocols = ['javascript:', 'vbscript:', 'data:', 'file:'];
      if (dangerousProtocols.some(protocol => url.toLowerCase().startsWith(protocol))) {
        return 'about:blank';
      }

      return urlObj.toString();
    } catch {
      return 'about:blank';
    }
  }
}
