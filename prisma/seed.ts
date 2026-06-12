import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// 默认密码（演示用）
const DEFAULT_PASSWORD = 'password123'
const BCRYPT_ROUNDS = 12

async function main() {
  console.log('🌱 开始填充演示数据...')

  // 预哈希默认密码
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS)
  console.log(`🔑 默认密码已哈希: ${DEFAULT_PASSWORD}`)

  // 清空现有数据（按依赖顺序）
  await prisma.qualityMetrics.deleteMany()
  await prisma.questionHeatMap.deleteMany()
  await prisma.knowledgeGap.deleteMany()
  await prisma.agentTask.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.sOPSubmission.deleteMany()
  await prisma.sOPTask.deleteMany()
  await prisma.experienceQuery.deleteMany()
  await prisma.knowledgeCard.deleteMany()
  await prisma.pushRecord.deleteMany()
  await prisma.policyBrief.deleteMany()
  await prisma.policyLink.deleteMany()
  await prisma.user.deleteMany()
  await prisma.department.deleteMany()

  // ==================== 部门 ====================
  console.log('📁 创建部门...')
  const departments = await Promise.all([
    prisma.department.create({ data: { name: '销售部', description: '负责客户开发与销售' } }),
    prisma.department.create({ data: { name: '客服部', description: '负责客户服务与支持' } }),
    prisma.department.create({ data: { name: '运营部', description: '负责业务运营与管理' } }),
    prisma.department.create({ data: { name: '财务部', description: '负责财务代账与税务' } }),
    prisma.department.create({ data: { name: 'AI 信息部', description: '负责 AI 系统与信息管理' } }),
    prisma.department.create({ data: { name: '管理层', description: '公司管理层' } }),
  ])

  const [salesDept, serviceDept, opsDept, financeDept, aiDept, adminDept] = departments

  // ==================== 用户 ====================
  console.log('👥 创建用户...')
  const users = await Promise.all([
    prisma.user.create({ data: { name: '张销售', departmentId: salesDept.id, role: 'sales', passwordHash } }),
    prisma.user.create({ data: { name: '李客服', departmentId: serviceDept.id, role: 'customer_service', passwordHash } }),
    prisma.user.create({ data: { name: '王运营', departmentId: opsDept.id, role: 'operations', passwordHash } }),
    prisma.user.create({ data: { name: '赵财务', departmentId: financeDept.id, role: 'finance', passwordHash } }),
    prisma.user.create({ data: { name: '陈导师', departmentId: financeDept.id, role: 'mentor', passwordHash } }),
    prisma.user.create({ data: { name: '刘新人', departmentId: salesDept.id, role: 'trainee', passwordHash } }),
    prisma.user.create({ data: { name: '周管理员', departmentId: adminDept.id, role: 'admin', passwordHash } }),
    prisma.user.create({ data: { name: '吴 AI 工程师', departmentId: aiDept.id, role: 'ai_info', passwordHash } }),
    prisma.user.create({ data: { name: '孙销售', departmentId: salesDept.id, role: 'sales', passwordHash } }),
    prisma.user.create({ data: { name: '郑运营', departmentId: opsDept.id, role: 'operations', passwordHash } }),
  ])

  const [zhangSales, liService, wangOps, zhaoFinance, chenMentor, liuTrainee, zhouAdmin, wuAI, sunSales, zhengOps] = users

  // ==================== 政策链接（覆盖餐饮/线下门店/个体工商户） ====================
  console.log('📋 创建政策链接...')
  const policyLinks = await Promise.all([
    // 原有 3 条
    prisma.policyLink.create({
      data: {
        url: 'https://www.gov.cn/zhengce/202401/content_123456.htm',
        title: '关于促进个体工商户发展的意见',
        source: '国务院',
        submitterId: wangOps.id,
        departmentId: opsDept.id,
        customerType: 'individual',
        status: 'reviewed',
      },
    }),
    prisma.policyLink.create({
      data: {
        url: 'https://www.tax.gov.cn/zhengce/202402/content_789012.htm',
        title: '小微企业税收优惠政策解读',
        source: '国家税务总局',
        submitterId: zhaoFinance.id,
        departmentId: financeDept.id,
        customerType: 'startup',
        status: 'brief_generated',
      },
    }),
    prisma.policyLink.create({
      data: {
        url: 'https://www.samr.gov.cn/zhengce/202403/content_345678.htm',
        title: '餐饮服务食品安全操作规范更新',
        source: '市场监管总局',
        submitterId: wangOps.id,
        departmentId: opsDept.id,
        customerType: 'restaurant',
        status: 'pushed',
      },
    }),
    // 新增：餐饮行业政策
    prisma.policyLink.create({
      data: {
        url: 'https://www.tax.gov.cn/zhengce/202404/content_111222.htm',
        title: '餐饮业增值税小规模纳税人减免政策',
        source: '国家税务总局',
        submitterId: zhaoFinance.id,
        departmentId: financeDept.id,
        customerType: 'restaurant',
        status: 'reviewed',
      },
    }),
    // 新增：线下门店政策
    prisma.policyLink.create({
      data: {
        url: 'https://www.mofcom.gov.cn/zhengce/202405/content_333444.htm',
        title: '关于支持实体零售门店数字化转型的通知',
        source: '商务部',
        submitterId: zhengOps.id,
        departmentId: opsDept.id,
        customerType: 'store',
        status: 'brief_generated',
      },
    }),
    // 新增：个体工商户政策
    prisma.policyLink.create({
      data: {
        url: 'https://www.samr.gov.cn/zhengce/202406/content_555666.htm',
        title: '个体工商户分型分类培育方案',
        source: '市场监管总局',
        submitterId: wangOps.id,
        departmentId: opsDept.id,
        customerType: 'individual',
        status: 'submitted',
      },
    }),
    // 新增：广告公司政策
    prisma.policyLink.create({
      data: {
        url: 'https://www.tax.gov.cn/zhengce/202407/content_777888.htm',
        title: '文化创意企业研发费用加计扣除办法',
        source: '国家税务总局',
        submitterId: sunSales.id,
        departmentId: salesDept.id,
        customerType: 'advertising',
        status: 'reviewed',
      },
    }),
    // 新增：零售行业政策
    prisma.policyLink.create({
      data: {
        url: 'https://www.mofcom.gov.cn/zhengce/202408/content_999000.htm',
        title: '零售连锁企业总部统一定税管理办法',
        source: '商务部',
        submitterId: zhengOps.id,
        departmentId: opsDept.id,
        customerType: 'retail',
        status: 'collected',
      },
    }),
  ])

  // ==================== 政策简报（覆盖多行业） ====================
  console.log('📰 创建政策简报...')
  const policyBriefs = await Promise.all([
    // 原有 2 条
    prisma.policyBrief.create({
      data: {
        policyLinkId: policyLinks[0].id,
        title: '个体工商户发展政策简报',
        summary: '国务院出台多项措施支持个体工商户发展，包括减税降费、融资支持、营商环境优化等。',
        applicableTo: JSON.stringify(['个体工商户', '小微企业']),
        keyClauses: '1. 延续实施阶段性降低失业保险、工伤保险费率政策\n2. 加大对个体工商户的金融支持力度\n3. 优化个体工商户营商环境',
        actionSuggestions: '1. 帮助客户申请相关税收优惠\n2. 协助客户了解融资渠道\n3. 提供营业执照变更指导',
        riskReminders: '1. 注意政策适用期限\n2. 确保客户符合申请条件\n3. 保留相关证明材料',
        sourceUrl: 'https://www.gov.cn/zhengce/202401/content_123456.htm',
        generatorId: wangOps.id,
        reviewStatus: 'reviewed',
      },
    }),
    prisma.policyBrief.create({
      data: {
        policyLinkId: policyLinks[1].id,
        title: '小微企业税收优惠政策简报',
        summary: '国家税务总局发布小微企业税收优惠政策，涵盖增值税、企业所得税、个人所得税等多个税种。',
        applicableTo: JSON.stringify(['小微企业', '初创公司']),
        keyClauses: '1. 小规模纳税人增值税减免\n2. 小微企业所得税优惠\n3. 研发费用加计扣除',
        actionSuggestions: '1. 核实客户是否符合小微企业标准\n2. 协助客户进行税收优惠申报\n3. 提供税务筹划建议',
        riskReminders: '1. 注意小微企业认定标准变化\n2. 保留完整财务记录\n3. 按时申报避免罚款',
        sourceUrl: 'https://www.tax.gov.cn/zhengce/202402/content_789012.htm',
        generatorId: zhaoFinance.id,
        reviewStatus: 'pending_review',
      },
    }),
    // 新增：餐饮食品安全简报
    prisma.policyBrief.create({
      data: {
        policyLinkId: policyLinks[2].id,
        title: '餐饮食品安全操作规范更新简报',
        summary: '市场监管总局更新餐饮服务食品安全操作规范，涉及食材溯源、加工卫生、员工健康管理等关键环节。',
        applicableTo: JSON.stringify(['餐饮门店', '食品零售']),
        keyClauses: '1. 食材采购溯源制度\n2. 厨房卫生分区管理\n3. 从业人员健康证更新要求\n4. 食品留样48小时制度',
        actionSuggestions: '1. 帮助餐饮客户建立食材台账\n2. 协助更新卫生管理制度\n3. 提醒客户关注员工健康证有效期',
        riskReminders: '1. 未达标的餐饮门店面临停业整顿风险\n2. 食品安全事故的法律责任',
        sourceUrl: 'https://www.samr.gov.cn/zhengce/202403/content_345678.htm',
        generatorId: wangOps.id,
        reviewStatus: 'reviewed',
      },
    }),
    // 新增：餐饮增值税减免简报
    prisma.policyBrief.create({
      data: {
        policyLinkId: policyLinks[3].id,
        title: '餐饮业小规模纳税人增值税减免简报',
        summary: '针对餐饮行业小规模纳税人的增值税减免新政策，月销售额10万以下免征增值税。',
        applicableTo: JSON.stringify(['餐饮门店', '个体工商户']),
        keyClauses: '1. 月销售额10万以下免征增值税\n2. 季度销售额30万以下免征增值税\n3. 超出部分按1%征收',
        actionSuggestions: '1. 核实客户月销售额是否达标\n2. 协助进行免税申报\n3. 合理规划开票节奏',
        riskReminders: '1. 注意销售额累计计算\n2. 虚开发票风险',
        sourceUrl: 'https://www.tax.gov.cn/zhengce/202404/content_111222.htm',
        generatorId: zhaoFinance.id,
        reviewStatus: 'reviewed',
      },
    }),
    // 新增：门店数字化简报
    prisma.policyBrief.create({
      data: {
        policyLinkId: policyLinks[4].id,
        title: '实体零售门店数字化转型简报',
        summary: '商务部推动实体零售门店数字化转型，提供智能化改造补贴和数字化运营培训支持。',
        applicableTo: JSON.stringify(['线下门店', '零售连锁']),
        keyClauses: '1. 智能化改造最高补贴50%\n2. 数字化运营培训免费参加\n3. 线上线下融合经营模式支持',
        actionSuggestions: '1. 帮助门店客户申请智能化改造补贴\n2. 推荐数字化运营方案\n3. 协助对接供应链数字化平台',
        riskReminders: '1. 补贴申请有时间窗口\n2. 需要满足基础信息化条件',
        sourceUrl: 'https://www.mofcom.gov.cn/zhengce/202405/content_333444.htm',
        generatorId: zhengOps.id,
        reviewStatus: 'pending_review',
      },
    }),
    // 新增：广告公司研发加计扣除简报
    prisma.policyBrief.create({
      data: {
        policyLinkId: policyLinks[6].id,
        title: '文化创意企业研发费用加计扣除简报',
        summary: '国家税务总局明确文化创意企业研发费用加计扣除比例提高至120%。',
        applicableTo: JSON.stringify(['广告公司', '文化创意企业']),
        keyClauses: '1. 研发费用加计扣除比例120%\n2. 人员人工费用可纳入研发费用\n3. 创意设计费用纳入研发范围',
        actionSuggestions: '1. 帮助客户归集研发费用\n2. 协助建立研发费用辅助账\n3. 指导研发费用申报流程',
        riskReminders: '1. 研发费用归集需合规\n2. 需留存研发项目立项资料',
        sourceUrl: 'https://www.tax.gov.cn/zhengce/202407/content_777888.htm',
        generatorId: zhaoFinance.id,
        reviewStatus: 'reviewed',
      },
    }),
  ])

  // ==================== 模拟推送记录 ====================
  console.log('📤 创建模拟推送记录...')
  const pushRecords = await Promise.all([
    prisma.pushRecord.create({
      data: {
        policyBriefId: policyBriefs[0].id,
        policyLinkId: policyLinks[0].id,
        channel: 'wecom',
        targetType: 'department',
        targetId: salesDept.id,
        targetName: '销售部',
        status: 'sent',
        readStatus: 'read',
        payloadSnapshot: JSON.stringify({
          title: '个体工商户发展政策简报',
          summary: '国务院出台多项措施支持个体工商户发展...',
        }),
        pusherId: wangOps.id,
        sentAt: new Date(),
        readAt: new Date(),
      },
    }),
    prisma.pushRecord.create({
      data: {
        policyBriefId: policyBriefs[2].id,
        policyLinkId: policyLinks[2].id,
        channel: 'wecom',
        targetType: 'department',
        targetId: serviceDept.id,
        targetName: '客服部',
        status: 'sent',
        readStatus: 'read',
        payloadSnapshot: JSON.stringify({
          title: '餐饮食品安全操作规范更新简报',
          summary: '市场监管总局更新餐饮服务食品安全操作规范...',
        }),
        pusherId: wangOps.id,
        sentAt: new Date(),
        readAt: new Date(),
      },
    }),
    prisma.pushRecord.create({
      data: {
        policyBriefId: policyBriefs[3].id,
        policyLinkId: policyLinks[3].id,
        channel: 'wecom',
        targetType: 'role',
        targetId: 'finance',
        targetName: '财务岗',
        status: 'sent',
        readStatus: 'unread',
        payloadSnapshot: JSON.stringify({
          title: '餐饮业小规模纳税人增值税减免简报',
          summary: '月销售额10万以下免征增值税...',
        }),
        pusherId: zhaoFinance.id,
        sentAt: new Date(),
      },
    }),
    prisma.pushRecord.create({
      data: {
        policyBriefId: policyBriefs[4].id,
        policyLinkId: policyLinks[4].id,
        channel: 'wecom',
        targetType: 'department',
        targetId: salesDept.id,
        targetName: '销售部',
        status: 'sent',
        readStatus: 'read',
        payloadSnapshot: JSON.stringify({
          title: '实体零售门店数字化转型简报',
          summary: '商务部推动实体零售门店数字化转型...',
        }),
        pusherId: zhengOps.id,
        sentAt: new Date(),
        readAt: new Date(),
      },
    }),
    prisma.pushRecord.create({
      data: {
        policyBriefId: policyBriefs[5].id,
        policyLinkId: policyLinks[6].id,
        channel: 'wecom',
        targetType: 'department',
        targetId: salesDept.id,
        targetName: '销售部',
        status: 'sent',
        readStatus: 'unread',
        payloadSnapshot: JSON.stringify({
          title: '文化创意企业研发费用加计扣除简报',
          summary: '研发费用加计扣除比例提高至120%...',
        }),
        pusherId: zhaoFinance.id,
        sentAt: new Date(),
      },
    }),
  ])

  // ==================== 知识卡（覆盖餐饮/门店/个体工商户场景） ====================
  console.log('📚 创建知识卡...')
  const knowledgeCards = await Promise.all([
    // 原有 3 张
    prisma.knowledgeCard.create({
      data: {
        title: '餐饮门店代账所需资料清单',
        category: 'data_checklist',
        tags: JSON.stringify(['餐饮', '资料清单', '代账']),
        content: `## 餐饮门店代账所需资料

### 基础资料
1. 营业执照副本复印件
2. 法人身份证复印件
3. 银行开户许可证复印件
4. 公章、财务章、法人章

### 每月需提供
1. 银行对账单
2. 收入发票（开具的）
3. 成本发票（取得的）
4. 费用发票（办公、房租、水电等）
5. 工资表
6. 社保缴费单

### 特别注意
- 餐饮行业需保留食材采购凭证
- 外卖平台流水需单独记录
- 储值卡收入需按权责发生制确认`,
        departmentId: financeDept.id,
        customerType: 'restaurant',
        source: '财务部内部经验',
        riskNotes: '资料不齐全可能导致账务处理延误',
        visibilityScope: 'public',
        status: 'published',
        creatorId: zhaoFinance.id,
        reviewerId: zhouAdmin.id,
        reviewedAt: new Date(),
      },
    }),
    prisma.knowledgeCard.create({
      data: {
        title: '餐饮门店常见税务风险',
        category: 'risk_reminder',
        tags: JSON.stringify(['餐饮', '税务风险', '合规']),
        content: `## 餐饮门店常见税务风险

### 1. 收入确认风险
- 风险点：外卖平台收入未全额确认
- 应对：核对平台流水与账面收入

### 2. 成本发票缺失
- 风险点：食材采购无发票
- 应对：要求供应商开具发票，小额零星支出可凭收据入账

### 3. 个税代扣代缴
- 风险点：员工工资未代扣个税
- 应对：建立工资台账，按月申报

### 4. 存货管理
- 风险点：食材损耗未合理确认
- 应对：建立存货盘点制度`,
        departmentId: financeDept.id,
        customerType: 'restaurant',
        source: '财务部风险案例',
        riskNotes: '税务风险可能导致罚款和滞纳金',
        visibilityScope: 'public',
        status: 'published',
        creatorId: zhaoFinance.id,
        reviewerId: zhouAdmin.id,
        reviewedAt: new Date(),
      },
    }),
    prisma.knowledgeCard.create({
      data: {
        title: '代账服务边界说明',
        category: 'service_boundary',
        tags: JSON.stringify(['服务边界', '代账', '免责']),
        content: `## 代账服务边界

### 我们提供的服务
1. 每月账务处理
2. 纳税申报
3. 财务报表编制
4. 税务咨询
5. 工商年检协助

### 我们不提供的服务
1. **税务筹划建议**（需由专业税务师提供）
2. **法律咨询服务**（需由律师提供）
3. **审计鉴证服务**（需由会计师事务所提供）
4. **虚开发票**（违法，坚决不做）

### 免责声明
- 客户提供的资料必须真实、完整
- 因客户提供虚假资料导致的税务问题，由客户承担
- 建议客户重大税务决策前咨询专业人士`,
        departmentId: financeDept.id,
        customerType: 'restaurant',
        source: '财务部服务协议',
        riskNotes: '超出服务边界可能导致法律责任',
        visibilityScope: 'public',
        status: 'published',
        creatorId: zhaoFinance.id,
        reviewerId: zhouAdmin.id,
        reviewedAt: new Date(),
      },
    }),
    // 新增：线下门店代账资料
    prisma.knowledgeCard.create({
      data: {
        title: '线下门店代账资料清单',
        category: 'data_checklist',
        tags: JSON.stringify(['门店', '零售', '资料清单']),
        content: `## 线下门店代账资料清单

### 基础资料
1. 营业执照副本
2. 法人身份证复印件
3. 银行开户许可证
4. 租赁合同复印件
5. 公章、财务章、法人章

### 每月需提供
1. 收银系统导出的销售日报
2. 银行对账单
3. 进货发票和入库单
4. 员工工资表
5. 房租、水电、物业费发票
6. 促销活动费用凭证

### 特别注意
- 连锁门店需分别核算各门店收入
- 会员卡充值收入需按消费进度确认
- 赠品和折扣需规范记录`,
        departmentId: financeDept.id,
        customerType: 'store',
        source: '财务部实战经验',
        riskNotes: '门店数据量大，需建立标准化流程',
        visibilityScope: 'public',
        status: 'published',
        creatorId: zhaoFinance.id,
        reviewerId: zhouAdmin.id,
        reviewedAt: new Date(),
      },
    }),
    // 新增：个体工商户税种说明
    prisma.knowledgeCard.create({
      data: {
        title: '个体工商户税种及优惠政策',
        category: 'tax_process',
        tags: JSON.stringify(['个体工商户', '税种', '优惠政策']),
        content: `## 个体工商户税种及优惠政策

### 主要税种
1. **增值税**：小规模纳税人月销售额10万以下免征
2. **个人所得税**：可选择查账征收或核定征收
3. **附加税**：随增值税缴纳

### 优惠政策
1. 年应纳税所得额200万以下减半征收个人所得税
2. 六税两费减半征收
3. 残疾人就业减免

### 申报周期
- 增值税：月报或季报（可选择）
- 个人所得税：月报或季报
- 附加税：随增值税

### 注意事项
- 核定征收和查账征收的切换规则
- 需要保留经营凭证备查`,
        departmentId: financeDept.id,
        customerType: 'individual',
        source: '国家税务总局政策汇编',
        riskNotes: '优惠政策有适用条件和期限',
        visibilityScope: 'public',
        status: 'published',
        creatorId: zhaoFinance.id,
        reviewerId: zhouAdmin.id,
        reviewedAt: new Date(),
      },
    }),
    // 新增：餐饮客户沟通技巧
    prisma.knowledgeCard.create({
      data: {
        title: '餐饮客户沟通技巧与经验',
        category: 'experience',
        tags: JSON.stringify(['餐饮', '沟通', '销售经验']),
        content: `## 餐饮客户沟通技巧

### 客户画像
- 通常时间紧张，偏好简洁沟通
- 关注成本控制和合规经营
- 对税务知识了解有限

### 沟通要点
1. **开场白**：直接说明服务价值，不要绕弯子
2. **痛点挖掘**：问"您目前代账遇到最大的问题是什么？"
3. **方案呈现**：用餐饮业案例说明，增加可信度
4. **促成合作**：提供首月免费试用或免费税务体检

### 常见异议处理
- "我自己会记账" → 强调合规风险和时间成本
- "太贵了" → 对比税务风险成本
- "已经有代账了" → 强调行业专业化优势

### 促成时机
- 新店开业时
- 食品安全检查前
- 税务申报截止前`,
        departmentId: salesDept.id,
        customerType: 'restaurant',
        source: '销售部经验总结',
        riskNotes: '不要过度承诺服务范围',
        visibilityScope: 'public',
        status: 'published',
        creatorId: zhangSales.id,
        reviewerId: zhouAdmin.id,
        reviewedAt: new Date(),
      },
    }),
    // 新增：线下门店常见问题
    prisma.knowledgeCard.create({
      data: {
        title: '线下门店常见财务问题FAQ',
        category: 'faq',
        tags: JSON.stringify(['门店', 'FAQ', '常见问题']),
        content: `## 线下门店常见财务问题

### Q1: 门店POS机收入和实际收入不一致怎么办？
A: 核对POS机流水、微信/支付宝收款、现金收入，建立每日对账制度。

### Q2: 促销活动的账务怎么处理？
A: 折扣销售按实际收款确认收入；赠品视同销售，需确认销项税。

### Q3: 多门店如何做账？
A: 建议每个门店独立核算，总部汇总报表。连锁经营需注意内部交易的处理。

### Q4: 门店装修费用怎么入账？
A: 租入房屋装修费在租赁期内摊销；自有房屋装修费计入固定资产。

### Q5: 员工社保怎么处理？
A: 按当地社保基数申报，注意新入职员工的社保增员时限。`,
        departmentId: financeDept.id,
        customerType: 'store',
        source: '客服部常见问题汇总',
        riskNotes: '具体问题需结合当地政策',
        visibilityScope: 'public',
        status: 'published',
        creatorId: liService.id,
        reviewerId: zhouAdmin.id,
        reviewedAt: new Date(),
      },
    }),
    // 新增：待审核知识卡
    prisma.knowledgeCard.create({
      data: {
        title: '零售行业库存管理最佳实践',
        category: 'experience',
        tags: JSON.stringify(['零售', '库存', '最佳实践']),
        content: `## 零售行业库存管理最佳实践

### 库存分类管理
1. A类商品（高价值）：每日盘点
2. B类商品（中价值）：每周盘点
3. C类商品（低价值）：每月盘点

### 库存周转率优化
- 定期分析滞销品
- 建立促销清仓机制
- 优化订货周期`,
        departmentId: opsDept.id,
        customerType: 'retail',
        source: '运营部实践经验',
        riskNotes: '库存积压影响现金流',
        visibilityScope: 'department',
        status: 'pending_review',
        creatorId: zhengOps.id,
      },
    }),
  ])

  // ==================== 经验调用记录（覆盖多场景） ====================
  console.log('🔍 创建经验调用记录...')
  const experienceQueries = await Promise.all([
    prisma.experienceQuery.create({
      data: {
        question: '餐饮客户问：我们店刚开业，代账需要准备什么材料？',
        callerId: zhangSales.id,
        retrievedCards: JSON.stringify([knowledgeCards[0].id, knowledgeCards[4].id]),
        generatedReply: JSON.stringify({
          policyExplanation: '根据个体工商户发展政策，新开业餐饮门店可享受税收优惠...',
          serviceOpportunity: '可推荐代账服务，包含每月账务处理和纳税申报',
          salesScript: '您好！新开业的餐饮门店，我们代账服务可以帮您处理账务和税务，您只需要每月提供银行流水和发票即可...',
          riskReminder: '提醒客户保留好所有经营凭证，特别是食材采购发票',
          citedSources: [knowledgeCards[0].id, knowledgeCards[4].id],
        }),
        status: 'generated',
      },
    }),
    prisma.experienceQuery.create({
      data: {
        question: '门店客户问：我们是连锁便利店，多门店怎么做账？',
        callerId: sunSales.id,
        retrievedCards: JSON.stringify([knowledgeCards[3].id, knowledgeCards[6].id]),
        generatedReply: JSON.stringify({
          policyExplanation: '连锁经营企业需要按照门店独立核算，总部汇总报表...',
          serviceOpportunity: '可提供连锁门店统一记账方案，按门店独立核算',
          salesScript: '连锁门店的财务管理，我们有一套成熟的方案，每个门店独立核算，总部可以实时查看各门店的财务状况...',
          riskReminder: '注意内部交易的处理和税务合规',
          citedSources: [knowledgeCards[3].id, knowledgeCards[6].id],
        }),
        status: 'generated',
      },
    }),
    prisma.experienceQuery.create({
      data: {
        question: '个体户客户问：核定征收和查账征收有什么区别？选哪个划算？',
        callerId: zhangSales.id,
        retrievedCards: JSON.stringify([knowledgeCards[5].id]),
        generatedReply: JSON.stringify({
          policyExplanation: '核定征收由税务机关核定应纳税额，查账征收按实际利润计算...',
          serviceOpportunity: '可提供税务筹划服务，帮助客户选择最优征收方式',
          salesScript: '核定征收和查账征收各有优劣，我帮您分析一下哪种更适合您的情况...',
          riskReminder: '征收方式选择后一般一年内不能变更',
          citedSources: [knowledgeCards[5].id],
        }),
        status: 'generated',
      },
    }),
    prisma.experienceQuery.create({
      data: {
        question: '广告公司问：我们的设计费可以算研发费用加计扣除吗？',
        callerId: sunSales.id,
        retrievedCards: JSON.stringify([]),
        generatedReply: JSON.stringify({
          policyExplanation: '根据最新政策，文化创意企业的创意设计费用可纳入研发费用范围...',
          serviceOpportunity: '可帮助客户归集研发费用，申请120%加计扣除',
          salesScript: '广告公司的创意设计费用是可以纳入研发费用的，加计扣除比例提高到了120%，我们可以帮您做这笔费用的归集...',
          riskReminder: '需要建立研发费用辅助账，留存项目立项资料',
          citedSources: [],
        }),
        status: 'generated',
      },
    }),
  ])

  // ==================== SOP 训练任务（覆盖多场景） ====================
  console.log('📝 创建 SOP 训练任务...')
  const sopTasks = await Promise.all([
    // 原有 1 条
    prisma.sOPTask.create({
      data: {
        title: '餐饮客户初次接触 SOP',
        description: '学习如何与餐饮客户进行初次沟通，了解客户需求并提供初步建议',
        template: `## 餐饮客户初次接触 SOP

### 第一步：自我介绍
- 介绍公司和自己的职责
- 说明服务内容

### 第二步：了解客户
- 询问门店类型（堂食/外卖/混合）
- 了解经营规模（座位数/员工数）
- 询问当前财务状况

### 第三步：需求分析
- 了解客户痛点
- 评估服务需求

### 第四步：初步建议
- 提供基本服务方案
- 说明服务边界

### 第五步：后续跟进
- 约定下次沟通时间
- 发送资料清单`,
        requirements: '按照 SOP 步骤完成，确保每个步骤都有记录',
        mentorId: chenMentor.id,
        traineeId: liuTrainee.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'in_progress',
      },
    }),
    // 新增：门店客户拜访 SOP
    prisma.sOPTask.create({
      data: {
        title: '线下门店客户拜访 SOP',
        description: '学习如何进行线下门店客户的实地拜访和需求调研',
        template: `## 线下门店客户拜访 SOP

### 第一步：拜访前准备
- 了解客户门店基本信息
- 准备公司介绍资料
- 准备行业案例

### 第二步：到店观察
- 观察门店经营状况
- 了解客流和消费水平
- 评估财务管理水平

### 第三步：与店长/老板沟通
- 了解当前代账情况
- 询问经营痛点
- 了解财务需求

### 第四步：现场演示
- 演示智能记账系统
- 展示报表样例
- 说明服务流程

### 第五步：后续计划
- 发送报价方案
- 约定签约时间`,
        requirements: '完成实地拜访并提交拜访报告',
        mentorId: chenMentor.id,
        traineeId: liuTrainee.id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'assigned',
      },
    }),
    // 新增：税务风险识别 SOP
    prisma.sOPTask.create({
      data: {
        title: '客户税务风险识别 SOP',
        description: '学习如何识别客户潜在税务风险并提供预警',
        template: `## 客户税务风险识别 SOP

### 第一步：资料审查
- 检查发票开具和取得情况
- 核对银行流水与账面记录
- 检查纳税申报记录

### 第二步：风险扫描
- 收入确认完整性
- 成本费用合规性
- 税种税率准确性
- 优惠政策适用性

### 第三步：风险评估
- 按风险等级分类
- 评估影响程度
- 制定应对方案

### 第四步：风险报告
- 编写风险评估报告
- 提出改进建议
- 跟踪整改情况`,
        requirements: '对2个模拟客户进行风险识别练习',
        mentorId: chenMentor.id,
        traineeId: liuTrainee.id,
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        status: 'assigned',
      },
    }),
  ])

  // 创建 SOP 提交记录
  const sopSubmissions = await Promise.all([
    prisma.sOPSubmission.create({
      data: {
        taskId: sopTasks[0].id,
        content: `## 餐饮客户初次接触 - 实操记录

### 第一步：自我介绍
完成与客户王老板的初次见面，介绍了恒识代账服务。

### 第二步：了解客户
- 门店类型：堂食+外卖
- 经营规模：80平米，12名员工
- 月营业额约15万
- 目前由会计兼职处理账务

### 第三步：需求分析
- 痛点：外卖平台对账困难
- 痛点：担心税务合规问题
- 需求：规范的代账服务

### 第四步：初步建议
- 推荐基础代账套餐
- 承诺协助外卖平台对账

### 第五步：后续跟进
- 已发送资料清单
- 约定3天后签约`,
        submitterId: liuTrainee.id,
        completeness: 85,
        missingSteps: '未详细说明服务边界',
        riskPoints: '未充分了解客户财务历史',
        executability: 80,
        status: 'submitted',
      },
    }),
  ])

  // ==================== 审计日志 ====================
  console.log('📊 创建审计日志...')
  await Promise.all([
    prisma.auditLog.create({
      data: {
        userId: wangOps.id,
        action: 'create',
        entityType: 'policy_link',
        entityId: policyLinks[0].id,
        details: JSON.stringify({ title: policyLinks[0].title }),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: wangOps.id,
        action: 'generate',
        entityType: 'policy_brief',
        entityId: policyBriefs[0].id,
        details: JSON.stringify({ title: policyBriefs[0].title }),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: zhouAdmin.id,
        action: 'review',
        entityType: 'policy_brief',
        entityId: policyBriefs[0].id,
        details: JSON.stringify({ status: 'reviewed' }),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: zhaoFinance.id,
        action: 'create',
        entityType: 'knowledge_card',
        entityId: knowledgeCards[0].id,
        details: JSON.stringify({ title: knowledgeCards[0].title }),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: zhouAdmin.id,
        action: 'publish',
        entityType: 'knowledge_card',
        entityId: knowledgeCards[0].id,
        details: JSON.stringify({ status: 'published' }),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: zhangSales.id,
        action: 'query',
        entityType: 'experience_query',
        entityId: experienceQueries[0].id,
        details: JSON.stringify({ question: '餐饮客户初次咨询' }),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: zhaoFinance.id,
        action: 'create',
        entityType: 'policy_link',
        entityId: policyLinks[3].id,
        details: JSON.stringify({ title: policyLinks[3].title }),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: zhengOps.id,
        action: 'create',
        entityType: 'policy_link',
        entityId: policyLinks[4].id,
        details: JSON.stringify({ title: policyLinks[4].title }),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: sunSales.id,
        action: 'query',
        entityType: 'experience_query',
        entityId: experienceQueries[1].id,
        details: JSON.stringify({ question: '连锁门店做账' }),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: liuTrainee.id,
        action: 'submit',
        entityType: 'sop_submission',
        entityId: sopSubmissions[0].id,
        details: JSON.stringify({ taskId: sopTasks[0].id }),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: zhaoFinance.id,
        action: 'create',
        entityType: 'knowledge_card',
        entityId: knowledgeCards[5].id,
        details: JSON.stringify({ title: knowledgeCards[5].title }),
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: wangOps.id,
        action: 'push',
        entityType: 'push_record',
        entityId: pushRecords[1].id,
        details: JSON.stringify({ target: '客服部', brief: policyBriefs[2].title }),
      },
    }),
  ])

  // ==================== Agent 任务（P0） ====================
  console.log('🤖 创建 Agent 任务...')
  await Promise.all([
    prisma.agentTask.create({
      data: {
        type: 'knowledge_review',
        title: '审核「跨境电商退税流程」知识卡',
        description: 'Agent 预审完成，建议通过',
        status: 'completed',
        priority: 'high',
        assignedTo: chenMentor.id,
        createdBy: wuAI.id,
        completedAt: new Date(),
        result: JSON.stringify({ preReview: 'pass', suggestion: '格式规范，内容完整，建议通过' }),
      },
    }),
    prisma.agentTask.create({
      data: {
        type: 'knowledge_review',
        title: '审核「客户投诉处理话术 v3」知识卡',
        description: 'Agent 预审发现缺少案例佐证',
        status: 'pending',
        priority: 'medium',
        assignedTo: chenMentor.id,
        createdBy: wuAI.id,
        result: JSON.stringify({ preReview: 'warning', suggestion: '缺少案例佐证，建议补充' }),
      },
    }),
    prisma.agentTask.create({
      data: {
        type: 'sop_review',
        title: '审核「新员工入职培训流程」SOP',
        description: 'Agent 预审完成，流程清晰',
        status: 'completed',
        priority: 'medium',
        assignedTo: chenMentor.id,
        createdBy: wuAI.id,
        completedAt: new Date(),
        result: JSON.stringify({ preReview: 'pass', suggestion: '流程清晰，建议通过' }),
      },
    }),
    prisma.agentTask.create({
      data: {
        type: 'brief_generation',
        title: '生成「2026-Q2 财税政策汇编」简报',
        description: 'Agent 预审发现有 2 条政策编号待核实',
        status: 'pending',
        priority: 'high',
        assignedTo: zhaoFinance.id,
        createdBy: wuAI.id,
        result: JSON.stringify({ preReview: 'warning', suggestion: '有 2 条政策编号待核实' }),
      },
    }),
    prisma.agentTask.create({
      data: {
        type: 'gap_fill',
        title: '补充「竞品价格对比」知识卡',
        description: '被问 23 次，无知识卡覆盖',
        status: 'pending',
        priority: 'high',
        createdBy: wuAI.id,
        result: JSON.stringify({ frequency: 23, suggestion: '创建知识卡' }),
      },
    }),
  ])

  // ==================== 知识缺口（P0） ====================
  console.log('🔍 创建知识缺口记录...')
  await Promise.all([
    prisma.knowledgeGap.create({
      data: {
        question: '竞品价格对比',
        department: '销售部',
        topic: '竞品分析',
        frequency: 23,
        priority: 'high',
        status: 'pending',
        suggestedAction: 'create_card',
      },
    }),
    prisma.knowledgeGap.create({
      data: {
        question: '跨部门协作流程',
        department: '运营部',
        topic: '内部流程',
        frequency: 18,
        priority: 'medium',
        status: 'pending',
        suggestedAction: 'update_card',
      },
    }),
    prisma.knowledgeGap.create({
      data: {
        question: '客户分级标准',
        department: '销售部',
        topic: '客户管理',
        frequency: 15,
        priority: 'medium',
        status: 'in_progress',
        suggestedAction: 'rewrite_card',
      },
    }),
  ])

  // ==================== 问答热力图（P1） ====================
  console.log('📊 创建问答热力图统计...')
  await Promise.all([
    // 销售部
    prisma.questionHeatMap.create({ data: { department: '销售部', topic: '价格异议处理', frequency: 45, timeRange: 'this_week' } }),
    prisma.questionHeatMap.create({ data: { department: '销售部', topic: '产品功能对比', frequency: 28, timeRange: 'this_week' } }),
    prisma.questionHeatMap.create({ data: { department: '销售部', topic: '竞品分析', frequency: 23, timeRange: 'this_week' } }),
    // 客服部
    prisma.questionHeatMap.create({ data: { department: '客服部', topic: '退款流程', frequency: 38, timeRange: 'this_week' } }),
    prisma.questionHeatMap.create({ data: { department: '客服部', topic: '服务边界', frequency: 22, timeRange: 'this_week' } }),
    prisma.questionHeatMap.create({ data: { department: '客服部', topic: '投诉升级', frequency: 12, timeRange: 'this_week' } }),
    // 运营部
    prisma.questionHeatMap.create({ data: { department: '运营部', topic: '活动执行SOP', frequency: 32, timeRange: 'this_week' } }),
    prisma.questionHeatMap.create({ data: { department: '运营部', topic: '数据报表解读', frequency: 18, timeRange: 'this_week' } }),
    // 新员工
    prisma.questionHeatMap.create({ data: { department: '新员工', topic: '入职流程', frequency: 42, timeRange: 'this_week' } }),
    prisma.questionHeatMap.create({ data: { department: '新员工', topic: '系统权限申请', frequency: 25, timeRange: 'this_week' } }),
    prisma.questionHeatMap.create({ data: { department: '新员工', topic: '汇报关系', frequency: 8, timeRange: 'this_week' } }),
  ])

  // ==================== 质量监控指标（P1） ====================
  console.log('📈 创建质量监控指标...')
  await Promise.all([
    prisma.qualityMetrics.create({ data: { metricType: 'coverage', value: 78, target: 90, department: null } }),
    prisma.qualityMetrics.create({ data: { metricType: 'citation_rate', value: 62, target: 80, department: null } }),
    prisma.qualityMetrics.create({ data: { metricType: 'satisfaction', value: 4.1, target: 4.5, department: null } }),
    prisma.qualityMetrics.create({ data: { metricType: 'outdated_rate', value: 2.6, target: 1, department: null } }),
  ])

  console.log('✅ 演示数据填充完成！')
  console.log(`
📊 数据统计：
- 部门：${await prisma.department.count()} 个
- 用户：${await prisma.user.count()} 个
- 政策链接：${await prisma.policyLink.count()} 条
- 政策简报：${await prisma.policyBrief.count()} 条
- 推送记录：${await prisma.pushRecord.count()} 条
- 知识卡：${await prisma.knowledgeCard.count()} 张
- 经验调用：${await prisma.experienceQuery.count()} 条
- SOP 任务：${await prisma.sOPTask.count()} 个
- SOP 提交：${await prisma.sOPSubmission.count()} 条
- 审计日志：${await prisma.auditLog.count()} 条
- Agent 任务：${await prisma.agentTask.count()} 个
- 知识缺口：${await prisma.knowledgeGap.count()} 条
- 问答热力图：${await prisma.questionHeatMap.count()} 条
- 质量监控指标：${await prisma.qualityMetrics.count()} 条
  `)
}

main()
  .catch((e) => {
    console.error('❌ 错误：', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
