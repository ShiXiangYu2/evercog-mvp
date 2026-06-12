/**
 * Export 模块统一导出
 */

// 导出类型
export type {
  Exporter,
  ExportFormat,
  ExportFormatInfo,
  PolicyBriefExportData,
  KnowledgeCardExportData,
  KnowledgeCardBatchExportData,
  AuditLogExportData,
  AuditLogBatchExportData,
} from './types'

export { EXPORT_FORMATS } from './types'

// 导出生成器
export { PDFGenerator, getPDFGenerator } from './pdf-generator'
export { CSVGenerator, getCSVGenerator } from './csv-generator'
export { ExcelGenerator, getExcelGenerator } from './excel-generator'

// ==================== 导出器工厂 ====================

import type { Exporter, ExportFormat } from './types'
import { getPDFGenerator } from './pdf-generator'
import { getCSVGenerator } from './csv-generator'
import { getExcelGenerator } from './excel-generator'

/**
 * 获取指定格式的导出器
 *
 * @param format 导出格式
 * @returns 导出器实例
 */
export function getExporter<T>(format: ExportFormat): Exporter<T> {
  switch (format) {
    case 'pdf':
      return getPDFGenerator() as unknown as Exporter<T>
    case 'csv':
      return getCSVGenerator() as unknown as Exporter<T>
    case 'excel':
      return getExcelGenerator() as unknown as Exporter<T>
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}
