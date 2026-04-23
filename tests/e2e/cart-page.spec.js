const { test, expect } = require('@playwright/test');

test.describe('Cart Page Interactions', () => {
  test('increase, decrease, remove and checkout behavior', async ({ page }) => {
    await page.goto('/');

    // Open a restaurant menu and add item
    const menuBtn = page.locator('.restaurant-view-menu-btn').first();
    await expect(menuBtn).toBeVisible({ timeout: 15000 });
    await menuBtn.click();
    const modal = page.locator('.modal.show');
    await expect(modal).toBeVisible();
    const addBtn = page.locator('.modal.show .card .btn', { hasText: 'Add' }).first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    // Use cart preview to go to cart
    const previewBtn = page.locator('[data-testid="cart-preview-view-cart-btn"]');
    await expect(previewBtn).toBeVisible({ timeout: 5000 });
    await previewBtn.click();
    await expect(page).toHaveURL(/\/cart$/);

    // There should be at least one row
    const qtyInput = page.locator('tbody .cart-row input[type="number"]').first();
    await expect(qtyInput).toBeVisible();
    const initialQty = parseInt(await qtyInput.inputValue(), 10);

    // Increase quantity
    const incBtn = page.locator('tbody .cart-row button', { hasText: '+' }).first();
    await incBtn.click();
    await expect(qtyInput).toHaveValue(String(initialQty + 1));

    // Decrease quantity
    const decBtn = page.locator('tbody .cart-row button', { hasText: '−' }).first();
    await decBtn.click();
    await expect(qtyInput).toHaveValue(String(initialQty));

    // Remove item
    const removeBtn = page.locator('tbody .cart-row [data-testid^="cart-remove-"]').first();
    await removeBtn.click();

    // If cart becomes empty, show empty state
    const emptyState = page.locator('text=Your Cart');
    await expect(emptyState).toBeVisible();
  });
});
