/**
 * Base API Client
 * Handles REST API requests with authentication and error handling
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface APIError {
  detail: string;
  status: number;
}

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem("access_token");
    } catch {
      return null;
    }
  }

  private getHeaders(contentType: string = "application/json"): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": contentType,
    };
    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let error: APIError;
      try {
        const data = await response.json();
        error = {
          detail: data.detail || data.message || "An error occurred",
          status: response.status,
        };
      } catch {
        error = {
          detail: response.statusText || "An error occurred",
          status: response.status,
        };
      }

      // Handle 401 by redirecting to login
      if (response.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }

      throw error;
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;

    return JSON.parse(text) as T;
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.getHeaders(),
      credentials: "include",
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.getHeaders(),
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(path: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers: this.getHeaders(),
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(path: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: this.getHeaders(),
      credentials: "include",
    });

    return this.handleResponse<T>(response);
  }
}

export const apiClient = new APIClient();
export default apiClient;
