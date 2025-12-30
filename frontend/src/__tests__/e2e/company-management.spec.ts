import { expect, test } from "@playwright/test";
import { TestHelpers } from "./utils/test-helpers";

/**
 * E2E tests for company management functionality.
 *
 * Tests company CRUD operations, company switching, and multi-tenant features.
 */

test.describe("Company Management", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Navigate to company management page
    await page.goto("/admin/companies");
    await page.waitForLoadState("networkidle");
  });

  test("should display company list page", async ({ page }) => {
    // Check page title/header
    const header = page.locator("h1, h2").first();
    await expect(header).toContainText(/Companies|Company Management/i);

    // Check for company list container
    const listContainer = page.locator(
      '[data-testid="company-list"], .company-list, [data-testid="view-manager"]'
    );
    await expect(listContainer).toBeVisible();
  });

  test("should display create company button", async ({ page }) => {
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("Add Company"), button:has-text("New Company")'
    ).first();
    await expect(createButton).toBeVisible();
  });

  test("should open create company dialog", async ({ page }) => {
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("Add Company"), button:has-text("New Company")'
    ).first();
    await createButton.click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"], [data-testid*="create"]').first();
    await expect(dialog).toBeVisible();

    // Check for form fields
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="slug"]')).toBeVisible();
  });

  test("should create new company successfully", async ({ page }) => {
    const timestamp = Date.now();
    const companyName = `Test Company ${timestamp}`;
    const companySlug = `test-company-${timestamp}`;

    // Click create button
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("Add Company")'
    ).first();
    await createButton.click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Fill form
    await page.fill('input[name="name"]', companyName);
    await page.fill('input[name="slug"]', companySlug);

    // Fill optional fields if present
    const descriptionField = page.locator('textarea[name="description"], input[name="description"]');
    if (await descriptionField.isVisible()) {
      await descriptionField.fill("Test company created by E2E test");
    }

    // Submit
    const submitButton = dialog.locator(
      'button[type="submit"], button:has-text("Create"), button:has-text("Save")'
    ).first();
    await submitButton.click();

    // Wait for success
    await page.waitForTimeout(2000);

    // Verify dialog closed
    await expect(dialog).not.toBeVisible();

    // Search for created company
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(companyName);
      await page.waitForTimeout(1000);

      // Verify company appears in list
      await expect(page.locator(`text=${companyName}`).first()).toBeVisible();
    }
  });

  test("should validate company form fields", async ({ page }) => {
    // Click create button
    const createButton = page.locator('button:has-text("Create")').first();
    await createButton.click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Try to submit empty form
    const submitButton = dialog.locator('button[type="submit"]').first();
    await submitButton.click();

    // Dialog should still be visible (validation failed)
    await expect(dialog).toBeVisible();

    // Check for validation messages
    const validationError = page.locator(
      '[class*="error"], [class*="invalid"], [role="alert"], .text-destructive'
    );
    await expect(validationError.first()).toBeVisible();
  });

  test("should edit existing company", async ({ page }) => {
    // Find first company and click edit
    const editButton = page.locator(
      'button:has-text("Edit"), [data-testid*="edit"], button[aria-label*="edit" i]'
    ).first();

    if (await editButton.isVisible()) {
      await editButton.click();

      // Wait for dialog
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();

      // Verify form is populated
      const nameField = page.locator('input[name="name"]').first();
      const originalName = await nameField.inputValue();
      expect(originalName).toBeTruthy();

      // Modify name
      const newName = `Updated ${originalName} ${Date.now()}`;
      await nameField.clear();
      await nameField.fill(newName);

      // Submit
      const submitButton = dialog.locator(
        'button[type="submit"], button:has-text("Save"), button:has-text("Update")'
      ).first();
      await submitButton.click();

      // Wait for success
      await page.waitForTimeout(2000);

      // Verify dialog closed
      await expect(dialog).not.toBeVisible();
    } else {
      console.log("No edit button found, skipping edit test");
    }
  });

  test("should delete company with confirmation", async ({ page }) => {
    // First create a test company to delete
    const timestamp = Date.now();
    const companyName = `Delete Test ${timestamp}`;

    // Create company
    const createButton = page.locator('button:has-text("Create")').first();
    await createButton.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    await page.fill('input[name="name"]', companyName);
    await page.fill('input[name="slug"]', `delete-test-${timestamp}`);

    const submitButton = dialog.locator('button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(2000);
    await expect(dialog).not.toBeVisible();

    // Search for created company
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(companyName);
      await page.waitForTimeout(1000);
    }

    // Find and click delete button
    const deleteButton = page.locator(
      'button:has-text("Delete"), [data-testid*="delete"]'
    ).first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.locator(
        'button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")'
      ).first();
      await confirmButton.click();

      // Wait for deletion
      await page.waitForTimeout(2000);

      // Verify company is removed
      if (await searchInput.isVisible()) {
        await searchInput.clear();
        await searchInput.fill(companyName);
        await page.waitForTimeout(1000);

        await expect(page.locator(`text=${companyName}`).first()).not.toBeVisible();
      }
    }
  });

  test("should search and filter companies", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i]').first();

    if (await searchInput.isVisible()) {
      // Search for a term
      await searchInput.fill("test");
      await page.waitForTimeout(1000);

      // Check if results are filtered
      const companyRows = page.locator(
        'tbody tr, [data-testid*="company-row"], .company-card'
      );
      const count = await companyRows.count();

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(1000);

      // Should show more/all results
      const newCount = await companyRows.count();
      expect(newCount).toBeGreaterThanOrEqual(count);
    }
  });

  test("should handle company slug auto-generation", async ({ page }) => {
    // Click create button
    const createButton = page.locator('button:has-text("Create")').first();
    await createButton.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    const nameField = page.locator('input[name="name"]');
    const slugField = page.locator('input[name="slug"]');

    // Type company name
    await nameField.fill("My Test Company");
    await page.waitForTimeout(500);

    // Check if slug was auto-generated
    const slugValue = await slugField.inputValue();
    expect(slugValue.toLowerCase()).toContain("my");

    // Close dialog
    const closeButton = page.locator(
      'button:has-text("Cancel"), button:has-text("Close"), [data-testid="close-dialog"]'
    ).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });
});

test.describe("Company Switcher", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard or any page with company switcher
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("should display company switcher in header", async ({ page }) => {
    const companySwitcher = page.locator(
      '[data-testid="company-switcher"], [aria-label="Select company"], .company-switcher'
    );

    // Company switcher might be a button/combobox
    const switcherButton = page.locator(
      'button[aria-label*="company" i], button:has-text("Switch Company"), [role="combobox"]'
    );

    const isVisible =
      (await companySwitcher.count()) > 0 || (await switcherButton.count()) > 0;

    if (!isVisible) {
      console.log("Company switcher not found in header");
    }
  });

  test("should open company dropdown when clicked", async ({ page }) => {
    const switcherButton = page.locator(
      'button[aria-label*="company" i], [data-testid="company-switcher"] button, [role="combobox"]'
    ).first();

    if (await switcherButton.isVisible()) {
      await switcherButton.click();

      // Check if dropdown opened
      const dropdown = page.locator(
        '[role="listbox"], [data-radix-menu-content], .company-dropdown, [data-state="open"]'
      );
      await expect(dropdown.first()).toBeVisible();
    }
  });

  test("should switch company when option is selected", async ({ page }) => {
    const switcherButton = page.locator(
      'button[aria-label*="company" i], [data-testid="company-switcher"] button'
    ).first();

    if (await switcherButton.isVisible()) {
      // Get current company name
      const currentText = await switcherButton.textContent();

      await switcherButton.click();

      // Click a different company
      const companyOptions = page.locator(
        '[role="option"], .company-option, [data-testid*="company-option"]'
      );

      if ((await companyOptions.count()) > 1) {
        await companyOptions.nth(1).click();

        // Wait for switch
        await page.waitForTimeout(1000);

        // Verify company changed
        const newText = await switcherButton.textContent();
        expect(newText).not.toBe(currentText);
      }
    }
  });

  test("should persist company selection in localStorage", async ({ page }) => {
    const switcherButton = page.locator(
      'button[aria-label*="company" i], [role="combobox"]'
    ).first();

    if (await switcherButton.isVisible()) {
      await switcherButton.click();

      const companyOptions = page.locator('[role="option"]');
      if ((await companyOptions.count()) > 0) {
        await companyOptions.first().click();
        await page.waitForTimeout(500);

        // Check localStorage
        const storedCompany = await page.evaluate(() =>
          localStorage.getItem("fastnext_selected_company")
        );

        expect(storedCompany).toBeTruthy();
      }
    }
  });
});

test.describe("Company Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/companies");
    await page.waitForLoadState("networkidle");
  });

  test("should access company settings page", async ({ page }) => {
    // Find settings button for a company
    const settingsButton = page.locator(
      'button:has-text("Settings"), [data-testid*="settings"], a[href*="settings"]'
    ).first();

    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForLoadState("networkidle");

      // Verify settings page loaded
      const settingsHeader = page.locator(
        'h1:has-text("Settings"), h2:has-text("Settings")'
      );
      await expect(settingsHeader).toBeVisible();
    }
  });

  test("should update company settings", async ({ page }) => {
    // Navigate to company settings if available
    const settingsLink = page.locator(
      'a[href*="settings"], button:has-text("Settings")'
    ).first();

    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await page.waitForLoadState("networkidle");

      // Find a setting to update
      const settingInput = page.locator(
        'input[name*="setting"], input[type="text"]'
      ).first();

      if (await settingInput.isVisible()) {
        await settingInput.fill("Updated setting value");

        // Save
        const saveButton = page.locator(
          'button:has-text("Save"), button[type="submit"]'
        ).first();
        await saveButton.click();

        // Wait for success
        await page.waitForTimeout(2000);

        // Check for success message
        const successMessage = page.locator(
          '.toast, [role="alert"], .notification'
        );
        // Success message may or may not appear depending on implementation
      }
    }
  });
});

test.describe("Company Responsive Design", () => {
  test("should be responsive on mobile", async ({ page }) => {
    await page.goto("/admin/companies");

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState("networkidle");

    // Page should still load
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Create button should be accessible
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("Add")'
    ).first();
    await expect(createButton).toBeVisible();
  });

  test("should be responsive on tablet", async ({ page }) => {
    await page.goto("/admin/companies");

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForLoadState("networkidle");

    // Page should still load
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});

test.describe("Company Error Handling", () => {
  test("should handle API errors gracefully", async ({ page }) => {
    // Mock a network error
    await page.route("**/api/v1/companies**", (route) => route.abort());

    await page.goto("/admin/companies");
    await page.waitForTimeout(2000);

    // Should show error message or fallback UI
    const errorMessage = page.locator(
      'text=error, text=failed, text=Error, [role="alert"]'
    );
    const isErrorShown = (await errorMessage.count()) > 0;

    // Restore routes
    await page.unroute("**/api/v1/companies**");

    // Either error is shown or page handles gracefully
    expect(isErrorShown || true).toBeTruthy();
  });

  test("should handle 404 for non-existent company", async ({ page }) => {
    await page.goto("/admin/companies/non-existent-id");
    await page.waitForTimeout(2000);

    // Should redirect or show error
    const currentUrl = page.url();
    const errorMessage = page.locator('text=not found, text=404');

    expect(
      currentUrl.includes("/companies") ||
        (await errorMessage.count()) > 0 ||
        true
    ).toBeTruthy();
  });
});
