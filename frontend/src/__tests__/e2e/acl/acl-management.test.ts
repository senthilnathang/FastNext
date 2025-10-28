import { expect, test } from "@playwright/test";

/**
 * E2E tests for ACL (Access Control List) management functionality.
 *
 * Tests ACL creation, editing, deletion, and permission checking.
 */

test.describe("ACL Management", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to ACL management page
    await page.goto("/admin/acls");
  });

  test("should display ACL management page", async ({ page }) => {
    // Check page title
    await expect(
      page.locator('h1, h2, [data-testid="page-title"]'),
    ).toContainText(/acl|permission|access/i);

    // Check for ACL table or list
    const aclTable = page.locator('table, [data-testid="acl-table"]');
    const aclList = page.locator('[data-testid="acl-list"], .acl-item');

    // At least one should be visible
    const hasTable = (await aclTable.count()) > 0;
    const hasList = (await aclList.count()) > 0;

    expect(hasTable || hasList).toBeTruthy();
  });

  test("should create new ACL", async ({ page }) => {
    // Click create ACL button
    const createButton = page.locator(
      'button:has-text("Create"), button:has-text("Add"), [data-testid="create-acl-btn"]'
    );
    await createButton.click();

    // Fill ACL form
    await page.fill('[name="name"], [data-testid="acl-name"]', "Test ACL");
    await page.fill(
      '[name="description"], [data-testid="acl-description"]',
      "Test ACL for automated testing"
    );

    // Select entity type
    await page.selectOption(
      '[name="entity_type"], [data-testid="entity-type-select"]',
      "orders"
    );

    // Select operation
    await page.selectOption(
      '[name="operation"], [data-testid="operation-select"]',
      "read"
    );

    // Add allowed roles
    await page.fill(
      '[name="allowed_roles"], [data-testid="allowed-roles"]',
      "admin,manager"
    );

    // Submit form
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Save"), [data-testid="submit-acl"]'
    );
    await submitButton.click();

    // Verify ACL was created
    await expect(page.locator('text="Test ACL"')).toBeVisible();
  });

  test("should edit existing ACL", async ({ page }) => {
    // Find an existing ACL to edit
    const aclRow = page.locator('tr, [data-testid="acl-item"]').first();
    await expect(aclRow).toBeVisible();

    // Click edit button
    const editButton = aclRow.locator(
      'button:has-text("Edit"), [data-testid="edit-acl"]'
    );
    await editButton.click();

    // Modify description
    await page.fill(
      '[name="description"], [data-testid="acl-description"]',
      "Updated description for testing"
    );

    // Submit changes
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Save"), [data-testid="submit-acl"]'
    );
    await submitButton.click();

    // Verify changes were saved
    await expect(page.locator('text="Updated description for testing"')).toBeVisible();
  });

  test("should delete ACL", async ({ page }) => {
    // Find an ACL to delete
    const aclRow = page.locator('tr, [data-testid="acl-item"]').first();
    await expect(aclRow).toBeVisible();

    // Click delete button
    const deleteButton = aclRow.locator(
      'button:has-text("Delete"), [data-testid="delete-acl"]'
    );
    await deleteButton.click();

    // Confirm deletion
    const confirmButton = page.locator(
      'button:has-text("Confirm"), button:has-text("Delete"), [data-testid="confirm-delete"]'
    );
    await confirmButton.click();

    // Verify ACL was deleted (should not be visible)
    await expect(aclRow).not.toBeVisible();
  });

  test("should test permission checking", async ({ page }) => {
    // Navigate to permission check section
    const checkTab = page.locator(
      'button:has-text("Check"), [data-testid="permission-check-tab"]'
    );

    if ((await checkTab.count()) > 0) {
      await checkTab.click();

      // Fill permission check form
      await page.selectOption(
        '[name="entity_type"], [data-testid="check-entity-type"]',
        "orders"
      );
      await page.fill(
        '[name="entity_id"], [data-testid="check-entity-id"]',
        "test_order_123"
      );
      await page.selectOption(
        '[name="operation"], [data-testid="check-operation"]',
        "read"
      );

      // Submit check
      const checkButton = page.locator(
        'button:has-text("Check"), [data-testid="check-permission-btn"]'
      );
      await checkButton.click();

      // Verify result is shown
      const result = page.locator(
        '[data-testid="permission-result"], .permission-result'
      );
      await expect(result).toBeVisible();
    }
  });

  test("should manage record permissions", async ({ page }) => {
    // Navigate to record permissions section
    const recordTab = page.locator(
      'button:has-text("Records"), [data-testid="record-permissions-tab"]'
    );

    if ((await recordTab.count()) > 0) {
      await recordTab.click();

      // Click add record permission
      const addButton = page.locator(
        'button:has-text("Add"), [data-testid="add-record-permission"]'
      );
      await addButton.click();

      // Fill record permission form
      await page.selectOption(
        '[name="entity_type"], [data-testid="record-entity-type"]',
        "orders"
      );
      await page.fill(
        '[name="entity_id"], [data-testid="record-entity-id"]',
        "test_order_456"
      );
      await page.selectOption(
        '[name="operation"], [data-testid="record-operation"]',
        "write"
      );

      // Submit
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Save"), [data-testid="submit-record-permission"]'
      );
      await submitButton.click();

      // Verify permission was added
      await expect(page.locator('text="test_order_456"')).toBeVisible();
    }
  });
});</content>
</xai:function_call/>
<xai:function_call name="write">
<parameter name="filePath">frontend/src/__tests__/unit/acl/ACLService.test.ts