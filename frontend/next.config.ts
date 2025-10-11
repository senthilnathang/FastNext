import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
  
  // Turbopack configuration
  turbopack: {
    rules: {
      // Add custom turbopack rules if needed
    }
  },

  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  
  // Image optimization
  images: {
    domains: [
      'localhost',
      '127.0.0.1',
      // Add your production domains here
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  },

  // Headers for security and performance
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const isProd = process.env.NODE_ENV === 'production';

    // Content Security Policy with environment-specific rules
    const cspDirectives = [
      "default-src 'self'",
      // Script sources - more restrictive in production
      `script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval'" : "'unsafe-inline'"} https://cdn.jsdelivr.net https://unpkg.com https://vercel.live https://va.vercel-scripts.com`,
      // Style sources
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net`,
      // Font sources
      "font-src 'self' https://fonts.gstatic.com data:",
      // Image sources - allow common CDNs
      "img-src 'self' data: https: blob: https://*.vercel.app https://*.vercel.com",
      // Media sources
      "media-src 'self' https: blob:",
      // Object sources - completely blocked
      "object-src 'none'",
      // Base URI - only self
      "base-uri 'self'",
      // Form actions - only self
      "form-action 'self'",
      // Frame ancestors - none (prevents clickjacking)
      "frame-ancestors 'none'",
      // Frame sources - none (prevents embedding iframes)
      "frame-src 'none'",
      // Connect sources - API and monitoring  
      `connect-src 'self' https://vercel.live wss://vercel.live https://vitals.vercel-insights.com ${isDev ? 'ws://localhost:* http://localhost:8000' : ''}`,
      // Worker sources
      "worker-src 'self' blob:",
      // Manifest sources
      "manifest-src 'self'",
      // Child sources (for workers)
      "child-src 'self' blob:",
      // Prefetch sources
      "prefetch-src 'self'",
      // Upgrade insecure requests in production
      ...(isProd ? ["upgrade-insecure-requests"] : [])
    ];

    const csp = cspDirectives.filter(Boolean).join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          // Trusted Types (for browsers that support it)
          {
            key: 'Trusted-Types',
            value: "dompurify default",
          },
          // Require Trusted Types for scripts
          {
            key: 'Require-Trusted-Types-For',
            value: "'script'",
          },
          // Frame Options
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Content Type Options
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // XSS Protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Strict Transport Security
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          // Permissions Policy (Feature Policy) - comprehensive restrictions
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'gyroscope=()',
              'magnetometer=()',
              'payment=()',
              'usb=()',
              'accelerometer=()',
              'ambient-light-sensor=()',
              'autoplay=()',
              'battery=()',
              'clipboard-read=()',
              'clipboard-write=()',
              'display-capture=()',
              'document-domain=()',
              'encrypted-media=()',
              'fullscreen=()',
              'picture-in-picture=()',
              'web-share=()',
              'speaker-selection=()'
            ].join(', ')
          },
          // Cross-Origin policies for enhanced security
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: isDev ? 'unsafe-none' : 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          // Additional security headers
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          {
            key: 'X-Download-Options',
            value: 'noopen',
          },
          // Server header masking
          {
            key: 'Server',
            value: 'FastNext',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
      // Special headers for static assets
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      // Add redirects as needed
    ];
  },

  // Rewrites
  async rewrites() {
    return [
      // Add rewrites as needed
    ];
  },
};

export default nextConfig;
