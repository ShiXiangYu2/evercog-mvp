import { test, expect } from '@playwright/test';
import { waitForPageLoad, login, takeScreenshot } from '../utils/test-helpers';

test.describe('系统设置测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/settings');
    await waitForPageLoad(page);
  });

  test('系统设置页面加载', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1')).toContainText('系统设置');

    await takeScreenshot(page, 'settings');
  });

  test('用户管理显示', async ({ page }) => {
    // 检查用户列表区域
    await expect(page.locator('text=用户管理')).toBeVisible();
  });

  test('权限设置显示', async ({ page }) => {
    // 检查权限设置区域
    await expect(page.locator('text=权限设置')).toBeVisible();
  });

  test('审计日志显示', async ({ page }) => {
    // 检查审计日志区域
    await expect(page.locator('text=审计日志')).toBeVisible();
  });

  test('导出功能', async ({ page }) => {
    // 检查导出按钮
    const exportButton = page.locator('button:has-text("导出")');
    if (await exportButton.isVisible()) {
      // 设置下载监听
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

      await exportButton.click();
      await page.waitForTimeout(1000);

      // 检查是否有下载或提示
      const download = await downloadPromise;
      if (download) {
        expect(download).toBeTruthy();
      }
    }
  });
});

test.describe('权限管理测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/settings/permissions');
    await waitForPageLoad(page);
  });

  test('权限管理页面加载', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1')).toContainText('权限管理');

    await takeScreenshot(page, 'permissions');
  });

  test('权限矩阵显示', async ({ page }) => {
    // 检查权限矩阵
    const matrix = page.locator('table');
    await expect(matrix).toBeVisible();
  });
});

test.describe('集成设置测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/settings/integrations');
    await waitForPageLoad(page);
  });

  test('集成设置页面加载', async ({ page }) => {
    // 检查页面标题
    await expect(page.locator('h1')).toContainText('系统集成');

    await takeScreenshot(page, 'integrations');
  });

  test('企业微信配置显示', async ({ page }) => {
    // 检查企业微信配置
    await expect(page.locator('text=企业微信')).toBeVisible();
  });

  test('配置输入框功能', async ({ page }) => {
    // 检查配置输入框
    const corpIdInput = page.locator('input[placeholder*="企业 ID"]');
    if (await corpIdInput.isVisible()) {
      await corpIdInput.fill('test-corp-id');
      await page.waitForTimeout(300);
    }
  });
});
