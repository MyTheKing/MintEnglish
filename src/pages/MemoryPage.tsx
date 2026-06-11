import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button, Card, Chip, AISparkBadge, Toast } from '../components/ui'
import {
  MemoryIcon,
  SparkleIcon,
  ArrowRightIcon,
  RefreshIcon,
  CheckIcon,
} from '../components/icons'
import { lookupWord } from '../lib/dictionary'
import { useLearningStore } from '../stores/useLearningStore'

// ─────────────────────────────────────────────
// 记忆系统 · 学习日志 + 待复习 + 每日邮件复习配置
// 把今天学的悄悄存进长期记忆 · 绿主角金点睛 · 暖白柔和
// ─────────────────────────────────────────────

/** 'YYYY-MM-DD' → 友好标题, 标记 今天/昨天 */
function formatDay(key: string): { label: string; tag?: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(key + 'T00:00:00')
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000)
  const label = d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
  if (diff === 0) return { label, tag: '今天' }
  if (diff === 1) return { label, tag: '昨天' }
  return { label }
}

export default function MemoryPage() {
  const navigate = useNavigate()
  const reduce = false

  const history = useLearningStore((s) => s.history)
  const reviewWords = useLearningStore((s) => s.reviewWords)
  const learnedWords = useLearningStore((s) => s.learnedWords)
  const todayWords = useLearningStore((s) => s.todayWords)
  const streak = useLearningStore((s) => s.streak)
  const removeReview = useLearningStore((s) => s.removeReview)

  // —— 邮件复习配置 (纯前端原型) ——
  const [mailOn, setMailOn] = useState(true)
  const [mailTime, setMailTime] = useState<string>('21:00')
  const [email, setEmail] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  // 按天降序
  const days = useMemo(
    () => Object.keys(history).filter((k) => history[k]?.length).sort((a, b) => (a < b ? 1 : -1)),
    [history],
  )
  const hasLog = days.length > 0

  // —— stagger 渐入 ——
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: reduce ? 0 : 0.04 } },
  }
  const item = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
      }

  const jump = (word: string) => navigate('/graph?w=' + encodeURIComponent(word))
  // 复习列表里点击 → 视为已复习, 跳转图谱前先移除
  const reviewAndJump = (word: string) => {
    removeReview(word)
    jump(word)
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-content px-5 md:px-page-margin pt-12 pb-24 md:pb-12"
    >
      {/* 1 · Header */}
      <motion.header variants={item}>
        <Chip accent="gold" className="mb-5 gap-1.5">
          <MemoryIcon width={13} height={13} />
          记忆系统
        </Chip>

        <h1 className="font-display text-display leading-tight text-text-primary">
          把今天学的，
          <span className="text-[#5C7150]">悄悄存进长期记忆。</span>
        </h1>

        <p className="mt-5 max-w-reading cjk text-body-lg text-text-secondary">
          每个学过的词都记在这里。隔一阵再回来看看它们，记忆就会
          <span className="vocab text-[#5C7150]"> spark </span>
          得更牢一点。
        </p>

        {/* 小数据行 */}
        <div className="mt-7 flex flex-wrap gap-3">
          <Stat label="累计已学" value={learnedWords.length} suffix="词" />
          <Stat label="连续打卡" value={streak} suffix="天" spark />
          <Stat label="待复习" value={reviewWords.length} suffix="词" />
        </div>
      </motion.header>

      {/* 2 · 待复习 */}
      {reviewWords.length > 0 && (
        <motion.section variants={item} className="mt-12">
          <Card className="bg-light-yellow">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sunshine/30 text-[#9A7400]">
                <RefreshIcon width={20} height={20} />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-title text-text-primary">待复习</h2>
                <p className="mt-1 cjk text-[14px] text-text-secondary">
                  你标记了 {reviewWords.length} 个词，想再见见它们。
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {reviewWords.map((w) => (
                <WordChip key={w} word={w} onClick={() => reviewAndJump(w)} />
              ))}
            </div>
          </Card>
        </motion.section>
      )}

      {/* 3 · 学习日志 */}
      <motion.section variants={item} className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-headline text-text-primary">学习日志</h2>
            <p className="mt-1.5 cjk text-[15px] text-text-secondary">
              按天回看走过的路，点任意单词进入词汇图谱。
            </p>
          </div>
          <AISparkBadge label="可进图谱" className="mb-1 hidden shrink-0 sm:inline-flex" />
        </div>

        {hasLog ? (
          // 时间线: 一条脊线串起每一天 (无框条目, 记忆沉淀感)
          <div className="relative mt-9 pl-9">
            {/* 脊线 + 顶端起点 */}
            <div aria-hidden className="absolute left-3 top-1 bottom-2 w-px bg-gradient-to-b from-[#C7D6BA] via-[#D5E0CA] to-transparent" />
            <span aria-hidden className="absolute left-[7px] top-0 h-2.5 w-2.5 rounded-full bg-[#9DB389] ring-4 ring-warm-white" />

            <div className="space-y-10">
              {days.map((key) => {
                const words = history[key]
                const { label, tag } = formatDay(key)
                const isToday = tag === '今天'
                return (
                  <div key={key} className="relative">
                    {/* 节点 */}
                    <span
                      aria-hidden
                      className="absolute -left-9 top-0.5 flex h-6 w-6 items-center justify-center"
                    >
                      <span
                        className={`rounded-full ring-4 ring-warm-white transition-colors ${
                          isToday ? 'h-3.5 w-3.5 bg-[#6E8B5E]' : 'h-2.5 w-2.5 bg-[#C2D2B4]'
                        }`}
                      />
                    </span>

                    {/* 日期行 */}
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="cjk text-[15px] font-semibold text-text-primary">{label}</h3>
                        {tag && (
                          <span
                            className={`cjk rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isToday ? 'bg-[#6E8B5E] text-white' : 'bg-[#E8EEE1] text-[#5C7150]'
                            }`}
                          >
                            {tag}
                          </span>
                        )}
                      </div>
                      <span className="cjk text-[12px] tabular-nums text-text-hint">
                        {words.length} 个词
                      </span>
                    </div>

                    {/* 单词流 (无框) */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {words.map((w) => (
                        <WordChip key={w} word={w} onClick={() => jump(w)} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <Card className="mt-7 flex flex-col items-center py-14 text-center">
            <motion.img
              src={`${import.meta.env.BASE_URL}spatial/companion-spark.png`}
              alt="陪伴精灵 Spark"
              className="h-28 w-28 select-none object-contain drop-shadow-[0_12px_28px_rgba(255,200,0,0.28)]"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <p className="mt-4 cjk text-body-lg text-text-primary">还没有学习记录</p>
            <p className="mt-1.5 cjk text-[14px] text-text-secondary">去学一节吧，第一颗记忆的种子等你来种。</p>
            <Button variant="pop" className="mt-6" onClick={() => navigate('/learn')}>
              开始学习
              <ArrowRightIcon width={18} height={18} />
            </Button>
          </Card>
        )}
      </motion.section>

      {/* 4 · 每日邮件复习 (前端原型) */}
      <motion.section variants={item} className="mt-12">
        <Card className="bg-soft-green/95 relative overflow-hidden">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand/15" />
          <div className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-sunshine/20" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-label-caps uppercase text-deep-green">每日提醒</p>
                <h2 className="mt-1.5 font-display text-title text-text-primary">每日邮件复习</h2>
              </div>
              <Switch on={mailOn} onChange={setMailOn} />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="block">
                <span className="cjk text-[13px] font-medium text-deep-green">提醒时间</span>
                <TimeField value={mailTime} onChange={setMailTime} disabled={!mailOn} />
                <span className="cjk mt-1 block text-[12px] text-deep-green/70">点击字段任意位置即可选择时间</span>
              </div>

              <label className="block">
                <span className="cjk text-[13px] font-medium text-deep-green">接收邮箱</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!mailOn}
                  placeholder="you@example.com"
                  className="vocab mt-1.5 w-full rounded-lg border-2 border-mint-deep bg-white px-4 py-2.5 text-[15px] text-text-primary outline-none transition-colors duration-200 placeholder:text-text-hint hover:border-light-green focus:border-brand disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>
            </div>

            {/* 预览 */}
            <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-white/70 px-4 py-3.5">
              <AISparkBadge className="mt-0.5 shrink-0" />
              <p className="cjk text-[14px] leading-relaxed text-text-primary">
                开启后，你学习过的那天，AI 会把当天学的词整理成一份记忆报告，在
                <span className="font-semibold text-deep-green">第二天 {mailTime}</span> 发到你的邮箱；没有学习的日子不会发送。
                {todayWords.length > 0 ? (
                  <>
                    今天学了 <span className="font-semibold text-deep-green">{todayWords.length}</span> 个词，将于
                    <span className="font-semibold text-deep-green">明天 {mailTime}</span> 寄出。
                  </>
                ) : (
                  <>今天还没有学新词，明天暂不会收到邮件。</>
                )}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Button
                variant="pop"
                onClick={() => setToast('已保存，明天见 ✦')}
                disabled={!mailOn}
              >
                <CheckIcon width={17} height={17} />
                保存设置
              </Button>
              <p className="cjk text-[12px] text-deep-green/80">
                此处对应 demo 的 NestJS + BullMQ 邮件服务，原型仅为前端界面。
              </p>
            </div>
          </div>
        </Card>
      </motion.section>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </motion.div>
  )
}

/* —— 自定义时间选择器 (替代原生竖白条下拉, 风格统一) —— */
function TimeField({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const hourColRef = useRef<HTMLDivElement>(null)
  const minColRef = useRef<HTMLDivElement>(null)

  const [hh, mm] = value.split(':')
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

  // 点击外部 / Esc 关闭
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // 打开时把当前值滚动到可视中央
  useEffect(() => {
    if (!open) return
    const scrollSel = (col: HTMLDivElement | null) => {
      const el = col?.querySelector('[data-selected="true"]') as HTMLElement | null
      if (el && col) col.scrollTop = el.offsetTop - col.clientHeight / 2 + el.clientHeight / 2
    }
    scrollSel(hourColRef.current)
    scrollSel(minColRef.current)
  }, [open])

  const col =
    'flex-1 h-44 overflow-y-auto px-1.5 py-1.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-mint-deep/40'
  const cell = (active: boolean) =>
    `w-full cursor-pointer rounded-md py-1.5 text-center text-[14px] font-semibold tabular-nums transition-colors duration-150 ${
      active ? 'bg-brand text-white' : 'text-text-primary hover:bg-mint'
    }`

  return (
    <div className="relative mt-1.5" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-lg border-2 bg-white py-2.5 pl-3.5 pr-3 text-left transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? 'border-brand' : 'border-mint-deep hover:border-light-green'
        }`}
      >
        <span className="text-deep-green">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5V12l3 1.8" />
          </svg>
        </span>
        <span className="flex-1 text-[15px] font-semibold tabular-nums text-text-primary">{value}</span>
        <ArrowRightIcon
          width={16}
          height={16}
          className={`text-text-hint transition-transform duration-200 ${open ? '-rotate-90' : 'rotate-90'}`}
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-light-gray bg-white shadow-popup">
          <div className="flex items-center justify-between border-b border-light-gray px-3 py-2">
            <span className="cjk text-[12px] text-text-hint">时</span>
            <span className="cjk text-[12px] text-text-hint">分</span>
          </div>
          <div className="flex divide-x divide-light-gray">
            <div className={col} ref={hourColRef}>
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  data-selected={h === hh}
                  onClick={() => onChange(`${h}:${mm}`)}
                  className={cell(h === hh)}
                >
                  {h}
                </button>
              ))}
            </div>
            <div className={col} ref={minColRef}>
              {minutes.map((m) => (
                <button
                  key={m}
                  type="button"
                  data-selected={m === mm}
                  onClick={() => onChange(`${hh}:${m}`)}
                  className={cell(m === mm)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end border-t border-light-gray px-3 py-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cjk rounded-md bg-brand px-3 py-1 text-[13px] font-semibold text-white transition-colors hover:bg-deep-green"
            >
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* —— 局部小组件 —— */

function Stat({
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
    <div className="rounded-lg bg-white px-5 py-3 shadow-card">
      <p className="cjk text-[12px] text-text-secondary">{label}</p>
      <p
        className={`mt-0.5 inline-flex items-baseline gap-1 font-display text-title ${
          spark ? 'text-[#9A7400]' : 'text-[#5C7150]'
        }`}
      >
        {spark && <SparkleIcon width={14} height={14} className="self-center text-sunshine" />}
        {value}
        {suffix && <span className="cjk text-[13px] font-normal text-text-secondary">{suffix}</span>}
      </p>
    </div>
  )
}

/** 可点单词芯片: 英文 vocab + 中文释义, 跳转图谱 */
function WordChip({ word, onClick }: { word: string; onClick: () => void }) {
  const { translation } = lookupWord(word)
  return (
    <button
      onClick={onClick}
      aria-label={`在图谱中查看 ${word}`}
      className="group inline-flex items-center gap-2 rounded-lg border border-[#DCE6D0] bg-[#F1F5EC] px-3 py-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#9DB389] hover:bg-[#E4ECDB] hover:shadow-[0_4px_10px_rgba(94,113,80,0.14)] cursor-pointer"
    >
      <span className="vocab text-[15px] font-semibold leading-none text-[#3F4A37]">{word}</span>
      {translation && (
        <span className="cjk text-[12px] leading-none text-[#8A9C7E]">
          {translation}
        </span>
      )}
    </button>
  )
}

/** 绿色开关 (track mint/brand, knob white) */
function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label="开启每日邮件复习"
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full cursor-pointer ${
        on ? 'bg-brand' : 'bg-mint-deep'
      }`}
    >
      {/* Framer 逐帧滑动: 不受系统「减少动态」关闭 CSS 过渡的影响 */}
      <motion.span
        className="inline-block h-5 w-5 rounded-full bg-white shadow-sm"
        animate={{ x: on ? 24 : 4 }}
        transition={{ type: 'spring', stiffness: 520, damping: 34 }}
      />
    </button>
  )
}
