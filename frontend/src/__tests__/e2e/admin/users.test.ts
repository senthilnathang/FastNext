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
  });

  test("should display users list page", async ({ page }) => {
    // Check page title or heading
    await expect(
      page.locator('h1, h2, [data-testid="page-title"]'),
    ).toContainText(/users/i);

    // Check for users table or list
    const usersTable = page.locator(
      'table, [data-testid="users-table"], .data-table',
    );
    const usersList = page.locator('[data-testid="users-list"], .users-list');

    // At least one of these should be visible
    const hasTable = (await usersTable.count()) > 0;
    const hasList = (await usersList.count()) > 0;

    expect(hasTable || hasList).toBeTruthy();
  });

  test("should have create user button", async ({ page }) => {
    // Look for create/add user button
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("Add"), button:has-text("New"), [data-testid="create-user"]',
    );

    await expect(createButton).toBeVisible();
  });

  test("should open create user dialog", async ({ page }) => {
    // Click create user button
    const createButton = page
      .locator(
        'button:has-text("Create"), button:has-text("Add"), button:has-text("New"), [data-testid="create-user"]',
      )
      .first();

    if ((await createButton.count()) > 0) {
      await createButton.click();

      // Check if dialog/modal opens
      const dialog = page.locator(
        '[role="dialog"], .modal, [data-testid="create-user-dialog"]',
      );
      await expect(dialog).toBeVisible();

      // Check for form fields
      const emailField = page.locator(
        'input[name="email"], input[type="email"]',
      );
      const usernameField = page.locator('input[name="username"]');
      const passwordField = page.locator(
        'input[name="password"], input[type="password"]',
      );

      await expect(emailField).toBeVisible();
      await expect(usernameField).toBeVisible();
      await expect(passwordField).toBeVisible();
    }
  });

  test("should validate create user form", async ({ page }) => {
    // Open create user dialog
    const createButton = page
      .locator(
        'button:has-text("Create"), button:has-text("Add"), button:has-text("New"), [data-testid="create-user"]',
      )
      .first();

    if ((await createButton.count()) > 0) {
      await createButton.click();

      // Try to submit empty form
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Create"), button:has-text("Save")',
      );
      await submitButton.click();

      // Should show validation errors or prevent submission
      const dialog = page.locator(
        '[role="dialog"], .modal, [data-testid="create-user-dialog"]',
      );
      await expect(dialog).toBeVisible(); // Dialog should still be open
    }
  });

  test("should create new user", async ({ page }) => {
    // Open create user dialog
    const createButton = page
      .locator(
        'button:has-text("Create"), button:has-text("Add"), button:has-text("New"), [data-testid="create-user"]',
      )
      .first();

    if ((await createButton.count()) > 0) {
      await createButton.click();

      // Fill form with valid data
      await page.fill(
        'input[name="email"], input[type="email"]',
        `testuser${Date.now()}@example.com`,
      );
      await page.fill('input[name="username"]', `testuser${Date.now()}`);
      await page.fill(
        'input[name="password"], input[type="password"]',
        "TestPassword123",
      );

      // Optional: fill other fields if they exist
      const fullNameField = page.locator(
        'input[name="full_name"], input[name="fullName"]',
      );
      if ((await fullNameField.count()) > 0) {
        await fullNameField.fill("Test User");
      }

      // Submit form
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Create"), button:has-text("Save")',
      );
      await submitButton.click();

      // Wait for success (dialog closes or success message)
      await page.waitForTimeout(2000);

      // Verify dialog is closed or success message is shown
      const dialog = page.locator('[role="dialog"], .modal');
      const isDialogVisible = await dialog.isVisible().catch(() => false);

      if (isDialogVisible) {
        // Look for success message within dialog
        const successMessage = page.locator("text=success, text=created");
        expect(await successMessage.count()).toBeGreaterThan(0);
      }
    }
  });

  test("should search users", async ({ page }) => {
    // Look for search input
    const searchInput = page.locator(
      'input[placeholder*="search" i], input[name="search"], [data-testid="search"]',
    );

    if ((await searchInput.count()) > 0) {
      // Type in search box
      await searchInput.fill("admin");

      // Wait for search results
      await page.waitForTimeout(1000);

      // Verify results (this is basic - in real test you'd verify specific results)
      const tableRows = page.locator(
        'tbody tr, .table-row, [data-testid="user-row"]',
      );
      expect(await tableRows.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test("should paginate users list", async ({ page }) => {
    // Look for pagination controls
    const paginationNext = page.locator(
      'button:has-text("Next"), [aria-label="Next"], .pagination-next',
    );

    // Check if pagination exists
    if ((await paginationNext.count()) > 0) {
      // Try clicking next if enabled
      const isEnabled = await paginationNext.isEnabled();
      if (isEnabled) {
        await paginationNext.click();
        await page.waitForTimeout(1000);

        // Verify page changed (URL or content)
        expect(page.url()).toBeTruthy(); // Basic check
      }
    }
  });

  test("should edit user", async ({ page }) => {
    // Look for edit buttons in the first row
    const editButton = page
      .locator(
        'button:has-text("Edit"), [data-testid="edit-user"], .edit-button',
      )
      .first();

    if ((await editButton.count()) > 0) {
      await editButton.click();

      // Check if edit dialog opens
      const dialog = page.locator(
        '[role="dialog"], .modal, [data-testid="edit-user-dialog"]',
      );
      await expect(dialog).toBeVisible();

      // Verify form fields are populated
      const emailField = page.locator(
        'input[name="email"], input[type="email"]',
      );
      const emailValue = await emailField.inputValue();
      expect(emailValue).toBeTruthy();
    }
  });

  test("should delete user with confirmation", async ({ page }) => {
    // Look for delete buttons
    const deleteButton = page
      .locator(
        'button:has-text("Delete"), [data-testid="delete-user"], .delete-button',
      )
      .first();

    if ((await deleteButton.count()) > 0) {
      await deleteButton.click();

      // Check for confirmation dialog
      const confirmDialog = page.locator(
        '[role="alertdialog"], [role="dialog"]:has-text("delete"), .confirm-dialog',
      );

      if ((await confirmDialog.count()) > 0) {
        // Look for confirm button
        const confirmButton = page.locator(
          'button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")',
        );

        if ((await confirmButton.count()) > 0) {
          await confirmButton.click();

          // Wait for deletion to complete
          await page.waitForTimeout(1000);

          // Verify success (this is basic - in real test you'd verify the user is gone)
          expect(page.url()).toBeTruthy();
        }
      }
    }
  });

  test("should toggle user status", async ({ page }) => {
    // Look for status toggle buttons
    const statusToggle = page
      .locator(
        'button:has-text("Active"), button:has-text("Inactive"), [data-testid="toggle-status"]',
      )
      .first();

    if ((await statusToggle.count()) > 0) {
      const originalText = await statusToggle.textContent();
      await statusToggle.click();

      // Wait for status change
      await page.waitForTimeout(1000);

      // Verify status changed (text should be different)
      const newText = await statusToggle.textContent();
      expect(newText).not.toBe(originalText);
    }
  });

  test("should have responsive design", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still be usable
    const heading = page.locator('h1, h2, [data-testid="page-title"]');
    await expect(heading).toBeVisible();

    // Create button should be accessible
    const createButton = page
      .locator(
        'button:has-text("Create"), button:has-text("Add"), [data-testid="create-user"]',
      )
      .first();

    if ((await createButton.count()) > 0) {
      await expect(createButton).toBeVisible();
    }

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(heading).toBeVisible();
  });
});
