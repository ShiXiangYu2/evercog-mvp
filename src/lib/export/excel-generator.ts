/**
 * Excel 生成器
 *
 * 将知识卡导出为 Excel 格式
 */
import ExcelJS from 'exceljs'

// ==================== 类型定义 ====================

export interface KnowledgeCardExcelData {
  id: string
  title: string
  category: string
  content: string
  tags: string | null
  source: string | null
  riskNotes: string | null
  visibilityScope: string
  status: string
  creatorName: string
  departmentName: string | null
  createdAt: Date
  updatedAt: Date
}

// ==================== Excel 生成器 ====================

export class ExcelGenerator {
  /**
   * 生成知识卡 Excel
   */
  async generateKnowledgeCardsExcel(
    cards: KnowledgeCardExcelData[]
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Evercog MVP'
    workbook.created = new Date()

    // 创建知识卡工作表
    const worksheet = workbook.addWorksheet('知识卡')

    // 设置列
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 20 },
      { header: '标题', key: 'title', width: 30 },
      { header: '分类', key: 'category', width: 15 },
      { header: '标签', key: 'tags', width: 20 },
      { header: '内容', key: 'content', width: 50 },
      { header: '来源', key: 'source', width: 15 },
      { header: '风险提示', key: 'riskNotes', width: 25 },
      { header: '可见范围', key: 'visibilityScope', width: 12 },
      { header: '状态', key: 'status', width: 10 },
      { header: '创建人', key: 'creatorName', width: 12 },
      { header: '所属部门', key: 'departmentName', width: 12 },
      { header: '创建时间', key: 'createdAt', width: 18 },
      { header: '更新时间', key: 'updatedAt', width: 18 },
    ]

    // 设置表头样式
    worksheet.getRow(1).font = { bold: true, size: 11 }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF10B981' },
    }
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    // 分类映射
    const categoryMap: Record<string, string> = {
      data_checklist: '资料清单',
      tax_process: '税务流程',
      risk_reminder: '风险提醒',
      service_boundary: '服务边界',
      faq: '常见问题',
      experience: '经验分享',
    }

    // 可见范围映射
    const visibilityMap: Record<string, string> = {
      department: '部门内',
      role: '角色内',
      public: '公开',
    }

    // 状态映射
    const statusMap: Record<string, string> = {
      draft: '草稿',
      pending_review: '待审核',
      published: '已发布',
      rejected: '已拒绝',
      archived: '已归档',
    }

    // 添加数据
    for (const card of cards) {
      worksheet.addRow({
        id: card.id,
        title: card.title,
        category: categoryMap[card.category] || card.category,
        tags: card.tags ? JSON.parse(card.tags).join(', ') : '',
        content: card.content.substring(0, 200) + (card.content.length > 200 ? '...' : ''),
        source: card.source || '',
        riskNotes: card.riskNotes || '',
        visibilityScope: visibilityMap[card.visibilityScope] || card.visibilityScope,
        status: statusMap[card.status] || card.status,
        creatorName: card.creatorName,
        departmentName: card.departmentName || '',
        createdAt: card.createdAt.toLocaleDateString('zh-CN'),
        updatedAt: card.updatedAt.toLocaleDateString('zh-CN'),
      })
    }

    // 设置筛选
    worksheet.autoFilter = {
      from: 'A1',
      to: `M${cards.length + 1}`,
    }

    // 冻结首行
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]

    // 生成 Buffer
    const buffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(buffer)
  }
}

// ==================== 单例导出 ====================

let _excelGenerator: ExcelGenerator | null = null

export function getExcelGenerator(): ExcelGenerator {
  if (!_excelGenerator) {
    _excelGenerator = new ExcelGenerator()
  }
  return _excelGenerator
}
