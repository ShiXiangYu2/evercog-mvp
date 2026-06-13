import { test, expect } from '@playwright/test';
import { waitForPageLoad, login, takeScreenshot } from '../utils/test-helpers';

test.describe('工作台测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('工作台页面加载', async ({ page }) => {
    await waitForPageLoad(page);

    // 检查页面标题
    await expect(page.locator('h1')).toContainText('企业知识运营工作台');

    // 检查统计卡片
    const statsCards = page.locator('.bg-white.rounded-xl');
    const count = await statsCards.count();
    expect(count).toBeGreaterThan(0);

    await takeScreenshot(page, 'dashboard');
  });

  test('待处理事项显示', async ({ page }) => {
    await waitForPageLoad(page);

    // 检查待处理事项区域
    const pendingSection = page.locator('text=待处理事项');
    await expect(pendingSection).toBeVisible();
  });

  test('快速入口显示', async ({ page }) => {
    await waitForPageLoad(page);

    // 检查快速入口
    const quickActions = page.locator('text=快速入口');
    await expect(quickActions).toBeVisible();

    // 检查入口链接
    const links = page.locator('a:has-text("上传政策"), a:has-text("生成简报"), a:has-text("导师审核"), a:has-text("员工问答")');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });

  test('最近活动显示', async ({ page }) => {
    await waitForPageLoad(page);

    // 检查最近活动区域
    const recentActivity = page.locator('text=最近活动');
    await expect(recentActivity).toBeVisible();
  });

  test('刷新按钮功能', async ({ page }) => {
    await waitForPageLoad(page);

    // 点击刷新按钮
    const refreshButton = page.locator('button:has-text("刷新")');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(1000);

      // 验证页面重新加载
      await waitForPageLoad(page);
    }
  });

  test('待处理事项跳转', async ({ page }) => {
    await waitForPageLoad(page);

    // 点击待处理事项
    const pendingItem = page.locator('a:has-text("知识卡待审核"), a:has-text("知识缺口"), a:has-text("Agent 任务"), a:has-text("简报待推送")').first();
    if (await pendingItem.isVisible()) {
      await pendingItem.click();
      await page.waitForTimeout(1000);

      // 验证跳转
      const url = page.url();
      expect(url).not.toBe('http://localhost:3000/');
    }
  });

  test('快速入口跳转', async ({ page }) => {
    await waitForPageLoad(page);

    // 点击上传政策
    const uploadPolicy = page.locator('a:has-text("上传政策")');
    if (await uploadPolicy.isVisible()) {
      await uploadPolicy.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/policy-intelligence');
    }
  });
});
