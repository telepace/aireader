import { test, expect } from '@playwright/test';

/**
 * 认证系统端到端测试
 * TDD最终验证：确保整个认证流程正常工作
 */

test.describe('认证系统 - 端到端测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('应该能成功注册新用户', async ({ page }) => {
    // 导航到注册页面
    await page.click('text=立即注册');
    await expect(page).toHaveURL('/register');

    // 填写注册表单
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.fill('input[name="confirmPassword"]', 'TestPass123!');

    // 提交表单
    await page.click('button[type="submit"]');

    // 验证成功或错误处理
    await expect(page).toHaveURL('/');
    
    // 验证用户已登录
    await expect(page.locator('text=欢迎, testuser')).toBeVisible();
  });

  test('应该能成功登录', async ({ page }) => {
    // 填写登录表单
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');

    // 提交表单
    await page.click('button[type="submit"]');

    // 验证成功登录
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=欢迎, testuser')).toBeVisible();
  });

  test('应该显示输入验证错误', async ({ page }) => {
    // 测试无效邮箱
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');

    // 验证错误消息
    await expect(page.locator('text=请输入有效的邮箱地址')).toBeVisible();
    await expect(page.locator('text=密码至少需要8个字符')).toBeVisible();
  });

  test('应该能成功登出', async ({ page }) => {
    // 先登录
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 等待登录完成
    await expect(page.locator('text=欢迎, testuser')).toBeVisible();

    // 点击登出按钮
    await page.click('button[aria-label="用户菜单"]');
    await page.click('text=退出登录');

    // 验证已登出
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=登录')).toBeVisible();
  });

  test('应该处理注册时的重复邮箱', async ({ page }) => {
    // 先注册一个用户
    await page.goto('/register');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.fill('input[name="confirmPassword"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 尝试用相同邮箱再次注册
    await page.goto('/register');
    await page.fill('input[name="username"]', 'anotheruser');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'AnotherPass123!');
    await page.fill('input[name="confirmPassword"]', 'AnotherPass123!');
    await page.click('button[type="submit"]');

    // 验证错误消息
    await expect(page.locator('text=邮箱已存在')).toBeVisible();
  });

  test('应该显示密码强度指示器', async ({ page }) => {
    await page.goto('/register');
    
    // 输入弱密码
    await page.fill('input[name="password"]', '123');
    
    // 验证弱密码指示
    await expect(page.locator('text=弱')).toBeVisible();
    
    // 输入强密码
    await page.fill('input[name="password"]', 'StrongPass123!@#');
    
    // 验证强密码指示
    await expect(page.locator('text=强')).toBeVisible();
  });

  test('应该处理登录失败', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // 验证错误消息
    await expect(page.locator('text=登录失败')).toBeVisible();
    
    // 验证表单仍在登录页面
    await expect(page).toHaveURL('/login');
  });

  test('应该限制登录尝试次数', async ({ page }) => {
    const email = 'test@example.com';
    const wrongPassword = 'WrongPassword123';

    // 连续失败5次
    for (let i = 0; i < 5; i++) {
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', wrongPassword);
      await page.click('button[type="submit"]');
      
      // 等待错误消息出现
      await page.waitForSelector('text=登录失败', { timeout: 5000 });
    }

    // 第6次尝试应该被限制
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', wrongPassword);
    await page.click('button[type="submit"]');

    // 验证速率限制消息
    await expect(page.locator('text=尝试次数过多')).toBeVisible();
  });

  test('应该记住登录状态', async ({ page }) => {
    // 登录并选择记住我
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.check('input[type="checkbox"][name="rememberMe"]');
    await page.click('button[type="submit"]');

    // 验证成功登录
    await expect(page.locator('text=欢迎, testuser')).toBeVisible();

    // 重新加载页面
    await page.reload();

    // 验证仍然登录
    await expect(page.locator('text=欢迎, testuser')).toBeVisible();
  });

  test('应该能处理密码重置流程', async ({ page }) => {
    // 导航到忘记密码页面
    await page.click('text=忘记密码？');
    await expect(page).toHaveURL('/forgot-password');

    // 输入邮箱
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // 验证成功消息
    await expect(page.locator('text=重置邮件已发送')).toBeVisible();

    // 模拟点击重置链接
    await page.goto('/reset-password?token=test-reset-token');
    
    // 设置新密码
    await page.fill('input[name="password"]', 'NewPass123!');
    await page.fill('input[name="confirmPassword"]', 'NewPass123!');
    await page.click('button[type="submit"]');

    // 验证密码重置成功
    await expect(page.locator('text=密码已重置成功')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('认证安全测试', () => {
  test('应该设置安全响应头', async ({ page }) => {
    await page.goto('/login');
    
    const response = await page.waitForResponse('**/login');
    const headers = response.headers();
    
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-xss-protection']).toBe('1; mode=block');
  });

  test('应该防止XSS攻击', async ({ page }) => {
    const xssPayload = '<script>alert("XSS")\u003c/script>';
    
    await page.goto('/register');
    await page.fill('input[name="username"]', xssPayload);
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // 验证脚本没有被执行
    const alertDialog = page.locator('dialog');
    await expect(alertDialog).not.toBeVisible();
  });

  test('应该强制HTTPS', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    // 验证重定向到HTTPS
    await expect(page).toHaveURL(/^https:\/\//);
  });
});

test.describe('响应式设计测试', () => {
  test('应该在移动设备上正确显示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    // 验证移动端布局
    await expect(page.locator('text=登录')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('应该在平板设备上正确显示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/register');

    // 验证平板布局
    await expect(page.locator('text=创建账户')).toBeVisible();
    await expect(page.locator('input[name="username"]')).toBeVisible();
  });
});

test.describe('无障碍测试', () => {
  test('应该支持键盘导航', async ({ page }) => {
    await page.goto('/login');
    
    // 使用Tab键导航
    await page.keyboard.press('Tab');
    await page.keyboard.type('test@example.com');
    
    await page.keyboard.press('Tab');
    await page.keyboard.type('TestPass123!');
    
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // 验证登录成功
    await expect(page.locator('text=欢迎, testuser')).toBeVisible();
  });

  test('应该提供屏幕阅读器支持', async ({ page }) => {
    await page.goto('/register');
    
    // 验证ARIA标签
    await expect(page.locator('[aria-label="用户名"]')).toBeVisible();
    await expect(page.locator('[aria-label="邮箱"]')).toBeVisible();
    
    // 验证表单标签
    await expect(page.locator('label[for="username"]')).toBeVisible();
    await expect(page.locator('label[for="email"]')).toBeVisible();
  });
});