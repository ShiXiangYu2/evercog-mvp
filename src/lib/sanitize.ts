/**
 * HTML 净化工具模块
 *
 * 使用 DOMPurify 过滤用户输入的 HTML，防止 XSS 攻击。
 * 仅允许安全的标签和属性。
 */
import DOMPurify from 'isomorphic-dompurify'

// ==================== 配置 ====================

/** DOMPurify 允许的标签白名单 */
const ALLOWED_TAGS = [
  'strong', 'em', 'b', 'i', 'code', 'pre',
  'a', 'li', 'ul', 'ol', 'p', 'br', 'span',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]

/** DOMPurify 允许的属性 */
const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'class', 'id',
]

// ==================== 净化函数 ====================

/**
 * 净化 HTML 字符串，过滤不安全的标签和属性
 *
 * @param dirty - 未经净化的 HTML 字符串
 * @returns 净化后的安全 HTML 字符串
 *
 * @example
 * ```ts
 * const safe = sanitizeHtml('<script>alert(1)</script><strong>安全</strong>')
 * // 返回: '<strong>安全</strong>'
 * ```
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}

/**
 * 净化 Markdown 转换后的 HTML
 *
 * 保留 Markdown 渲染的格式标签，过滤其他所有内容。
 *
 * @param markdownHtml - Markdown 转换后的 HTML
 * @returns 净化后的安全 HTML
 */
export function sanitizeMarkdownHtml(markdownHtml: string): string {
  return DOMPurify.sanitize(markdownHtml, {
    ALLOWED_TAGS: [...ALLOWED_TAGS, 'div', 'hr'],
    ALLOWED_ATTR: [...ALLOWED_ATTR, 'style'],
    ALLOW_DATA_ATTR: false,
  })
}
