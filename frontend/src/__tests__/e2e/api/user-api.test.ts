import { expect, test } from "@playwright/test";
import { APIRequestContext } from "@playwright/test";

/**
 * API tests for user management endpoints.
 *
 * Tests backend CRUD operations directly via API calls.
 */

test.describe("User API CRUD Operations", () => {
  let apiContext: APIRequestContext;
  let adminToken: string;
  let testUserId: number;

  test.beforeAll(async ({ playwright }) => {
    // Create API context
    apiContext = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_API_BASE_URL || "http://localhost:8000",
    });

    // Login as admin to get token
    const loginResponse = await apiContext.post("/api/v1/auth/login", {
      data: {
        username: process.env.ADMIN_USERNAME || "admin",
        password: process.env.ADMIN_PASSWORD || "admin123",
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    adminToken = loginData.access_token;

    // Set authorization header for all subsequent requests
    apiContext = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_API_BASE_URL || "http://localhost:8000",
      extraHTTPHeaders: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test("should get users list", async () => {
    const response = await apiContext.get("/api/v1/users");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty("items");
    expect(data).toHaveProperty("total");
    expect(Array.isArray(data.items)).toBeTruthy();
  });

  test("should create new user", async () => {
    const timestamp = Date.now();
    const userData = {
      email: `testuser${timestamp}@example.com`,
      username: `testuser${timestamp}`,
      password: "TestPassword123!",
      full_name: "Test User API",
      is_active: true,
      is_verified: false,
      is_superuser: false,
    };

    const response = await apiContext.post("/api/v1/users", {
      data: userData,
    });

    expect(response.ok()).toBeTruthy();
    const createdUser = await response.json();

    expect(createdUser).toHaveProperty("id");
    expect(createdUser.email).toBe(userData.email);
    expect(createdUser.username).toBe(userData.username);
    expect(createdUser.full_name).toBe(userData.full_name);

    // Store user ID for later tests
    testUserId = createdUser.id;
  });

  test("should get specific user by ID", async () => {
    const response = await apiContext.get(`/api/v1/users/${testUserId}`);
    expect(response.ok()).toBeTruthy();

    const user = await response.json();
    expect(user.id).toBe(testUserId);
    expect(user).toHaveProperty("email");
    expect(user).toHaveProperty("username");
  });

  test("should update user", async () => {
    const updateData = {
      full_name: "Updated Test User API",
      is_verified: true,
      bio: "Updated bio via API test",
    };

    const response = await apiContext.put(`/api/v1/users/${testUserId}`, {
      data: updateData,
    });

    expect(response.ok()).toBeTruthy();
    const updatedUser = await response.json();

    expect(updatedUser.id).toBe(testUserId);
    expect(updatedUser.full_name).toBe(updateData.full_name);
    expect(updatedUser.is_verified).toBe(updateData.is_verified);
    expect(updatedUser.bio).toBe(updateData.bio);
  });

  test("should toggle user status", async () => {
    // First get current status
    const getResponse = await apiContext.get(`/api/v1/users/${testUserId}`);
    const user = await getResponse.json();
    const originalStatus = user.is_active;

    // Toggle status
    const toggleResponse = await apiContext.patch(`/api/v1/users/${testUserId}/toggle-status`);
    expect(toggleResponse.ok()).toBeTruthy();

    const toggledUser = await toggleResponse.json();
    expect(toggledUser.is_active).toBe(!originalStatus);

    // Toggle back to original status
    const toggleBackResponse = await apiContext.patch(`/api/v1/users/${testUserId}/toggle-status`);
    expect(toggleBackResponse.ok()).toBeTruthy();

    const finalUser = await toggleBackResponse.json();
    expect(finalUser.is_active).toBe(originalStatus);
  });

  test("should validate user creation", async () => {
    // Test duplicate email
    const duplicateEmailData = {
      email: "admin@example.com", // Assuming this exists
      username: `unique${Date.now()}`,
      password: "TestPassword123!",
    };

    const duplicateResponse = await apiContext.post("/api/v1/users", {
      data: duplicateEmailData,
    });

    expect(duplicateResponse.status()).toBe(400);
    const error = await duplicateResponse.json();
    expect(error.detail).toContain("email already exists");

    // Test duplicate username
    const duplicateUsernameData = {
      email: `unique${Date.now()}@example.com`,
      username: "admin", // Assuming this exists
      password: "TestPassword123!",
    };

    const duplicateUsernameResponse = await apiContext.post("/api/v1/users", {
      data: duplicateUsernameData,
    });

    expect(duplicateUsernameResponse.status()).toBe(400);
    const usernameError = await duplicateUsernameResponse.json();
    expect(usernameError.detail).toContain("username already exists");

    // Test invalid email
    const invalidEmailData = {
      email: "invalid-email",
      username: `invalid${Date.now()}`,
      password: "TestPassword123!",
    };

    const invalidResponse = await apiContext.post("/api/v1/users", {
      data: invalidEmailData,
    });

    expect(invalidResponse.status()).toBe(422); // Validation error
  });

  test("should handle pagination", async () => {
    // Test with limit
    const limitResponse = await apiContext.get("/api/v1/users?limit=2");
    expect(limitResponse.ok()).toBeTruthy();

    const limitData = await limitResponse.json();
    expect(limitData.items.length).toBeLessThanOrEqual(2);
    expect(limitData.limit).toBe(2);

    // Test with skip
    const skipResponse = await apiContext.get("/api/v1/users?skip=1&limit=2");
    expect(skipResponse.ok()).toBeTruthy();

    const skipData = await skipResponse.json();
    expect(skipData.skip).toBe(1);
  });

  test("should handle search and filtering", async () => {
    // Search by email
    const searchResponse = await apiContext.get("/api/v1/users?search=testuser");
    expect(searchResponse.ok()).toBeTruthy();

    const searchData = await searchResponse.json();
    expect(searchData.items.length).toBeGreaterThan(0);

    // All results should contain the search term
    searchData.items.forEach((user: any) => {
      const hasMatch = user.email.includes("testuser") ||
                      user.username.includes("testuser") ||
                      (user.full_name && user.full_name.includes("testuser"));
      expect(hasMatch).toBeTruthy();
    });

    // Filter by active status
    const activeResponse = await apiContext.get("/api/v1/users?is_active=true");
    expect(activeResponse.ok()).toBeTruthy();

    const activeData = await activeResponse.json();
    activeData.items.forEach((user: any) => {
      expect(user.is_active).toBe(true);
    });
  });

  test("should delete user", async () => {
    // Delete the test user
    const deleteResponse = await apiContext.delete(`/api/v1/users/${testUserId}`);
    expect(deleteResponse.ok()).toBeTruthy();

    // Verify user is deleted (soft delete - should still exist but inactive)
    const getResponse = await apiContext.get(`/api/v1/users/${testUserId}`);
    expect(getResponse.ok()).toBeTruthy();

    const deletedUser = await getResponse.json();
    expect(deletedUser.is_active).toBe(false);
  });

  test("should prevent non-admin access", async ({ playwright }) => {
    // Create non-admin context
    const nonAdminContext = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_API_BASE_URL || "http://localhost:8000",
    });

    // Try to login as regular user (assuming one exists)
    const loginResponse = await nonAdminContext.post("/api/v1/auth/login", {
      data: {
        username: "user", // Assuming regular user exists
        password: "user123",
      },
    });

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      const userToken = loginData.access_token;

      // Try admin operations with user token
      const adminContext = await playwright.request.newContext({
        baseURL: process.env.PLAYWRIGHT_API_BASE_URL || "http://localhost:8000",
        extraHTTPHeaders: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      // Should fail
      const usersResponse = await adminContext.get("/api/v1/users");
      expect(usersResponse.status()).toBe(403);

      const createResponse = await adminContext.post("/api/v1/users", {
        data: {
          email: "test@example.com",
          username: "testuser",
          password: "password",
        },
      });
      expect(createResponse.status()).toBe(403);

      await adminContext.dispose();
    }

    await nonAdminContext.dispose();
  });

  test("should get current user profile", async () => {
    const response = await apiContext.get("/api/v1/auth/me");
    expect(response.ok()).toBeTruthy();

    const user = await response.json();
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("email");
    expect(user).toHaveProperty("username");
    expect(user.is_superuser).toBe(true); // Admin user
  });

  test("should update current user profile", async () => {
    const updateData = {
      full_name: "Updated Admin User",
      bio: "Updated bio",
    };

    const response = await apiContext.put("/api/v1/auth/me", {
      data: updateData,
    });

    expect(response.ok()).toBeTruthy();
    const updatedUser = await response.json();

    expect(updatedUser.full_name).toBe(updateData.full_name);
    expect(updatedUser.bio).toBe(updateData.bio);
  });
});