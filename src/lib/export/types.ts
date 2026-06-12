/**
 * Exporter 类型定义
 *
 * 统一导出器接口，支持多种格式
 */

// ==================== 基础接口 ====================

/**
 * 导出器接口
 *
 * 所有导出器实现此接口，支持将数据导出为特定格式
 *
 * @template T 导出数据类型
 */
export interface Exporter<T> {
  /** 导出器名称 */
  readonly name: string

  /** 导出文件扩展名 */
  readonly extension: string

  /** MIME 类型 */
  readonly mimeType: string

  /**
   * 导出数据
   *
   * @param data 要导出的数据
   * @returns 导出的文件内容（Uint8Array）
   */
  export(data: T): Promise<Uint8Array>
}

// ==================== 导出格式 ====================

/**
 * 支持的导出格式
 */
export type ExportFormat = 'pdf' | 'csv' | 'excel'

/**
 * 导出格式信息
 */
export interface ExportFormatInfo {
  format: ExportFormat
  name: string
  extension: string
  mimeType: string
}

/**
 * 支持的导出格式列表
 */
export const EXPORT_FORMATS: Record<ExportFormat, ExportFormatInfo> = {
  pdf: {
    format: 'pdf',
    name: 'PDF',
    extension: '.pdf',
    mimeType: 'application/pdf',
  },
  csv: {
    format: 'csv',
    name: 'CSV',
    extension: '.csv',
    mimeType: 'text/csv',
  },
  excel: {
    format: 'excel',
    name: 'Excel',
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
}

// ==================== 政策简报导出 ====================

/**
 * 政策简报导出数据
 */
export interface PolicyBriefExportData {
  title: string
  summary: string
  applicableTo: string
  keyClauses: string
  actionSuggestions: string
  riskReminders: string
  sourceUrl: string
  generatorName: string
  generatedAt: Date
}

// ==================== 知识卡导出 ====================

/**
 * 知识卡导出数据
 */
export interface KnowledgeCardExportData {
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
  createdAt: Date
}

/**
 * 知识卡批量导出数据
 */
export interface KnowledgeCardBatchExportData {
  cards: KnowledgeCardExportData[]
  exportedAt: Date
  exportedBy: string
}

// ==================== 审计日志导出 ====================

/**
 * 审计日志导出数据
 */
export interface AuditLogExportData {
  id: string
  userName: string
  action: string
  entityType: string
  entityId: string | null
  details: string | null
  createdAt: Date
}

/**
 * 审计日志批量导出数据
 */
export interface AuditLogBatchExportData {
  logs: AuditLogExportData[]
  exportedAt: Date
  exportedBy: string
  dateRange?: {
    start: Date
    end: Date
  }
}
