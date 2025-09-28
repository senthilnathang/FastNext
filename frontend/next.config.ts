import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
  
  // Experimental features
  experimental: {
    // Enable turbopack for faster builds
    turbo: {
      rules: {
        // Add custom turbopack rules if needed
      }
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
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },

  // Headers for security and performance
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    
    // Generate nonce for CSP
    const nonce = Buffer.from(require('crypto').randomBytes(16)).toString('base64');
    
    // Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://cdn.jsdelivr.net https://unpkg.com https://vercel.live`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https: blob:",
      "media-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "frame-src 'none'",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'} https://vercel.live wss://vercel.live`,
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests"
    ];

    const csp = cspDirectives.join('; ');

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
          // Permissions Policy (Feature Policy)
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), gyroscope=(), magnetometer=(), payment=(), usb=()',
          },
          // Cross-Origin policies
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
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

  // Rewrites for API proxy in development
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
