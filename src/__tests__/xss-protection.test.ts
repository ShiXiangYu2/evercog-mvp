/**
 * XSS 防护测试
 *
 * 验证 sanitizeHtml 和 sanitizeMarkdownHtml 能正确过滤 XSS 攻击向量
 */
import { describe, it, expect } from 'vitest'
import { sanitizeHtml, sanitizeMarkdownHtml } from '@/lib/sanitize'

describe('XSS Protection', () => {
  describe('sanitizeHtml', () => {
    it('should filter script tags', () => {
      const dirty = '<script>alert("XSS")</script>'
      const clean = sanitizeHtml(dirty)
      expect(clean).not.toContain('<script>')
      expect(clean).not.toContain('alert')
    })

    it('should filter img onerror', () => {
      const dirty = '<img src=x onerror="alert(1)">'
      const clean = sanitizeHtml(dirty)
      expect(clean).not.toContain('onerror')
      expect(clean).not.toContain('alert')
    })

    it('should filter iframe', () => {
      const dirty = '<iframe src="javascript:alert(1)"></iframe>'
      const clean = sanitizeHtml(dirty)
      expect(clean).not.toContain('<iframe>')
    })

    it('should filter event handlers', () => {
      const dirty = '<div onmouseover="alert(1)">hover me</div>'
      const clean = sanitizeHtml(dirty)
      expect(clean).not.toContain('onmouseover')
    })

    it('should filter javascript: URLs', () => {
      const dirty = '<a href="javascript:alert(1)">click</a>'
      const clean = sanitizeHtml(dirty)
      expect(clean).not.toContain('javascript:')
    })

    it('should preserve safe HTML tags', () => {
      const safe = '<strong>bold</strong> <code>code</code> <a href="https://example.com">link</a>'
      const clean = sanitizeHtml(safe)
      expect(clean).toContain('<strong>')
      expect(clean).toContain('<code>')
      expect(clean).toContain('<a')
      expect(clean).toContain('https://example.com')
    })

    it('should preserve list tags', () => {
      const safe = '<ul><li>item 1</li><li>item 2</li></ul>'
      const clean = sanitizeHtml(safe)
      expect(clean).toContain('<ul>')
      expect(clean).toContain('<li>')
    })
  })

  describe('sanitizeMarkdownHtml', () => {
    it('should filter script tags from markdown output', () => {
      const dirty = '<strong>safe</strong><script>alert("XSS")</script>'
      const clean = sanitizeMarkdownHtml(dirty)
      expect(clean).toContain('<strong>')
      expect(clean).not.toContain('<script>')
    })

    it('should filter object/embed tags', () => {
      const dirty = '<object data="evil.swf"></object>'
      const clean = sanitizeMarkdownHtml(dirty)
      expect(clean).not.toContain('<object>')
    })

    it('should filter form inputs', () => {
      const dirty = '<input type="text" onfocus="alert(1)">'
      const clean = sanitizeMarkdownHtml(dirty)
      expect(clean).not.toContain('<input>')
    })

    it('should preserve markdown-formatted content', () => {
      const markdown = '<strong>政策标题</strong>\n<code>tax_process</code>\n<a href="https://example.com">链接</a>'
      const clean = sanitizeMarkdownHtml(markdown)
      expect(clean).toContain('<strong>政策标题</strong>')
      expect(clean).toContain('<code>tax_process</code>')
      expect(clean).toContain('https://example.com')
    })

    it('should handle complex XSS payloads', () => {
      const payloads = [
        '<svg onload="alert(1)">',
        '<math><mi//xlink:href="data:x,<script>alert(1)</script>">',
        '<details open ontoggle="alert(1)">',
        '<marquee onstart="alert(1)">',
      ]

      for (const payload of payloads) {
        const clean = sanitizeMarkdownHtml(payload)
        expect(clean).not.toContain('alert')
        expect(clean).not.toContain('onload')
        expect(clean).not.toContain('ontoggle')
        expect(clean).not.toContain('onstart')
      }
    })

    it('should handle empty input', () => {
      expect(sanitizeMarkdownHtml('')).toBe('')
    })

    it('should handle plain text without HTML', () => {
      const text = '这是一段普通文本，没有 HTML 标签'
      expect(sanitizeMarkdownHtml(text)).toBe(text)
    })
  })
})
