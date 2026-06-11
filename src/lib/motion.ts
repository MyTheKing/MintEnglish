// ─────────────────────────────────────────────
// 流体空间动效系统 (Cosmin Capitanu 风格: 平滑形变、景深推入)
// 全站统一缓动与转场变体, 供路由转场 / 卡片渐入 / 层叠浮现复用
// ─────────────────────────────────────────────
import type { Variants, Transition } from 'framer-motion'

// 缓动: 流体 (柔顺有重量) / 收尾 (干脆退场)
export const EASE_FLUID = [0.22, 1, 0.36, 1] as const
export const EASE_OUT = [0.4, 0, 1, 1] as const

// 通用弹簧 (用于 tilt / 位移)
export const SPRING: Transition = { type: 'spring', stiffness: 260, damping: 30 }
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 180, damping: 26 }

// 页面级流体转场: 景深推入 (scale + blur + y), 出场更快更轻
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.985, filter: 'blur(8px)' },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: EASE_FLUID },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.99,
    filter: 'blur(6px)',
    transition: { duration: 0.3, ease: EASE_OUT },
  },
}

// 容器 stagger: 子项依次浮入 (空间层次)
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}

// 子项: 自下方浮入
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_FLUID } },
}

// 子项: 景深浮现 (缩放 + 模糊, 更强空间感)
export const depthItem: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.96, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 0.55, ease: EASE_FLUID },
  },
}
