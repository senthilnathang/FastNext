# Content Security Policy (CSP) Management

FastNext includes a comprehensive Content Security Policy management system that allows you to easily configure and manage allowed URLs for different CSP directives.

## Overview

The CSP system is designed to:
- ✅ **Easily manage allowed URLs** for different CSP directives
- ✅ **Environment-specific configurations** (development, production, frontend)
- ✅ **Command-line tools** for adding/removing URLs
- ✅ **Automatic header generation** for middleware integration

## Configuration File

The CSP configuration is managed in `app/core/csp_config.py` with the following structure:

```python
# Base directives (always applied)
base_directives = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
}

# URL-based directives (configurable)
allowed_urls = {
    "script-src": [
        "'self'",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",
        "https://vercel.live",
        "https://va.vercel-scripts.com",
    ],
    "style-src": [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net",
    ],
    # ... more directives
}
```

## Current Configuration

The current CSP configuration includes URLs for Vercel deployment and CSP violation reporting:

```
default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; object-src 'none'; script-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://vercel.live https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob: https://*.vercel.app https://*.vercel.com; media-src 'self' https: blob:; connect-src 'self' https://vercel.live wss://vercel.live https://vitals.vercel-insights.com; report-uri /api/v1/csp/csp-report;
```
default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://vercel.live https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob: https://*.vercel.app https://*.vercel.com; media-src 'self' https: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src 'none'; connect-src 'self' https://vercel.live wss://vercel.live https://vitals.vercel-insights.com;
```

## Managing CSP URLs

### Using the Command-Line Tool

The `scripts/manage_csp.py` script provides an easy way to manage CSP URLs:

```bash
# List all current CSP directives and URLs
python scripts/manage_csp.py list

# Add a URL to a directive
python scripts/manage_csp.py add script-src https://example.com/script.js

# Remove a URL from a directive
python scripts/manage_csp.py remove script-src https://example.com/script.js

# Show the current CSP header
python scripts/manage_csp.py header
```

### Programmatic Management

You can also manage CSP URLs programmatically:

```python
from app.core.csp_config import add_csp_url, remove_csp_url, get_csp_header

# Add a URL
add_csp_url("script-src", "https://analytics.example.com/tracker.js")

# Remove a URL
remove_csp_url("script-src", "https://old-cdn.example.com")

# Get the current CSP header
header = get_csp_header()
print(header)
```

## Environment-Specific Configurations

The CSP system provides different configurations for various environments:

```python
from app.core.csp_config import get_development_csp, get_production_csp, get_frontend_csp

# Development CSP (more permissive)
dev_csp = get_development_csp()

# Production CSP (stricter)
prod_csp = get_production_csp()

# Frontend-optimized CSP
frontend_csp = get_frontend_csp()
```

## Adding New URLs

To add URLs for your deployment, use the management script:

```bash
# For Vercel deployment
python scripts/manage_csp.py add script-src https://vercel.live
python scripts/manage_csp.py add connect-src wss://vercel.live
python scripts/manage_csp.py add img-src https://*.vercel.app

# For CDN resources
python scripts/manage_csp.py add script-src https://cdn.jsdelivr.net
python scripts/manage_csp.py add style-src https://fonts.googleapis.com

# For analytics
python scripts/manage_csp.py add connect-src https://vitals.vercel-insights.com
```

## CSP Directives Reference

| Directive | Purpose | Example Values |
|-----------|---------|----------------|
| `default-src` | Fallback for other directives | `'self'`, `https:` |
| `script-src` | JavaScript sources | `'self'`, `https://cdn.example.com` |
| `style-src` | CSS sources | `'self'`, `'unsafe-inline'`, `https://fonts.googleapis.com` |
| `img-src` | Image sources | `'self'`, `data:`, `https:`, `blob:` |
| `font-src` | Font sources | `'self'`, `https://fonts.gstatic.com`, `data:` |
| `connect-src` | AJAX/WebSocket connections | `'self'`, `wss://example.com` |
| `media-src` | Audio/video sources | `'self'`, `https:`, `blob:` |
| `object-src` | Plugin objects | `'none'` |
| `frame-src` | Frame/iframe sources | `'none'`, `https://trusted-site.com` |
| `frame-ancestors` | Who can embed this site | `'none'`, `'self'` |

## Security Considerations

- ✅ **Principle of least privilege**: Only allow necessary URLs
- ✅ **Regular audits**: Review and remove unused URLs
- ✅ **Environment separation**: Different CSP for dev/prod
- ✅ **Monitoring**: Log CSP violations for analysis

## Troubleshooting

### CSP Violations

If you see CSP violation errors in the browser console:

1. Check the violation details in browser dev tools
2. Add the blocked URL using the management script
3. Test in development first
4. Deploy to production after verification

### Common Issues

- **Missing protocol**: Always include `https://` or `http://`
- **Wildcard domains**: Use `https://*.example.com` for subdomains
- **Data URLs**: Use `data:` for inline data
- **Blob URLs**: Use `blob:` for dynamically generated content

## Integration

The CSP configuration is automatically integrated into the security middleware. The generated CSP header is applied to all responses that go through the `SecurityMiddleware`.

For custom integrations, you can import and use the CSP functions directly in your middleware or response handlers.</content>
</xai:function_call: write>
<parameter name="filePath">backend/docs/CSP_MANAGEMENT.md