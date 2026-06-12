/**
 * Mock Brief Generator
 *
 * 生成政策简报的 Mock 实现
 */
import type { BriefGenerator, BriefGenerationInput, BriefGenerationOutput } from './types'

const CUSTOMER_TYPE_MAP: Record<string, string> = {
  restaurant: '餐饮门店',
  retail: '零售企业',
  store: '线下门店',
  advertising: '广告公司',
  startup: '初创公司',
  individual: '个体工商户',
  general: '中小微企业',
}

export class MockBriefGenerator implements BriefGenerator {
  name = 'mock-brief'

  async generateBrief(input: BriefGenerationInput): Promise<BriefGenerationOutput> {
    const targetCustomer = CUSTOMER_TYPE_MAP[input.customerType] || '中小微企业'

    return {
      title: `${input.title} - 政策简报`,
      summary: `本简报针对"${input.title}"进行解读。该政策由${input.source}发布，主要面向${targetCustomer}群体，涉及税收优惠、营商环境优化、融资支持等多个方面。政策的实施将对${targetCustomer}的经营发展产生积极影响。`,
      applicableTo: JSON.stringify([targetCustomer, '中小微企业', '代账客户']),
      keyClauses: [
        `1. 政策背景：${input.source}为支持${targetCustomer}发展出台的扶持政策`,
        `2. 适用范围：注册地在本辖区内的${targetCustomer}`,
        `3. 优惠期限：政策发布之日起至规定截止日期`,
        `4. 申请条件：符合相关资质要求的经营主体`,
        `5. 办理流程：向当地主管部门提交申请材料`,
      ].join('\n'),
      actionSuggestions: [
        `1. 筛选客户：从客户名单中筛选出符合${targetCustomer}条件的客户`,
        `2. 政策通知：通过企微群或电话通知相关客户政策信息`,
        `3. 材料准备：协助客户准备申请所需的证明材料`,
        `4. 申报指导：指导客户完成优惠政策的申报流程`,
        `5. 跟踪反馈：定期跟进客户申报进度，及时反馈结果`,
      ].join('\n'),
      riskReminders: [
        `1. 注意政策适用期限，避免错过申报窗口`,
        `2. 确保客户提供的材料真实完整，避免虚假申报`,
        `3. 关注政策后续调整，及时更新服务方案`,
        `4. 对不符合条件的客户做好解释工作，避免误导`,
        `5. 留存所有沟通记录和服务凭证`,
      ].join('\n'),
      sourceUrl: input.url,
    }
  }
}
