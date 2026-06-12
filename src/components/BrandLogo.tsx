/**
 * 恒识 Evercog 品牌标识
 *
 * 六边形图标 + 内部 S 形互锁图案。
 * 设计灵感：六边形象征稳固结构，S 形互锁象征知识的连接与流动。
 *
 * Props:
 * - size: 图标尺寸（默认 40px）
 * - showText: 是否显示文字（默认 true）
 * - collapsed: 是否折叠模式（默认 false）
 */
interface BrandLogoProps {
  size?: number
  showText?: boolean
  collapsed?: boolean
}

export default function BrandLogo({ size = 40, showText = true, collapsed = false }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-3">
      {/* SVG 图标 - 六边形 + S 形互锁 */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* 外层六边形 */}
        <path
          d="M24 4L42 14V34L24 44L6 34V14L24 4Z"
          fill="#2BA78F"
        />

        {/* 内层六边形轮廓 */}
        <path
          d="M24 10L36 16.5V29.5L24 36L12 29.5V16.5L24 10Z"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
        />

        {/* S 形互锁图案 - 上半部分 */}
        <path
          d="M18 18L24 15L30 18V22L24 25L18 22V18Z"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* S 形互锁图案 - 下半部分 */}
        <path
          d="M18 26L24 23L30 26V30L24 33L18 30V26Z"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* 中间连接线 */}
        <path
          d="M24 25V23"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* 文字 */}
      {showText && !collapsed && (
        <div>
          <h1 className="text-lg font-extrabold text-gray-900 tracking-tight leading-tight">
            恒识
          </h1>
          <p className="text-[11px] text-gray-400 font-medium tracking-wide">
            Evercog
          </p>
        </div>
      )}
    </div>
  )
}
