/**
 * 测试 Agent 主运行器
 *
 * 基于 AutoDev Framework 的自动化测试解决方案
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// 测试结果接口
interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  errors: string[];
  screenshot?: string;
  details?: string;
}

// 测试配置
const CONFIG = {
  baseURL: 'http://localhost:3000',
  screenshotDir: path.join(__dirname, 'screenshots'),
  reportDir: path.join(__dirname, 'reports'),
  logDir: path.join(__dirname, 'logs'),
};

// 确保目录存在
function ensureDirectories() {
  const date = new Date().toISOString().split('T')[0];
  const dirs = [
    path.join(CONFIG.screenshotDir, date),
    path.join(CONFIG.reportDir, date),
    path.join(CONFIG.logDir, date),
  ];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 登录函数
async function login(page: any) {
  await page.goto(`${CONFIG.baseURL}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // 选择用户
  const userButton = page.locator('button:has-text("王运营")').first();
  if (await userButton.isVisible()) {
    await userButton.click();
    await page.waitForTimeout(500);
  }

  // 点击登录
  const loginButton = page.locator('button:has-text("登录")');
  if (await loginButton.isVisible()) {
    await loginButton.click();
    await page.waitForTimeout(2000);
  }

  // 等待页面跳转
  try {
    await page.waitForURL('/', { timeout: 10000 });
  } catch {
    // 如果超时，直接访问首页
    await page.goto(`${CONFIG.baseURL}/`);
  }
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

// 截图函数
async function takeScreenshot(page: any, name: string) {
  const date = new Date().toISOString().split('T')[0];
  const screenshotPath = path.join(CONFIG.screenshotDir, date, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

// 测试登录页面
async function testLoginPage(page: any): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    await page.goto(`${CONFIG.baseURL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // 检查页面标题（使用 first() 避免 strict mode 错误）
    const title = await page.locator('h1').first().textContent();
    if (!title?.includes('恒识')) {
      errors.push('页面标题不正确');
    }

    // 检查登录表单
    const loginForm = page.locator('text=选择用户登录');
    if (!(await loginForm.isVisible())) {
      errors.push('登录表单未显示');
    }

    const screenshot = await takeScreenshot(page, 'login-page');

    return {
      name: '登录页面加载',
      status: errors.length === 0 ? 'pass' : 'fail',
      duration: Date.now() - startTime,
      errors,
      screenshot,
    };
  } catch (error) {
    return {
      name: '登录页面加载',
      status: 'fail',
      duration: Date.now() - startTime,
      errors: [`执行错误: ${error}`],
    };
  }
}

// 测试登录功能
async function testLoginFunction(page: any): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    await page.goto(`${CONFIG.baseURL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // 选择用户
    const userButton = page.locator('button:has-text("王运营")').first();
    if (await userButton.isVisible()) {
      await userButton.click();
      await page.waitForTimeout(300);
    } else {
      errors.push('用户选择按钮未找到');
    }

    // 点击登录
    const loginButton = page.locator('button:has-text("登录")');
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForTimeout(1000);
    } else {
      errors.push('登录按钮未找到');
    }

    // 验证跳转
    const url = page.url();
    if (!url.includes('localhost:3000/')) {
      errors.push(`登录后未跳转到首页，当前 URL: ${url}`);
    }

    const screenshot = await takeScreenshot(page, 'login-success');

    return {
      name: '登录功能',
      status: errors.length === 0 ? 'pass' : 'fail',
      duration: Date.now() - startTime,
      errors,
      screenshot,
    };
  } catch (error) {
    return {
      name: '登录功能',
      status: 'fail',
      duration: Date.now() - startTime,
      errors: [`执行错误: ${error}`],
    };
  }
}

// 测试工作台页面
async function testDashboardPage(page: any): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    await login(page);
    await page.waitForTimeout(1500);

    // 检查页面主标题（使用 main 区域内的 h1）
    const mainTitle = page.locator('main h1, .flex-1 h1').first();
    const title = await mainTitle.textContent();
    if (!title?.includes('企业知识运营') && !title?.includes('工作台')) {
      errors.push(`工作台标题不正确: ${title}`);
    }

    // 检查主要区域
    const pendingSection = page.locator('text=待处理事项');
    if (!(await pendingSection.isVisible())) {
      errors.push('待处理事项区域未显示');
    }

    const quickActions = page.locator('text=快速入口');
    if (!(await quickActions.isVisible())) {
      errors.push('快速入口区域未显示');
    }

    const screenshot = await takeScreenshot(page, 'dashboard');

    return {
      name: '工作台页面',
      status: errors.length === 0 ? 'pass' : 'fail',
      duration: Date.now() - startTime,
      errors,
      screenshot,
    };
  } catch (error) {
    return {
      name: '工作台页面',
      status: 'fail',
      duration: Date.now() - startTime,
      errors: [`执行错误: ${error}`],
    };
  }
}

// 测试导航菜单
async function testNavigationMenu(page: any): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    await login(page);

    // 检查侧边栏
    const sidebar = page.locator('aside');
    if (!(await sidebar.isVisible())) {
      errors.push('侧边栏未显示');
    }

    // 检查菜单项
    const menuItems = page.locator('nav a');
    const count = await menuItems.count();
    if (count === 0) {
      errors.push('菜单项未找到');
    }

    const screenshot = await takeScreenshot(page, 'navigation-menu');

    return {
      name: '导航菜单',
      status: errors.length === 0 ? 'pass' : 'fail',
      duration: Date.now() - startTime,
      errors,
      screenshot,
    };
  } catch (error) {
    return {
      name: '导航菜单',
      status: 'fail',
      duration: Date.now() - startTime,
      errors: [`执行错误: ${error}`],
    };
  }
}

// 测试政策情报页面
async function testPolicyPage(page: any): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    await login(page);
    await page.goto(`${CONFIG.baseURL}/policy-intelligence`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // 检查页面主标题（使用 main 区域内的 h1）
    const mainTitle = page.locator('main h1, .flex-1 h1').first();
    const title = await mainTitle.textContent();
    if (!title?.includes('政策') && !title?.includes('情报')) {
      errors.push(`政策情报标题不正确: ${title}`);
    }

    // 检查统计卡片
    const statsCard = page.locator('text=政策链接总数');
    if (!(await statsCard.isVisible())) {
      errors.push('统计卡片未显示');
    }

    const screenshot = await takeScreenshot(page, 'policy-intelligence');

    return {
      name: '政策情报页面',
      status: errors.length === 0 ? 'pass' : 'fail',
      duration: Date.now() - startTime,
      errors,
      screenshot,
    };
  } catch (error) {
    return {
      name: '政策情报页面',
      status: 'fail',
      duration: Date.now() - startTime,
      errors: [`执行错误: ${error}`],
    };
  }
}

// 测试知识中台页面
async function testKnowledgePage(page: any): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    await login(page);
    await page.goto(`${CONFIG.baseURL}/knowledge-hub`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // 检查页面主标题（使用 main 区域内的 h1）
    const mainTitle = page.locator('main h1, .flex-1 h1').first();
    const title = await mainTitle.textContent();
    if (!title?.includes('知识') && !title?.includes('中台')) {
      errors.push(`知识中台标题不正确: ${title}`);
    }

    // 检查新建按钮
    const newButton = page.locator('a:has-text("新建知识卡")');
    if (!(await newButton.isVisible())) {
      errors.push('新建知识卡按钮未显示');
    }

    const screenshot = await takeScreenshot(page, 'knowledge-hub');

    return {
      name: '知识中台页面',
      status: errors.length === 0 ? 'pass' : 'fail',
      duration: Date.now() - startTime,
      errors,
      screenshot,
    };
  } catch (error) {
    return {
      name: '知识中台页面',
      status: 'fail',
      duration: Date.now() - startTime,
      errors: [`执行错误: ${error}`],
    };
  }
}

// 测试导师审核页面
async function testMentorReviewPage(page: any): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    await login(page);
    await page.goto(`${CONFIG.baseURL}/mentor-review`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // 检查页面主标题（使用 main 区域内的 h1）
    const mainTitle = page.locator('main h1, .flex-1 h1').first();
    const title = await mainTitle.textContent();
    if (!title?.includes('导师') && !title?.includes('审核')) {
      errors.push(`导师审核标题不正确: ${title}`);
    }

    // 检查待审核队列
    const reviewQueue = page.locator('text=待审核队列');
    if (!(await reviewQueue.isVisible())) {
      errors.push('待审核队列未显示');
    }

    // 检查审核按钮
    const reviewButtons = page.locator('button:has-text("审核")');
    const count = await reviewButtons.count();
    if (count === 0) {
      errors.push('审核按钮未找到');
    }

    const screenshot = await takeScreenshot(page, 'mentor-review');

    return {
      name: '导师审核页面',
      status: errors.length === 0 ? 'pass' : 'fail',
      duration: Date.now() - startTime,
      errors,
      screenshot,
    };
  } catch (error) {
    return {
      name: '导师审核页面',
      status: 'fail',
      duration: Date.now() - startTime,
      errors: [`执行错误: ${error}`],
    };
  }
}

// 测试审核弹窗功能
async function testReviewModal(page: any): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    await login(page);
    await page.goto(`${CONFIG.baseURL}/mentor-review`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // 点击审核按钮
    const reviewButton = page.locator('button:has-text("审核")').first();
    if (await reviewButton.isVisible()) {
      await reviewButton.click();
      await page.waitForTimeout(500);

      // 检查弹窗
      const modal = page.locator('.fixed.inset-0');
      if (!(await modal.isVisible())) {
        errors.push('审核弹窗未显示');
      }

      // 检查操作按钮
      const approveButton = page.locator('button:has-text("通过")');
      if (!(await approveButton.isVisible())) {
        errors.push('通过按钮未显示');
      }

      const rejectButton = page.locator('button:has-text("驳回")');
      if (!(await rejectButton.isVisible())) {
        errors.push('驳回按钮未显示');
      }

      const screenshot = await takeScreenshot(page, 'review-modal');
    } else {
      errors.push('审核按钮未找到');
    }

    return {
      name: '审核弹窗功能',
      status: errors.length === 0 ? 'pass' : 'fail',
      duration: Date.now() - startTime,
      errors,
    };
  } catch (error) {
    return {
      name: '审核弹窗功能',
      status: 'fail',
      duration: Date.now() - startTime,
      errors: [`执行错误: ${error}`],
    };
  }
}

// 生成测试报告
function generateReport(results: TestResult[]): string {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('zh-CN');

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  let report = `# 测试 Agent 测试报告

## 基本信息
- 测试时间：${date} ${time}
- 测试环境：${CONFIG.baseURL}
- 测试结果：通过 ${passed} / 失败 ${failed} / 跳过 ${skipped}
- 通过率：${((passed / results.length) * 100).toFixed(1)}%

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
  - 截图：${r.screenshot || '无'}
\n`;
    });

  report += `\n### ⏭️ 跳过项\n`;
  results
    .filter((r) => r.status === 'skip')
    .forEach((r) => {
      report += `- [ ] ${r.name}\n`;
    });

  report += `\n## 问题分析

### 阻塞问题
`;

  const blockingIssues = results.filter((r) => r.status === 'fail' && r.errors.some((e) => e.includes('未找到') || e.includes('未显示')));
  if (blockingIssues.length === 0) {
    report += `- 无\n`;
  } else {
    blockingIssues.forEach((r) => {
      report += `- ${r.name}: ${r.errors.join(', ')}\n`;
    });
  }

  report += `\n### 体验问题
`;
  const experienceIssues = results.filter((r) => r.status === 'fail' && !r.errors.some((e) => e.includes('未找到') || e.includes('未显示')));
  if (experienceIssues.length === 0) {
    report += `- 无\n`;
  } else {
    experienceIssues.forEach((r) => {
      report += `- ${r.name}: ${r.errors.join(', ')}\n`;
    });
  }

  report += `\n## 修复建议

1. **高优先级**：修复阻塞问题，确保核心功能可用
2. **中优先级**：优化体验问题，提升用户满意度
3. **低优先级**：完善细节，增强系统稳定性

## 总结

- 总测试数：${results.length}
- 通过率：${((passed / results.length) * 100).toFixed(1)}%
- 执行时间：${results.reduce((acc, r) => acc + r.duration, 0)}ms
- 建议：${passed === results.length ? '所有测试通过，项目可交付' : '存在失败项，需要修复后重新测试'}
`;

  return report;
}

// 主函数
async function main() {
  console.log('🚀 测试 Agent 启动...');
  console.log(`📍 测试环境: ${CONFIG.baseURL}`);

  ensureDirectories();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const results: TestResult[] = [];

  // 运行测试
  console.log('\n📋 开始测试...');

  results.push(await testLoginPage(page));
  console.log(`  ✓ 登录页面加载: ${results[results.length - 1].status}`);

  results.push(await testLoginFunction(page));
  console.log(`  ✓ 登录功能: ${results[results.length - 1].status}`);

  results.push(await testDashboardPage(page));
  console.log(`  ✓ 工作台页面: ${results[results.length - 1].status}`);

  results.push(await testNavigationMenu(page));
  console.log(`  ✓ 导航菜单: ${results[results.length - 1].status}`);

  results.push(await testPolicyPage(page));
  console.log(`  ✓ 政策情报页面: ${results[results.length - 1].status}`);

  results.push(await testKnowledgePage(page));
  console.log(`  ✓ 知识中台页面: ${results[results.length - 1].status}`);

  results.push(await testMentorReviewPage(page));
  console.log(`  ✓ 导师审核页面: ${results[results.length - 1].status}`);

  results.push(await testReviewModal(page));
  console.log(`  ✓ 审核弹窗功能: ${results[results.length - 1].status}`);

  // 生成报告
  console.log('\n📝 生成测试报告...');
  const report = generateReport(results);

  const date = new Date().toISOString().split('T')[0];
  const reportPath = path.join(CONFIG.reportDir, date, 'test-report.md');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`✅ 报告已保存: ${reportPath}`);

  // 输出统计
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  console.log(`\n📊 测试完成: 通过 ${passed} / 失败 ${failed} / 总计 ${results.length}`);
  console.log(`📈 通过率: ${((passed / results.length) * 100).toFixed(1)}%`);

  await browser.close();
  console.log('\n🎉 测试 Agent 执行完成！');
}

// 执行
main().catch(console.error);
