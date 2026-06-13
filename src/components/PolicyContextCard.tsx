/**
 * PolicyContextCard 组件
 *
 * 展示政策上下文信息：有效期、适用地区、适用主体、条款编号、适用性判断
 */
'use client'

import { useState } from 'react'
import {
  Calendar,
  MapPin,
  Building2,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Copy,
} from 'lucide-react'

interface PolicyContext {
  validFrom?: string
  validTo?: string
  status: 'active' | 'expiring' | 'expired'
  applicableRegions: string[]
  applicableEntities: string[]
  clauseNumbers: string[]
}

interface ApplicabilityResult {
  status: 'applicable' | 'partial' | 'not_applicable'
  reason: string
  missingConditions?: string[]
}

interface PolicyContextCardProps {
  context: PolicyContext
  applicability?: ApplicabilityResult
}

export function PolicyContextCard({ context, applicability }: PolicyContextCardProps) {
  const [copied, setCopied] = useState(false)

  // 状态样式
  const statusConfig = {
    active: {
      label: '有效',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-200',
    },
    expiring: {
      label: '即将过期',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
    },
    expired: {
      label: '已过期',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-200',
    },
  }

  // 适用性样式
  const applicabilityConfig = {
    applicable: {
      label: '✅ 适用',
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      borderColor: 'border-green-200',
      icon: CheckCircle,
    },
    partial: {
      label: '⚠️ 部分适用',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
      icon: AlertTriangle,
    },
    not_applicable: {
      label: '❌ 不适用',
      bgColor: 'bg-red-50',
      textColor: 'text-red-800',
      borderColor: 'border-red-200',
      icon: XCircle,
    },
  }

  const statusStyle = statusConfig[context.status]
  const applicabilityStyle = applicability ? applicabilityConfig[applicability.status] : null
  const ApplicabilityIcon = applicabilityStyle?.icon

  // 复制功能
  const handleCopy = async () => {
    const text = [
      `有效期：${context.validFrom} - ${context.validTo}（${statusStyle.label}）`,
      `适用地区：${context.applicableRegions.join(', ')}`,
      `适用主体：${context.applicableEntities.join(', ')}`,
      `条款编号：${context.clauseNumbers.join(', ')}`,
      applicability ? `适用性：${applicabilityStyle?.label} - ${applicability.reason}` : '',
    ].filter(Boolean).join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          政策上下文
        </h4>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {copied ? (
            <>
              <CheckCircle className="w-3 h-3" />
              已复制
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              复制
            </>
          )}
        </button>
      </div>

      {/* 信息列表 */}
      <div className="space-y-3">
        {/* 有效期 */}
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <span className="text-xs text-gray-500">有效期</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-900">
                {context.validFrom || '未设置'} - {context.validTo || '未设置'}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusStyle.bgColor} ${statusStyle.textColor}`}>
                {statusStyle.label}
              </span>
            </div>
          </div>
        </div>

        {/* 适用地区 */}
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <span className="text-xs text-gray-500">适用地区</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {context.applicableRegions.map((region, i) => (
                <span key={i} className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  {region}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 适用主体 */}
        <div className="flex items-start gap-3">
          <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <span className="text-xs text-gray-500">适用主体</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {context.applicableEntities.map((entity, i) => (
                <span key={i} className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                  {entity}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 条款编号 */}
        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <span className="text-xs text-gray-500">条款编号</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {context.clauseNumbers.map((clause, i) => (
                <span key={i} className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                  {clause}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 适用性判断 */}
      {applicability && applicabilityStyle && (
        <div className={`mt-4 p-3 rounded-lg border ${applicabilityStyle.bgColor} ${applicabilityStyle.borderColor}`}>
          <div className="flex items-center gap-2">
            {ApplicabilityIcon && <ApplicabilityIcon className={`w-4 h-4 ${applicabilityStyle.textColor}`} />}
            <span className={`text-sm font-medium ${applicabilityStyle.textColor}`}>
              {applicabilityStyle.label}
            </span>
          </div>
          <p className={`text-xs mt-1 ${applicabilityStyle.textColor}`}>
            {applicability.reason}
          </p>
          {applicability.missingConditions && applicability.missingConditions.length > 0 && (
            <div className="mt-2">
              <span className={`text-xs ${applicabilityStyle.textColor}`}>需补充条件：</span>
              <ul className="list-disc list-inside text-xs mt-1">
                {applicability.missingConditions.map((condition, i) => (
                  <li key={i} className={applicabilityStyle.textColor}>{condition}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
