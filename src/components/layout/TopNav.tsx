// 顶部固定导航 (56px 半透明毛玻璃) — 仅桌面 Web 显示; 移动端用底部 Dock (BottomTabBar).
import { useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SparkleIcon, SearchIcon } from '../icons'
import { useSearchStore } from '../../stores/useSearchStore'

const NAV: { to: string; label: string }[] = [
  { to: '/', label: '首页' },
  { to: '/learn', label: '今日学习' },
  { to: '/reading', label: '阅读伴侣' },
  { to: '/memory', label: '记忆系统' },
  { to: '/assistant', label: 'AI 助手' },
]

export function TopNav() {
  const openSearch = useSearchStore((s) => s.openSearch)

  const { pathname } = useLocation()
  const activeTo =
    NAV.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)))?.to ?? null

  const navRef = useRef<HTMLElement>(null)
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})
  const [pill, setPill] = useState<{ left: number; top: number; width: number; height: number } | null>(null)

  // 测量当前路由项 → 薄荷药丸 Framer 滑动 (不受系统「减少动态」关闭 CSS 过渡影响)
  useLayoutEffect(() => {
    const measure = () => {
      const el = activeTo ? linkRefs.current[activeTo] : null
      if (!el) {
        setPill(null)
        return
      }
      setPill({ left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (navRef.current) ro.observe(navRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [activeTo])

  return (
    <header className="sticky top-0 z-40 hidden h-14 border-b border-light-gray/70 glass md:block">
      <div className="mx-auto flex h-full max-w-[1200px] items-center gap-6 px-page-margin">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
            <SparkleIcon width={18} height={18} />
          </span>
          <span className="font-display text-[18px] font-bold text-deep-green tracking-tight">
            MintEnglish
          </span>
        </Link>

        {/* 导航项 */}
        <nav ref={navRef} className="relative flex shrink-0 items-center gap-1" aria-label="主导航">
          {pill && (
            <motion.span
              aria-hidden
              className="absolute rounded-full bg-mint"
              initial={false}
              animate={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            />
          )}
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              ref={(el) => {
                linkRefs.current[to] = el
              }}
              className={({ isActive }) =>
                `relative z-10 whitespace-nowrap rounded-full px-3 py-1.5 text-[14px] font-medium cursor-pointer ${
                  isActive ? 'text-deep-green' : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* 右侧: 搜索 */}
        <div className="ml-auto shrink-0">
          <motion.button
            type="button"
            onClick={openSearch}
            aria-label="搜索单词"
            title="搜索单词 → 词汇图谱"
            whileHover={{ y: -1 }}
            whileTap={{ y: 4 }}
            style={{
              boxShadow:
                'inset 0 2px 0 rgba(255,255,255,0.35), 0 4px 0 #2E7D00, 0 6px 8px rgba(46,125,0,0.25)',
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white transition-colors duration-200 hover:bg-soft-green cursor-pointer"
          >
            <SearchIcon width={17} height={17} />
          </motion.button>
        </div>
      </div>
    </header>
  )
}
