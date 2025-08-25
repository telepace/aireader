import { test, expect } from '@playwright/test';

test.describe('Prompt Tester App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main application', async ({ page }) => {
    await expect(page).toHaveTitle(/React App/);
    await expect(page.locator('text=提示词测试工具')).toBeVisible();
  });

  test('should have basic UI elements', async ({ page }) => {
    // Check for main components
    await expect(page.locator('text=处理对象框')).toBeVisible();
    await expect(page.locator('text=Prompt框')).toBeVisible();
    await expect(page.locator('text=处理结果')).toBeVisible();
  });

  test('should have generate and save buttons', async ({ page }) => {
    await expect(page.locator('button:has-text("生成")').first()).toBeVisible();
    await expect(page.locator('button:has-text("保存")').first()).toBeVisible();
  });

  test('should load without errors', async ({ page }) => {
    // Basic sanity check - no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Allow some time for potential errors
    await page.waitForTimeout(1000);
    
    // Check for critical errors
    expect(errors.filter(e => !e.includes('sourcemap'))).toHaveLength(0);
  });

  test('should have model selector', async ({ page }) => {
    await expect(page.locator('select')).toBeVisible();
  });
});