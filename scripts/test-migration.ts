/**
 * 数据迁移测试脚本
 *
 * 验证 Prisma schema 变更的兼容性
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TestResult {
  name: string
  passed: boolean
  message: string
  duration: number
}

async function runMigrationTests(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // 测试 1: 数据库连接
  results.push(await testDatabaseConnection())

  // 测试 2: 表存在性检查
  results.push(await testTableExistence())

  // 测试 3: 基本 CRUD 操作
  results.push(await testBasicCRUD())

  // 测试 4: 关系完整性
  results.push(await testRelationshipIntegrity())

  // 测试 5: 索引有效性
  results.push(await testIndexEffectiveness())

  return results
}

async function testDatabaseConnection(): Promise<TestResult> {
  const start = Date.now()
  try {
    await prisma.$connect()
    return {
      name: '数据库连接',
      passed: true,
      message: '数据库连接成功',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: '数据库连接',
      passed: false,
      message: `数据库连接失败: ${(error as Error).message}`,
      duration: Date.now() - start,
    }
  }
}

async function testTableExistence(): Promise<TestResult> {
  const start = Date.now()
  try {
    // 检查核心表是否存在
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    ` as Array<{ name: string }>

    const requiredTables = [
      'users',
      'departments',
      'knowledge_cards',
      'policy_links',
      'policy_briefs',
      'sop_tasks',
      'sop_submissions',
      'agent_tasks',
      'knowledge_gaps',
      'feedbacks',
      'loop_executions',
      'scheduler_states',
      'agent_decision_logs',
      'agent_learning_patterns',
      'rule_adjustments',
    ]

    const tableNames = tables.map((t) => t.name)
    const missingTables = requiredTables.filter((t) => !tableNames.includes(t))

    if (missingTables.length > 0) {
      return {
        name: '表存在性检查',
        passed: false,
        message: `缺少表: ${missingTables.join(', ')}`,
        duration: Date.now() - start,
      }
    }

    return {
      name: '表存在性检查',
      passed: true,
      message: `所有 ${requiredTables.length} 个核心表都存在`,
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: '表存在性检查',
      passed: false,
      message: `检查失败: ${(error as Error).message}`,
      duration: Date.now() - start,
    }
  }
}

async function testBasicCRUD(): Promise<TestResult> {
  const start = Date.now()
  try {
    // 测试创建
    const dept = await prisma.department.create({
      data: { name: '测试部门', description: '迁移测试' },
    })

    // 测试读取
    const foundDept = await prisma.department.findUnique({
      where: { id: dept.id },
    })

    if (!foundDept) {
      throw new Error('读取失败')
    }

    // 测试更新
    await prisma.department.update({
      where: { id: dept.id },
      data: { description: '更新后的描述' },
    })

    // 测试删除
    await prisma.department.delete({
      where: { id: dept.id },
    })

    return {
      name: '基本 CRUD 操作',
      passed: true,
      message: 'CRUD 操作全部成功',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: '基本 CRUD 操作',
      passed: false,
      message: `CRUD 操作失败: ${(error as Error).message}`,
      duration: Date.now() - start,
    }
  }
}

async function testRelationshipIntegrity(): Promise<TestResult> {
  const start = Date.now()
  try {
    // 创建测试数据
    const dept = await prisma.department.create({
      data: { name: '关系测试部门' },
    })

    const user = await prisma.user.create({
      data: {
        name: '测试用户',
        departmentId: dept.id,
        role: 'sales',
      },
    })

    // 验证关系
    const userWithDept = await prisma.user.findUnique({
      where: { id: user.id },
      include: { department: true },
    })

    if (!userWithDept?.department || userWithDept.department.id !== dept.id) {
      throw new Error('关系完整性检查失败')
    }

    // 清理测试数据
    await prisma.user.delete({ where: { id: user.id } })
    await prisma.department.delete({ where: { id: dept.id } })

    return {
      name: '关系完整性',
      passed: true,
      message: '关系完整性检查通过',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: '关系完整性',
      passed: false,
      message: `关系完整性检查失败: ${(error as Error).message}`,
      duration: Date.now() - start,
    }
  }
}

async function testIndexEffectiveness(): Promise<TestResult> {
  const start = Date.now()
  try {
    // 测试索引查询（使用 where 条件触发索引）
    await prisma.knowledgeCard.findMany({
      where: { status: 'published' },
      take: 1,
    })

    await prisma.agentTask.findMany({
      where: { status: 'pending' },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: 1,
    })

    await prisma.feedback.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      take: 1,
    })

    return {
      name: '索引有效性',
      passed: true,
      message: '索引查询正常',
      duration: Date.now() - start,
    }
  } catch (error) {
    return {
      name: '索引有效性',
      passed: false,
      message: `索引查询失败: ${(error as Error).message}`,
      duration: Date.now() - start,
    }
  }
}

async function main() {
  console.log('🔍 开始数据迁移测试...\n')

  const results = await runMigrationTests()

  // 输出结果
  console.log('测试结果:')
  console.log('=' .repeat(60))

  let passed = 0
  let failed = 0

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌'
    console.log(`${icon} ${result.name}`)
    console.log(`   ${result.message}`)
    console.log(`   耗时: ${result.duration}ms`)
    console.log()

    if (result.passed) {
      passed++
    } else {
      failed++
    }
  }

  console.log('=' .repeat(60))
  console.log(`总计: ${results.length} 个测试, ${passed} 通过, ${failed} 失败`)

  // 关闭连接
  await prisma.$disconnect()

  // 退出码
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((error) => {
  console.error('测试脚本执行失败:', error)
  process.exit(1)
})
