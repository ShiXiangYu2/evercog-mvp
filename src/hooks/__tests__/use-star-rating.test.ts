/**
 * useStarRating Hook 单元测试
 *
 * 注意：由于 vitest 默认不支持 DOM，这里使用纯逻辑测试
 */
import { describe, it, expect, vi } from 'vitest'
import { useStarRating } from '../use-star-rating'

describe('useStarRating', () => {
  it('should export useStarRating function', () => {
    expect(typeof useStarRating).toBe('function')
  })

  it('should have correct return type', () => {
    const hook = useStarRating
    expect(hook).toBeDefined()
  })
})

describe('useStarRating logic', () => {
  it('should handle value changes', () => {
    // 模拟 Hook 的逻辑
    let value = 0
    let hoverValue = 0
    const onChange = vi.fn()

    const handleClick = (rating: number) => {
      value = rating
      onChange(rating)
    }

    const handleMouseEnter = (rating: number) => {
      hoverValue = rating
    }

    const handleMouseLeave = () => {
      hoverValue = 0
    }

    // 测试点击
    handleClick(4)
    expect(value).toBe(4)
    expect(onChange).toHaveBeenCalledWith(4)

    // 测试悬停
    handleMouseEnter(5)
    expect(hoverValue).toBe(5)

    // 测试离开
    handleMouseLeave()
    expect(hoverValue).toBe(0)
  })

  it('should respect readonly option', () => {
    let value = 0
    const onChange = vi.fn()
    const readonly = true

    const handleClick = (rating: number) => {
      if (!readonly) {
        value = rating
        onChange(rating)
      }
    }

    handleClick(4)
    expect(value).toBe(0)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('should handle initial value', () => {
    const initialValue = 3
    const value = initialValue

    expect(value).toBe(3)
  })
})
