// ─────────────────────────────────────────────
// 全站环境背景 · 未来空间氛围 (Cosmin 风格适配亮色)
// 缓慢漂移的极光光晕 + HUD 细网格(径向淡出) + 柔噪点
// 守则: 安静、低透明、不抢学习焦点; 永不暗色
// ─────────────────────────────────────────────
import { motion } from 'framer-motion'

const BLOBS = [
  { cls: 'left-[-12%] top-[-10%] h-[46vw] w-[46vw] bg-brand/15 blur-[110px]', x: [0, 50, 0], y: [0, 30, 0], d: 26 },
  { cls: 'right-[-14%] top-[8%] h-[40vw] w-[40vw] bg-sky/12 blur-[110px]', x: [0, -40, 0], y: [0, 40, 0], d: 30 },
  { cls: 'bottom-[-14%] left-[18%] h-[44vw] w-[44vw] bg-light-green/14 blur-[120px]', x: [0, 36, 0], y: [0, -28, 0], d: 34 },
  { cls: 'bottom-[6%] right-[20%] h-[22vw] w-[22vw] bg-sunshine/12 blur-[90px]', x: [0, -28, 0], y: [0, 22, 0], d: 24 },
]

export function SpatialBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-warm-white">
      {BLOBS.map((b, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${b.cls}`}
          animate={{ x: b.x, y: b.y }}
          transition={{ duration: b.d, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* HUD 细网格 — 径向遮罩淡出, 只留空间氛围 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(67,192,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(67,192,0,0.05) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 72% 60% at 50% 38%, #000 28%, transparent 82%)',
          WebkitMaskImage: 'radial-gradient(ellipse 72% 60% at 50% 38%, #000 28%, transparent 82%)',
        }}
      />

      {/* 柔噪点 — 柔化数码塑料感 */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.025]">
        <filter id="bg-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-grain)" />
      </svg>
    </div>
  )
}
