import { Page, Locator, expect } from '@playwright/test';

/**
 * Utility functions for Playwright E2E tests.
 * 
 * Provides common helper functions for authentication, navigation,
 * form interactions, and assertions.
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Login with credentials
   */
  async login(email: string, password: string) {
    await this.page.goto('/login');
    
    await this.page.fill('input[type="email"], input[name="username"], input[name="email"]', email);
    await this.page.fill('input[type="password"], input[name="password"]', password);
    
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")');
    await submitButton.click();
    
    // Wait for redirect
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  /**
   * Logout user
   */
  async logout() {
    const logoutButton = this.page.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
    );
    
    if (await logoutButton.count() > 0) {
      await logoutButton.click();
      await this.page.waitForURL('**/login');
    }
  }

  /**
   * Fill form with data
   */
  async fillForm(formData: Record<string, string>) {
    for (const [fieldName, value] of Object.entries(formData)) {
      const field = this.page.locator(`input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`);
      
      if (await field.count() > 0) {
        const tagName = await field.evaluate(el => el.tagName.toLowerCase());
        
        if (tagName === 'select') {
          await field.selectOption(value);
        } else {
          await field.fill(value);
        }
      }
    }
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout = 5000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    return element;
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    return await this.page.locator(selector).count() > 0;
  }

  /**
   * Click element with retry
   */
  async clickWithRetry(selector: string, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.page.locator(selector).click({ timeout: 5000 });
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Upload file
   */
  async uploadFile(inputSelector: string, filePath: string) {
    const fileInput = this.page.locator(inputSelector);
    await fileInput.setInputFiles(filePath);
  }

  /**
   * Take screenshot with timestamp
   */
  async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Verify table data
   */
  async verifyTableData(tableSelector: string, expectedData: string[][]) {
    const table = this.page.locator(tableSelector);
    await expect(table).toBeVisible();
    
    const rows = table.locator('tbody tr, .table-row');
    const rowCount = await rows.count();
    
    expect(rowCount).toBe(expectedData.length);
    
    for (let i = 0; i < expectedData.length; i++) {
      const row = rows.nth(i);
      const cells = row.locator('td, .table-cell');
      
      for (let j = 0; j < expectedData[i].length; j++) {
        await expect(cells.nth(j)).toContainText(expectedData[i][j]);
      }
    }
  }

  /**
   * Wait for API call to complete
   */
  async waitForApiCall(urlPattern: string, method = 'GET') {
    return await this.page.waitForResponse(response => 
      response.url().includes(urlPattern) && response.request().method() === method
    );
  }

  /**
   * Mock API response
   */
  async mockApiResponse(urlPattern: string, responseData: any, status = 200) {
    await this.page.route(urlPattern, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(responseData)
      });
    });
  }

  /**
   * Check accessibility violations
   */
  async checkAccessibility() {
    // This is a basic check - you might want to integrate with axe-core
    const headings = this.page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    
    if (headingCount > 0) {
      // Check that h1 exists
      const h1 = this.page.locator('h1');
      expect(await h1.count()).toBeGreaterThan(0);
    }
    
    // Check for alt text on images
    const images = this.page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  }

  /**
   * Test responsive design
   */
  async testResponsiveDesign(element: Locator) {
    // Test mobile
    await this.page.setViewportSize({ width: 375, height: 667 });
    await expect(element).toBeVisible();
    
    // Test tablet
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await expect(element).toBeVisible();
    
    // Test desktop
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await expect(element).toBeVisible();
  }

  /**
   * Navigate using sidebar menu
   */
  async navigateUsingSidebar(menuItemText: string) {
    const sidebarMenu = this.page.locator('[data-testid="sidebar"], .sidebar, nav');
    const menuItem = sidebarMenu.locator(`a:has-text("${menuItemText}"), button:has-text("${menuItemText}")`);
    
    if (await menuItem.count() > 0) {
      await menuItem.click();
      await this.page.waitForLoadState('networkidle');
    } else {
      throw new Error(`Menu item "${menuItemText}" not found in sidebar`);
    }
  }

  /**
   * Verify notification/toast message
   */
  async verifyNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
    const notification = this.page.locator(
      `[data-testid="notification"], .toast, .alert, .notification, [role="alert"]`
    );
    
    await expect(notification).toBeVisible();
    await expect(notification).toContainText(message);
    
    // Check notification type if possible
    if (type) {
      const hasTypeClass = await notification.evaluate((el, t) => 
        el.classList.contains(t) || 
        el.classList.contains(`alert-${t}`) || 
        el.classList.contains(`toast-${t}`) ||
        el.classList.contains(`notification-${t}`), type
      );
      
      if (!hasTypeClass) {
        console.warn(`Notification type "${type}" class not found`);
      }
    }
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete() {
    // Wait for common loading indicators to disappear
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading',
      '.spinner',
      '[data-loading="true"]',
      '.skeleton'
    ];
    
    for (const selector of loadingSelectors) {
      const loader = this.page.locator(selector);
      if (await loader.count() > 0) {
        await loader.waitFor({ state: 'hidden', timeout: 10000 });
      }
    }
    
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Generate unique test data
   */
  generateTestData(prefix = 'test') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    
    return {
      email: `${prefix}.${timestamp}.${random}@example.com`,
      username: `${prefix}_${timestamp}_${random}`,
      name: `Test ${prefix} ${timestamp}`,
      timestamp,
      random
    };
  }
}

export default TestHelpers;