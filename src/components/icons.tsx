// SVG 图标集 (Lucide 风格, 内联无依赖) — 设计规则: 禁用 emoji 作图标
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...p,
})

export const PlayIcon = (p: P) => (
  <svg {...base(p)}><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none" /></svg>
)
export const StopIcon = (p: P) => (
  <svg {...base(p)}><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /></svg>
)
export const PauseIcon = (p: P) => (
  <svg {...base(p)}><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></svg>
)
export const SpeakerIcon = (p: P) => (
  <svg {...base(p)}><path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" /><path d="M16 9a4 4 0 0 1 0 6" /><path d="M19 6a8 8 0 0 1 0 12" /></svg>
)
export const SparkleIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" fill="currentColor" stroke="none" /></svg>
)
export const GalaxyIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><ellipse cx="12" cy="12" rx="10" ry="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" /></svg>
)
export const ArrowRightIcon = (p: P) => (
  <svg {...base(p)}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
)
export const BookIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
)
export const GraphIcon = (p: P) => (
  <svg {...base(p)}><circle cx="5" cy="6" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="12" cy="18" r="2" /><line x1="6.7" y1="7" x2="11" y2="16.5" /><line x1="17.3" y1="7" x2="13" y2="16.5" /><line x1="7" y1="6" x2="17" y2="6" /></svg>
)
export const ChatIcon = (p: P) => (
  <svg {...base(p)}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
)
export const MemoryIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" /><circle cx="12" cy="12" r="3" /></svg>
)
export const HomeIcon = (p: P) => (
  <svg {...base(p)}><path d="M3 9.5L12 3l9 6.5" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></svg>
)
export const PhoneIcon = (p: P) => (
  <svg {...base(p)}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
)
export const SendIcon = (p: P) => (
  <svg {...base(p)}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
)
export const MicIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" /></svg>
)
export const MicOffIcon = (p: P) => (
  <svg {...base(p)}><line x1="3" y1="3" x2="21" y2="21" /><path d="M9 9v2a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-1m14 0v1a6.97 6.97 0 0 1-.34 2.16M12 18v4" /></svg>
)
export const PlusIcon = (p: P) => (
  <svg {...base(p)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
export const CloseIcon = (p: P) => (
  <svg {...base(p)}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)
export const CheckIcon = (p: P) => (
  <svg {...base(p)}><polyline points="20 6 9 17 4 12" /></svg>
)
export const MenuIcon = (p: P) => (
  <svg {...base(p)}><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
)
export const LockIcon = (p: P) => (
  <svg {...base(p)}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
)
export const RefreshIcon = (p: P) => (
  <svg {...base(p)}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15" /></svg>
)
export const ChevronRightIcon = (p: P) => (
  <svg {...base(p)}><polyline points="9 18 15 12 9 6" /></svg>
)
export const SearchIcon = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
)
export const EyeIcon = (p: P) => (
  <svg {...base(p)}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
)
export const EyeOffIcon = (p: P) => (
  <svg {...base(p)}><path d="M10.6 6.1A8.7 8.7 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.7M6.6 6.6A17 17 0 0 0 2 12s3.5 6 10 6a8.7 8.7 0 0 0 3.5-.7" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><line x1="3" y1="3" x2="21" y2="21" /></svg>
)
export const RepeatIcon = (p: P) => (
  <svg {...base(p)}><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
)
