import { Page, expect } from '@playwright/test';

/**
 * 测试辅助函数
 */

// 等待页面加载完成
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// 登录系统
export async function login(page: Page, userId: string = 'cmqal5t49000gaz0g5n28y25y') {
  await page.goto('/login');
  await waitForPageLoad(page);

  // 点击用户选择
  const userButton = page.locator(`button:has-text("王运营")`).first();
  if (await userButton.isVisible()) {
    await userButton.click();
    await page.waitForTimeout(300);
  }

  // 点击登录按钮
  const loginButton = page.locator('button:has-text("登录")');
  if (await loginButton.isVisible()) {
    await loginButton.click();
    await page.waitForTimeout(1000);
  }

  // 等待跳转到首页
  await page.waitForURL('/');
  await waitForPageLoad(page);
}

// 登出系统
export async function logout(page: Page) {
  // 点击用户区域
  const userArea = page.locator('.flex.items-center.gap-2.p-2').first();
  if (await userArea.isVisible()) {
    await userArea.hover();
    await page.waitForTimeout(300);
  }

  // 点击登出按钮
  const logoutButton = page.locator('button[title="登出"]');
  if (await logoutButton.isVisible()) {
    // 监听确认对话框
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await logoutButton.click();
    await page.waitForTimeout(1000);
  }
}

// 检查页面是否有错误
export async function checkForErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  // 检查控制台错误
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  // 检查页面错误
  const errorElement = page.locator('.text-red-500, .error, [role="alert"]');
  const errorCount = await errorElement.count();
  for (let i = 0; i < errorCount; i++) {
    const text = await errorElement.nth(i).textContent();
    if (text) {
      errors.push(`Page Error: ${text}`);
    }
  }

  return errors;
}

// 检查元素是否可点击
export async function isClickable(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout: 5000 });
    const isEnabled = await element.isEnabled();
    return isEnabled;
  } catch {
    return false;
  }
}

// 点击并验证跳转
export async function clickAndVerifyRedirect(
  page: Page,
  selector: string,
  expectedUrl: string
): Promise<boolean> {
  try {
    await page.click(selector);
    await page.waitForTimeout(1000);
    const currentUrl = page.url();
    return currentUrl.includes(expectedUrl);
  } catch {
    return false;
  }
}

// 截图保存
export async function takeScreenshot(page: Page, name: string) {
  const date = new Date().toISOString().split('T')[0];
  await page.screenshot({
    path: `screenshots/${date}/${name}.png`,
    fullPage: true,
  });
}

// 记录测试结果
export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  errors: string[];
  screenshot?: string;
  details?: string;
}

// 生成测试报告
export async function generateReport(results: TestResult[]): Promise<string> {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('zh-CN');

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  let report = `# 测试报告

## 基本信息
- 测试时间：${date} ${time}
- 测试环境：http://localhost:3000
- 测试结果：通过 ${passed} / 失败 ${failed} / 跳过 ${skipped}

## 测试结果

### ✅ 通过项
`;

  results
    .filter((r) => r.status === 'pass')
    .forEach((r) => {
      report += `- [x] ${r.name} (${r.duration}ms)\n`;
    });

  report += `\n### ❌ 失败项\n`;
  results
    .filter((r) => r.status === 'fail')
    .forEach((r) => {
      report += `- [ ] ${r.name}
  - 耗时：${r.duration}ms
  - 错误：${r.errors.join(', ')}
  - 详情：${r.details || '无'}
  - 截图：${r.screenshot || '无'}
\n`;
    });

  report += `\n### ⏭️ 跳过项\n`;
  results
    .filter((r) => r.status === 'skip')
    .forEach((r) => {
      report += `- [ ] ${r.name}\n`;
    });

  report += `\n## 总结
- 总测试数：${results.length}
- 通过率：${((passed / results.length) * 100).toFixed(1)}%
- 执行时间：${results.reduce((acc, r) => acc + r.duration, 0)}ms
`;

  return report;
}
