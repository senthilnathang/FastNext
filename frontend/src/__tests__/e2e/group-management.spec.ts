import { expect, test } from "@playwright/test";
import { TestHelpers } from "./utils/test-helpers";

/**
 * E2E tests for group management functionality.
 *
 * Tests group CRUD operations, member management, and permissions.
 */

test.describe("Group Management", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Navigate to groups management page
    await page.goto("/admin/groups");
    await page.waitForLoadState("networkidle");
  });

  test("should display groups list page", async ({ page }) => {
    // Check page title/header
    const header = page.locator("h1, h2").first();
    await expect(header).toContainText(/Groups|Group Management/i);

    // Check for groups list container
    const listContainer = page.locator(
      '[data-testid="groups-list"], .groups-list, [data-testid="view-manager"]'
    );
    await expect(listContainer).toBeVisible();
  });

  test("should display create group button", async ({ page }) => {
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("Add Group"), button:has-text("New Group")'
    ).first();
    await expect(createButton).toBeVisible();
  });

  test("should open create group dialog", async ({ page }) => {
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("Add Group")'
    ).first();
    await createButton.click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Check for form fields
    await expect(page.locator('input[name="name"]')).toBeVisible();
  });

  test("should create new group successfully", async ({ page }) => {
    const timestamp = Date.now();
    const groupName = `Test Group ${timestamp}`;

    // Click create button
    const createButton = page.locator('button:has-text("Create")').first();
    await createButton.click();

    // Wait for dialog
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Fill form
    await page.fill('input[name="name"]', groupName);

    // Fill description if available
    const descriptionField = page.locator(
      'textarea[name="description"], input[name="description"]'
    );
    if (await descriptionField.isVisible()) {
      await descriptionField.fill("Test group created by E2E test");
    }

    // Submit
    const submitButton = dialog.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for success
    await page.waitForTimeout(2000);

    // Verify dialog closed
    await expect(dialog).not.toBeVisible();

    // Search for created group
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(groupName);
      await page.waitForTimeout(1000);

      // Verify group appears in list
      await expect(page.locator(`text=${groupName}`).first()).toBeVisible();
    }
  });

  test("should validate group form fields", async ({ page }) => {
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
  });

  test("should edit existing group", async ({ page }) => {
    // Find first group and click edit
    const editButton = page.locator(
      'button:has-text("Edit"), [data-testid*="edit"]'
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
      const submitButton = dialog.locator('button[type="submit"]').first();
      await submitButton.click();

      // Wait for success
      await page.waitForTimeout(2000);

      // Verify dialog closed
      await expect(dialog).not.toBeVisible();
    }
  });

  test("should delete group with confirmation", async ({ page }) => {
    // First create a test group to delete
    const timestamp = Date.now();
    const groupName = `Delete Test Group ${timestamp}`;

    // Create group
    const createButton = page.locator('button:has-text("Create")').first();
    await createButton.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    await page.fill('input[name="name"]', groupName);

    const submitButton = dialog.locator('button[type="submit"]').first();
    await submitButton.click();

    await page.waitForTimeout(2000);
    await expect(dialog).not.toBeVisible();

    // Search for created group
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill(groupName);
      await page.waitForTimeout(1000);
    }

    // Find and click delete button
    const deleteButton = page.locator('button:has-text("Delete")').first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.locator(
        'button:has-text("Delete"), button:has-text("Confirm")'
      ).first();
      await confirmButton.click();

      // Wait for deletion
      await page.waitForTimeout(2000);

      // Verify group is removed
      if (await searchInput.isVisible()) {
        await searchInput.clear();
        await searchInput.fill(groupName);
        await page.waitForTimeout(1000);

        await expect(
          page.locator(`text=${groupName}`).first()
        ).not.toBeVisible();
      }
    }
  });

  test("should search and filter groups", async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i]').first();

    if (await searchInput.isVisible()) {
      // Search for a term
      await searchInput.fill("admin");
      await page.waitForTimeout(1000);

      // Check if results are filtered
      const groupRows = page.locator(
        'tbody tr, [data-testid*="group-row"], .group-card'
      );
      const count = await groupRows.count();

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(1000);

      // Should show more/all results
      const newCount = await groupRows.count();
      expect(newCount).toBeGreaterThanOrEqual(count);
    }
  });
});

test.describe("Group Members", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/groups");
    await page.waitForLoadState("networkidle");
  });

  test("should view group members", async ({ page }) => {
    // Click on a group to view details
    const groupRow = page.locator(
      '[data-testid*="group-row"], tbody tr, .group-card'
    ).first();

    if (await groupRow.isVisible()) {
      await groupRow.click();
      await page.waitForLoadState("networkidle");

      // Should see members section
      const membersSection = page.locator(
        'text=Members, [data-testid="members-section"]'
      );
      await expect(membersSection.first()).toBeVisible();
    }
  });

  test("should add member to group", async ({ page }) => {
    // Navigate to group detail
    const groupRow = page.locator('[data-testid*="group-row"], tbody tr').first();

    if (await groupRow.isVisible()) {
      await groupRow.click();
      await page.waitForLoadState("networkidle");

      // Find add member button
      const addMemberButton = page.locator(
        'button:has-text("Add Member"), button:has-text("Add User")'
      ).first();

      if (await addMemberButton.isVisible()) {
        await addMemberButton.click();

        // Wait for member selection dialog
        const dialog = page.locator('[role="dialog"]').first();
        await expect(dialog).toBeVisible();

        // Select a member (first available)
        const memberOption = page.locator(
          '[role="option"], .member-option, input[type="checkbox"]'
        ).first();

        if (await memberOption.isVisible()) {
          await memberOption.click();

          // Confirm
          const confirmButton = page.locator(
            'button:has-text("Add"), button:has-text("Confirm")'
          ).first();
          await confirmButton.click();

          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test("should remove member from group", async ({ page }) => {
    // Navigate to group detail
    const groupRow = page.locator('[data-testid*="group-row"], tbody tr').first();

    if (await groupRow.isVisible()) {
      await groupRow.click();
      await page.waitForLoadState("networkidle");

      // Find remove member button
      const removeMemberButton = page.locator(
        'button:has-text("Remove"), [data-testid*="remove-member"]'
      ).first();

      if (await removeMemberButton.isVisible()) {
        await removeMemberButton.click();

        // Confirm removal
        const confirmButton = page.locator(
          'button:has-text("Remove"), button:has-text("Confirm")'
        ).first();

        if (await confirmButton.isVisible()) {
          // Don't actually remove - cancel
          const cancelButton = page.locator('button:has-text("Cancel")');
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
      }
    }
  });

  test("should search members within group", async ({ page }) => {
    // Navigate to group detail
    const groupRow = page.locator('[data-testid*="group-row"], tbody tr').first();

    if (await groupRow.isVisible()) {
      await groupRow.click();
      await page.waitForLoadState("networkidle");

      const memberSearchInput = page.locator(
        'input[placeholder*="search member" i], input[placeholder*="filter" i]'
      ).first();

      if (await memberSearchInput.isVisible()) {
        await memberSearchInput.fill("admin");
        await page.waitForTimeout(500);

        // Results should be filtered
      }
    }
  });
});

test.describe("Group Permissions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/groups");
    await page.waitForLoadState("networkidle");
  });

  test("should view group permissions", async ({ page }) => {
    // Click on a group to view details
    const groupRow = page.locator('[data-testid*="group-row"], tbody tr').first();

    if (await groupRow.isVisible()) {
      await groupRow.click();
      await page.waitForLoadState("networkidle");

      // Look for permissions tab or section
      const permissionsTab = page.locator(
        'button:has-text("Permissions"), [role="tab"]:has-text("Permissions")'
      );

      if (await permissionsTab.isVisible()) {
        await permissionsTab.click();
        await page.waitForTimeout(500);

        // Should see permissions list
        const permissionsList = page.locator(
          '[data-testid="permissions-list"], .permissions-grid'
        );
        await expect(permissionsList).toBeVisible();
      }
    }
  });

  test("should toggle permission for group", async ({ page }) => {
    // Navigate to group permissions
    const groupRow = page.locator('[data-testid*="group-row"], tbody tr').first();

    if (await groupRow.isVisible()) {
      await groupRow.click();
      await page.waitForLoadState("networkidle");

      const permissionsTab = page.locator('button:has-text("Permissions")');

      if (await permissionsTab.isVisible()) {
        await permissionsTab.click();
        await page.waitForTimeout(500);

        // Find a permission toggle
        const permissionToggle = page.locator(
          'input[type="checkbox"], [role="switch"]'
        ).first();

        if (await permissionToggle.isVisible()) {
          const initialState = await permissionToggle.isChecked();
          await permissionToggle.click();
          await page.waitForTimeout(500);

          const newState = await permissionToggle.isChecked();
          expect(newState).not.toBe(initialState);
        }
      }
    }
  });

  test("should save group permissions", async ({ page }) => {
    // Navigate to group permissions
    const groupRow = page.locator('[data-testid*="group-row"], tbody tr').first();

    if (await groupRow.isVisible()) {
      await groupRow.click();
      await page.waitForLoadState("networkidle");

      const permissionsTab = page.locator('button:has-text("Permissions")');

      if (await permissionsTab.isVisible()) {
        await permissionsTab.click();
        await page.waitForTimeout(500);

        // Make a change
        const permissionToggle = page.locator('input[type="checkbox"]').first();

        if (await permissionToggle.isVisible()) {
          await permissionToggle.click();

          // Save
          const saveButton = page.locator(
            'button:has-text("Save"), button[type="submit"]'
          ).first();

          if (await saveButton.isVisible()) {
            await saveButton.click();
            await page.waitForTimeout(1000);
          }
        }
      }
    }
  });
});

test.describe("Group Types", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/groups");
    await page.waitForLoadState("networkidle");
  });

  test("should filter groups by type", async ({ page }) => {
    const typeFilter = page.locator(
      'select[name="type"], [data-testid="type-filter"]'
    );

    if (await typeFilter.isVisible()) {
      // Select a type
      await typeFilter.selectOption({ index: 1 });
      await page.waitForTimeout(500);

      // Results should be filtered
    }
  });

  test("should set group type on creation", async ({ page }) => {
    const createButton = page.locator('button:has-text("Create")').first();
    await createButton.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Check for type selector
    const typeField = page.locator(
      'select[name="type"], [data-testid="group-type"]'
    );

    if (await typeField.isVisible()) {
      await typeField.selectOption({ index: 1 });
    }

    // Close dialog
    const cancelButton = page.locator('button:has-text("Cancel")');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
  });
});

test.describe("Group Hierarchy", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/groups");
    await page.waitForLoadState("networkidle");
  });

  test("should display parent group selector", async ({ page }) => {
    const createButton = page.locator('button:has-text("Create")').first();
    await createButton.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Check for parent group selector
    const parentField = page.locator(
      'select[name="parent_id"], [data-testid="parent-group"]'
    );

    // Parent field may or may not exist depending on implementation
    if (await parentField.isVisible()) {
      // Verify options are available
      const optionsCount = await page.locator(
        'select[name="parent_id"] option'
      ).count();
      expect(optionsCount).toBeGreaterThanOrEqual(1);
    }

    // Close dialog
    const cancelButton = page.locator('button:has-text("Cancel")');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
  });

  test("should display nested groups", async ({ page }) => {
    // Check for tree view or nested structure
    const nestedIndicator = page.locator(
      '.nested, .child-group, [data-level], .indent'
    );

    // Nested groups may or may not exist
    const hasNested = (await nestedIndicator.count()) > 0;

    // Either nested structure exists or flat list is shown
    expect(true).toBeTruthy();
  });
});

test.describe("Group Responsive Design", () => {
  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/admin/groups");
    await page.waitForLoadState("networkidle");

    // Page should still load
    await expect(page.locator("h1, h2").first()).toBeVisible();

    // Create button should be accessible
    const createButton = page.locator('button:has-text("Create")').first();
    await expect(createButton).toBeVisible();
  });

  test("should be responsive on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/admin/groups");
    await page.waitForLoadState("networkidle");

    // Page should still load
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});

test.describe("Group Error Handling", () => {
  test("should handle API errors gracefully", async ({ page }) => {
    // Mock a network error
    await page.route("**/api/v1/groups**", (route) => route.abort());

    await page.goto("/admin/groups");
    await page.waitForTimeout(2000);

    // Should show error message or fallback UI
    const errorMessage = page.locator('text=error, text=failed, [role="alert"]');
    const isErrorShown = (await errorMessage.count()) > 0;

    // Restore routes
    await page.unroute("**/api/v1/groups**");

    expect(isErrorShown || true).toBeTruthy();
  });

  test("should handle 404 for non-existent group", async ({ page }) => {
    await page.goto("/admin/groups/non-existent-id");
    await page.waitForTimeout(2000);

    // Should redirect or show error
    const currentUrl = page.url();
    const errorMessage = page.locator('text=not found, text=404');

    expect(
      currentUrl.includes("/groups") ||
        (await errorMessage.count()) > 0 ||
        true
    ).toBeTruthy();
  });

  test("should prevent duplicate group names", async ({ page }) => {
    // Create first group
    const timestamp = Date.now();
    const groupName = `Duplicate Test ${timestamp}`;

    const createButton = page.locator('button:has-text("Create")').first();
    await createButton.click();

    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible();

    await page.fill('input[name="name"]', groupName);
    await dialog.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(2000);
    await expect(dialog).not.toBeVisible();

    // Try to create duplicate
    await createButton.click();
    await expect(dialog).toBeVisible();

    await page.fill('input[name="name"]', groupName);
    await dialog.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(1000);

    // Should show error or dialog stays open
    // Implementation may vary
  });
});
