import { test, expect } from '@playwright/test';
import { waitForPageLoad, login, takeScreenshot } from '../utils/test-helpers';

test.describe('知识中台测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/knowledge-hub');
    await waitForPageLoad(page);
  });

  test('知识中台页面加载', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1')).toContainText('知识中台');

    // 检查统计卡片
    await expect(page.locator('text=知识卡总数')).toBeVisible();

    await takeScreenshot(page, 'knowledge-hub');
  });

  test('知识卡分类显示', async ({ page }) => {
    // 检查分类区域
    await expect(page.locator('text=知识卡分类')).toBeVisible();

    // 检查分类条目
    const categories = page.locator('.bg-gray-50.rounded-lg');
    const count = await categories.count();
    expect(count).toBeGreaterThan(0);
  });

  test('新建知识卡按钮', async ({ page }) => {
    // 检查新建按钮
    const newButton = page.locator('a:has-text("新建知识卡")');
    await expect(newButton).toBeVisible();

    // 点击新建
    await newButton.click();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/knowledge-cards/new');
  });

  test('最近更新的知识卡显示', async ({ page }) => {
    // 检查最近更新区域
    await expect(page.locator('text=最近更新的知识卡')).toBeVisible();

    // 检查表格
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('知识卡详情跳转', async ({ page }) => {
    // 点击第一个知识卡
    const cardLink = page.locator('a[href*="/knowledge-cards/"]').first();
    if (await cardLink.isVisible()) {
      await cardLink.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/knowledge-cards/');
    }
  });
});

test.describe('知识卡详情测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // 先获取一个知识卡 ID
    await page.goto('/knowledge-cards');
    await waitForPageLoad(page);

    const cardLink = page.locator('a[href*="/knowledge-cards/"]').first();
    if (await cardLink.isVisible()) {
      await cardLink.click();
      await page.waitForTimeout(1000);
    }
  });

  test('知识卡详情页面加载', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1, h2')).toBeVisible();

    await takeScreenshot(page, 'knowledge-card-detail');
  });

  test('编辑按钮功能', async ({ page }) => {
    // 检查编辑按钮
    const editButton = page.locator('button:has-text("编辑")');
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(500);

      // 检查是否进入编辑模式
      const saveButton = page.locator('button:has-text("保存")');
      await expect(saveButton).toBeVisible();
    }
  });
});
