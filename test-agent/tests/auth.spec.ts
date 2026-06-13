import { test, expect } from '@playwright/test';
import { waitForPageLoad, login, logout, takeScreenshot } from '../utils/test-helpers';

test.describe('登录认证测试', () => {
  test('登录页面加载', async ({ page }) => {
    await page.goto('/login');
    await waitForPageLoad(page);

    // 检查页面标题
    await expect(page.locator('h1')).toContainText('恒识 Evercog');

    // 检查登录表单
    await expect(page.locator('text=选择用户登录')).toBeVisible();

    // 截图
    await takeScreenshot(page, 'login-page');
  });

  test('用户选择功能', async ({ page }) => {
    await page.goto('/login');
    await waitForPageLoad(page);

    // 检查用户列表
    const userButtons = page.locator('button:has-text("运营"), button:has-text("销售"), button:has-text("财务")');
    const count = await userButtons.count();
    expect(count).toBeGreaterThan(0);

    // 点击第一个用户
    await userButtons.first().click();
    await page.waitForTimeout(300);

    // 检查选中状态
    const selectedButton = page.locator('button.border-\\[\\#10B981\\]');
    await expect(selectedButton).toBeVisible();
  });

  test('登录成功', async ({ page }) => {
    await page.goto('/login');
    await waitForPageLoad(page);

    // 选择用户
    const userButton = page.locator('button:has-text("王运营")').first();
    if (await userButton.isVisible()) {
      await userButton.click();
      await page.waitForTimeout(300);
    }

    // 点击登录
    const loginButton = page.locator('button:has-text("登录")');
    await loginButton.click();

    // 等待跳转
    await page.waitForTimeout(1000);
    await page.waitForURL('/');

    // 验证登录成功
    expect(page.url()).toBe('http://localhost:3000/');
  });

  test('登出功能', async ({ page }) => {
    // 先登录
    await login(page);

    // 悬停用户区域
    const userArea = page.locator('.flex.items-center.gap-2.p-2').first();
    if (await userArea.isVisible()) {
      await userArea.hover();
      await page.waitForTimeout(300);
    }

    // 监听确认对话框
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // 点击登出
    const logoutButton = page.locator('button[title="登出"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
    }

    // 验证跳转到登录页
    expect(page.url()).toContain('/login');
  });
});
