import { test, expect } from '@playwright/test';

/**
 * E2E API tests for health checks and basic API functionality.
 * 
 * Tests API endpoints directly using Playwright's request capabilities.
 */

test.describe('API Health Checks', () => {
  const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8000';

  test('should return healthy status from health endpoint', async ({ request }) => {
    const response = await request.get(`${apiBaseUrl}/health`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('FastNext Framework API');
    expect(data.version).toBeTruthy();
    expect(data.timestamp).toBeTruthy();
  });

  test('should return API information from root endpoint', async ({ request }) => {
    const response = await request.get(`${apiBaseUrl}/`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.message).toContain('FastNext Framework');
    expect(data.version).toBeTruthy();
    expect(data.endpoints).toBeTruthy();
    expect(data.features).toBeTruthy();
  });

  test('should return OpenAPI spec', async ({ request }) => {
    const response = await request.get(`${apiBaseUrl}/api/v1/openapi.json`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.openapi).toBeTruthy();
    expect(data.info).toBeTruthy();
    expect(data.info.title).toBe('FastNext Framework');
    expect(data.paths).toBeTruthy();
  });

  test('should have CORS headers', async ({ request }) => {
    const response = await request.fetch(`${apiBaseUrl}/health`, {
      method: 'OPTIONS'
    });

    // CORS preflight should be handled
    expect(response.status()).toBe(200);

    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeTruthy();
    expect(headers['access-control-allow-methods']).toBeTruthy();
  });

  test('should require authentication for protected endpoints', async ({ request }) => {
    const response = await request.get(`${apiBaseUrl}/api/v1/users`);
    
    expect(response.status()).toBe(403);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error.message).toContain('authenticated');
  });
});

test.describe('API Authentication', () => {
  const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8000';

  test('should reject invalid login credentials', async ({ request }) => {
    const response = await request.post(`${apiBaseUrl}/api/v1/auth/login`, {
      data: {
        username: 'invalid@test.com',
        password: 'wrongpassword'
      }
    });
    
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  test('should validate request data format', async ({ request }) => {
    const response = await request.post(`${apiBaseUrl}/api/v1/auth/login`, {
      data: {
        // Missing required fields
        username: ''
      }
    });
    
    expect(response.status()).toBe(422);
  });

  test('should handle malformed JSON', async ({ request }) => {
    const response = await request.post(`${apiBaseUrl}/api/v1/auth/login`, {
      data: 'invalid json',
      headers: {
        'content-type': 'application/json'
      }
    });
    
    expect(response.status()).toBe(422);
  });
});

test.describe('API Rate Limiting', () => {
  const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8000';

  test('should handle multiple rapid requests', async ({ request }) => {
    // Make multiple rapid requests to test rate limiting
    const promises = Array.from({ length: 10 }, () =>
      request.get(`${apiBaseUrl}/health`)
    );
    
    const responses = await Promise.all(promises);
    
    // Most requests should succeed (rate limiting might kick in for some)
    const successCount = responses.filter(r => r.status() === 200).length;
    expect(successCount).toBeGreaterThan(5); // At least half should succeed
  });
});

test.describe('API Error Handling', () => {
  const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8000';

  test('should return 404 for non-existent endpoints', async ({ request }) => {
    const response = await request.get(`${apiBaseUrl}/api/v1/nonexistent`);
    
    expect(response.status()).toBe(404);
  });

  test('should return consistent error format', async ({ request }) => {
    const response = await request.get(`${apiBaseUrl}/api/v1/users/99999`, {
      headers: {
        'Authorization': 'Bearer invalid_token'
      }
    });
    
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBeTruthy();
    expect(data.error.code).toBeTruthy();
    expect(data.error.message).toBeTruthy();
    expect(data.meta).toBeTruthy();
    expect(data.meta.timestamp).toBeTruthy();
  });

  test('should handle large request bodies gracefully', async ({ request }) => {
    const largeData = {
      username: 'a'.repeat(10000), // Very long username
      password: 'b'.repeat(10000)  // Very long password
    };
    
    const response = await request.post(`${apiBaseUrl}/api/v1/auth/login`, {
      data: largeData
    });
    
    // Should handle gracefully (either validate or return proper error)
    expect([400, 413, 422]).toContain(response.status());
  });
});

test.describe('API Performance', () => {
  const apiBaseUrl = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8000';

  test('should respond to health check within reasonable time', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get(`${apiBaseUrl}/health`);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
  });

  test('should include performance headers', async ({ request }) => {
    const response = await request.get(`${apiBaseUrl}/health`);
    
    const headers = response.headers();
    
    // Check for performance-related headers
    expect(headers['x-process-time']).toBeTruthy();
    expect(headers['x-request-id']).toBeTruthy();
  });
});