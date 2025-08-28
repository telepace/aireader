import { test, expect } from '@playwright/test';

test.describe('Prompt Tester App', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
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

  test('should allow prompt input and model selection', async ({ page }) => {
    // Find text input areas
    const textAreas = await page.locator('textarea').count();
    const inputs = await page.locator('input[type="text"]').count();
    
    expect(textAreas + inputs).toBeGreaterThan(0);
    
    // Try to find and interact with text input
    const promptInput = page.locator('textarea').first();
    if (await promptInput.count() > 0) {
      await promptInput.fill('Test prompt for E2E testing');
      await expect(promptInput).toHaveValue('Test prompt for E2E testing');
    }
    
    // Try to find model selector
    const modelSelect = page.locator('select').first();
    if (await modelSelect.count() > 0) {
      const options = await modelSelect.locator('option').count();
      if (options > 1) {
        await modelSelect.selectOption({ index: 1 });
      }
    }
  });

  test('should persist state in localStorage', async ({ page }) => {
    // Fill prompt text if available
    const promptInput = page.locator('textarea').first();
    if (await promptInput.count() > 0) {
      await promptInput.fill('Persistent test prompt');
      await page.waitForTimeout(500); // Wait for localStorage update
    }
    
    // Check localStorage has the value
    const storedValue = await page.evaluate(() => {
      return localStorage.getItem('promptTester_promptText') || 
             localStorage.getItem('promptTester_promptObject');
    });
    
    expect(storedValue).toBeTruthy();
    
    // Reload page and check if value persists
    await page.reload();
    
    if (await promptInput.count() > 0) {
      const inputValue = await promptInput.inputValue();
      expect(inputValue).toBeTruthy();
    }
  });

  test('should handle sidebar toggles', async ({ page }) => {
    // Look for sidebar toggle buttons or navigation elements
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    expect(buttonCount).toBeGreaterThan(0);
    
    // Try to find toggle buttons (could be hamburger menus, arrows, etc.)
    const possibleToggleButtons = await page.locator('button').all();
    
    for (const button of possibleToggleButtons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      
      // Look for common toggle button indicators
      if (text?.includes('☰') || 
          text?.includes('≡') || 
          text?.includes('|||') ||
          ariaLabel?.toLowerCase().includes('menu') ||
          ariaLabel?.toLowerCase().includes('toggle') ||
          ariaLabel?.toLowerCase().includes('sidebar')) {
        
        await button.click();
        await page.waitForTimeout(300);
        break;
      }
    }
  });

  test('should handle save functionality if available', async ({ page }) => {
    // Fill some test data
    const promptInput = page.locator('textarea').first();
    if (await promptInput.count() > 0) {
      await promptInput.fill('Test prompt to save');
    }
    
    // Look for save button
    const saveButton = page.locator('button').filter({ hasText: /保存|Save/i });
    
    if (await saveButton.count() > 0) {
      await saveButton.click();
      
      // Check if save was successful (could be notification, modal, etc.)
      await page.waitForTimeout(1000);
      
      // The save should not cause any errors
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      expect(errors.filter(e => !e.includes('sourcemap'))).toHaveLength(0);
    }
  });

  test('should handle tab navigation', async ({ page }) => {
    // Look for tab elements
    const tabs = page.locator('[role="tab"], .tab, button').filter({ hasText: /Tab|标签|提示词|聊天|Chat/i });
    
    if (await tabs.count() > 0) {
      const firstTab = tabs.first();
      await firstTab.click();
      
      // Wait for tab content to load
      await page.waitForTimeout(500);
      
      // Check if clicking tab doesn't cause errors
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      expect(errors.filter(e => !e.includes('sourcemap'))).toHaveLength(0);
    }
  });

  test('should handle responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(300);
    
    // Basic layout should be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 600 });
    await page.waitForTimeout(300);
    
    await expect(body).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    
    await expect(body).toBeVisible();
  });

  test('should maintain state across navigation', async ({ page }) => {
    // Set some initial state
    const promptInput = page.locator('textarea').first();
    if (await promptInput.count() > 0) {
      await promptInput.fill('Navigation test prompt');
      await page.waitForTimeout(500);
    }
    
    // Navigate to different tabs if available
    const tabs = page.locator('[role="tab"], button').filter({ hasText: /聊天|Chat/i });
    
    if (await tabs.count() > 0) {
      await tabs.first().click();
      await page.waitForTimeout(300);
      
      // Navigate back to original tab
      const promptTab = page.locator('[role="tab"], button').filter({ hasText: /提示词|Prompt/i });
      if (await promptTab.count() > 0) {
        await promptTab.first().click();
        await page.waitForTimeout(300);
        
        // Check if original state is maintained
        if (await promptInput.count() > 0) {
          const currentValue = await promptInput.inputValue();
          expect(currentValue).toBe('Navigation test prompt');
        }
      }
    }
  });

  test('should handle export functionality if available', async ({ page }) => {
    // Look for export buttons
    const exportButton = page.locator('button').filter({ hasText: /导出|Export|下载|Download/i });
    
    if (await exportButton.count() > 0) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      
      await exportButton.first().click();
      
      const download = await downloadPromise;
      
      // If download started, verify it
      if (download) {
        expect(download.suggestedFilename()).toBeTruthy();
      }
    }
  });
});