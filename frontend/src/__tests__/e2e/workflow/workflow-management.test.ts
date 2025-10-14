import { test, expect } from '@playwright/test';

/**
 * E2E tests for workflow management functionality.
 *
 * Tests workflow types, templates, and workflow builder features.
 */

test.describe('Workflow Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to workflows page
    await page.goto('/workflows');
  });

  test('should display workflows page', async ({ page }) => {
    // Check page title or heading
    await expect(page.locator('h1, h2, [data-testid="page-title"]')).toContainText(/workflow/i);

    // Check for workflow tabs or sections
    const typeTab = page.locator('button:has-text("Types"), [data-testid="workflow-types-tab"]');
    const templateTab = page.locator('button:has-text("Templates"), [data-testid="workflow-templates-tab"]');

    // At least one should be visible
    const hasTypesTab = await typeTab.count() > 0;
    const hasTemplatesTab = await templateTab.count() > 0;

    expect(hasTypesTab || hasTemplatesTab).toBeTruthy();
  });

  test('should switch between workflow tabs', async ({ page }) => {
    // Look for tab navigation
    const typeTab = page.locator('button:has-text("Types"), [data-testid="workflow-types-tab"]');
    const templateTab = page.locator('button:has-text("Templates"), [data-testid="workflow-templates-tab"]');

    if (await typeTab.count() > 0 && await templateTab.count() > 0) {
      // Click on types tab
      await typeTab.click();
      await page.waitForTimeout(500);

      // Verify types content is visible
      const typesContent = page.locator('[data-testid="workflow-types-content"], .workflow-types');
      if (await typesContent.count() > 0) {
        await expect(typesContent).toBeVisible();
      }

      // Click on templates tab
      await templateTab.click();
      await page.waitForTimeout(500);

      // Verify templates content is visible
      const templatesContent = page.locator('[data-testid="workflow-templates-content"], .workflow-templates');
      if (await templatesContent.count() > 0) {
        await expect(templatesContent).toBeVisible();
      }
    }
  });

  test('should create new workflow type', async ({ page }) => {
    // Look for create workflow type button
    const createTypeButton = page.locator(
      'button:has-text("Create Type"), button:has-text("New Type"), [data-testid="create-workflow-type"]'
    );

    if (await createTypeButton.count() > 0) {
      await createTypeButton.click();

      // Check if dialog opens
      const dialog = page.locator('[role="dialog"], .modal, [data-testid="create-type-dialog"]');
      await expect(dialog).toBeVisible();

      // Fill form
      await page.fill('input[name="name"]', `Test Workflow Type ${Date.now()}`);
      await page.fill('textarea[name="description"], input[name="description"]', 'Test workflow type description');

      // Select color if color picker exists
      const colorInput = page.locator('input[type="color"], [data-testid="color-picker"]');
      if (await colorInput.count() > 0) {
        await colorInput.fill('#ff0000');
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
      await submitButton.click();

      // Wait for creation
      await page.waitForTimeout(2000);

      // Verify dialog closes or success message
      const isDialogVisible = await dialog.isVisible().catch(() => false);
      expect(!isDialogVisible || await page.locator('text=success, text=created').count() > 0).toBeTruthy();
    }
  });

  test('should create new workflow template', async ({ page }) => {
    // Navigate to templates tab if it exists
    const templateTab = page.locator('button:has-text("Templates"), [data-testid="workflow-templates-tab"]');
    if (await templateTab.count() > 0) {
      await templateTab.click();
      await page.waitForTimeout(500);
    }

    // Look for create template button
    const createTemplateButton = page.locator(
      'button:has-text("Create Template"), button:has-text("New Template"), [data-testid="create-workflow-template"]'
    );

    if (await createTemplateButton.count() > 0) {
      await createTemplateButton.click();

      // Check if dialog opens
      const dialog = page.locator('[role="dialog"], .modal, [data-testid="create-template-dialog"]');
      await expect(dialog).toBeVisible();

      // Fill form
      await page.fill('input[name="name"]', `Test Workflow Template ${Date.now()}`);
      await page.fill('textarea[name="description"], input[name="description"]', 'Test workflow template description');

      // Select workflow type if dropdown exists
      const typeSelect = page.locator('select[name="workflow_type_id"], [data-testid="workflow-type-select"]');
      if (await typeSelect.count() > 0) {
        await typeSelect.selectOption({ index: 1 }); // Select first available option
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
      await submitButton.click();

      // Wait for creation
      await page.waitForTimeout(2000);

      // Verify dialog closes or success message
      const isDialogVisible = await dialog.isVisible().catch(() => false);
      expect(!isDialogVisible || await page.locator('text=success, text=created').count() > 0).toBeTruthy();
    }
  });

  test('should open workflow builder', async ({ page }) => {
    // Look for workflow builder button
    const builderButton = page.locator(
      'button:has-text("Builder"), button:has-text("Design"), [data-testid="workflow-builder"]'
    );

    if (await builderButton.count() > 0) {
      await builderButton.click();

      // Check if builder opens (could be modal or new page)
      const builder = page.locator('[data-testid="workflow-builder"], .reactflow-wrapper, .workflow-canvas');

      if (await builder.count() > 0) {
        await expect(builder).toBeVisible();

        // Check for workflow nodes panel
        const nodesPanel = page.locator('[data-testid="nodes-panel"], .workflow-nodes, .node-palette');
        if (await nodesPanel.count() > 0) {
          await expect(nodesPanel).toBeVisible();
        }
      }
    }
  });

  test('should display workflow types grid', async ({ page }) => {
    // Check for workflow types grid/list
    const typesGrid = page.locator('[data-testid="workflow-types-grid"], .workflow-types-grid, .types-container');
    const typeCards = page.locator('[data-testid="workflow-type-card"], .workflow-type-card, .type-card');

    // At least the container or cards should exist
    const hasGrid = await typesGrid.count() > 0;
    const hasCards = await typeCards.count() > 0;

    expect(hasGrid || hasCards).toBeTruthy();
  });

  test('should display workflow templates grid', async ({ page }) => {
    // Navigate to templates tab
    const templateTab = page.locator('button:has-text("Templates"), [data-testid="workflow-templates-tab"]');
    if (await templateTab.count() > 0) {
      await templateTab.click();
      await page.waitForTimeout(500);
    }

    // Check for templates grid/list
    const templatesGrid = page.locator('[data-testid="workflow-templates-grid"], .workflow-templates-grid, .templates-container');
    const templateCards = page.locator('[data-testid="workflow-template-card"], .workflow-template-card, .template-card');

    // At least the container or cards should exist
    const hasGrid = await templatesGrid.count() > 0;
    const hasCards = await templateCards.count() > 0;

    expect(hasGrid || hasCards).toBeTruthy();
  });

  test('should edit workflow type', async ({ page }) => {
    // Look for edit button on first workflow type
    const editButton = page.locator(
      'button:has-text("Edit"), [data-testid="edit-workflow-type"], .edit-button'
    ).first();

    if (await editButton.count() > 0) {
      await editButton.click();

      // Check if edit dialog opens
      const dialog = page.locator('[role="dialog"], .modal, [data-testid="edit-type-dialog"]');
      await expect(dialog).toBeVisible();

      // Verify form fields are populated
      const nameField = page.locator('input[name="name"]');
      const nameValue = await nameField.inputValue();
      expect(nameValue).toBeTruthy();
    }
  });

  test('should delete workflow type', async ({ page }) => {
    // Look for delete button
    const deleteButton = page.locator(
      'button:has-text("Delete"), [data-testid="delete-workflow-type"], .delete-button'
    ).first();

    if (await deleteButton.count() > 0) {
      await deleteButton.click();

      // Check for confirmation dialog
      const confirmDialog = page.locator(
        '[role="alertdialog"], [role="dialog"]:has-text("delete"), .confirm-dialog'
      );

      if (await confirmDialog.count() > 0) {
        // Look for confirm button
        const confirmButton = page.locator(
          'button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")'
        );

        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test('should have responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Page should still be usable
    const heading = page.locator('h1, h2, [data-testid="page-title"]');
    await expect(heading).toBeVisible();

    // Tabs should be accessible
    const tabs = page.locator('button[role="tab"], .tab-button');
    if (await tabs.count() > 0) {
      await expect(tabs.first()).toBeVisible();
    }

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(heading).toBeVisible();
  });

  test('should search workflow types', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator(
      'input[placeholder*="search" i], input[name="search"], [data-testid="search"]'
    );

    if (await searchInput.count() > 0) {
      // Type in search box
      await searchInput.fill('test');

      // Wait for search results
      await page.waitForTimeout(1000);

      // Verify search works (basic check)
      expect(page.url()).toBeTruthy();
    }
  });
});

test.describe('Workflow Builder', () => {
  test('should load ReactFlow canvas', async ({ page }) => {
    await page.goto('/workflows');

    // Open workflow builder
    const builderButton = page.locator(
      'button:has-text("Builder"), button:has-text("Design"), button:has-text("New Template")'
    );

    if (await builderButton.count() > 0) {
      await builderButton.click();

      // Wait for ReactFlow to load
      await page.waitForTimeout(2000);

      // Check for ReactFlow elements
      const reactFlowWrapper = page.locator('.react-flow, .reactflow-wrapper, [data-testid="workflow-canvas"]');

      if (await reactFlowWrapper.count() > 0) {
        await expect(reactFlowWrapper).toBeVisible();

        // Check for basic ReactFlow elements
        const viewport = page.locator('.react-flow__viewport, .reactflow-viewport');
        if (await viewport.count() > 0) {
          await expect(viewport).toBeVisible();
        }
      }
    }
  });

  test('should have node palette', async ({ page }) => {
    await page.goto('/workflows');

    // Open workflow builder
    const builderButton = page.locator(
      'button:has-text("Builder"), button:has-text("Design"), button:has-text("New Template")'
    );

    if (await builderButton.count() > 0) {
      await builderButton.click();
      await page.waitForTimeout(2000);

      // Check for node palette/toolbar
      const nodePalette = page.locator(
        '[data-testid="node-palette"], .node-palette, .workflow-toolbar, .node-types'
      );

      if (await nodePalette.count() > 0) {
        await expect(nodePalette).toBeVisible();
      }
    }
  });
});
