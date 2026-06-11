// ─────────────────────────────────────────────
// MintEnglish · UI 基础组件
// 圆润友好 · 柔和绿阴影 · 绿主角金点睛
// ─────────────────────────────────────────────
import { forwardRef, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import { PlayIcon, SparkleIcon } from './icons'
import { speak } from '../lib/dictionary'

function cx(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(' ')
}

// —— 主/次/幽灵按钮 ——
type BtnProps = HTMLMotionProps<'button'> & {
  variant?: 'primary' | 'ghost' | 'text' | 'pop'
  size?: 'md' | 'lg'
}
export const Button = forwardRef<HTMLButtonElement, BtnProps>(
  ({ variant = 'primary', size = 'md', className, children, style, ...rest }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-colors duration-200 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed'
    const sizes = { md: 'px-6 py-2.5 text-[15px]', lg: 'px-8 py-3.5 text-base' }
    const variants = {
      // 主按钮: 品牌绿实底 + 3px 深绿厚度边 (可按拟物)
      primary:
        'bg-brand text-white shadow-[0_3px_0_#43C000] hover:bg-soft-green',
      // 实体按钮 (动森风): 5px 厚底边常驻, hover 抬起加厚, 点按整体下沉到 1px
      pop: 'bg-brand text-white hover:bg-soft-green',
      ghost: 'bg-mint text-deep-green hover:bg-mint-deep',
      text: 'text-deep-green hover:text-brand px-0',
    }
    const pop = variant === 'pop'
    // 实体厚度: 顶部高光 + 深绿侧边 (与 #58CC02 面拉开明度对比)
    const popRest = 'inset 0 2px 0 rgba(255,255,255,0.35), 0 6px 0 #2E7D00, 0 8px 8px rgba(46,125,0,0.25)'
    const popHover = 'inset 0 2px 0 rgba(255,255,255,0.35), 0 7px 0 #2E7D00, 0 10px 12px rgba(46,125,0,0.28)'
    const popTap = 'inset 0 1px 0 rgba(255,255,255,0.25), 0 1px 0 #2E7D00, 0 2px 4px rgba(46,125,0,0.2)'
    // Framer 点按下沉 — 不受系统「减少动态」关闭 CSS 过渡影响
    return (
      <motion.button
        ref={ref}
        style={pop ? { boxShadow: popRest, ...style } : style}
        whileHover={pop ? { y: -1, boxShadow: popHover } : undefined}
        whileTap={pop ? { y: 5, boxShadow: popTap } : { scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 600, damping: 30 }}
        className={cx(base, sizes[size], variants[variant], className)}
        {...rest}
      >
        {children}
      </motion.button>
    )
  },
)
Button.displayName = 'Button'

// —— 卡片 ——
type CardProps = HTMLMotionProps<'div'> & { hover?: boolean; pad?: boolean }
export function Card({ hover, pad = true, className, children, ...rest }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4 } : undefined}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={cx(
        'bg-white rounded-xl shadow-card',
        pad && 'p-card-pad',
        hover && 'hover:shadow-card-hover cursor-pointer',
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

// —— Chip / 标签 (薄荷底深绿字全圆角) ——
export function Chip({ children, className, accent, onClick, title }: { children: ReactNode; className?: string; accent?: 'mint' | 'gold' | 'sky' | 'coral'; onClick?: () => void; title?: string }) {
  const tones = {
    mint: 'bg-mint text-deep-green',
    gold: 'bg-light-yellow text-[#9A7400]',
    sky: 'bg-sky-soft text-[#2A7AB8]',
    coral: 'bg-coral-soft text-[#C44A2E]',
  }
  const cls = cx(
    'inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[12px] font-semibold tracking-wide',
    tones[accent ?? 'mint'],
    onClick && 'cursor-pointer transition-colors duration-150 hover:brightness-[0.96]',
    className,
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} title={title} className={cls}>
        {children}
      </button>
    )
  }
  return <span className={cls}>{children}</span>
}

// —— 分段选择器 (选项长条) ——
// 选中态是一颗品牌绿药丸, 切换时用 Framer layoutId 在选项间「滑动」过去, 而非突兀显隐.
type SegOption<T> = { value: T; label: ReactNode; title?: string }
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  wrap = false,
  fluid = false,
  className,
}: {
  options: SegOption<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel?: string
  size?: 'sm' | 'md'
  wrap?: boolean
  fluid?: boolean
  className?: string
}) {
  const sm = size === 'sm'
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [pill, setPill] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  // 测量当前选中项的位置/尺寸 → 单颗药丸 animate 过去 (比 layoutId 显隐更可靠地滑动)
  useLayoutEffect(() => {
    const measure = () => {
      const el = btnRefs.current[String(value)]
      if (!el) return
      setPill({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [value, options.length, size])

  return (
    <div
      ref={wrapRef}
      role="group"
      aria-label={ariaLabel}
      className={cx(
        'relative rounded-full bg-off-white',
        fluid ? 'flex w-full md:inline-flex md:w-auto' : 'inline-flex',
        sm ? 'gap-1 p-0.5' : 'gap-2 p-1',
        wrap && 'flex-wrap',
        className,
      )}
    >
      {pill && (
        <motion.span
          aria-hidden
          className="absolute rounded-full bg-brand shadow-[0_2px_0_#43C000]"
          initial={false}
          animate={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
          transition={{ type: 'spring', stiffness: 460, damping: 36 }}
        />
      )}
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              btnRefs.current[String(o.value)] = el
            }}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            title={o.title}
            className={cx(
              'relative z-10 rounded-full font-semibold tabular-nums tracking-wide transition-colors duration-200 cursor-pointer',
              sm ? 'px-2.5 py-1 text-[12px]' : 'px-4 py-1.5 text-[14px]',
              fluid && 'flex-1 text-center md:flex-none',
              on ? 'text-white' : 'text-deep-green hover:bg-mint',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// —— 进度点 ●●●○○ ——
export function ProgressDots({ total, done }: { total: number; done: number }) {
  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={`进度 ${done}/${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cx('h-2 w-2 rounded-full transition-colors duration-300', i < done ? 'bg-brand' : 'bg-mint')}
        />
      ))}
    </div>
  )
}

// —— 进度环 (SVG) ——
export function ProgressRing({ pct, size = 48, stroke = 5, children }: { pct: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E8E8E3" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#58CC02" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-deep-green">{children ?? `${Math.round(pct * 100)}%`}</span>
    </div>
  )
}

// —— 发音按钮 ——
export function PlayButton({ word, audio, className }: { word: string; audio?: string; className?: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); speak(word, audio) }}
      aria-label={`朗读 ${word}`}
      className={cx('inline-flex h-7 w-7 items-center justify-center rounded-full bg-mint text-deep-green hover:bg-brand hover:text-white transition-colors duration-200 cursor-pointer', className)}
    >
      <PlayIcon width={13} height={13} />
    </button>
  )
}

// —— AI Spark 徽章 (金色, 标识 AI 生成) ——
export function AISparkBadge({ label = 'AI', className }: { label?: string; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full bg-sunshine px-2 py-0.5 text-[11px] font-bold text-[#7A5C00] shadow-sm', className)}>
      <SparkleIcon width={11} height={11} />
      {label}
    </span>
  )
}

// —— 骨架块 (加载占位, 波浪 shimmer) ——
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton rounded-md', className)} />
}

// —— 橙色温柔 Toast (永不用红色报错, EXPERIENCE) ——
export function Toast({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-warn px-5 py-2.5 text-[14px] font-medium text-white shadow-popup animate-fade-up"
      onClick={onClose}
    >
      {message}
    </div>
  )
}
