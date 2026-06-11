// 移动端底部「Spark Dock」— 悬浮玻璃胶囊导航 (md 以下显示, 桌面隐藏).
// 设计: 暖白玻璃胶囊 + 顶缘高光 + 选中滑动薄荷锭(layoutId) + 金色 spark 点 + 绿色辉光.
// 5 槽: 首页 · 学习 ·〔搜索 凸起 FAB〕· 阅读 · 记忆. 搜索键凸出于栏上方, 复用全局搜索弹窗.
// 守底线: 禁暗色 / 禁红色 / 动效常开.
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HomeIcon, BookIcon, SpeakerIcon, MemoryIcon, SearchIcon } from '../icons'
import type { SVGProps } from 'react'
import { useSearchStore } from '../../stores/useSearchStore'

const TABS: { to: string; label: string; Icon: (p: SVGProps<SVGSVGElement>) => JSX.Element; end?: boolean }[] = [
  { to: '/', label: '首页', Icon: HomeIcon, end: true },
  { to: '/learn', label: '学习', Icon: BookIcon },
  { to: '/reading', label: '阅读', Icon: SpeakerIcon },
  { to: '/memory', label: '记忆', Icon: MemoryIcon },
]

export function BottomTabBar() {
  const openSearch = useSearchStore((s) => s.openSearch)
  const left = TABS.slice(0, 2)
  const right = TABS.slice(2)

  return (
    <motion.nav
      aria-label="主导航"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.06 }}
      className="fixed inset-x-3 z-40 md:hidden"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
    >
      <ul className="relative flex items-stretch rounded-[24px] border border-white/70 glass px-1.5 py-1.5 shadow-float">
        {/* 顶缘一抹白色高光 → 强化玻璃质感 */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
        />
        {left.map((t) => (
          <DockTab key={t.to} {...t} />
        ))}

        {/* 中央搜索 — 与栏一体的玻璃隆起 + 凸起 FAB; 复用全局搜索弹窗 */}
        <li className="relative flex flex-1">
          {/* 玻璃凸台: 与导航栏同材质向上隆起, 下半融入栏身 (无描边 → 无接缝) */}
          <span
            aria-hidden
            className="absolute left-1/2 -top-6 h-[68px] w-[68px] -translate-x-1/2 rounded-full glass shadow-[0_-6px_14px_rgba(46,125,0,0.10)]"
          />
          {/* 仅顶弧描边 → 勾勒隆起轮廓, 不在栏内留下整圈接缝线 */}
          <span
            aria-hidden
            className="absolute left-1/2 -top-6 h-[68px] w-[68px] -translate-x-1/2 rounded-full border border-white/80 [clip-path:inset(0_0_56%_0)]"
          />
          {/* 搜索 FAB — 坐落在隆起正中, 凸出栏面 */}
          <button
            type="button"
            onClick={openSearch}
            aria-label="搜索单词"
            className="absolute left-1/2 -top-[14px] flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-b from-soft-green to-brand text-white shadow-[0_6px_14px_rgba(46,125,0,0.4)] transition-transform active:scale-95 cursor-pointer"
          >
            <span aria-hidden className="absolute inset-0 rounded-full bg-brand/25 animate-pulse-ring" />
            <SearchIcon width={22} height={22} className="relative" />
          </button>
        </li>

        {right.map((t) => (
          <DockTab key={t.to} {...t} />
        ))}
      </ul>
    </motion.nav>
  )
}

function DockTab({
  to,
  label,
  Icon,
  end,
}: {
  to: string
  label: string
  Icon: (p: SVGProps<SVGSVGElement>) => JSX.Element
  end?: boolean
}) {
  return (
    <li className="flex-1">
      <NavLink
        to={to}
        end={end}
        aria-label={label}
        className="group relative flex flex-col items-center justify-center gap-0.5 rounded-[18px] py-1.5"
      >
        {({ isActive }) => (
          <>
            {/* 选中: 滑动薄荷锭 (在选项间流动) */}
            {isActive && (
              <motion.span
                layoutId="dockLozenge"
                aria-hidden
                className="absolute inset-0 rounded-[18px] bg-gradient-to-b from-mint to-mint-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 flex h-6 items-center justify-center">
              {/* 选中: 图标下垫柔绿辉光 */}
              {isActive && (
                <span aria-hidden className="absolute -inset-1.5 rounded-full bg-light-green/40 blur-md" />
              )}
              <Icon
                width={22}
                height={22}
                strokeWidth={isActive ? 2.5 : 2}
                className={`relative transition-colors duration-200 ${
                  isActive ? 'text-deep-green' : 'text-text-hint group-active:text-deep-green'
                }`}
              />
              {/* 选中: 金色 spark 点睛 */}
              {isActive && (
                <motion.span
                  aria-hidden
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 18, delay: 0.08 }}
                  className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-sunshine shadow-[0_0_6px_rgba(255,200,0,0.95)]"
                />
              )}
            </span>
            <span
              className={`relative z-10 text-[10px] font-semibold tracking-tight transition-colors duration-200 ${
                isActive ? 'text-deep-green' : 'text-text-hint'
              }`}
            >
              {label}
            </span>
          </>
        )}
      </NavLink>
    </li>
  )
}
