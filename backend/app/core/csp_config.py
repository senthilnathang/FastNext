"""
Content Security Policy (CSP) Configuration
Manages allowed URLs for different CSP directives
"""

from typing import Dict, List, Set


class CSPConfig:
    """Configuration class for Content Security Policy settings"""

    def __init__(self):
        # Base directives that are always allowed
        self.base_directives = {
            "default-src": ["'self'"],
            "base-uri": ["'self'"],
            "form-action": ["'self'"],
            "frame-ancestors": ["'none'"],
            "frame-src": ["'none'"],
            "object-src": ["'none'"],
        }

        # Allowed URLs for each directive
        self.allowed_urls = {
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
            "font-src": [
                "'self'",
                "https://fonts.gstatic.com",
                "data:",
            ],
            "img-src": [
                "'self'",
                "data:",
                "https:",
                "blob:",
                "https://*.vercel.app",
                "https://*.vercel.com",
            ],
            "media-src": [
                "'self'",
                "https:",
                "blob:",
            ],
            "connect-src": [
                "'self'",
                "https://vercel.live",
                "wss://vercel.live",
                "https://vitals.vercel-insights.com",
            ],
        }

    def add_url(self, directive: str, url: str) -> None:
        """Add a URL to a specific CSP directive"""
        if directive not in self.allowed_urls:
            self.allowed_urls[directive] = []

        if url not in self.allowed_urls[directive]:
            self.allowed_urls[directive].append(url)

    def remove_url(self, directive: str, url: str) -> None:
        """Remove a URL from a specific CSP directive"""
        if directive in self.allowed_urls and url in self.allowed_urls[directive]:
            self.allowed_urls[directive].remove(url)

    def get_csp_header(self, report_uri: str = "/api/v1/csp/csp-report") -> str:
        """Generate the complete CSP header string"""
        directives = []

        # Add base directives
        for directive, values in self.base_directives.items():
            directives.append(f"{directive} {' '.join(values)}")

        # Add URL-based directives
        for directive, urls in self.allowed_urls.items():
            if urls:
                directives.append(f"{directive} {' '.join(urls)}")

        # Add report-uri directive for CSP violation reporting
        directives.append(f"report-uri {report_uri}")

        return "; ".join(directives)

    def get_directive_urls(self, directive: str) -> List[str]:
        """Get all allowed URLs for a specific directive"""
        return self.allowed_urls.get(directive, [])

    def list_all_directives(self) -> Dict[str, List[str]]:
        """Get all directives and their allowed URLs"""
        result = self.base_directives.copy()
        result.update(self.allowed_urls)
        return result


# Global CSP configuration instance
csp_config = CSPConfig()

# Convenience functions for managing CSP
def add_csp_url(directive: str, url: str) -> None:
    """Add a URL to CSP configuration"""
    csp_config.add_url(directive, url)

def remove_csp_url(directive: str, url: str) -> None:
    """Remove a URL from CSP configuration"""
    csp_config.remove_url(directive, url)

def get_csp_header(report_uri: str = "/api/v1/csp/csp-report") -> str:
    """Get the current CSP header"""
    return csp_config.get_csp_header(report_uri)

def get_csp_directives() -> Dict[str, List[str]]:
    """Get all CSP directives and URLs"""
    return csp_config.list_all_directives()


# Pre-configured CSP for different environments
def get_development_csp() -> str:
    """Get CSP suitable for development"""
    dev_config = CSPConfig()
    # Add development-specific URLs
    dev_config.add_url("script-src", "'unsafe-eval'")
    dev_config.add_url("connect-src", "ws://localhost:*")
    dev_config.add_url("connect-src", "http://localhost:*")
    return dev_config.get_csp_header()

def get_production_csp() -> str:
    """Get CSP suitable for production"""
    return csp_config.get_csp_header()

def get_frontend_csp() -> str:
    """Get CSP optimized for frontend applications"""
    frontend_config = CSPConfig()
    # Add frontend-specific allowances
    frontend_config.add_url("script-src", "'unsafe-inline'")
    frontend_config.add_url("style-src", "'unsafe-inline'")
    return frontend_config.get_csp_header()