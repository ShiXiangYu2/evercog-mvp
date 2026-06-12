/**
 * CSV 生成器
 *
 * 实现 Exporter 接口，将数据导出为 CSV 格式
 */
import type { Exporter, AuditLogBatchExportData } from './types'

// ==================== 类型定义 ====================

export interface AuditLogCSVData {
  id: string
  userName: string
  userRole: string
  action: string
  entityType: string
  entityId: string | null
  details: string | null
  ipAddress: string | null
  createdAt: Date
}

// ==================== CSV 生成器 ====================

export class CSVGenerator implements Exporter<AuditLogBatchExportData> {
  readonly name = 'CSV'
  readonly extension = '.csv'
  readonly mimeType = 'text/csv'

  /**
   * 导出审计日志为 CSV
   */
  async export(data: AuditLogBatchExportData): Promise<Uint8Array> {
    const csv = this.generateAuditLogsCSVFromBatch(data)
    return new TextEncoder().encode(csv)
  }

  /**
   * 从批量数据生成 CSV
   */
  private generateAuditLogsCSVFromBatch(data: AuditLogBatchExportData): string {
    const csvData: AuditLogCSVData[] = data.logs.map(log => ({
      id: log.id,
      userName: log.userName,
      userRole: '',
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
      ipAddress: null,
      createdAt: log.createdAt,
    }))

    return this.generateAuditLogsCSV(csvData)
  }

  /**
   * 生成审计日志 CSV（兼容旧接口）
   */
  generateAuditLogsCSV(logs: AuditLogCSVData[]): string {
    // 操作类型映射
    const actionMap: Record<string, string> = {
      create: '创建',
      edit: '编辑',
      review: '审核',
      publish: '发布',
      reject: '拒绝',
      query: '查询',
      generate: '生成',
      push: '推送',
      approve: '审批',
      submit: '提交',
    }

    // 实体类型映射
    const entityMap: Record<string, string> = {
      policy_link: '政策链接',
      policy_brief: '政策简报',
      knowledge_card: '知识卡',
      experience_query: '经验调用',
      sop_task: 'SOP 任务',
      sop_submission: 'SOP 提交',
      push_record: '推送记录',
    }

    // 角色映射
    const roleMap: Record<string, string> = {
      admin: '管理员',
      mentor: '导师',
      finance: '财务',
      sales: '销售',
      customer_service: '客服',
      operations: '运营',
      trainee: '新人',
      ai_info: 'AI 工程师',
    }

    // CSV 表头
    const headers = [
      'ID',
      '操作人',
      '操作人角色',
      '操作类型',
      '实体类型',
      '实体 ID',
      '详情',
      'IP 地址',
      '操作时间',
    ]

    // CSV 数据行
    const rows = logs.map((log) => [
      log.id,
      log.userName,
      roleMap[log.userRole] || log.userRole,
      actionMap[log.action] || log.action,
      entityMap[log.entityType] || log.entityType,
      log.entityId || '',
      log.details ? this.escapeCSV(log.details) : '',
      log.ipAddress || '',
      log.createdAt.toLocaleString('zh-CN'),
    ])

    // 组合 CSV
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    // 添加 BOM 以支持中文
    return '﻿' + csvContent
  }

  /**
   * CSV 字段转义
   */
  private escapeCSV(value: string): string {
    // 如果包含逗号、换行或引号，需要用引号包裹
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }
}

// ==================== 单例导出 ====================

let _csvGenerator: CSVGenerator | null = null

export function getCSVGenerator(): CSVGenerator {
  if (!_csvGenerator) {
    _csvGenerator = new CSVGenerator()
  }
  return _csvGenerator
}
