import { test, expect } from '@playwright/test';
import { waitForPageLoad, login, takeScreenshot } from '../utils/test-helpers';

test.describe('政策情报测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/policy-intelligence');
    await waitForPageLoad(page);
  });

  test('政策情报页面加载', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1')).toContainText('政策情报');

    // 检查统计卡片
    await expect(page.locator('text=政策链接总数')).toBeVisible();
    await expect(page.locator('text=政策简报')).toBeVisible();

    await takeScreenshot(page, 'policy-intelligence');
  });

  test('最新政策动态显示', async ({ page }) => {
    // 检查最新政策动态区域
    await expect(page.locator('text=最新政策动态')).toBeVisible();

    // 检查政策条目
    const policyItems = page.locator('.bg-gray-50.rounded-xl');
    const count = await policyItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('政策详情跳转', async ({ page }) => {
    // 点击第一个政策条目
    const policyItem = page.locator('a[href*="/policy-links/"]').first();
    if (await policyItem.isVisible()) {
      await policyItem.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/policy-links/');
    }
  });

  test('查看全部政策链接', async ({ page }) => {
    // 点击查看全部
    const viewAll = page.locator('a:has-text("查看全部政策链接")');
    if (await viewAll.isVisible()) {
      await viewAll.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/policy-links');
    }
  });

  test('数据概览分析显示', async ({ page }) => {
    // 检查数据概览区域
    await expect(page.locator('text=数据概览分析')).toBeVisible();
  });

  test('Agent 处理队列显示', async ({ page }) => {
    // 检查 Agent 处理队列区域
    await expect(page.locator('text=Agent 处理队列')).toBeVisible();
  });

  test('知识库提醒显示', async ({ page }) => {
    // 检查知识库提醒区域
    await expect(page.locator('text=知识库提醒')).toBeVisible();
  });
});

test.describe('政策链接测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/policy-links');
    await waitForPageLoad(page);
  });

  test('政策链接列表加载', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1')).toContainText('政策链接');

    // 检查列表
    const policyList = page.locator('table, .space-y-4');
    await expect(policyList).toBeVisible();

    await takeScreenshot(page, 'policy-links');
  });

  test('新建政策链接', async ({ page }) => {
    // 点击新建按钮
    const newButton = page.locator('a:has-text("新建政策链接"), button:has-text("新建")');
    if (await newButton.isVisible()) {
      await newButton.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/policy-links/new');
    }
  });

  test('搜索功能', async ({ page }) => {
    // 检查搜索框
    const searchInput = page.locator('input[placeholder*="搜索"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('测试');
      await page.waitForTimeout(500);
    }
  });
});
