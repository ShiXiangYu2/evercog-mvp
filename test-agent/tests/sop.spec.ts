import { test, expect } from '@playwright/test';
import { waitForPageLoad, login, takeScreenshot } from '../utils/test-helpers';

test.describe('SOP 训练测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/sop');
    await waitForPageLoad(page);
  });

  test('SOP 列表页面加载', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1')).toContainText('SOP 训练');

    // 检查列表
    const sopList = page.locator('table, .space-y-4');
    await expect(sopList).toBeVisible();

    await takeScreenshot(page, 'sop-list');
  });

  test('新建 SOP 任务', async ({ page }) => {
    // 点击新建按钮
    const newButton = page.locator('a:has-text("新建"), button:has-text("新建")');
    if (await newButton.isVisible()) {
      await newButton.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/sop/new');
    }
  });

  test('SOP 详情跳转', async ({ page }) => {
    // 点击第一个 SOP 条目
    const sopItem = page.locator('a[href*="/sop/"]').first();
    if (await sopItem.isVisible()) {
      await sopItem.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/sop/');
    }
  });
});

test.describe('SOP 详情测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // 先获取一个 SOP ID
    await page.goto('/sop');
    await waitForPageLoad(page);

    const sopItem = page.locator('a[href*="/sop/"]').first();
    if (await sopItem.isVisible()) {
      await sopItem.click();
      await page.waitForTimeout(1000);
    }
  });

  test('SOP 详情页面加载', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1, h2')).toBeVisible();

    await takeScreenshot(page, 'sop-detail');
  });

  test('审核操作', async ({ page }) => {
    // 检查审核按钮
    const approveButton = page.locator('button:has-text("通过"), button:has-text("审核通过")');
    const rejectButton = page.locator('button:has-text("驳回"), button:has-text("审核驳回")');

    if (await approveButton.isVisible()) {
      // 监听对话框
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });

      await approveButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('沉淀为知识卡', async ({ page }) => {
    // 检查沉淀按钮
    const saveButton = page.locator('button:has-text("沉淀"), button:has-text("知识卡")');
    if (await saveButton.isVisible()) {
      // 监听对话框
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });

      await saveButton.click();
      await page.waitForTimeout(1000);
    }
  });
});
