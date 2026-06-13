import { test, expect } from '@playwright/test';
import { waitForPageLoad, login, takeScreenshot } from '../utils/test-helpers';

test.describe('导航菜单测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('导航菜单显示', async ({ page }) => {
    // 检查侧边栏
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // 检查菜单项
    const menuItems = page.locator('nav a');
    const count = await menuItems.count();
    expect(count).toBeGreaterThan(0);

    await takeScreenshot(page, 'navigation-menu');
  });

  test('工作台跳转', async ({ page }) => {
    await page.click('a:has-text("工作台")');
    await waitForPageLoad(page);
    expect(page.url()).toBe('http://localhost:3000/');
  });

  test('政策情报跳转', async ({ page }) => {
    await page.click('a:has-text("政策情报")');
    await waitForPageLoad(page);
    expect(page.url()).toContain('/policy-intelligence');
  });

  test('知识中台跳转', async ({ page }) => {
    await page.click('a:has-text("知识中台")');
    await waitForPageLoad(page);
    expect(page.url()).toContain('/knowledge-hub');
  });

  test('导师审核跳转', async ({ page }) => {
    await page.click('a:has-text("导师审核")');
    await waitForPageLoad(page);
    expect(page.url()).toContain('/mentor-review');
  });

  test('员工问答跳转', async ({ page }) => {
    await page.click('a:has-text("员工问答")');
    await waitForPageLoad(page);
    expect(page.url()).toContain('/employee-qa');
  });

  test('Agent 工作台跳转', async ({ page }) => {
    await page.click('a:has-text("Agent 工作台")');
    await waitForPageLoad(page);
    expect(page.url()).toContain('/agent-workspace');
  });

  test('系统设置跳转', async ({ page }) => {
    await page.click('a:has-text("系统设置")');
    await waitForPageLoad(page);
    expect(page.url()).toContain('/settings');
  });

  test('菜单折叠功能', async ({ page }) => {
    // 点击折叠按钮
    const collapseButton = page.locator('button:has-text("收起")');
    if (await collapseButton.isVisible()) {
      await collapseButton.click();
      await page.waitForTimeout(500);

      // 检查侧边栏宽度变化
      const sidebar = page.locator('aside');
      const width = await sidebar.evaluate((el) => el.offsetWidth);
      expect(width).toBeLessThan(260);
    }
  });
});
