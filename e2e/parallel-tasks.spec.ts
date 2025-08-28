import { test, expect } from '@playwright/test';

test.describe('Parallel Task Processing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="messages-box"]', { state: 'visible' });
  });

  test('should allow multiple option cards to be clicked simultaneously', async ({ page }) => {
    // First, we need to get some options by sending a message
    await page.fill('input[placeholder*="输入你的问题"]', '请帮我分析一下人工智能的发展趋势');
    await page.click('button:has-text("发送")');
    
    // Wait for response and options to appear
    await page.waitForSelector('[data-testid="option-card"]', { timeout: 30000 });
    
    // Get all option cards
    const optionCards = page.locator('[data-testid="option-card"]');
    const cardCount = await optionCards.count();
    
    // Click multiple cards quickly (simulate parallel clicking)
    const clickPromises = [];
    const maxClicks = Math.min(3, cardCount); // Click up to 3 cards
    
    for (let i = 0; i < maxClicks; i++) {
      clickPromises.push(optionCards.nth(i).click());
    }
    
    // Execute all clicks simultaneously
    await Promise.all(clickPromises);
    
    // Verify that task queue panel appears
    await expect(page.locator('[data-testid="task-queue-panel"]')).toBeVisible({ timeout: 5000 });
    
    // Verify that multiple tasks are being processed
    const processingIndicators = page.locator('[data-testid="task-processing"]');
    await expect(processingIndicators).toHaveCount(Math.min(3, maxClicks), { timeout: 10000 });
  });

  test('should show proper visual feedback for different task states', async ({ page }) => {
    // Send a message to get options
    await page.fill('input[placeholder*="输入你的问题"]', '介绍一下机器学习的基本概念');
    await page.click('button:has-text("发送")');
    
    // Wait for options
    await page.waitForSelector('[data-testid="option-card"]', { timeout: 30000 });
    
    // Click on the first option card
    const firstCard = page.locator('[data-testid="option-card"]').first();
    await firstCard.click();
    
    // Verify click animation or immediate feedback
    await expect(firstCard).toHaveAttribute('data-state', 'clicked', { timeout: 1000 });
    
    // Verify queued state appears
    await expect(firstCard).toHaveAttribute('data-state', 'queued', { timeout: 2000 });
    
    // Verify processing state
    await expect(firstCard).toHaveAttribute('data-state', 'processing', { timeout: 5000 });
    
    // Wait for completion
    await expect(firstCard).toHaveAttribute('data-state', 'completed', { timeout: 30000 });
  });

  test('should display task queue with correct information', async ({ page }) => {
    // Create multiple tasks
    await page.fill('input[placeholder*="输入你的问题"]', '请分析深度学习的应用场景');
    await page.click('button:has-text("发送")');
    
    await page.waitForSelector('[data-testid="option-card"]', { timeout: 30000 });
    
    // Click multiple cards
    const cards = page.locator('[data-testid="option-card"]');
    await cards.nth(0).click();
    await cards.nth(1).click();
    
    // Wait for queue panel to appear
    await expect(page.locator('[data-testid="task-queue-panel"]')).toBeVisible();
    
    // Verify queue contains correct number of tasks
    const queueItems = page.locator('[data-testid="queue-item"]');
    await expect(queueItems).toHaveCount(2);
    
    // Verify queue statistics
    const queueStats = page.locator('[data-testid="queue-stats"]');
    await expect(queueStats).toContainText('正在处理');
  });

  test('should allow task cancellation', async ({ page }) => {
    // Create a task
    await page.fill('input[placeholder*="输入你的问题"]', '什么是神经网络？');
    await page.click('button:has-text("发送")');
    
    await page.waitForSelector('[data-testid="option-card"]', { timeout: 30000 });
    await page.locator('[data-testid="option-card"]').first().click();
    
    // Wait for task queue panel
    await expect(page.locator('[data-testid="task-queue-panel"]')).toBeVisible();
    
    // Find and click cancel button
    const cancelButton = page.locator('[data-testid="task-cancel"]').first();
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();
    
    // Verify task is cancelled
    await expect(page.locator('[data-testid="task-cancelled"]')).toBeVisible();
  });

  test('should show notifications for task completion and errors', async ({ page }) => {
    // Create a task that should complete successfully
    await page.fill('input[placeholder*="输入你的问题"]', '人工智能的历史发展');
    await page.click('button:has-text("发送")');
    
    await page.waitForSelector('[data-testid="option-card"]', { timeout: 30000 });
    await page.locator('[data-testid="option-card"]').first().click();
    
    // Wait for completion notification
    await expect(page.locator('[data-testid="notification-success"]')).toBeVisible({ timeout: 60000 });
    
    // Verify notification content
    await expect(page.locator('[data-testid="notification-success"]')).toContainText('任务完成');
  });

  test('should maintain responsive design with multiple active tasks', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.fill('input[placeholder*="输入你的问题"]', '区块链技术原理');
    await page.click('button:has-text("发送")');
    
    await page.waitForSelector('[data-testid="option-card"]', { timeout: 30000 });
    
    // Click multiple cards on mobile
    const cards = page.locator('[data-testid="option-card"]');
    const cardCount = await cards.count();
    
    for (let i = 0; i < Math.min(2, cardCount); i++) {
      await cards.nth(i).click();
    }
    
    // Verify queue panel is responsive
    const queuePanel = page.locator('[data-testid="task-queue-panel"]');
    await expect(queuePanel).toBeVisible();
    
    // Check that panel doesn't overflow viewport
    const panelBounds = await queuePanel.boundingBox();
    const viewport = page.viewportSize();
    
    if (panelBounds && viewport) {
      expect(panelBounds.width).toBeLessThanOrEqual(viewport.width);
      expect(panelBounds.height).toBeLessThanOrEqual(viewport.height);
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Intercept API calls and simulate network error
    await page.route('**/api/v1/chat/completions', route => {
      route.abort('failed');
    });
    
    await page.fill('input[placeholder*="输入你的问题"]', '测试网络错误');
    await page.click('button:has-text("发送")');
    
    await page.waitForSelector('[data-testid="option-card"]', { timeout: 30000 });
    await page.locator('[data-testid="option-card"]').first().click();
    
    // Should show error notification
    await expect(page.locator('[data-testid="notification-error"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="notification-error"]')).toContainText('任务失败');
  });

  test('should persist task queue state during page interactions', async ({ page }) => {
    // Create tasks
    await page.fill('input[placeholder*="输入你的问题"]', '量子计算的基本原理');
    await page.click('button:has-text("发送")');
    
    await page.waitForSelector('[data-testid="option-card"]', { timeout: 30000 });
    
    // Click multiple cards
    const cards = page.locator('[data-testid="option-card"]');
    await cards.nth(0).click();
    await cards.nth(1).click();
    
    // Wait for queue to appear
    await expect(page.locator('[data-testid="task-queue-panel"]')).toBeVisible();
    
    // Navigate within the chat (scroll, type new message, etc.)
    await page.fill('input[placeholder*="输入你的问题"]', '补充问题');
    
    // Queue should still be visible and maintain state
    await expect(page.locator('[data-testid="task-queue-panel"]')).toBeVisible();
    
    // Queue items should still be there
    const queueItems = page.locator('[data-testid="queue-item"]');
    await expect(queueItems.count()).toBeGreaterThan(0);
  });
});