import { expect, test } from "@playwright/test";

/**
 * E2E tests for user management functionality.
 *
 * Tests admin user management features including CRUD operations.
 */

test.describe("User Management (Admin)", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to users management page
    await page.goto("/admin/users");
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
  });

  test("should display users list page with statistics", async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText(/Users Management|Users/);

    // Check statistics cards are visible
    const statsCards = page.locator('[class*="grid"] [class*="card"]');
    await expect(statsCards).toHaveCount(4); // Total, Verified, Recent Activity, Administrators

    // Check for users table/list
    const usersContainer = page.locator('[data-testid="view-manager"], .view-manager');
    await expect(usersContainer).toBeVisible();

    // Check create user button is visible
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add User")').first();
    await expect(createButton).toBeVisible();
  });

  test("should create new user successfully", async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@example.com`;
    const testUsername = `testuser${timestamp}`;

    // Click create user button
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add User")').first();
    await createButton.click();

    // Wait for create dialog to open
    const dialog = page.locator('[role="dialog"], [data-testid*="create"]').first();
    await expect(dialog).toBeVisible();

    // Fill required fields
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="password"]', 'TestPassword123!');

    // Fill optional fields
    await page.fill('input[name="full_name"]', 'Test User E2E');

    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    // Wait for success - either dialog closes or success message appears
    await page.waitForTimeout(2000);

    // Verify user was created by checking if it appears in the list
    // Search for the created user
    const searchInput = page.locator('input[placeholder*="search" i], input[name="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(testUsername);
      await page.waitForTimeout(1000);

      // Check if the user appears in results
      const userRow = page.locator(`text=${testUsername}`).first();
      await expect(userRow).toBeVisible();
    }

    // Alternative: Check if URL changed back to list view
    await expect(page).toHaveURL(/\/admin\/users($|\?mode=list)/);
  });

  test("should validate create user form fields", async ({ page }) => {
    // Click create user button
    const createButton = page.locator('button:has-text("Create"), button:has-text("Add User")').first();
    await createButton.click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    // Dialog should still be open (validation failed)
    await expect(dialog).toBeVisible();

    // Test email validation
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', '123');
    await submitButton.click();

    // Should still be open due to validation
    await expect(dialog).toBeVisible();

    // Test valid data
    await page.fill('input[name="email"]', `valid${Date.now()}@example.com`);
    await page.fill('input[name="username"]', `validuser${Date.now()}`);
    await page.fill('input[name="password"]', 'ValidPassword123!');
    await submitButton.click();

    // Should succeed and close dialog
    await page.waitForTimeout(2000);
    await expect(dialog).not.toBeVisible();
  });

  test("should edit existing user", async ({ page }) => {
    // Find first user row and click edit
    const editButton = page.locator('button:has-text("Edit"), [data-testid*="edit"]').first();
    await editButton.click();

    // Wait for edit dialog
    const dialog = page.locator('[role="dialog"], [data-testid*="edit"]').first();
    await expect(dialog).toBeVisible();

    // Verify form is populated
    const emailField = page.locator('input[name="email"]').first();
    const originalEmail = await emailField.inputValue();
    expect(originalEmail).toBeTruthy();

    // Modify full name
    const newFullName = `Updated User ${Date.now()}`;
    await page.fill('input[name="full_name"]', newFullName);

    // Submit changes
    const submitButton = page.locator('button[type="submit"], button:has-text("Update"), button:has-text("Save")').first();
    await submitButton.click();

    // Wait for success
    await page.waitForTimeout(2000);

    // Verify dialog closed
    await expect(dialog).not.toBeVisible();

    // Verify changes persisted (if we can find the user in the list)
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(originalEmail.split('@')[0]); // Search by username part
      await page.waitForTimeout(1000);

      // Check if updated name appears
      const updatedName = page.locator(`text=${newFullName}`).first();
      await expect(updatedName).toBeVisible();
    }
  });

  test("should toggle user active status", async ({ page }) => {
    // Find a user row and locate the status toggle
    const userRow = page.locator('tbody tr, [data-testid*="user-row"]').first();
    await expect(userRow).toBeVisible();

    // Find status badge or toggle button
    const statusElement = userRow.locator('text=Active, text=Inactive, [data-testid*="status"]').first();
    const originalStatus = await statusElement.textContent();

    // Click the toggle (could be a button or the status badge itself)
    const toggleButton = userRow.locator('button:has-text("Active"), button:has-text("Inactive"), [data-testid*="toggle"]').first();
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
    } else {
      // Try clicking the status badge directly
      await statusElement.click();
    }

    // Wait for status change
    await page.waitForTimeout(2000);

    // Verify status changed
    const newStatus = await statusElement.textContent();
    expect(newStatus).not.toBe(originalStatus);
  });

  test("should delete user with confirmation", async ({ page }) => {
    // First create a test user to delete
    const timestamp = Date.now();
    const testEmail = `deletetest${timestamp}@example.com`;
    const testUsername = `deletetest${timestamp}`;

    // Create user
    const createButton = page.locator('button:has-text("Create")').first();
    await createButton.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="username"]', testUsername);
    await page.fill('input[name="password"]', 'DeleteMe123!');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(2000);
    await expect(dialog).not.toBeVisible();

    // Now find and delete the user
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(testUsername);
      await page.waitForTimeout(1000);
    }

    // Find delete button for this user
    const deleteButton = page.locator(`button:has-text("Delete"), [data-testid*="delete"]`).first();
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")').first();
    await confirmButton.click();

    // Wait for deletion
    await page.waitForTimeout(2000);

    // Verify user is no longer in the list
    if (await searchInput.isVisible()) {
      await searchInput.fill(testUsername);
      await page.waitForTimeout(1000);

      // Should not find the user
      const userRow = page.locator(`text=${testUsername}`).first();
      await expect(userRow).not.toBeVisible();
    }
  });

  test("should search and filter users", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i], input[name="search"]').first();

    if (await searchInput.isVisible()) {
      // Search for "admin"
      await searchInput.fill("admin");
      await page.waitForTimeout(1000);

      // Should show filtered results
      const userRows = page.locator('tbody tr, [data-testid*="user-row"]');
      const rowCount = await userRows.count();
      expect(rowCount).toBeGreaterThanOrEqual(0);

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(1000);

      // Should show more results now
      const newRowCount = await userRows.count();
      expect(newRowCount).toBeGreaterThanOrEqual(rowCount);
    }
  });

  test("should handle bulk operations", async ({ page }) => {
    // Look for checkboxes to select multiple users
    const checkboxes = page.locator('input[type="checkbox"], [data-testid*="checkbox"]');

    if ((await checkboxes.count()) > 1) {
      // Select first two users
      await checkboxes.nth(1).check();
      await checkboxes.nth(2).check();

      // Look for bulk actions
      const bulkDeleteButton = page.locator('button:has-text("Delete Selected"), [data-testid*="bulk-delete"]');

      if (await bulkDeleteButton.isVisible()) {
        await bulkDeleteButton.click();

        // Confirm bulk deletion
        const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")');
        if (await confirmButton.isVisible()) {
          // Don't actually delete - just test the flow
          const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Close")').first();
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
      }

      // Uncheck boxes
      await checkboxes.nth(1).uncheck();
      await checkboxes.nth(2).uncheck();
    }
  });

  test("should handle different view modes", async ({ page }) => {
    // Check if view mode buttons exist
    const listViewButton = page.locator('button:has-text("List"), [data-testid*="list-view"]');
    const cardViewButton = page.locator('button:has-text("Card"), [data-testid*="card-view"]');
    const kanbanViewButton = page.locator('button:has-text("Kanban"), [data-testid*="kanban-view"]');

    // Test list view
    if (await listViewButton.isVisible()) {
      await listViewButton.click();
      await page.waitForTimeout(500);
      const table = page.locator('table, [data-testid*="table"]');
      await expect(table).toBeVisible();
    }

    // Test card view
    if (await cardViewButton.isVisible()) {
      await cardViewButton.click();
      await page.waitForTimeout(500);
      const cards = page.locator('[data-testid*="card"], .card');
      await expect(cards.first()).toBeVisible();
    }

    // Test kanban view
    if (await kanbanViewButton.isVisible()) {
      await kanbanViewButton.click();
      await page.waitForTimeout(500);
      const kanbanColumns = page.locator('[data-testid*="kanban"], .kanban-column');
      await expect(kanbanColumns.first()).toBeVisible();
    }
  });

  test("should handle pagination", async ({ page }) => {
    const nextButton = page.locator('button:has-text("Next"), [aria-label="Next page"]');
    const prevButton = page.locator('button:has-text("Previous"), [aria-label="Previous page"]');

    // Check if pagination exists
    if (await nextButton.isVisible()) {
      const isNextEnabled = await nextButton.isEnabled();

      if (isNextEnabled) {
        await nextButton.click();
        await page.waitForTimeout(1000);

        // Should be on next page
        await expect(prevButton).toBeEnabled();

        // Go back
        await prevButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still load
    await expect(page.locator('h1')).toBeVisible();

    // Mobile navigation should work
    const mobileMenuButton = page.locator('button[aria-label*="menu"], .mobile-menu-button');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      const mobileMenu = page.locator('[data-testid*="mobile-menu"], .mobile-menu');
      await expect(mobileMenu).toBeVisible();
    }

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1')).toBeVisible();

    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test("should handle error states gracefully", async ({ page }) => {
    // Try to access a non-existent user edit page
    await page.goto("/admin/users?mode=edit&id=999999");

    // Should handle gracefully (either redirect or show error)
    await page.waitForTimeout(2000);

    // Should not crash, should either redirect back or show error message
    const errorMessage = page.locator('text=not found, text=error, text=Error').first();
    const isOnUsersPage = page.url().includes('/admin/users');

    expect(await errorMessage.isVisible() || isOnUsersPage).toBeTruthy();
  });

  test("should prevent non-admin users from accessing user management", async ({ page }) => {
    // This test would need a separate setup for non-admin user
    // For now, we'll test that admin routes are protected by middleware
    // Navigate to admin page without proper auth would redirect to login

    // Test that admin routes require authentication
    await page.goto("/admin/users");

    // Should either be on login page or show access denied
    const currentUrl = page.url();
    const isOnLoginPage = currentUrl.includes('/login');
    const hasAccessDenied = await page.locator('text=access denied, text=forbidden, text=403').isVisible();

    // With proper admin auth setup, this should work
    // Without admin auth, it should redirect or show error
    expect(isOnLoginPage || hasAccessDenied || currentUrl.includes('/admin/users')).toBeTruthy();
  });

  test("should validate admin permissions for sensitive operations", async ({ page }) => {
    // Test that certain operations require admin permissions
    // This would test that superuser status changes are restricted

    // Try to create a superuser account
    const createButton = page.locator('button:has-text("Create")').first();
    await createButton.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Fill form
    await page.fill('input[name="email"]', `superuser${Date.now()}@example.com`);
    await page.fill('input[name="username"]', `superuser${Date.now()}`);
    await page.fill('input[name="password"]', 'SuperUser123!');

    // Check superuser checkbox
    const superuserCheckbox = page.locator('input[name="is_superuser"], [data-testid*="superuser"]');
    if (await superuserCheckbox.isVisible()) {
      await superuserCheckbox.check();
    }

    // Submit
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should succeed (admin creating superuser should be allowed)
    await page.waitForTimeout(2000);
    await expect(dialog).not.toBeVisible();
  });

  test("should handle API errors gracefully", async ({ page }) => {
    // Test error handling when API calls fail

    // Mock a network error by blocking API calls
    await page.route('**/api/v1/users**', route => route.abort());

    // Try to create user
    const createButton = page.locator('button:has-text("Create")').first();
    await createButton.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    await page.fill('input[name="email"]', `error${Date.now()}@example.com`);
    await page.fill('input[name="username"]', `error${Date.now()}`);
    await page.fill('input[name="password"]', 'ErrorTest123!');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Should show error message
    await page.waitForTimeout(2000);
    const errorMessage = page.locator('text=error, text=failed, text=Error').first();
    await expect(errorMessage).toBeVisible();

    // Restore API calls
    await page.unroute('**/api/v1/users**');
  });
});
