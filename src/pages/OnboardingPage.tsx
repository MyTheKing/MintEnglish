import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, Card, AISparkBadge, ProgressRing } from '../components/ui'
import {
  SparkleIcon,
  ArrowRightIcon,
  CheckIcon,
  RefreshIcon,
  BookIcon,
} from '../components/icons'
import { useLearningStore } from '../stores/useLearningStore'

// ─────────────────────────────────────────────
// 新手测评 · 沉浸式单屏多步流程 (无顶部导航, App 已隐藏)
// 几道小题 → AI 定位起点章节。鼓励而不打分: 「跟着走就好」
// 暖白底 · 绿主角 · 金点睛 · framer AnimatePresence 步间切换
// ─────────────────────────────────────────────

type Level = 'beginner' | 'elementary' | 'intermediate' | 'advanced' | 'expert'

interface Option {
  label: string
  /** 英文呈现 (vocab 衬线), 可选 */
  en?: string
  /** 该选项贡献的能力分: 越高代表水平越高 */
  score: number
}

interface Question {
  id: string
  /** 顶部小标签 */
  kicker: string
  prompt: string
  /** 题面里需要 vocab 呈现的英文句/词 */
  feature?: { text: string; cjk?: string }
  options: Option[]
}

const QUESTIONS: Question[] = [
  {
    id: 'reading',
    kicker: '阅读理解',
    prompt: '你能读懂下面这句吗？',
    feature: {
      text: 'The little plant needs water and light to grow.',
      cjk: '不用急着翻译，凭感觉选就好。',
    },
    options: [
      { label: '完全可以', score: 3 },
      { label: '大概懂', score: 2 },
      { label: '有点难', score: 1 },
      { label: '看不懂', score: 0 },
    ],
  },
  {
    id: 'vocab',
    kicker: '词汇辨识',
    prompt: '“negotiate” 这个词，你的感觉是？',
    feature: {
      text: 'negotiate',
      cjk: '它常出现在商务和考试里。',
    },
    options: [
      { label: '认识，会用', en: 'use it', score: 3 },
      { label: '见过，知道意思', en: 'seen it', score: 2 },
      { label: '面熟，记不清', en: 'maybe', score: 1 },
      { label: '第一次见', en: 'new', score: 0 },
    ],
  },
  {
    id: 'comfort',
    kicker: '学习节奏',
    prompt: '每天愿意花多少时间陪单词长大？',
    feature: {
      text: 'a little every day',
      cjk: '不必勉强，舒服最重要。',
    },
    options: [
      { label: '5 分钟，轻松起步', score: 0 },
      { label: '10 分钟，刚刚好', score: 1 },
      { label: '20 分钟，认真学', score: 2 },
      { label: '更久也乐意', score: 3 },
    ],
  },
]

const GOALS = [
  { id: '日常交流', label: '日常交流', en: 'Everyday', desc: '听说读写，自然开口' },
  { id: '四级', label: '四级', en: 'CET-4', desc: '稳过四级核心词' },
  { id: '考研', label: '考研', en: 'Postgrad', desc: '考研大纲词汇攻坚' },
  { id: '雅思', label: '雅思', en: 'IELTS', desc: '冲刺学术高频词' },
  { id: '职场英语', label: '职场英语', en: 'Business', desc: '商务沟通与邮件' },
] as const

const LEVEL_META: Record<Level, { zh: string; en: string; chapter: string }> = {
  beginner: { zh: '入门', en: 'First Steps', chapter: '日常基础 · 第 1 节' },
  elementary: { zh: '初级', en: 'Everyday Basics', chapter: '日常基础 · 第 1 节' },
  intermediate: { zh: '中级', en: 'Building Up', chapter: '动作与虚词 · 第 1 节' },
  advanced: { zh: '中高级', en: 'Going Further', chapter: '具体事物 · 第 1 节' },
  expert: { zh: '高阶', en: 'Fluent Forest', chapter: '一般概念 · 第 1 节' },
}

/** 由测评得分映射到水平 (满分 9 = 3 题 × 3 分) */
function deriveLevel(scores: number[]): Level {
  const total = scores.reduce((a, b) => a + b, 0)
  if (total <= 1) return 'beginner'
  if (total <= 3) return 'elementary'
  if (total <= 5) return 'intermediate'
  if (total <= 7) return 'advanced'
  return 'expert'
}

// 步骤序列: welcome → 每题一步 → goal → scoring → result
type Phase = 'welcome' | 'question' | 'goal' | 'scoring' | 'result'

export default function OnboardingPage() {
  const navigate = useNavigate()
  const reduce = false
  const completeOnboarding = useLearningStore((s) => s.completeOnboarding)

  const [phase, setPhase] = useState<Phase>('welcome')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [goal, setGoal] = useState<string | null>(null)

  const level = useMemo(() => deriveLevel(answers), [answers])

  // 进度: welcome 不计, 3 题 + 目标 = 4 段
  const totalSteps = QUESTIONS.length + 1
  const stepDone =
    phase === 'question' ? qIndex : phase === 'goal' ? QUESTIONS.length : totalSteps

  // —— 步间过渡: 横向滑入淡出 ——
  const slide = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      }
    : {
        initial: { opacity: 0, x: 32 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -32 },
        transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] as const },
      }

  function start() {
    setPhase('question')
    setQIndex(0)
    setAnswers([])
  }

  function chooseOption(score: number) {
    const next = [...answers]
    next[qIndex] = score
    setAnswers(next)
    // 轻微停顿后自动推进, 让选中态被看见
    const delay = reduce ? 0 : 360
    window.setTimeout(() => {
      if (qIndex < QUESTIONS.length - 1) {
        setQIndex(qIndex + 1)
      } else {
        setPhase('goal')
      }
    }, delay)
  }

  function confirmGoal() {
    if (!goal) return
    setPhase('scoring')
    const delay = reduce ? 200 : 800
    window.setTimeout(() => setPhase('result'), delay)
  }

  function finish() {
    completeOnboarding(level, goal ?? '日常交流')
    navigate('/learn')
  }

  function restart() {
    setAnswers([])
    setGoal(null)
    setQIndex(0)
    setPhase('welcome')
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-warm-white">
      {/* 柔和背景光晕 (绿主角 + 金点睛) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-mint blur-3xl opacity-60" />
        <div className="absolute -right-20 top-1/3 h-64 w-64 rounded-full bg-light-yellow blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-soft-green/10 blur-3xl" />
      </div>

      {/* 顶部品牌标识 */}
      <header className="relative z-10 flex items-center justify-between px-5 md:px-page-margin py-6">
        <div className="inline-flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-float">
            <SparkleIcon width={18} height={18} />
          </span>
          <span className="font-display text-[17px] font-bold tracking-tight text-text-primary">
            Sprout &amp; Spark
          </span>
        </div>

        {/* 进度: welcome / scoring / result 不展示 */}
        {(phase === 'question' || phase === 'goal') && (
          <div className="flex items-center gap-3">
            <span className="cjk text-[13px] text-text-hint">
              {stepDone + 1} / {totalSteps}
            </span>
            <SlimProgress done={stepDone} total={totalSteps} reduce={!!reduce} />
          </div>
        )}
      </header>

      {/* 主舞台: 垂直居中 */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 md:px-page-margin pb-16">
        <div className="w-full max-w-[560px]">
          <AnimatePresence mode="wait">
            {/* ─── 1 · 欢迎 ─── */}
            {phase === 'welcome' && (
              <motion.div
                key="welcome"
                {...slide}
                className="text-center"
              >
                <motion.div
                  initial={reduce ? false : { scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-mint text-deep-green"
                >
                  <SparkleIcon width={40} height={40} />
                </motion.div>

                <h1 className="font-display text-display leading-tight text-text-primary text-balance">
                  欢迎来到这片
                  <span className="text-brand"> 森林</span>
                </h1>
                <p className="mx-auto mt-5 max-w-reading cjk text-body-lg text-text-secondary text-balance">
                  几道小题，帮你找到合适的起点。
                  <br />
                  没有对错，<span className="text-deep-green">跟着走就好</span>。
                </p>

                <div className="mt-9 flex flex-col items-center gap-4">
                  <Button variant="pop" size="lg" onClick={start}>
                    开始吧
                    <ArrowRightIcon width={18} height={18} />
                  </Button>
                  <span className="cjk text-[13px] text-text-hint">大约 1 分钟</span>
                </div>
              </motion.div>
            )}

            {/* ─── 2 · 测评题 ─── */}
            {phase === 'question' && (
              <motion.div key={`q-${qIndex}`} {...slide}>
                <QuestionCard
                  question={QUESTIONS[qIndex]}
                  selected={answers[qIndex]}
                  onChoose={chooseOption}
                />
              </motion.div>
            )}

            {/* ─── 3 · 目标 ─── */}
            {phase === 'goal' && (
              <motion.div key="goal" {...slide}>
                <p className="text-center text-label-caps uppercase text-deep-green">
                  最后一步
                </p>
                <h2 className="mt-2 text-center font-display text-headline text-text-primary text-balance">
                  你想往哪个方向生长？
                </h2>
                <p className="mt-2 text-center cjk text-[15px] text-text-secondary">
                  选一个目标，AI 会据此为你铺路。
                </p>

                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {GOALS.map((g) => {
                    const active = goal === g.id
                    return (
                      <button
                        key={g.id}
                        onClick={() => setGoal(g.id)}
                        className={[
                          'group flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 cursor-pointer',
                          active
                            ? 'border-brand bg-mint shadow-card'
                            : 'border-transparent bg-white shadow-card hover:-translate-y-0.5 hover:shadow-card-hover',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200',
                            active
                              ? 'bg-brand text-white'
                              : 'bg-mint text-deep-green group-hover:bg-mint-deep',
                          ].join(' ')}
                        >
                          {active ? (
                            <CheckIcon width={15} height={15} />
                          ) : (
                            <SparkleIcon width={14} height={14} />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display text-[16px] font-semibold text-text-primary">
                            {g.label}
                          </span>
                          <span className="block text-[12px] text-text-hint">
                            <span className="vocab text-deep-green">{g.en}</span>
                            <span className="mx-1.5">·</span>
                            <span className="cjk">{g.desc}</span>
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-8 flex justify-center">
                  <Button variant="pop" size="lg" onClick={confirmGoal} disabled={!goal}>
                    看看我的起点
                    <ArrowRightIcon width={18} height={18} />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ─── 4a · 评分中 ─── */}
            {phase === 'scoring' && (
              <motion.div
                key="scoring"
                {...slide}
                className="flex flex-col items-center text-center"
              >
                <motion.div
                  animate={reduce ? {} : { rotate: 360 }}
                  transition={{ duration: 1.1, ease: 'linear', repeat: Infinity }}
                  className="mb-6"
                >
                  <ProgressRing pct={0.75} size={84} stroke={8}>
                    <SparkleIcon
                      width={26}
                      height={26}
                      className="text-deep-green"
                    />
                  </ProgressRing>
                </motion.div>
                <h2 className="font-display text-title text-text-primary">
                  正在为你规划路线…
                </h2>
                <p className="mt-2 cjk text-[14px] text-text-secondary">
                  AI 正根据你的答案挑选合适的起点。
                </p>
              </motion.div>
            )}

            {/* ─── 4b · 结果 ─── */}
            {phase === 'result' && (
              <motion.div key="result" {...slide}>
                <Card className="relative overflow-hidden bg-soft-green/95 text-center">
                  <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand/15" />
                  <div className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-sunshine/25" />

                  <div className="relative">
                    <motion.span
                      initial={reduce ? false : { scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-deep-green shadow-card"
                    >
                      <CheckIcon width={30} height={30} />
                    </motion.span>

                    <AISparkBadge label="AI 已为你规划" className="mt-5" />

                    <p className="mt-4 text-label-caps uppercase text-deep-green">
                      你的起点
                    </p>
                    <h2 className="mt-1 font-display text-headline text-text-primary">
                      {LEVEL_META[level].zh}
                      <span className="mx-2 text-text-hint">·</span>
                      <span className="vocab text-deep-green">
                        {LEVEL_META[level].en}
                      </span>
                    </h2>

                    <p className="mx-auto mt-4 max-w-reading cjk text-[15px] leading-relaxed text-text-secondary">
                      很好，从这里起步刚刚好。我们会从
                      <span className="font-semibold text-text-primary">
                        「{LEVEL_META[level].chapter}」
                      </span>
                      开始，朝着
                      <span className="font-semibold text-deep-green">
                        {goal ?? '日常交流'}
                      </span>
                      慢慢生长。
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-[13px] text-deep-green">
                      <BookIcon width={15} height={15} />
                      <span className="cjk">第一节有 6 个新词在等你</span>
                    </div>
                  </div>
                </Card>

                <div className="mt-7 flex flex-col items-center gap-3">
                  <Button variant="pop" size="lg" onClick={finish}>
                    开始学习
                    <ArrowRightIcon width={18} height={18} />
                  </Button>
                  <button
                    onClick={restart}
                    className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-text-secondary transition-colors duration-200 hover:text-deep-green cursor-pointer"
                  >
                    <RefreshIcon
                      width={14}
                      height={14}
                      className="transition-transform duration-300 group-hover:-rotate-45"
                    />
                    重新测评
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

/* —— 局部小组件 —— */

/** 顶部纤细进度条 */
function SlimProgress({
  done,
  total,
  reduce,
}: {
  done: number
  total: number
  reduce: boolean
}) {
  const pct = total ? Math.min(done / total, 1) : 0
  return (
    <div
      className="h-2 w-32 overflow-hidden rounded-full bg-mint"
      role="img"
      aria-label={`进度 ${done}/${total}`}
    >
      <motion.div
        className="h-full rounded-full bg-brand"
        initial={false}
        animate={{ width: `${pct * 100}%` }}
        transition={{ duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

/** 单题卡: 题面 + 卡片选项 (选中 mint) */
function QuestionCard({
  question,
  selected,
  onChoose,
}: {
  question: Question
  selected?: number
  onChoose: (score: number) => void
}) {
  return (
    <div>
      <p className="text-center text-label-caps uppercase text-deep-green">
        {question.kicker}
      </p>
      <h2 className="mt-2 text-center font-display text-headline text-text-primary text-balance">
        {question.prompt}
      </h2>

      {question.feature && (
        <div className="mt-5 rounded-xl bg-white px-6 py-5 text-center shadow-card">
          <p className="vocab text-[22px] leading-snug text-text-primary">
            {question.feature.text}
          </p>
          {question.feature.cjk && (
            <p className="mt-2 cjk text-[13px] text-text-hint">
              {question.feature.cjk}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((opt) => {
          const active = selected === opt.score
          return (
            <button
              key={opt.label}
              onClick={() => onChoose(opt.score)}
              className={[
                'flex items-center justify-between gap-2 rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 cursor-pointer',
                active
                  ? 'border-brand bg-mint shadow-card'
                  : 'border-transparent bg-white shadow-card hover:-translate-y-0.5 hover:shadow-card-hover',
              ].join(' ')}
            >
              <span className="min-w-0">
                <span className="block cjk text-[15px] font-medium text-text-primary">
                  {opt.label}
                </span>
                {opt.en && (
                  <span className="vocab block text-[12px] text-text-hint">
                    {opt.en}
                  </span>
                )}
              </span>
              <span
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200',
                  active ? 'bg-brand text-white' : 'bg-off-white text-transparent',
                ].join(' ')}
              >
                <CheckIcon width={13} height={13} />
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-6 text-center cjk text-[13px] text-text-hint">
        选好就会自动进入下一题，凭直觉就好。
      </p>
    </div>
  )
}
