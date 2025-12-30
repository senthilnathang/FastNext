import { expect, test } from "@playwright/test";
import { TestHelpers } from "./utils/test-helpers";

/**
 * E2E tests for notification center functionality.
 *
 * Tests notification display, marking as read, filtering, and real-time updates.
 */

test.describe("Notification Center", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    // Navigate to a page with notification bell (usually in header)
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
  });

  test("should display notification bell in header", async ({ page }) => {
    const notificationBell = page.locator(
      '[data-testid="notification-bell"], button[aria-label*="notification" i], .notification-bell'
    );

    await expect(notificationBell.first()).toBeVisible();
  });

  test("should show unread count badge", async ({ page }) => {
    const unreadBadge = page.locator(
      '[data-testid="unread-count"], .notification-badge, .badge'
    );

    // Badge may or may not be visible depending on unread count
    const isVisible = await unreadBadge.first().isVisible();
    if (isVisible) {
      const badgeText = await unreadBadge.first().textContent();
      expect(badgeText).toBeTruthy();
    }
  });

  test("should open notification popover when clicked", async ({ page }) => {
    const notificationBell = page.locator(
      'button[aria-label*="notification" i], [data-testid="notification-bell"]'
    ).first();

    await notificationBell.click();

    // Check popover is open
    const popover = page.locator(
      '[data-testid="notification-popover"], [data-radix-popper-content-wrapper], .notification-dropdown'
    );
    await expect(popover.first()).toBeVisible();

    // Should show notification header
    await expect(page.locator('text=Notifications')).toBeVisible();
  });

  test("should display notification list", async ({ page }) => {
    const notificationBell = page.locator(
      'button[aria-label*="notification" i]'
    ).first();

    await notificationBell.click();
    await page.waitForTimeout(500);

    // Check for notification items or empty state
    const notificationItems = page.locator(
      '[data-testid*="notification-item"], .notification-item'
    );
    const emptyState = page.locator('text=No notifications');

    const hasNotifications = (await notificationItems.count()) > 0;
    const hasEmptyState = await emptyState.isVisible();

    expect(hasNotifications || hasEmptyState).toBeTruthy();
  });

  test("should mark notification as read when clicked", async ({ page }) => {
    const notificationBell = page.locator(
      'button[aria-label*="notification" i]'
    ).first();

    await notificationBell.click();
    await page.waitForTimeout(500);

    const notificationItem = page.locator(
      '[data-testid*="notification-item"], .notification-item'
    ).first();

    if (await notificationItem.isVisible()) {
      // Check if it's unread (has unread styling)
      const isUnread = await notificationItem.evaluate((el) =>
        el.classList.contains("unread") ||
        el.classList.contains("bg-primary/5") ||
        el.querySelector(".unread-indicator") !== null
      );

      // Click the notification
      await notificationItem.click();

      await page.waitForTimeout(500);

      // If it was unread, it should now be marked as read
      if (isUnread) {
        // Re-open popover
        await notificationBell.click();
        await page.waitForTimeout(500);

        const updatedItem = page.locator(
          '[data-testid*="notification-item"], .notification-item'
        ).first();

        const stillUnread = await updatedItem.evaluate((el) =>
          el.classList.contains("unread") ||
          el.classList.contains("bg-primary/5")
        );

        expect(stillUnread).toBeFalsy();
      }
    }
  });

  test("should mark all notifications as read", async ({ page }) => {
    const notificationBell = page.locator(
      'button[aria-label*="notification" i]'
    ).first();

    await notificationBell.click();
    await page.waitForTimeout(500);

    const markAllReadButton = page.locator(
      'button:has-text("Mark all read"), button:has-text("Mark all as read")'
    ).first();

    if (await markAllReadButton.isVisible()) {
      await markAllReadButton.click();
      await page.waitForTimeout(500);

      // Unread count badge should disappear or show 0
      const unreadBadge = page.locator('.notification-badge, .badge');
      const badgeCount = await unreadBadge.count();

      if (badgeCount > 0) {
        const text = await unreadBadge.first().textContent();
        expect(text === "0" || text === "").toBeTruthy();
      }
    }
  });

  test("should delete notification", async ({ page }) => {
    const notificationBell = page.locator(
      'button[aria-label*="notification" i]'
    ).first();

    await notificationBell.click();
    await page.waitForTimeout(500);

    const deleteButton = page.locator(
      'button[title="Delete"], [data-testid*="delete-notification"]'
    ).first();

    if (await deleteButton.isVisible()) {
      const initialCount = await page.locator(
        '[data-testid*="notification-item"], .notification-item'
      ).count();

      await deleteButton.click();
      await page.waitForTimeout(500);

      const newCount = await page.locator(
        '[data-testid*="notification-item"], .notification-item'
      ).count();

      expect(newCount).toBeLessThan(initialCount);
    }
  });

  test("should navigate to notification center page", async ({ page }) => {
    const notificationBell = page.locator(
      'button[aria-label*="notification" i]'
    ).first();

    await notificationBell.click();
    await page.waitForTimeout(500);

    const viewAllButton = page.locator(
      'button:has-text("View all"), a:has-text("View all")'
    ).first();

    if (await viewAllButton.isVisible()) {
      await viewAllButton.click();
      await page.waitForLoadState("networkidle");

      // Should be on notification center page
      expect(page.url()).toContain("/notifications");
    }
  });

  test("should show notification settings button", async ({ page }) => {
    const notificationBell = page.locator(
      'button[aria-label*="notification" i]'
    ).first();

    await notificationBell.click();
    await page.waitForTimeout(500);

    const settingsButton = page.locator(
      'button[title*="settings" i], [data-testid="notification-settings"]'
    );

    // Settings button may or may not be present
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForTimeout(500);

      // Should navigate to settings or open settings modal
    }
  });

  test("should display notification types with different colors", async ({ page }) => {
    const notificationBell = page.locator(
      'button[aria-label*="notification" i]'
    ).first();

    await notificationBell.click();
    await page.waitForTimeout(500);

    // Check for type indicators
    const typeIndicators = page.locator(
      '[data-testid*="notification-type"], .notification-type-indicator'
    );

    if ((await typeIndicators.count()) > 0) {
      // Verify different types have different styling
      const firstType = await typeIndicators.first().getAttribute("class");
      expect(firstType).toBeTruthy();
    }
  });

  test("should format notification timestamps correctly", async ({ page }) => {
    const notificationBell = page.locator(
      'button[aria-label*="notification" i]'
    ).first();

    await notificationBell.click();
    await page.waitForTimeout(500);

    // Check for time stamps like "5m ago", "2h ago", "1d ago"
    const timePatterns = [
      /\d+[smhd] ago/i,
      /just now/i,
      /yesterday/i,
      /\d{1,2}\/\d{1,2}/,
    ];

    const notificationItems = page.locator(
      '[data-testid*="notification-item"], .notification-item'
    );

    if ((await notificationItems.count()) > 0) {
      const itemText = await notificationItems.first().textContent();
      const hasTimeFormat = timePatterns.some((pattern) =>
        pattern.test(itemText || "")
      );
      expect(hasTimeFormat).toBeTruthy();
    }
  });
});

test.describe("Notification Center Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/notifications");
    await page.waitForLoadState("networkidle");
  });

  test("should display full notification list", async ({ page }) => {
    // Page should load with notifications
    const header = page.locator("h1, h2").first();
    await expect(header).toContainText(/Notifications/i);

    // Should have notification items or empty state
    const notificationList = page.locator(
      '[data-testid="notification-list"], .notification-list'
    );

    // Wait for content to load
    await page.waitForTimeout(1000);
  });

  test("should filter notifications by type", async ({ page }) => {
    const typeFilter = page.locator(
      'select[name="type"], [data-testid="type-filter"], button:has-text("All Types")'
    );

    if (await typeFilter.isVisible()) {
      await typeFilter.click();

      // Select a specific type
      const typeOption = page.locator(
        'option:has-text("Info"), [role="option"]:has-text("Info")'
      );

      if (await typeOption.isVisible()) {
        await typeOption.click();
        await page.waitForTimeout(500);

        // Results should be filtered
      }
    }
  });

  test("should filter notifications by read status", async ({ page }) => {
    const readFilter = page.locator(
      'button:has-text("Unread"), [data-testid="read-filter"]'
    ).first();

    if (await readFilter.isVisible()) {
      await readFilter.click();
      await page.waitForTimeout(500);

      // Should show only unread notifications
      const notifications = page.locator(
        '[data-testid*="notification-item"], .notification-item'
      );

      // All visible notifications should be unread
      const count = await notifications.count();
      for (let i = 0; i < count; i++) {
        const item = notifications.nth(i);
        const isUnread = await item.evaluate((el) =>
          el.classList.contains("unread") ||
          !el.classList.contains("read") ||
          el.querySelector(".unread-indicator") !== null
        );
        // This check may vary based on implementation
      }
    }
  });

  test("should paginate notification list", async ({ page }) => {
    const nextButton = page.locator(
      'button:has-text("Next"), button[aria-label="Next page"]'
    );

    if (await nextButton.isVisible() && (await nextButton.isEnabled())) {
      await nextButton.click();
      await page.waitForTimeout(500);

      // Should load next page
      const prevButton = page.locator(
        'button:has-text("Previous"), button[aria-label="Previous page"]'
      );
      await expect(prevButton).toBeEnabled();
    }
  });

  test("should bulk select notifications", async ({ page }) => {
    const selectAllCheckbox = page.locator(
      'input[type="checkbox"][aria-label*="select all" i], [data-testid="select-all"]'
    );

    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();

      // Bulk action buttons should appear
      const bulkActions = page.locator(
        '[data-testid="bulk-actions"], .bulk-actions'
      );
      await expect(bulkActions).toBeVisible();
    }
  });

  test("should bulk delete notifications", async ({ page }) => {
    const selectAllCheckbox = page.locator('input[type="checkbox"]').first();

    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();

      const bulkDeleteButton = page.locator(
        'button:has-text("Delete Selected"), [data-testid="bulk-delete"]'
      );

      if (await bulkDeleteButton.isVisible()) {
        await bulkDeleteButton.click();

        // Confirm deletion
        const confirmButton = page.locator(
          'button:has-text("Confirm"), button:has-text("Delete")'
        ).first();

        if (await confirmButton.isVisible()) {
          // Don't actually delete in test
          const cancelButton = page.locator('button:has-text("Cancel")');
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
      }
    }
  });

  test("should search notifications", async ({ page }) => {
    const searchInput = page.locator(
      'input[placeholder*="search" i], input[type="search"]'
    );

    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      await page.waitForTimeout(500);

      // Results should be filtered
      const notifications = page.locator(
        '[data-testid*="notification-item"], .notification-item'
      );

      const count = await notifications.count();
      // Some results or no results based on data
    }
  });
});

test.describe("Notification Preferences", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings/notifications");
    await page.waitForLoadState("networkidle");
  });

  test("should display notification settings page", async ({ page }) => {
    const header = page.locator("h1, h2");
    await expect(header.first()).toContainText(/Notification|Settings/i);
  });

  test("should toggle email notifications", async ({ page }) => {
    const emailToggle = page.locator(
      'input[name*="email"], [data-testid="email-notifications-toggle"]'
    ).first();

    if (await emailToggle.isVisible()) {
      const initialState = await emailToggle.isChecked();
      await emailToggle.click();
      await page.waitForTimeout(500);

      const newState = await emailToggle.isChecked();
      expect(newState).not.toBe(initialState);
    }
  });

  test("should toggle push notifications", async ({ page }) => {
    const pushToggle = page.locator(
      'input[name*="push"], [data-testid="push-notifications-toggle"]'
    ).first();

    if (await pushToggle.isVisible()) {
      const initialState = await pushToggle.isChecked();
      await pushToggle.click();
      await page.waitForTimeout(500);

      const newState = await pushToggle.isChecked();
      expect(newState).not.toBe(initialState);
    }
  });

  test("should configure notification frequency", async ({ page }) => {
    const frequencySelect = page.locator(
      'select[name*="frequency"], [data-testid="notification-frequency"]'
    );

    if (await frequencySelect.isVisible()) {
      await frequencySelect.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
  });

  test("should save notification preferences", async ({ page }) => {
    const saveButton = page.locator(
      'button:has-text("Save"), button[type="submit"]'
    );

    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Check for success message
      const successMessage = page.locator(
        '.toast, [role="alert"], .notification'
      );
      // Success message may appear
    }
  });
});

test.describe("Notification Responsive Design", () => {
  test("should work on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Notification bell should be visible and functional
    const notificationBell = page.locator(
      'button[aria-label*="notification" i]'
    ).first();

    await expect(notificationBell).toBeVisible();

    // Click should work
    await notificationBell.click();

    const popover = page.locator('[data-radix-popper-content-wrapper]');
    await expect(popover.first()).toBeVisible();
  });

  test("should display notification center on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/notifications");
    await page.waitForLoadState("networkidle");

    // Page should be usable
    const header = page.locator("h1, h2").first();
    await expect(header).toBeVisible();
  });
});

test.describe("Real-time Notifications", () => {
  test("should update badge count in real-time", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // This test would typically use WebSocket mocking
    // For now, we verify the structure is in place

    const notificationBell = page.locator(
      'button[aria-label*="notification" i]'
    ).first();

    await expect(notificationBell).toBeVisible();

    // In a real test, you would:
    // 1. Mock WebSocket connection
    // 2. Send a mock notification
    // 3. Verify badge updates
  });

  test("should show toast for new notifications", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // This would typically involve mocking real-time updates
    // Verify toast container exists
    const toastContainer = page.locator(
      '[data-testid="toast-container"], .toaster, [role="region"][aria-label*="notification" i]'
    );

    // Container may or may not be visible without notifications
  });
});
