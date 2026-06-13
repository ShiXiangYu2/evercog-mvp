import { test, expect } from '@playwright/test';
import { waitForPageLoad, login, takeScreenshot } from '../utils/test-helpers';

test.describe('导师审核测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/mentor-review');
    await waitForPageLoad(page);
  });

  test('导师审核页面加载', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1')).toContainText('导师审核');

    // 检查主要区域
    await expect(page.locator('text=待审核队列')).toBeVisible();

    await takeScreenshot(page, 'mentor-review');
  });

  test('待审核队列显示', async ({ page }) => {
    // 检查待审核列表
    const reviewList = page.locator('table');
    await expect(reviewList).toBeVisible();

    // 检查审核按钮
    const reviewButtons = page.locator('button:has-text("审核")');
    const count = await reviewButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('审核按钮功能', async ({ page }) => {
    // 点击第一个审核按钮
    const reviewButton = page.locator('button:has-text("审核")').first();
    if (await reviewButton.isVisible()) {
      await reviewButton.click();
      await page.waitForTimeout(500);

      // 检查弹窗是否出现
      const modal = page.locator('.fixed.inset-0');
      await expect(modal).toBeVisible();

      await takeScreenshot(page, 'review-modal');
    }
  });

  test('审核弹窗操作', async ({ page }) => {
    // 点击审核按钮
    const reviewButton = page.locator('button:has-text("审核")').first();
    if (await reviewButton.isVisible()) {
      await reviewButton.click();
      await page.waitForTimeout(500);

      // 选择通过
      const approveButton = page.locator('button:has-text("通过")');
      if (await approveButton.isVisible()) {
        await approveButton.click();
        await page.waitForTimeout(300);
      }

      // 点击提交
      const submitButton = page.locator('button:has-text("确认提交")');
      if (await submitButton.isVisible()) {
        // 监听对话框
        page.on('dialog', async (dialog) => {
          await dialog.accept();
        });

        await submitButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('审核统计显示', async ({ page }) => {
    // 检查审核统计区域
    await expect(page.locator('text=审核统计')).toBeVisible();
  });

  test('Agent 预审结果显示', async ({ page }) => {
    // 检查 Agent 预审区域
    await expect(page.locator('text=Agent 预审结果')).toBeVisible();
  });

  test('导师工作台显示', async ({ page }) => {
    // 检查导师工作台区域
    await expect(page.locator('text=导师工作台')).toBeVisible();
  });
});
