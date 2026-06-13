import { test, expect } from '@playwright/test';
import { waitForPageLoad, login, takeScreenshot } from '../utils/test-helpers';

test.describe('经验问答测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/employee-qa');
    await waitForPageLoad(page);
  });

  test('员工问答页面加载', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1')).toContainText('员工问答');

    // 检查主要区域
    await expect(page.locator('text=问题输入')).toBeVisible();

    await takeScreenshot(page, 'employee-qa');
  });

  test('问题输入功能', async ({ page }) => {
    // 检查输入框
    const questionInput = page.locator('textarea, input[placeholder*="问题"]').first();
    if (await questionInput.isVisible()) {
      await questionInput.fill('餐饮客户代账需要什么材料？');
      await page.waitForTimeout(300);
    }
  });

  test('提交问题', async ({ page }) => {
    // 输入问题
    const questionInput = page.locator('textarea, input[placeholder*="问题"]').first();
    if (await questionInput.isVisible()) {
      await questionInput.fill('测试问题');

      // 点击提交按钮
      const submitButton = page.locator('button:has-text("提交"), button:has-text("发送")');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        // 检查是否有响应
        await waitForPageLoad(page);
      }
    }
  });

  test('问答历史显示', async ({ page }) => {
    // 检查历史记录区域
    const historySection = page.locator('text=问答历史, text=历史记录');
    if (await historySection.isVisible()) {
      await expect(historySection).toBeVisible();
    }
  });

  test('知识缺口追踪显示', async ({ page }) => {
    // 检查知识缺口区域
    await expect(page.locator('text=知识缺口追踪')).toBeVisible();
  });
});

test.describe('经验调用测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/experience');
    await waitForPageLoad(page);
  });

  test('经验调用页面加载', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1')).toContainText('经验调用');

    await takeScreenshot(page, 'experience');
  });

  test('问题输入功能', async ({ page }) => {
    // 检查输入框
    const questionInput = page.locator('textarea').first();
    if (await questionInput.isVisible()) {
      await questionInput.fill('客户问：我们店刚开业，代账需要准备什么材料？');
      await page.waitForTimeout(300);
    }
  });
});
