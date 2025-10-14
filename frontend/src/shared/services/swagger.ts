/**
 * Swagger UI integration utilities
 */

export interface SwaggerConfig {
  apiUrl: string;
  openApiUrl: string;
  token?: string;
}

export const getSwaggerConfig = (token?: string): SwaggerConfig => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  return {
    apiUrl: baseUrl,
    openApiUrl: `${baseUrl}/api/v1/openapi.json`,
    token,
  };
};

/**
 * Test API endpoint connectivity
 */
export const testAPIConnection = async (
  baseUrl: string = "http://localhost:8000",
): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> => {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: "API connection successful",
        data,
      };
    } else {
      return {
        success: false,
        message: `API returned status ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to API: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

/**
 * Test authenticated endpoint
 */
export const testAuthenticatedEndpoint = async (
  token: string,
  endpoint: string = "/api/v1/auth/me",
  baseUrl: string = "http://localhost:8000",
): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> => {
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: "Authenticated request successful",
        data,
      };
    } else {
      return {
        success: false,
        message: `Authentication failed: ${response.status} ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

/**
 * Get all available endpoints from OpenAPI spec
 */
export const getAvailableEndpoints = async (
  openApiUrl: string,
): Promise<{
  success: boolean;
  endpoints: Array<{
    path: string;
    method: string;
    summary?: string;
    tags?: string[];
    security?: boolean;
  }>;
}> => {
  try {
    const response = await fetch(openApiUrl);
    if (!response.ok) {
      return { success: false, endpoints: [] };
    }

    const spec = await response.json();
    const endpoints: Array<{
      path: string;
      method: string;
      summary?: string;
      tags?: string[];
      security?: boolean;
    }> = [];

    if (spec.paths) {
      Object.entries(spec.paths).forEach(([path, pathItem]: [string, any]) => {
        Object.entries(pathItem).forEach(
          ([method, operation]: [string, any]) => {
            if (["get", "post", "put", "delete", "patch"].includes(method)) {
              endpoints.push({
                path,
                method: method.toUpperCase(),
                summary: operation.summary,
                tags: operation.tags,
                security: Boolean(
                  operation.security && operation.security.length > 0,
                ),
              });
            }
          },
        );
      });
    }

    return { success: true, endpoints };
  } catch (error) {
    console.error("Failed to fetch OpenAPI spec:", error);
    return { success: false, endpoints: [] };
  }
};

/**
 * CRUD testing utilities
 */
export interface CRUDTestResult {
  operation: "create" | "read" | "update" | "delete";
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class CRUDTester {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string = "http://localhost:8000", token?: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  async testCreate(endpoint: string, data: any): Promise<CRUDTestResult> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          operation: "create",
          success: true,
          message: "Create operation successful",
          data: responseData,
        };
      } else {
        return {
          operation: "create",
          success: false,
          message: `Create failed: ${response.status}`,
          error: responseData,
        };
      }
    } catch (error) {
      return {
        operation: "create",
        success: false,
        message: "Create operation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async testRead(endpoint: string): Promise<CRUDTestResult> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          operation: "read",
          success: true,
          message: "Read operation successful",
          data: responseData,
        };
      } else {
        return {
          operation: "read",
          success: false,
          message: `Read failed: ${response.status}`,
          error: responseData,
        };
      }
    } catch (error) {
      return {
        operation: "read",
        success: false,
        message: "Read operation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async testUpdate(endpoint: string, data: any): Promise<CRUDTestResult> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.ok) {
        return {
          operation: "update",
          success: true,
          message: "Update operation successful",
          data: responseData,
        };
      } else {
        return {
          operation: "update",
          success: false,
          message: `Update failed: ${response.status}`,
          error: responseData,
        };
      }
    } catch (error) {
      return {
        operation: "update",
        success: false,
        message: "Update operation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async testDelete(endpoint: string): Promise<CRUDTestResult> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "DELETE",
        headers: this.getHeaders(),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }

      if (response.ok) {
        return {
          operation: "delete",
          success: true,
          message: "Delete operation successful",
          data: responseData,
        };
      } else {
        return {
          operation: "delete",
          success: false,
          message: `Delete failed: ${response.status}`,
          error: responseData,
        };
      }
    } catch (error) {
      return {
        operation: "delete",
        success: false,
        message: "Delete operation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
