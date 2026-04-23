const { test, expect } = require('@playwright/test');

// Helper: wait for test readiness (restaurants loaded)
async function waitForAppReady(page) {
  await page.waitForSelector('.restaurant-view-menu-btn', { timeout: 15000 });
}

test.describe('Cart Preview', () => {
  test('appears after adding item and View Full Cart navigates', async ({ page }) => {
    await page.goto('/');
    await waitForAppReady(page);

    // Open first restaurant menu
    const menuBtn = page.locator('.restaurant-view-menu-btn').first();
    await menuBtn.click();
    const modal = page.locator('.modal.show');
    await expect(modal).toBeVisible();

    // Add first menu item (button containing 
    const addBtn = page.locator('.modal.show .card .btn', { hasText: 'Add' }).first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    // Preview should appear
    const preview = page.locator('[data-testid="cart-preview"]');
    await expect(preview).toBeVisible({ timeout: 5000 });

    // Button initially present
    const viewBtn = page.locator('[data-testid="cart-preview-view-cart-btn"]');
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    // Navigation occurs & modal auto-closes via route change effect
    await expect(page).toHaveURL(/\/cart$/);
    await expect(modal).toBeHidden();
    await expect(preview).toBeHidden({ timeout: 5000 });
  });
});
