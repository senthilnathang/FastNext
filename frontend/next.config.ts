import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: process.env.DOCKER_BUILD === "true" ? "standalone" : undefined,

  // Turbopack configuration
  turbopack: {
    rules: {
      // Add custom turbopack rules if needed
    },
  },

  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ["@radix-ui/react-icons", "lucide-react"],
  },

  // Image optimization
  images: {
    domains: [
      "localhost",
      "127.0.0.1",
      // Add your production domains here
    ],
    unoptimized: process.env.NODE_ENV === "development",
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "",
    NEXT_PUBLIC_ENVIRONMENT:
      process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
  },

  // Headers for security and performance
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const isProd = process.env.NODE_ENV === "production";

    // CSP is now handled dynamically in middleware.ts with nonce support
    // This static CSP has been moved to middleware for proper nonce integration

    return [
      {
        source: "/(.*)",
        headers: [
          // CSP is now handled in middleware.ts with nonce support
          // Trusted Types (for browsers that support it)
          {
            key: "Trusted-Types",
            value: "dompurify default",
          },
          // Require Trusted Types for scripts
          {
            key: "Require-Trusted-Types-For",
            value: "'script'",
          },
          // Frame Options
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Content Type Options
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // XSS Protection
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Referrer Policy
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Strict Transport Security
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // Permissions Policy (Feature Policy) - comprehensive restrictions
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "gyroscope=()",
              "magnetometer=()",
              "payment=()",
              "usb=()",
              "accelerometer=()",
              "ambient-light-sensor=()",
              "autoplay=()",
              "battery=()",
              "clipboard-read=()",
              "clipboard-write=()",
              "display-capture=()",
              "document-domain=()",
              "encrypted-media=()",
              "fullscreen=()",
              "picture-in-picture=()",
              "web-share=()",
              "speaker-selection=()",
            ].join(", "),
          },
          // Cross-Origin policies for enhanced security
          {
            key: "Cross-Origin-Embedder-Policy",
            value: isDev ? "unsafe-none" : "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          // Additional security headers
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
          {
            key: "X-Download-Options",
            value: "noopen",
          },
          // Server header masking
          {
            key: "Server",
            value: "FastNext",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
      // Special headers for static assets
      {
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
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
