"""
Swagger UI customization and configuration for FastNext Framework
"""

from app.core.config import settings
from fastapi import FastAPI
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles


def customize_swagger_ui(app: FastAPI) -> None:
    """
    Customize Swagger UI with enhanced styling and functionality
    """

    # Custom Swagger UI HTML with enhanced styling
    swagger_ui_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <link rel="shortcut icon" href="/favicon.ico">
        <title>{title} - Interactive API Documentation</title>
        <style>
            /* Custom styling to match Next.js theme */
            body {{
                margin: 0;
                background: #fafafa;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }}

            .swagger-ui .topbar {{
                background-color: #1e40af;
                padding: 16px 0;
            }}

            .swagger-ui .topbar .topbar-wrapper {{
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 20px;
            }}

            .swagger-ui .topbar .topbar-wrapper .link {{
                content: "FastNext Framework - API Documentation";
                font-size: 18px;
                font-weight: 600;
                color: white;
                text-decoration: none;
            }}

            .swagger-ui .info .title {{
                color: #1e40af;
                font-size: 36px;
                font-weight: 700;
                margin-bottom: 8px;
            }}

            .swagger-ui .info .description {{
                font-size: 16px;
                line-height: 1.6;
                color: #4b5563;
            }}

            .swagger-ui .scheme-container {{
                background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
                padding: 20px;
                margin: 20px 0;
                border-radius: 8px;
                border: none;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }}

            .swagger-ui .scheme-container .schemes .schemes-title {{
                color: white;
                font-weight: 600;
                margin-bottom: 10px;
            }}

            .swagger-ui .scheme-container .schemes .schemes-title::after {{
                content: " - Click Authorize to test protected endpoints";
                font-weight: 400;
                font-size: 14px;
            }}

            .swagger-ui .btn.authorize {{
                background: #10b981;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: 600;
                transition: all 0.2s;
            }}

            .swagger-ui .btn.authorize:hover {{
                background: #059669;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            }}

            .swagger-ui .opblock-summary {{
                border-radius: 6px;
                border: 1px solid #e5e7eb;
                margin-bottom: 8px;
            }}

            .swagger-ui .opblock.opblock-get .opblock-summary-method {{
                background: #10b981;
                color: white;
                font-weight: 600;
            }}

            .swagger-ui .opblock.opblock-post .opblock-summary-method {{
                background: #3b82f6;
                color: white;
                font-weight: 600;
            }}

            .swagger-ui .opblock.opblock-put .opblock-summary-method {{
                background: #f59e0b;
                color: white;
                font-weight: 600;
            }}

            .swagger-ui .opblock.opblock-delete .opblock-summary-method {{
                background: #ef4444;
                color: white;
                font-weight: 600;
            }}

            .swagger-ui .opblock.opblock-patch .opblock-summary-method {{
                background: #8b5cf6;
                color: white;
                font-weight: 600;
            }}

            /* Connection status indicator */
            .api-status-indicator {{
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                z-index: 1000;
            }}

            .api-status-indicator.disconnected {{
                background: #ef4444;
            }}

            .swagger-ui .operation-tag-content {{
                max-width: none;
            }}

            /* Enhanced try it out button */
            .swagger-ui .btn.try-out__btn {{
                background: #1e40af;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-weight: 500;
            }}

            .swagger-ui .btn.try-out__btn:hover {{
                background: #1e3a8a;
            }}

            /* Custom response styling */
            .swagger-ui .responses-inner {{
                border-radius: 6px;
                overflow: hidden;
            }}

            .swagger-ui .response .response-col_status {{
                font-weight: 600;
            }}

            /* Loading indicator */
            .swagger-ui .loading-container {{
                text-align: center;
                padding: 40px;
            }}

            /* Authentication modal enhancements */
            .swagger-ui .auth-container .auth-wrapper {{
                padding: 20px;
            }}

            .swagger-ui .auth-container .auth-wrapper .auth-wrapper-inner {{
                max-width: 500px;
            }}

            /* Model section styling */
            .swagger-ui .model-container {{
                margin-top: 20px;
                border-radius: 6px;
            }}
        </style>
    </head>
    <body>
        <div class="api-status-indicator" id="apiStatus">
            🟢 API Connected
        </div>
        <div id="swagger-ui"></div>
        <!-- Swagger UI script will be loaded by FastAPI -->
        <script>
            const ui = SwaggerUIBundle({{
                url: '{openapi_url}',
                dom_id: '#swagger-ui',
                layout: 'BaseLayout',
                deepLinking: true,
                showExtensions: true,
                showCommonExtensions: true,
                tryItOutEnabled: true,
                displayRequestDuration: true,
                docExpansion: 'none',
                operationsSorter: 'alpha',
                filter: true,
                requestInterceptor: function(request) {{
                    // Add request timestamp for debugging
                    console.log('API Request:', request.method, request.url);
                    return request;
                }},
                responseInterceptor: function(response) {{
                    // Update connection status based on response
                    const statusIndicator = document.getElementById('apiStatus');
                    if (response.status === 0 || response.status >= 500) {{
                        statusIndicator.textContent = '🔴 API Error';
                        statusIndicator.className = 'api-status-indicator disconnected';
                    }} else {{
                        statusIndicator.textContent = '🟢 API Connected';
                        statusIndicator.className = 'api-status-indicator';
                    }}

                    // Log response for debugging
                    console.log('API Response:', response.status, response.url);
                    return response;
                }},
                onComplete: function() {{
                    console.log('FastNext Framework API Documentation loaded successfully');

                    // Add custom header
                    const infoSection = document.querySelector('.swagger-ui .info');
                    if (infoSection) {{
                        const statusBanner = document.createElement('div');
                        statusBanner.innerHTML = `
                            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
                                <h3 style="margin: 0 0 8px 0; font-size: 18px;">🚀 Ready to Test API Endpoints</h3>
                                <p style="margin: 0; opacity: 0.9;">Use the <strong>Authorize</strong> button to authenticate with your JWT token and test protected endpoints</p>
                            </div>
                        `;
                        infoSection.appendChild(statusBanner);
                    }}
                }},
                onFailure: function(error) {{
                    console.error('Failed to load API documentation:', error);
                    const statusIndicator = document.getElementById('apiStatus');
                    statusIndicator.textContent = '🔴 API Disconnected';
                    statusIndicator.className = 'api-status-indicator disconnected';
                }}
            }});

            // Test API connection on load
            fetch('/health')
                .then(response => {{
                    const statusIndicator = document.getElementById('apiStatus');
                    if (response.ok) {{
                        statusIndicator.textContent = '🟢 API Connected';
                        statusIndicator.className = 'api-status-indicator';
                    }} else {{
                        statusIndicator.textContent = '🟡 API Issues';
                        statusIndicator.className = 'api-status-indicator disconnected';
                    }}
                }})
                .catch(error => {{
                    console.error('API connection test failed:', error);
                    const statusIndicator = document.getElementById('apiStatus');
                    statusIndicator.textContent = '🔴 API Disconnected';
                    statusIndicator.className = 'api-status-indicator disconnected';
                }});
        </script>
    </body>
    </html>
    """

    @app.get("/docs", include_in_schema=False)
    async def custom_swagger_ui_html():
        """Custom Swagger UI with enhanced styling and functionality"""
        return HTMLResponse(
            swagger_ui_html.format(
                title=settings.PROJECT_NAME,
                openapi_url=f"{settings.API_V1_STR}/openapi.json",
            )
        )


def setup_swagger_auth_config() -> dict:
    """
    Setup authentication configuration for OpenAPI/Swagger
    """
    return {
        "components": {
            "securitySchemes": {
                "BearerAuth": {
                    "type": "http",
                    "scheme": "bearer",
                    "bearerFormat": "JWT",
                    "description": "Enter your JWT access token obtained from the `/auth/login` endpoint",
                }
            }
        },
        "security": [{"BearerAuth": []}],
    }
