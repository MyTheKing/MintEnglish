import { useMemo, type PointerEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  type MotionValue,
} from 'framer-motion'
import { Button, Chip, ProgressRing } from '../components/ui'
import {
  SparkleIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  CheckIcon,
} from '../components/icons'
import { getStages } from '../lib/chapters'
import { useLearningStore } from '../stores/useLearningStore'
import type { Stage, Chapter } from '../lib/types'

// ─────────────────────────────────────────────
// 首页 · Hero 空间场景 + 学习数据概览 + 学习路线
// 温暖鼓励、绿主角金点睛、一次编排好的渐入 reveal
// ─────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL // vite base './' → Electron file:// 友好

interface NextUp {
  stage: Stage
  chapter: Chapter
  index: number
}

/** 找到第一个未完成的章节，作为「继续上次」推荐 */
function findNextChapter(completed: string[]): NextUp | null {
  const done = new Set(completed)
  for (const stage of getStages()) {
    for (let i = 0; i < stage.chapters.length; i++) {
      const chapter = stage.chapters[i]
      const key = `${stage.id}-${chapter.id}`
      if (!done.has(key)) return { stage, chapter, index: i }
    }
  }
  return null
}

export default function HomePage() {
  const navigate = useNavigate()
  const reduce = false

  const onboarded = useLearningStore((s) => s.onboarded)
  const learnedWords = useLearningStore((s) => s.learnedWords)
  const completedChapters = useLearningStore((s) => s.completedChapters)
  const reviewWords = useLearningStore((s) => s.reviewWords)
  const streak = useLearningStore((s) => s.streak)

  const stages = getStages()
  const totalWords = useMemo(
    () => stages.reduce((sum, s) => sum + s.total, 0),
    [stages],
  )
  const learnedCount = learnedWords.length
  const overallPct = totalWords ? Math.min(learnedCount / totalWords, 1) : 0
  const nextUp = useMemo(() => findNextChapter(completedChapters), [completedChapters])
  const reviewCount = reviewWords.length

  // 各阶段已学进度 → 学习路线展示 (状态驱动配色)
  const stageProgress = useMemo(() => {
    const learnedSet = new Set(learnedWords)
    return stages.map((s) => {
      const words = s.chapters.flatMap((c) => c.words)
      const done = words.reduce((n, w) => n + (learnedSet.has(w) ? 1 : 0), 0)
      return { id: s.id, done }
    })
  }, [stages, learnedWords])
  const activeStageId = nextUp?.stage.id ?? null

  // Hero 视差: 鼠标驱动多层 3D 物体错位漂浮 (空间景深, 非卡片)
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const mvx = useSpring(px, { stiffness: 120, damping: 20 })
  const mvy = useSpring(py, { stiffness: 120, damping: 20 })
  const onScene = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width - 0.5)
    py.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onSceneLeave = () => {
    px.set(0)
    py.set(0)
  }

  // —— 一次编排的渐入: 容器 stagger 子项 ——
  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: reduce ? 0 : 0.04 },
    },
  }
  const item = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 16 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
        },
      }

  const ctaLabel = learnedCount > 0 ? '继续今天的学习' : '开始第一课'

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-content px-5 md:px-page-margin pt-12 pb-24 md:pb-12"
    >
      {/* 1 · Hero */}
      <section className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
        <motion.div variants={item}>
          <Chip accent="mint" className="mb-5 gap-1.5">
            <SparkleIcon width={13} height={13} />
            Sprout &amp; Spark
          </Chip>

          <h1 className="font-display text-display leading-tight text-text-primary">
            今天学什么？
            <br />
            <span className="text-brand">跟着计划走就好。</span>
          </h1>

          <p className="mt-5 max-w-reading cjk text-body-lg text-text-secondary">
            用奥格登
            <span className="vocab text-deep-green"> 850 核心词 </span>
            打底，每天几分钟 —— 跟着 AI 把单词放进真实例句里记。不贪多，记得牢、用得上。
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button variant="pop" size="lg" onClick={() => navigate('/learn')}>
              {ctaLabel}
              <ArrowRightIcon width={18} height={18} />
            </Button>

            {!onboarded && (
              <Link
                to="/onboarding"
                className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-deep-green transition-colors duration-200 hover:text-brand cursor-pointer"
              >
                <SparkleIcon width={15} height={15} />
                先做个小测评
                <ChevronRightIcon
                  width={15}
                  height={15}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
            )}
          </div>

          {/* 今日复习提示: 仅在有待复习词时温柔出现 */}
          {reviewCount > 0 && (
            <Link
              to="/memory"
              className="group mt-6 inline-flex items-center gap-3 rounded-full bg-light-yellow px-4 py-2 text-[14px] transition-shadow duration-200 hover:shadow-card cursor-pointer"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sunshine text-[#7A5C00]">
                <SparkleIcon width={13} height={13} />
              </span>
              <span className="font-medium text-text-primary">
                有 {reviewCount} 个词在等你复习
              </span>
              <ChevronRightIcon
                width={15}
                height={15}
                className="text-text-hint transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          )}
        </motion.div>

        {/* 学习空间场景 · 多层 3D 物体破框悬浮 + 鼠标视差景深 (非卡片堆叠) */}
        <motion.div
          variants={item}
          onPointerMove={onScene}
          onPointerLeave={onSceneLeave}
          className="relative flex min-h-[360px] items-center justify-center overflow-visible sm:min-h-[440px]"
        >
          {/* 景深背环 — 最深层柔环 (VID0 背后深环做景深) */}
          <ParallaxLayer
            mvx={mvx}
            mvy={mvy}
            depth={6}
            className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
          >
            <div className="relative h-[320px] w-[320px]">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-mint/60 via-transparent to-sky-soft/40 blur-md" />
              <div className="absolute inset-0 rounded-full border border-brand/15" />
              <div className="absolute inset-10 rounded-full border border-sunshine/20" />
            </div>
          </ParallaxLayer>

          {/* 流光螺旋 — 深层漂浮 (3D 玻璃形变体) */}
          <ParallaxLayer
            mvx={mvx}
            mvy={mvy}
            depth={12}
            className="pointer-events-none absolute -left-4 top-0 z-0 w-24"
          >
            <motion.img
              src={`${BASE}spatial/obj-spiral.png`}
              alt=""
              aria-hidden
              className="w-full select-none drop-shadow-[0_10px_24px_rgba(88,204,2,0.25)]"
              animate={{ y: [0, -12, 0], rotate: [0, -4, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </ParallaxLayer>

          {/* 发光球体 — 破框大球, 浮在卡片右上后方 (VID3 3D 渐变球体) */}
          <ParallaxLayer
            mvx={mvx}
            mvy={mvy}
            depth={16}
            className="pointer-events-none absolute -right-8 -top-10 z-0 w-44"
          >
            <motion.img
              src={`${BASE}spatial/obj-orb.png`}
              alt=""
              aria-hidden
              className="w-full select-none drop-shadow-[0_18px_40px_rgba(88,204,2,0.35)]"
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            />
          </ParallaxLayer>

          {/* 玻璃数据卡 — 前景可读层 (轻微反向视差, 更贴近观者) */}
          <ParallaxLayer mvx={mvx} mvy={mvy} depth={-4} className="relative z-10 w-full max-w-[380px]">
            <VocabCard
              overallPct={overallPct}
              learnedCount={learnedCount}
              streak={streak}
              totalWords={totalWords}
            />
          </ParallaxLayer>

          {/* 吉祥物精灵 — 前景探出, 视差最大 (破框悬浮 + 角色感) */}
          <ParallaxLayer
            mvx={mvx}
            mvy={mvy}
            depth={22}
            className="pointer-events-none absolute -bottom-6 -left-4 z-20 w-28"
          >
            <motion.img
              src={`${BASE}spatial/companion-spark.png`}
              alt=""
              aria-hidden
              className="w-full select-none drop-shadow-[0_10px_24px_rgba(255,200,0,0.45)]"
              animate={{ y: [0, -10, 0], rotate: [0, 3, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </ParallaxLayer>

          {/* 金色光粒 — 前景点缀 */}
          <ParallaxLayer
            mvx={mvx}
            mvy={mvy}
            depth={18}
            className="pointer-events-none absolute -bottom-4 -right-4 z-20 w-28"
          >
            <motion.img
              src={`${BASE}spatial/obj-sparks.png`}
              alt=""
              aria-hidden
              className="w-full select-none drop-shadow-[0_4px_16px_rgba(255,200,0,0.6)]"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </ParallaxLayer>
        </motion.div>
      </section>

      {/* 2 · 学习路线 — 发光路径 (无框、空间立体): 光束连接 + 立体球节点 + 浮动文字 */}
      <motion.section variants={item} className="relative mt-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-headline text-text-primary">你的学习路线</h2>
            <p className="mt-1.5 cjk text-[15px] text-text-secondary">
              从日常基础到一般概念，850 个核心词，一阶一阶稳稳走。
            </p>
          </div>
          <span className="mb-1 hidden shrink-0 items-baseline gap-1 font-display text-text-hint sm:inline-flex">
            <span className="text-title text-deep-green">{learnedCount}</span>
            <span className="text-[14px]">/ {totalWords} 词</span>
          </span>
        </div>

        <div className="relative -mx-5 mt-12 overflow-x-auto px-5 pb-4 md:mx-0 md:px-0">
          <div className="relative min-w-[600px] px-2">
            {/* 背后柔光带 — 给路径一层景深氛围, 无边框 */}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[60px] -z-10 h-32 -translate-y-1/2">
              <div className="absolute left-[8%] top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-mint/55 blur-3xl" />
              <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-soft/45 blur-3xl" />
              <div className="absolute right-[8%] top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-light-yellow/55 blur-3xl" />
            </div>

            {/* 标题行 (浮动文字, 无框) */}
            <div className="grid auto-cols-fr grid-flow-col">
              {stages.map((s) => (
                <div key={s.id} className="flex min-h-12 flex-col justify-end px-2 text-center">
                  <h3 className="font-display text-[15px] font-semibold leading-tight text-text-primary">
                    {s.title}
                  </h3>
                  <p className="vocab mt-0.5 text-[11px] text-text-hint">{s.subtitle}</p>
                </div>
              ))}
            </div>

            {/* 节点行 — 发光光束穿过立体球 */}
            <div className="relative mt-5 grid h-14 auto-cols-fr grid-flow-col items-center">
              {/* 光束底 (灰) */}
              <div
                aria-hidden
                className="absolute inset-x-[10%] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-light-gray"
              />
              {/* 光束进度 (绿→金, 带辉光) */}
              <div
                aria-hidden
                className="absolute left-[10%] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-brand to-soft-green shadow-[0_0_12px_rgba(88,204,2,0.7)]"
                style={{ width: `calc(80% * ${overallPct})` }}
              />
              {stages.map((s, i) => (
                <div key={s.id} className="relative z-10 flex items-center justify-center">
                  <StageOrb
                    stage={s}
                    index={i}
                    done={stageProgress.find((p) => p.id === s.id)?.done ?? 0}
                    active={s.id === activeStageId}
                    onClick={() => navigate(`/learn/${s.id}`)}
                  />
                </div>
              ))}
            </div>

            {/* 计数行 (浮动文字, 无框) */}
            <div className="mt-5 grid auto-cols-fr grid-flow-col">
              {stages.map((s) => {
                const done = stageProgress.find((p) => p.id === s.id)?.done ?? 0
                return (
                  <p
                    key={s.id}
                    className="cjk px-2 text-center text-[11px] tabular-nums text-text-secondary"
                  >
                    {done} / {s.total} 词
                  </p>
                )
              })}
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  )
}

/* —— 阶段色相: 状态驱动 (绿/天/金/珊瑚), 用于立体球渐变 + 辉光 —— */
const STAGE_HUE: Record<Stage['accent'], { c: string; soft: string }> = {
  green: { c: '#58CC02', soft: '#A8E06C' },
  sky: { c: '#5BB3F0', soft: '#DCEEFB' },
  gold: { c: '#FFC800', soft: '#FFE9A8' },
  coral: { c: '#FF8A65', soft: '#FFD4C7' },
}

// 学习路线节点: 立体发光球 (径向高光 + 内阴影 → 球面感), 当前阶段放大 + 浮动 + 脉冲光环
function StageOrb({
  stage,
  index,
  done,
  active,
  onClick,
}: {
  stage: Stage
  index: number
  done: number
  active: boolean
  onClick: () => void
}) {
  const h = STAGE_HUE[stage.accent]
  const complete = done >= stage.total && stage.total > 0
  const size = active ? 'h-14 w-14 text-[15px]' : 'h-10 w-10 text-[13px]'
  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={`${stage.title} · ${done}/${stage.total}`}
      whileHover={{ scale: 1.12, y: -3 }}
      animate={active ? { y: [0, -4, 0] } : undefined}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 22,
        ...(active ? { y: { duration: 3, repeat: Infinity, ease: 'easeInOut' } } : {}),
      }}
      className="relative cursor-pointer"
    >
      {/* 当前阶段脉冲光环 */}
      {active && (
        <span
          aria-hidden
          className="animate-pulse-ring absolute inset-0 rounded-full border-2"
          style={{ borderColor: h.c }}
        />
      )}
      <span
        className={`relative flex items-center justify-center rounded-full font-display font-bold text-white ${size}`}
        style={{
          background: `radial-gradient(circle at 34% 28%, #ffffff, ${h.soft} 38%, ${h.c} 100%)`,
          boxShadow: `0 8px 18px ${h.c}59, inset 0 -3px 6px ${h.c}88, inset 0 2px 5px rgba(255,255,255,0.85)`,
        }}
      >
        {complete ? <CheckIcon width={active ? 18 : 15} height={active ? 18 : 15} /> : index + 1}
      </span>
    </motion.button>
  )
}

/* —— 局部小组件 —— */

// 视差层: 把 hero 鼠标位移按 depth 放大成位移, 不同层不同 depth → 景深错位
function ParallaxLayer({
  mvx,
  mvy,
  depth,
  className,
  children,
}: {
  mvx: MotionValue<number>
  mvy: MotionValue<number>
  depth: number
  className?: string
  children: ReactNode
}) {
  const x = useTransform(mvx, (v) => v * depth)
  const y = useTransform(mvy, (v) => v * depth)
  return (
    <motion.div style={{ x, y }} className={className}>
      {children}
    </motion.div>
  )
}

// 未来空间玻璃面板: 磨砂玻璃 + 鼠标 3D tilt + 光标高光 + 绿金霓虹描边 + HUD 角标
// 灵感 Cosmin Capitanu (Radium) 的深空 HUD, 这里适配到亮色绿系
function VocabCard({
  overallPct,
  learnedCount,
  streak,
  totalWords,
}: {
  overallPct: number
  learnedCount: number
  streak: number
  totalWords: number
}) {
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const mx = useMotionValue(50)
  const my = useMotionValue(50)
  const rotateX = useSpring(rx, { stiffness: 220, damping: 22 })
  const rotateY = useSpring(ry, { stiffness: 220, damping: 22 })
  const sheen = useMotionTemplate`radial-gradient(240px circle at ${mx}% ${my}%, rgba(255,255,255,0.5), transparent 62%)`

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const nx = (e.clientX - r.left) / r.width
    const ny = (e.clientY - r.top) / r.height
    ry.set((nx - 0.5) * 9)
    rx.set(-(ny - 0.5) * 9)
    mx.set(nx * 100)
    my.set(ny * 100)
  }
  const onLeave = () => {
    rx.set(0)
    ry.set(0)
    mx.set(50)
    my.set(50)
  }

  return (
    <div style={{ perspective: 1100 }}>
      <motion.div
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative rounded-xl"
      >
        {/* 彩色光晕底 (被玻璃磨砂) */}
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-soft-green">
          <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-brand/45 blur-2xl" />
          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-sunshine/45 blur-2xl" />
          <div className="absolute bottom-6 right-16 h-24 w-24 rounded-full bg-light-green/55 blur-2xl" />
        </div>

        {/* 玻璃面板 */}
        <div className="relative overflow-hidden rounded-xl border border-white/60 bg-white/45 p-card-pad shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_22px_45px_-14px_rgba(46,125,0,0.5)] backdrop-blur-xl backdrop-saturate-150">
          {/* 光标高光 */}
          <motion.span aria-hidden style={{ background: sheen }} className="pointer-events-none absolute inset-0" />
          {/* 顶部绿→金霓虹描边线 */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-6 right-6 top-0 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, #58CC02 28%, #FFC800 72%, transparent)',
              boxShadow: '0 0 10px 1px rgba(88,204,2,0.5)',
            }}
          />
          {/* HUD 角标 (左上 / 右下) */}
          <span aria-hidden className="pointer-events-none absolute left-2.5 top-2.5 h-3 w-3 border-l border-t border-brand/50" />
          <span aria-hidden className="pointer-events-none absolute bottom-2.5 right-2.5 h-3 w-3 border-b border-r border-brand/50" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label-caps uppercase text-deep-green">学习进度</p>
                <p className="mt-1.5 font-display text-title text-text-primary">你的词汇量</p>
              </div>
              <ProgressRing pct={overallPct} size={72} stroke={7}>
                <span className="font-display text-[15px] text-deep-green">
                  {Math.round(overallPct * 100)}%
                </span>
              </ProgressRing>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <Metric label="已学单词" value={learnedCount} />
              <Metric label="连续打卡" value={streak} suffix="天" spark />
            </div>

            <p className="mt-5 flex items-center gap-1.5 cjk text-[13px] text-deep-green">
              <CheckIcon width={14} height={14} />
              已掌握 {learnedCount} / {totalWords} 词，稳稳地往前走。
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function Metric({
  label,
  value,
  suffix,
  spark,
}: {
  label: string
  value: number
  suffix?: string
  spark?: boolean
}) {
  return (
    <div className="rounded-lg bg-white/70 px-4 py-3">
      <p className="cjk text-[12px] text-text-secondary">{label}</p>
      <p
        className={`mt-0.5 inline-flex items-baseline gap-0.5 font-display text-title ${
          spark ? 'text-[#9A7400]' : 'text-deep-green'
        }`}
      >
        {spark && <SparkleIcon width={14} height={14} className="self-center text-sunshine" />}
        {value}
        {suffix && <span className="text-[14px]">{suffix}</span>}
      </p>
    </div>
  )
}
