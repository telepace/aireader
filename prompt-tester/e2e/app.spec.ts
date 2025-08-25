import { test, expect } from '@playwright/test';

test.describe('Prompt Tester App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the main application', async ({ page }) => {
    await expect(page).toHaveTitle(/React App/);
    // Check for any text content that indicates the app loaded
    await expect(page.locator('body')).toContainText(/提示词|Prompt|测试|工具/i);
  });

  test('should have basic UI elements', async ({ page }) => {
    // Check for main components with flexible text matching
    await expect(page.locator('body')).toContainText(/处理对象|Prompt|处理结果|结果/i);
  });

  test('should have generate and save buttons', async ({ page }) => {
    await expect(page.locator('button')).toContainText([/生成/i, /保存/i]);
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

  test('should have model selector or input field', async ({ page }) => {
    // Allow for either select dropdown or text input for model selection
    const hasSelect = await page.locator('select').count() > 0;
    const hasTextInput = await page.locator('input[type="text"], textarea').count() > 0;
    expect(hasSelect || hasTextInput).toBe(true);
  });
});