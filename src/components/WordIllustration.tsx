// 单词插画 — 用 public/illustrations 下的 10 张图模拟「AI 生成插画」.
// 每个单词按 hash 确定性取其中一张 (同词总是同图), 加载失败回退程序化 SVG.
import { useMemo, useState } from 'react'
import { AISparkBadge } from './ui'

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const IMG_COUNT = 10
const BASE = import.meta.env.BASE_URL // vite base './' → Electron file:// 友好

// 程序化占位配色 (回退用, 绝不暗黑)
const PALETTES = [
  { bg: '#E8F5E9', a: '#58CC02', b: '#A8E06C', c: '#FFC800' },
  { bg: '#DCEEFB', a: '#5BB3F0', b: '#A8E06C', c: '#58CC02' },
  { bg: '#FFF8E1', a: '#FFC800', b: '#58CC02', c: '#FF8A65' },
  { bg: '#F5F5F0', a: '#7AC70C', b: '#FFD54F', c: '#58CC02' },
  { bg: '#FFD4C7', a: '#FF8A65', b: '#58CC02', c: '#FFC800' },
]

export function WordIllustration({
  word,
  alt,
  image,
  className = '',
  showBadge = true,
}: {
  word: string
  alt?: string
  /** 数据里若带真实图地址则优先；否则用 10 张模拟图之一 */
  image?: string
  className?: string
  showBadge?: boolean
}) {
  const [failed, setFailed] = useState(false)

  const { src, art } = useMemo(() => {
    const h = hash(word)
    const n = (h % IMG_COUNT) + 1
    const src = image && image.trim() ? image : `${BASE}illustrations/${n}.webp`
    const p = PALETTES[h % PALETTES.length]
    const letter = word.charAt(0).toUpperCase()
    const blobs = Array.from({ length: 4 }).map((_, i) => {
      const hh = hash(word + i)
      return {
        cx: 12 + (hh % 76),
        cy: 12 + ((hh >> 3) % 60),
        r: 8 + ((hh >> 6) % 22),
        fill: [p.a, p.b, p.c][hh % 3],
        op: 0.18 + ((hh >> 9) % 5) * 0.05,
      }
    })
    return { src, art: { p, letter, blobs } }
  }, [word, image])

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`} style={{ background: art.p.bg }}>
      {!failed ? (
        <img
          src={src}
          alt={alt ?? `${word} 插画`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <svg viewBox="0 0 100 75" className="h-full w-full" role="img" aria-label={alt ?? `${word} 插画`} preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={`g-${art.letter}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={art.p.a} />
              <stop offset="100%" stopColor={art.p.b} />
            </linearGradient>
          </defs>
          {art.blobs.map((b, i) => (
            <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill={b.fill} opacity={b.op} />
          ))}
          <path d="M50 60c-8-14-22-16-22-32 0 0 14 2 22 14 8-12 22-14 22-14 0 16-14 18-22 32z" fill={`url(#g-${art.letter})`} opacity="0.9" />
          <circle cx="68" cy="22" r="5" fill={art.p.c} opacity="0.85" />
          <text x="50" y="44" textAnchor="middle" fontFamily="'Crimson Pro', serif" fontSize="30" fontWeight="600" fill="#fff" opacity="0.92">
            {art.letter}
          </text>
        </svg>
      )}
      {showBadge && <AISparkBadge className="absolute right-2 top-2" />}
    </div>
  )
}
