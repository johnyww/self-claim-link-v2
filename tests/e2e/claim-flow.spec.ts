/**
 * End-to-end tests for the claim flow
 */

import { test, expect } from '@playwright/test';

test.describe('Claim Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main page
    await page.goto('/');
  });

  test('should display the claim form', async ({ page }) => {
    // Check if the main elements are present
    await expect(page.locator('h1')).toContainText('Claim Your Products');
    await expect(page.locator('input[placeholder*="order"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid order ID', async ({ page }) => {
    // Enter an invalid order ID
    await page.fill('input[placeholder*="order"]', 'INVALID123');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Order not found');
  });

  test('should handle empty order ID', async ({ page }) => {
    // Ensure the order ID input is empty
    await page.fill('input[placeholder*="order"]', '');
    
    // Assert that the submit button is disabled
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });
});

test.describe('Admin Flow', () => {
  test('should navigate to admin login', async ({ page }) => {
    await page.goto('/admin');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/admin/login');
    await expect(page.locator('h1')).toContainText('Admin Login');
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Fill login form
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'password');
    await page.click('button[type="submit"]');
    
    // Should redirect to admin dashboard
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/admin/login');
    
    // Fill with invalid credentials
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error
    await expect(page.locator('[data-testid="admin-login-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="admin-login-error"]')).toContainText('Login failed');
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check if elements are still visible and functional
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[placeholder*="order"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[placeholder*="order"]')).toBeVisible();
  });
});
