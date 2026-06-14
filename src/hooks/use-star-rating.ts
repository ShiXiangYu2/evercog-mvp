/**
 * useStarRating Hook
 *
 * 封装星级评分的交互逻辑
 * 可被 StarRating 和其他组件复用
 */
import { useState, useCallback } from 'react'

// ==================== 类型定义 ====================

export interface UseStarRatingOptions {
  /** 初始值 */
  initialValue?: number
  /** 最大值 */
  maxRating?: number
  /** 是否只读 */
  readonly?: boolean
  /** 值变化回调 */
  onChange?: (value: number) => void
}

export interface UseStarRatingReturn {
  /** 当前值 */
  value: number
  /** 悬停值 */
  hoverValue: number
  /** 设置值 */
  setValue: (value: number) => void
  /** 设置悬停值 */
  setHoverValue: (value: number) => void
  /** 处理点击 */
  handleClick: (rating: number) => void
  /** 处理鼠标进入 */
  handleMouseEnter: (rating: number) => void
  /** 处理鼠标离开 */
  handleMouseLeave: () => void
  /** 是否只读 */
  readonly: boolean
}

// ==================== Hook ====================

/**
 * 星级评分 Hook
 *
 * @example
 * ```tsx
 * const { value, hoverValue, handleClick, handleMouseEnter, handleMouseLeave, readonly } = useStarRating({
 *   initialValue: 3,
 *   onChange: (value) => console.log('Selected:', value),
 * })
 *
 * return (
 *   <div>
 *     {[1, 2, 3, 4, 5].map((rating) => (
 *       <Star
 *         key={rating}
 *         filled={rating <= (hoverValue || value)}
 *         onClick={() => handleClick(rating)}
 *         onMouseEnter={() => handleMouseEnter(rating)}
 *         onMouseLeave={handleMouseLeave}
 *       />
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useStarRating(options: UseStarRatingOptions = {}): UseStarRatingReturn {
  const {
    initialValue = 0,
    readonly = false,
    onChange,
  } = options

  const [value, setValue] = useState(initialValue)
  const [hoverValue, setHoverValue] = useState(0)

  const handleClick = useCallback(
    (rating: number) => {
      if (!readonly) {
        setValue(rating)
        onChange?.(rating)
      }
    },
    [readonly, onChange]
  )

  const handleMouseEnter = useCallback(
    (rating: number) => {
      if (!readonly) {
        setHoverValue(rating)
      }
    },
    [readonly]
  )

  const handleMouseLeave = useCallback(() => {
    setHoverValue(0)
  }, [])

  return {
    value,
    hoverValue,
    setValue,
    setHoverValue,
    handleClick,
    handleMouseEnter,
    handleMouseLeave,
    readonly,
  }
}
