/**
 * StarRating 组件
 *
 * 使用 useStarRating Hook 管理状态
 */
'use client'

import { Star } from 'lucide-react'
import { useStarRating } from '@/hooks/use-star-rating'

interface StarRatingProps {
  value?: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function StarRating({
  value = 0,
  onChange,
  readonly = false,
  size = 'md',
}: StarRatingProps) {
  const {
    value: currentValue,
    hoverValue,
    handleClick,
    handleMouseEnter,
    handleMouseLeave,
  } = useStarRating({
    initialValue: value,
    readonly,
    onChange,
  })

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => handleClick(rating)}
          onMouseEnter={() => handleMouseEnter(rating)}
          onMouseLeave={handleMouseLeave}
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            className={`${sizeClasses[size]} ${
              rating <= (hoverValue || currentValue)
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            } ${!readonly && rating <= hoverValue ? 'text-yellow-500' : ''}`}
          />
        </button>
      ))}
    </div>
  )
}
