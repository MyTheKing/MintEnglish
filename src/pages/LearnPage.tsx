// ─────────────────────────────────────────────
// LEARN 流 — 学习计划的核心 ⭐ 表面
// 内部嵌套路由 (挂载于 /learn/*):
//   /learn                          阶段列表
//   /learn/:stage                   章节路径
//   /learn/:stage/:chapter          单词预览
//   /learn/:stage/:chapter/study    卡片流 + 章节末复习
// 设计契约: 明亮画布 + 柔绿阴影, 禁暗黑 / 禁红 / 禁自动播放 / 禁 3D 跟随.
// ─────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState } from 'react'
import { Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Button,
  Card,
  Chip,
  ProgressDots,
  ProgressRing,
  PlayButton,
  AISparkBadge,
} from '../components/ui'
import { WordIllustration } from '../components/WordIllustration'
import { ClickableText } from '../components/ClickableText'
import {
  ArrowRightIcon,
  GalaxyIcon,
  CheckIcon,
  CloseIcon,
  LockIcon,
  MenuIcon,
  ChevronRightIcon,
  BookIcon,
  SparkleIcon,
  EyeIcon,
  EyeOffIcon,
} from '../components/icons'
import { getStages, getStage, getChapter } from '../lib/chapters'
import { getRichWord } from '../lib/dictionary'
import { useLearningStore } from '../stores/useLearningStore'
import type { Stage, Chapter, RichWord } from '../lib/types'
import { EASE_FLUID, staggerContainer, depthItem } from '../lib/motion'

const accentChip: Record<Stage['accent'], 'mint' | 'gold' | 'sky' | 'coral'> = {
  green: 'mint',
  gold: 'gold',
  sky: 'sky',
  coral: 'coral',
}

const FADE = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }

// 阶段已学进度 = 该阶段全部词 ∩ learnedWords
function stageLearned(stage: Stage, learned: string[]): number {
  const set = new Set(learned.map((w) => w.toLowerCase()))
  let n = 0
  for (const c of stage.chapters) for (const w of c.words) if (set.has(w.toLowerCase())) n++
  return n
}

// ════════════════════════════════════════════════════════
// 路由壳 — 单一默认导出
// ════════════════════════════════════════════════════════
export default function LearnPage() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <Routes>
      <Route index element={<StageListView />} />
      <Route path=":stage" element={<ChapterListView />} />
      <Route path=":stage/:chapter" element={<WordPreviewView />} />
      <Route path=":stage/:chapter/study" element={<StudyView />} />
      <Route path="*" element={<StageListView />} />
    </Routes>
  )
}

// 复用的页面容器 + 面包屑
function Shell({
  trail,
  children,
}: {
  trail: { label: string; to?: string }[]
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-content px-5 md:px-page-margin pt-12 pb-24 md:pb-12">
      <nav className="mb-7 flex items-center gap-1.5 text-[13px] font-cjk text-text-secondary">
        {trail.map((t, i) => {
          const last = i === trail.length - 1
          return (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRightIcon width={14} height={14} className="text-text-hint" />}
              {last || !t.to ? (
                <span className="font-semibold text-deep-green">{t.label}</span>
              ) : (
                <Link
                  to={t.to}
                  className="cursor-pointer transition-colors duration-200 hover:text-deep-green"
                >
                  {t.label}
                </Link>
              )}
            </span>
          )
        })}
      </nav>
      {children}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// 1. 阶段列表  /learn
// ════════════════════════════════════════════════════════
function StageListView() {
  const stages = getStages()
  const learnedWords = useLearningStore((s) => s.learnedWords)

  return (
    <Shell trail={[{ label: '学习计划' }]}>
      <header className="mb-9">
        <h1 className="font-display text-headline text-text-primary">今日学习计划</h1>
        <p className="mt-2 font-cjk text-body-lg text-text-secondary">
          循序渐进，一节一节点亮你的英语星图。
        </p>
      </header>

      <motion.div
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {stages.map((s) => {
          const done = stageLearned(s, learnedWords)
          const pct = s.total ? done / s.total : 0
          return (
            <motion.div key={s.id} variants={depthItem}>
              <Link to={s.id} className="block h-full">
                <Card hover className="flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-title text-text-primary">{s.title}</h2>
                      <p className="vocab mt-1 text-body-lg text-text-secondary">{s.subtitle}</p>
                    </div>
                    <ProgressRing pct={pct} size={56}>
                      <span className="text-[12px] font-bold text-deep-green">
                        {Math.round(pct * 100)}%
                      </span>
                    </ProgressRing>
                  </div>

                  <div className="mt-6">
                    <div className="mb-3 flex items-center gap-2">
                      <Chip accent={accentChip[s.accent]}>{s.total} 词</Chip>
                      <Chip accent="mint">{s.chapters.length} 节</Chip>
                    </div>
                    <p className="font-cjk text-[13px] text-text-secondary">
                      已点亮 <span className="font-semibold text-deep-green">{done}</span> /{' '}
                      {s.total} 词
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-off-white">
                        <div
                          className="h-full rounded-full bg-brand transition-[width] duration-500"
                          style={{ width: `${Math.max(pct * 100, done > 0 ? 6 : 0)}%` }}
                        />
                      </div>
                      <span className="ml-3 flex items-center gap-1 text-deep-green">
                        <span className="text-[13px] font-semibold font-cjk">开始</span>
                        <ArrowRightIcon width={16} height={16} />
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>
    </Shell>
  )
}

// ════════════════════════════════════════════════════════
// 2. 章节路径  /learn/:stage
// ════════════════════════════════════════════════════════
function ChapterListView() {
  const { stage: stageId = '' } = useParams()
  const stage = getStage(stageId)
  const completedChapters = useLearningStore((s) => s.completedChapters)

  const learnedWords = useLearningStore((s) => s.learnedWords)

  if (!stage) return <NotFound to="/learn" label="返回学习计划" />

  const learnedSet = new Set(learnedWords.map((w) => w.toLowerCase()))

  // 第一个未完成章节之后的全部上锁
  const firstIncomplete = stage.chapters.findIndex((c) => !completedChapters.includes(c.id))
  const chapterState = (idx: number): 'done' | 'active' | 'locked' => {
    const c = stage.chapters[idx]
    if (completedChapters.includes(c.id)) return 'done'
    if (firstIncomplete === -1) return 'done'
    return idx === firstIncomplete ? 'active' : idx < firstIncomplete ? 'done' : 'locked'
  }

  return (
    <Shell trail={[{ label: '学习计划', to: '/learn' }, { label: stage.title }]}>
      <header className="mb-9">
        <h1 className="font-display text-headline text-text-primary">{stage.title}</h1>
        <p className="vocab mt-1 text-body-lg text-text-secondary">{stage.subtitle}</p>
      </header>

      <ol className="relative mx-auto max-w-reading">
        {stage.chapters.map((c, idx) => {
          const st = chapterState(idx)
          const locked = st === 'locked'
          const learnedCount = c.words.filter((w) => learnedSet.has(w.toLowerCase())).length
          const node = (
            <div
              className={`group relative flex w-full items-center gap-4 rounded-xl bg-white p-5 text-left shadow-card transition-all duration-200 ${
                locked
                  ? 'cursor-not-allowed opacity-60'
                  : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover'
              }`}
            >
              <StatusBubble state={st} index={idx + 1} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-title text-text-primary">{c.title}</span>
                  {st === 'active' && (
                    <span className="rounded-full bg-light-yellow px-2 py-0.5 text-[11px] font-semibold text-warn font-cjk">
                      进行中
                    </span>
                  )}
                  {st === 'done' && (
                    <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold text-deep-green font-cjk">
                      已完成
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-cjk text-[13px] text-text-secondary">
                  {st === 'active'
                    ? `${learnedCount}/${c.words.length} 个单词`
                    : `${c.words.length} 个单词`}
                </p>
              </div>
              {locked ? (
                <LockIcon width={18} height={18} className="text-text-hint" />
              ) : (
                <ArrowRightIcon
                  width={18}
                  height={18}
                  className="text-text-hint transition-colors duration-200 group-hover:text-deep-green"
                />
              )}
            </div>
          )

          return (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              className="relative mb-4 pl-0"
            >
              {locked ? (
                <div aria-disabled="true">{node}</div>
              ) : (
                <Link to={c.id} className="block">
                  {node}
                </Link>
              )}
            </motion.li>
          )
        })}
      </ol>
    </Shell>
  )
}

function StatusBubble({ state, index }: { state: 'done' | 'active' | 'locked'; index: number }) {
  if (state === 'done')
    return (
      <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_3px_0_#43C000]">
        <CheckIcon width={20} height={20} />
      </span>
    )
  if (state === 'locked')
    return (
      <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-off-white text-text-hint">
        <LockIcon width={18} height={18} />
      </span>
    )
  // active — 脉冲环
  return (
    <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint font-display text-title text-deep-green">
      <span className="absolute inset-0 rounded-full bg-brand/30 animate-pulse-ring" aria-hidden="true" />
      {index}
    </span>
  )
}

// ════════════════════════════════════════════════════════
// 3. 单词预览  /learn/:stage/:chapter
// ════════════════════════════════════════════════════════
function WordPreviewView() {
  const { stage: stageId = '', chapter: chapterId = '' } = useParams()
  const found = getChapter(stageId, chapterId)
  const learnedWords = useLearningStore((s) => s.learnedWords)

  if (!found) return <NotFound to="/learn" label="返回学习计划" />
  const { stage, chapter } = found
  const learnedSet = new Set(learnedWords.map((w) => w.toLowerCase()))

  return (
    <Shell
      trail={[
        { label: '学习计划', to: '/learn' },
        { label: stage.title, to: `/learn/${stage.id}` },
        { label: chapter.title },
      ]}
    >
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Chip accent={accentChip[stage.accent]}>{stage.title}</Chip>
          <span className="font-cjk text-[13px] text-text-secondary">
            本节 {chapter.words.length} 个单词
          </span>
        </div>
        <h1 className="font-display text-headline text-text-primary">{chapter.title}</h1>
        <p className="mt-2 font-cjk text-body-lg text-text-secondary">
          先快速浏览，准备好后开始逐词学习。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {chapter.words.map((w, i) => {
          const rich = getRichWord(w)
          const learned = learnedSet.has(w.toLowerCase())
          return (
            <motion.div
              key={w}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: i * 0.04 }}
            >
              <Card className="flex items-center gap-3 !p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint font-display text-[15px] text-deep-green">
                  {learned ? <CheckIcon width={16} height={16} className="text-brand" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="vocab text-title text-text-primary">{w}</span>
                    {rich?.pos && (
                      <span className="font-mono text-[12px] text-text-hint">{rich.pos}</span>
                    )}
                  </div>
                  <p className="truncate font-cjk text-[13px] text-text-secondary">
                    {rich?.translation ?? '—'}
                  </p>
                </div>
                <PlayButton word={w} audio={rich?.audio} />
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-9 flex justify-center">
        <Link to="study">
          <Button variant="pop" size="lg">
            <span className="flex items-center gap-2">
              开始学习
              <ArrowRightIcon width={18} height={18} />
            </span>
          </Button>
        </Link>
      </div>
    </Shell>
  )
}

// ════════════════════════════════════════════════════════
// 4. 卡片流 + 章节末复习  /learn/:stage/:chapter/study
// ════════════════════════════════════════════════════════
type Phase = 'cards' | 'prompt' | 'review' | 'done'

function StudyView() {
  const { stage: stageId = '', chapter: chapterId = '' } = useParams()
  const navigate = useNavigate()
  const found = getChapter(stageId, chapterId)

  const learnedWords = useLearningStore((s) => s.learnedWords)
  const learnWord = useLearningStore((s) => s.learnWord)
  const completeChapter = useLearningStore((s) => s.completeChapter)

  const [index, setIndex] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('cards')

  // 查看即点亮该词 (副作用放 effect, 不在渲染期写 store)
  const word = found?.chapter.words[index]
  useEffect(() => {
    if (word) learnWord(word)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word])

  if (!found) return <NotFound to="/learn" label="返回学习计划" />
  const { stage, chapter } = found

  const goNext = () => {
    if (index + 1 >= chapter.words.length) {
      setPhase('prompt')
    } else {
      setIndex((i) => i + 1)
    }
  }

  const finishChapter = () => {
    completeChapter(chapter.id)
    setPhase('done')
  }

  const learnedSet = new Set(learnedWords.map((w) => w.toLowerCase()))

  return (
    <Shell
      trail={[
        { label: '学习计划', to: '/learn' },
        { label: stage.title, to: `/learn/${stage.id}` },
        { label: chapter.title, to: `/learn/${stage.id}/${chapter.id}` },
        { label: '学习' },
      ]}
    >
      <div className="relative mx-auto max-w-card">
        {/* 本章单词菜单 — 默认气泡, 点击展开毛玻璃浮层 */}
        <div className="absolute -top-1 right-0 z-30">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? '收起本章单词菜单' : '展开本章单词菜单'}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-deep-green shadow-card transition-colors duration-200 hover:bg-mint cursor-pointer"
          >
            {menuOpen ? <CloseIcon width={18} height={18} /> : <MenuIcon width={20} height={20} />}
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="glass absolute right-0 mt-3 w-60 rounded-xl border border-white/60 p-3 shadow-popup"
              >
                <p className="mb-2 flex items-center gap-1.5 px-1 text-label-caps uppercase text-text-secondary">
                  <BookIcon width={14} height={14} /> 本章单词
                </p>
                <ul className="max-h-72 space-y-1 overflow-auto">
                  {chapter.words.map((w, i) => {
                    const isCur = i === index && phase === 'cards'
                    const learned = learnedSet.has(w.toLowerCase())
                    return (
                      <li key={w}>
                        <button
                          onClick={() => {
                            setIndex(i)
                            setPhase('cards')
                            setMenuOpen(false)
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors duration-200 cursor-pointer ${
                            isCur ? 'bg-mint' : 'hover:bg-off-white'
                          }`}
                        >
                          <span
                            className={`vocab text-body-lg ${
                              isCur ? 'text-deep-green font-semibold' : 'text-text-primary'
                            }`}
                          >
                            {w}
                          </span>
                          {learned && <CheckIcon width={15} height={15} className="text-brand" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── 卡片流 ── */}
        {phase === 'cards' && word && (
          <>
            <div className="mb-4 flex items-center justify-between pr-12">
              <span className="font-cjk text-[13px] text-text-secondary">
                {stage.title} · {chapter.title}
              </span>
              <ProgressDots total={chapter.words.length} done={index + 1} />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 48, scale: 0.94, filter: 'blur(10px)' }}
                animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -40, scale: 0.96, filter: 'blur(8px)' }}
                transition={{ duration: 0.5, ease: EASE_FLUID }}
              >
                <WordCard
                  word={word}
                  isLast={index + 1 >= chapter.words.length}
                  onGraph={() => navigate(`/graph?w=${encodeURIComponent(word)}`)}
                  onNext={goNext}
                />
              </motion.div>
            </AnimatePresence>
          </>
        )}

        {/* ── 复习提示 ── */}
        {phase === 'prompt' && (
          <ReviewPrompt
            onYes={() => setPhase('review')}
            onSkip={finishChapter}
          />
        )}

        {/* ── 遮词回忆复习 ── */}
        {phase === 'review' && (
          <ChapterReview
            chapter={chapter}
            onComplete={finishChapter}
            onSkip={finishChapter}
          />
        )}

        {/* ── 完成 ── */}
        {phase === 'done' && (
          <ChapterDone
            stage={stage}
            chapter={chapter}
            onNextChapter={() => navigate(`/learn/${stage.id}`)}
            onBackToStages={() => navigate('/learn')}
          />
        )}
      </div>
    </Shell>
  )
}

// ── 单张词卡 ──
function WordCard({
  word,
  isLast,
  onGraph,
  onNext,
}: {
  word: string
  isLast: boolean
  onGraph: () => void
  onNext: () => void
}) {
  const rich = getRichWord(word)
  const example = rich?.examples?.[0]

  return (
    <Card pad className="overflow-hidden">
      <WordIllustration
        word={word}
        alt={rich?.illustration.alt ?? word}
        image={rich?.illustration.image ?? ''}
        className="h-52 w-full rounded-xl"
        showBadge
      />

      <div className="mt-6 text-center">
        <h2 className="vocab text-word-hero text-text-primary">{word}</h2>
        <div className="mt-2 flex items-center justify-center gap-2">
          {rich?.phonetic && (
            <span className="font-mono text-phonetic text-text-secondary">{rich.phonetic}</span>
          )}
          <PlayButton word={word} audio={rich?.audio} />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2.5">
        {rich?.pos && <Chip accent="sky">{rich.pos}</Chip>}
        <span className="font-cjk text-body-lg text-text-primary">{rich?.translation ?? '—'}</span>
      </div>

      {example && (
        <div className="mt-6 rounded-lg bg-off-white p-4">
          <ClickableText
            text={example.en}
            highlight={example.highlight}
            className="vocab block text-body-lg leading-relaxed text-text-primary"
          />
          <p className="mt-1.5 font-cjk text-[13px] text-text-secondary">{example.cn}</p>
        </div>
      )}

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button variant="ghost" className="flex-1 justify-center" onClick={onGraph}>
          <span className="flex items-center justify-center gap-2">
            <GalaxyIcon width={18} height={18} />
            探索图谱
          </span>
        </Button>
        <Button variant="pop" className="flex-1 justify-center" onClick={onNext}>
          <span className="flex items-center justify-center gap-2">
            {isLast ? '去复习' : '下一个'}
            <ArrowRightIcon width={18} height={18} />
          </span>
        </Button>
      </div>
    </Card>
  )
}

// ── 复习提示卡 ──
function ReviewPrompt({ onYes, onSkip }: { onYes: () => void; onSkip: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={FADE}>
      <Card className="flex flex-col items-center py-10 text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-light-yellow text-sunshine">
          <SparkleIcon width={30} height={30} />
        </span>
        <h2 className="font-display text-headline text-text-primary">这一节学完了</h2>
        <p className="mt-2 max-w-xs font-cjk text-body-lg text-text-secondary">
          要不要快速过一遍？回忆一下刚学的几个词。
        </p>
        <div className="mt-7 flex items-center gap-3">
          <Button variant="ghost" onClick={onSkip}>
            直接完成
          </Button>
          <Button variant="pop" onClick={onYes}>
            <span className="flex items-center gap-2">
              快速复习
              <ArrowRightIcon width={18} height={18} />
            </span>
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

// ── 逐字母拼写输入 (每个字母一个下划线格, 自动聚焦下一格) ──
function SpellInput({
  word,
  letters,
  status,
  onChange,
  onSubmit,
  onPeekChange,
}: {
  word: string
  letters: string[]
  status: 'idle' | 'wrong'
  onChange: (next: string[]) => void
  onSubmit: () => void
  onPeekChange?: (peek: boolean) => void
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const savedRef = useRef<string[]>([])
  const [peek, setPeek] = useState(false)
  const editable = useMemo(() => word.split('').map((c) => /[a-zA-Z]/.test(c)), [word])

  // 卡片切换 → 关闭偷看 + 聚焦第一个可填格
  useEffect(() => {
    setPeek(false)
    onPeekChange?.(false)
    savedRef.current = []
    const first = editable.findIndex(Boolean)
    if (first >= 0) refs.current[first]?.focus()
  }, [word]) // eslint-disable-line react-hooks/exhaustive-deps

  const togglePeek = () => {
    if (!peek) {
      savedRef.current = letters
      onChange(word.split('').map((c, i) => (editable[i] ? c : letters[i] ?? '')))
      setPeek(true)
      onPeekChange?.(true)
    } else {
      onChange(savedRef.current)
      setPeek(false)
      onPeekChange?.(false)
    }
  }

  const focusStep = (from: number, dir: 1 | -1) => {
    let j = from + dir
    while (j >= 0 && j < word.length && !editable[j]) j += dir
    if (j >= 0 && j < word.length) refs.current[j]?.focus()
  }

  const setChar = (i: number, ch: string) => {
    const next = [...letters]
    next[i] = ch
    onChange(next)
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex flex-wrap items-end justify-center gap-x-1.5 gap-y-3">
      {word.split('').map((c, i) =>
        editable[i] ? (
          <input
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={letters[i] ?? ''}
            readOnly={peek}
            maxLength={1}
            spellCheck={false}
            autoComplete="off"
            aria-label={`第 ${i + 1} 个字母`}
            onChange={(e) => {
              const ch = e.target.value.slice(-1)
              setChar(i, ch)
              if (ch) focusStep(i, 1)
            }}
            onKeyDown={(e) => {
              if (peek) return
              if (e.key === 'Enter') {
                onSubmit()
                return
              }
              if (e.key === 'Backspace') {
                if (!letters[i]) {
                  e.preventDefault()
                  focusStep(i, -1)
                }
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                focusStep(i, -1)
              } else if (e.key === 'ArrowRight') {
                e.preventDefault()
                focusStep(i, 1)
              }
            }}
            className={`vocab h-12 w-7 border-b-2 bg-transparent text-center text-[30px] leading-[44px] outline-none transition-colors duration-200 ${
              peek
                ? 'border-soft-green text-soft-green'
                : status === 'wrong'
                  ? 'border-warn text-deep-green'
                  : 'border-light-gray text-deep-green focus:border-brand'
            }`}
          />
        ) : (
          <span
            key={i}
            className="vocab select-none px-0.5 text-[30px] leading-[44px] text-text-hint"
          >
            {c === ' ' ? ' ' : c}
          </span>
        ),
      )}
      </div>

      <button
        type="button"
        onClick={togglePeek}
        aria-label={peek ? '隐藏答案' : '偷看答案'}
        aria-pressed={peek}
        title={peek ? '隐藏答案' : '偷看答案'}
        className="shrink-0 cursor-pointer rounded-full p-1.5 text-text-hint transition-colors duration-200 hover:text-brand"
      >
        {peek ? (
          <EyeIcon width={19} height={19} className="text-brand" />
        ) : (
          <EyeOffIcon width={19} height={19} />
        )}
      </button>
    </div>
  )
}

// ── 遮词回忆复习 ──
function ChapterReview({
  chapter,
  onComplete,
  onSkip,
}: {
  chapter: Chapter
  onComplete: () => void
  onSkip: () => void
}) {
  // 取本章前几个有富词条 (有中文释义才能遮词回忆) 的词
  const pool = useMemo<{ word: string; rich: RichWord }[]>(
    () =>
      chapter.words
        .map((w) => ({ word: w, rich: getRichWord(w) }))
        .filter((x): x is { word: string; rich: RichWord } => !!x.rich)
        .slice(0, 4),
    [chapter],
  )

  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [feedback, setFeedback] = useState<string>('')
  const [letters, setLetters] = useState<string[]>([])
  const [hint, setHint] = useState<{ text: string; ok: boolean } | null>(null)
  const [peeking, setPeeking] = useState(false)

  // 无可复习的富词 → 直接完成
  if (pool.length === 0) {
    onComplete()
    return null
  }

  const cur = pool[idx]
  const total = pool.length

  const advance = (remembered: boolean) => {
    setHint(null)
    setFeedback(remembered ? '记住啦，真棒！' : '差一点，再试试，多看几遍就记住了。')
    window.setTimeout(() => {
      if (idx + 1 >= pool.length) {
        onComplete()
      } else {
        setIdx((i) => i + 1)
        setRevealed(false)
        setFeedback('')
        setLetters([])
        setHint(null)
      }
    }, 650)
  }

  const isLetter = (c: string) => /[a-zA-Z]/.test(c)

  const checkGuess = () => {
    const filled = cur.word
      .split('')
      .every((c, i) => !isLetter(c) || (letters[i] && letters[i] !== ''))
    if (!filled) {
      setHint({ text: '把单词补全再校验哦～', ok: false })
      return
    }
    const typed = cur.word
      .split('')
      .map((c, i) => (isLetter(c) ? letters[i] : c))
      .join('')
    if (typed.toLowerCase() === cur.word.toLowerCase()) {
      setHint({ text: '拼对啦，太厉害了！', ok: true })
      setRevealed(true)
    } else {
      setHint({ text: '差一点，再看看，或者点下面显示答案。', ok: false })
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between pr-12">
        <span className="flex items-center gap-2 font-cjk text-[13px] text-text-secondary">
          <SparkleIcon width={15} height={15} className="text-sunshine" />
          回忆复习
        </span>
        <ProgressDots total={total} done={idx + 1} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.26, ease: 'easeOut' }}
        >
          <Card className="text-center">
            <p className="text-label-caps uppercase text-text-secondary">这个中文对应的单词是？</p>
            <p className="mt-3 font-cjk text-title text-text-primary">{cur.rich.translation}</p>

            <div className="my-8 flex min-h-[68px] items-center justify-center">
              {revealed ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-col items-center gap-2"
                >
                  <span className="vocab text-word-hero text-deep-green">{cur.word}</span>
                  <PlayButton word={cur.word} audio={cur.rich.audio} />
                </motion.div>
              ) : (
                <SpellInput
                  word={cur.word}
                  letters={letters}
                  status={hint && !hint.ok ? 'wrong' : 'idle'}
                  onChange={(next) => {
                    setLetters(next)
                    if (hint && !hint.ok) setHint(null)
                  }}
                  onSubmit={checkGuess}
                  onPeekChange={setPeeking}
                />
              )}
            </div>

            {/* 反馈区 — 温柔语气, 屏幕阅读器播报 */}
            <div aria-live="polite" className="min-h-[24px]">
              {feedback ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-cjk text-[14px] font-medium text-warn"
                >
                  {feedback}
                </motion.p>
              ) : (
                hint && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`font-cjk text-[14px] font-medium ${hint.ok ? 'text-brand' : 'text-warn'}`}
                  >
                    {hint.text}
                  </motion.p>
                )
              )}
            </div>

            {!feedback &&
              (!revealed ? (
                <div className="flex flex-col items-center gap-3">
                  <Button variant="pop" size="lg" onClick={checkGuess} disabled={peeking}>
                    校验
                  </Button>
                  <button
                    onClick={() => {
                      setHint(null)
                      setRevealed(true)
                    }}
                    className="font-cjk text-[13px] text-text-hint transition-colors duration-200 hover:text-text-secondary cursor-pointer"
                  >
                    想不起来？显示答案
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => advance(false)}
                    className="rounded-full bg-light-yellow px-6 py-2.5 font-cjk text-[15px] font-semibold text-warn transition-colors duration-200 hover:bg-soft-gold cursor-pointer"
                  >
                    忘了
                  </button>
                  <button
                    onClick={() => advance(true)}
                    className="flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 font-cjk text-[15px] font-semibold text-white shadow-[0_3px_0_#43C000] transition-colors duration-200 hover:bg-soft-green cursor-pointer"
                  >
                    <CheckIcon width={16} height={16} />
                    记得
                  </button>
                </div>
              ))}
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 text-center">
        <button
          onClick={onSkip}
          className="font-cjk text-[13px] text-text-hint transition-colors duration-200 hover:text-text-secondary cursor-pointer"
        >
          跳过复习
        </button>
      </div>
    </div>
  )
}

// ── 章节完成 ──
function ChapterDone({
  stage,
  chapter,
  onNextChapter,
  onBackToStages,
}: {
  stage: Stage
  chapter: Chapter
  onNextChapter: () => void
  onBackToStages: () => void
}) {
  return (
    <div className="text-center">
      <Card className="relative flex flex-col items-center overflow-hidden py-12">
        {/* 庆祝光晕 + 陪伴精灵悬浮 */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-light-yellow/60 to-transparent" />
        <motion.img
          src={`${import.meta.env.BASE_URL}spatial/companion-spark.png`}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -top-3 right-6 z-10 w-20 select-none drop-shadow-[0_10px_24px_rgba(255,200,0,0.3)]"
          initial={{ opacity: 0, y: -10, scale: 0.7 }}
          animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
          transition={{ opacity: { duration: 0.5 }, scale: { duration: 0.5, ease: 'easeOut' }, y: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
        />
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative z-[1] mb-6"
        >
          <ProgressRing pct={1} size={104} stroke={8}>
            <CheckIcon width={40} height={40} className="text-brand" />
          </ProgressRing>
          <span className="absolute -right-1 -top-1 text-sunshine animate-spark-pop">
            <SparkleIcon width={26} height={26} />
          </span>
        </motion.div>

        <div className="mb-3">
          <AISparkBadge label="完成" />
        </div>
        <h2 className="font-display text-headline text-text-primary">这一节通关啦</h2>
        <p className="mt-2 font-cjk text-body-lg text-text-secondary">
          {stage.title} · {chapter.title} · {chapter.words.length} 个单词已点亮
        </p>

        <div className="mt-8 flex items-center gap-3">
          <Button variant="ghost" onClick={onBackToStages}>
            返回计划
          </Button>
          <Button variant="pop" size="lg" onClick={onNextChapter}>
            <span className="flex items-center gap-2">
              进入下一节
              <ArrowRightIcon width={18} height={18} />
            </span>
          </Button>
        </div>
      </Card>
    </div>
  )
}

// ── 未找到 ──
function NotFound({ to, label }: { to: string; label: string }) {
  return (
    <Shell trail={[{ label: '学习计划', to: '/learn' }]}>
      <Card className="mx-auto max-w-card py-12 text-center">
        <p className="font-cjk text-body-lg text-text-secondary">没有找到这个内容。</p>
        <div className="mt-6 flex justify-center">
          <Link to={to}>
            <Button variant="pop">{label}</Button>
          </Link>
        </div>
      </Card>
    </Shell>
  )
}
