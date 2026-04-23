// Smoke test for restaurant menu modal scrolling and cleanup
const { test, expect } = require('@playwright/test');

// Helper to check body scroll lock
async function isBodyScrollLocked(page) {
  const overflow = await page.evaluate(() => document.body.style.overflow);
  const hasClass = await page.evaluate(() => document.body.classList.contains('modal-open'));
  return overflow === 'hidden' || hasClass;
}

test.describe('Restaurant menu modal', () => {
  test('opens, scrolls, and closes restoring scroll', async ({ page }) => {
    await page.goto('/');

    // Wait for at least one restaurant card menu button
    const menuBtn = page.locator('.restaurant-view-menu-btn').first();
    await expect(menuBtn).toBeVisible({ timeout: 15000 });

    // Open modal
    await menuBtn.click();

    const modal = page.locator('.modal.show');
    await expect(modal).toBeVisible();

    // Ensure modal body is scrollable
    const canScroll = await page.evaluate(() => {
      const body = document.querySelector('.modal.show .modal-body');
      return body && body.scrollHeight > body.clientHeight;
    });
    expect(canScroll).toBeTruthy();

    // Scroll inside modal
    await page.locator('.modal.show .modal-body').evaluate(el => el.scrollTo(0, el.scrollHeight));

    // Close via close button
    const closeBtn = page.locator('.modal.show button[aria-label="Close"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    await expect(modal).toBeHidden();

    // Body scroll restored
    expect(await isBodyScrollLocked(page)).toBeFalsy();
  });

  test('add item in modal then View Cart navigates and closes', async ({ page }) => {
    await page.goto('/');

    const menuBtn = page.locator('.restaurant-view-menu-btn').first();
    await expect(menuBtn).toBeVisible({ timeout: 15000 });
    await menuBtn.click();

    const modal = page.locator('.modal.show');
    await expect(modal).toBeVisible();

    // Add first visible item to cart
    const addBtn = page.locator('.modal.show .card .btn', { hasText: 'Add' }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Click View Cart via cart progress indicator (appears once cart has items)
    const viewCartBtn = page.locator('.modal.show [data-testid="cart-progress-view-cart"]');
    await viewCartBtn.waitFor({ state: 'visible', timeout: 10000 });
    await viewCartBtn.click();

    // Modal closes and navigated to /cart
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL(/\/cart$/);
    expect(await isBodyScrollLocked(page)).toBeFalsy();
  });

  test('auto-closes modal on in-modal route navigation', async ({ page }) => {
    await page.goto('/');
    const menuBtn = page.locator('.restaurant-view-menu-btn').first();
    await expect(menuBtn).toBeVisible({ timeout: 15000 });
    await menuBtn.click();
    const modal = page.locator('.modal.show');
    await expect(modal).toBeVisible();

    // Navigate using dedicated modal footer button
    const footerBtn = page.locator('[data-testid="modal-restaurants-btn"]');
    await expect(footerBtn).toBeVisible();
    await footerBtn.click();

    await expect(modal).toBeHidden();
    expect(await isBodyScrollLocked(page)).toBeFalsy();
  });

  test('after closing modal navbar links remain clickable', async ({ page }) => {
    await page.goto('/');
    const menuBtn = page.locator('.restaurant-view-menu-btn').first();
    await expect(menuBtn).toBeVisible({ timeout: 15000 });
    await menuBtn.click();
    const modal = page.locator('.modal.show');
    await expect(modal).toBeVisible();
    // Close via close button
    const closeBtn = page.locator('.modal.show button[aria-label="Close"]');
    await closeBtn.click();
    await expect(modal).toBeHidden();
    // Click Restaurants link in navbar via test id (emoji-safe)
    const restaurantsLink = page.locator('[data-testid="nav-restaurants-link"]');
    await restaurantsLink.waitFor({ state: 'attached', timeout: 10000 });
    await expect(restaurantsLink).toBeVisible({ timeout: 5000 });
    await restaurantsLink.click();
    await expect(page).toHaveURL(/\/restaurants$/);
    expect(await isBodyScrollLocked(page)).toBeFalsy();
  });
});
