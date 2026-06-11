import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { Button, Card, Skeleton, Segmented } from '../components/ui'
import {
  SparkleIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  SpeakerIcon,
  RepeatIcon,
} from '../components/icons'
import { ClickableText } from '../components/ClickableText'
import { speakText, stopSpeech } from '../lib/dictionary'
import { useLearningStore } from '../stores/useLearningStore'

// ─────────────────────────────────────────────
// AI 阅读伴侣 · 自定义主题 / 已学词 生成短文 (顶部控制条 + 全宽阅读)
// 点任意英文单词即查即记 (ClickableText → 全局弹窗); 已学词柔黄高亮
// 纯前端 mock 生成, 900ms 撰写动画, 渐入 reveal
// ─────────────────────────────────────────────

type Mode = 'direct' | 'learned'

interface Article {
  title: string
  paragraphs: string[]
}

const SPEEDS = [0.5, 1, 2] as const

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'direct', label: '直接生成', hint: '随手来一篇轻松的小短文。' },
  { id: 'learned', label: '用我学过的词', hint: '把你掌握的单词编进故事里。' },
]

// —— 默认短文 (简单基础词汇, 偏长); 直接生成走这篇, 有主题则加一句引子 ——
const DEFAULT_ARTICLE: Article = {
  title: 'A Sunny Morning',
  paragraphs: [
    'The sun is bright today. A small bird sings outside the window and slowly wakes up Mia. For a moment she just lies in bed and listens. The room is warm, and the light is soft and gold.',
    'She gets up and opens the window wide. Fresh air comes in and touches her face. She makes a cup of warm tea and holds it with both hands, feeling the heat through the cup.',
    'Mia sits by the table and reads a few pages of her book. The story is quiet and kind, just like the morning. She is in no hurry. Time feels slow and easy, and that is exactly what she needs.',
    'After tea, she decides to go for a walk in the park near her home. She puts on her shoes, takes her keys, and steps outside. The sky is clear, with only a few white clouds far away.',
    'In the park, the grass is green and still a little wet from the night. Children run and laugh, and an old man feeds the birds by the lake. Mia walks slowly and lets her mind rest.',
    'She finds a quiet bench under a big tree and sits down. A gentle wind moves the leaves above her. She closes her eyes and listens to the sounds of the morning — birds, wind, and far away, soft music.',
    'On her way home, she buys some fresh bread and a few flowers. The small things make her happy. She does not need a special plan to enjoy a day like this.',
    'Back home, Mia puts the flowers in a glass of water by the window. She smiles to herself. A simple morning like this, she thinks, makes her feel calm, thankful, and full of quiet energy.',
  ],
}

// 把若干已学词编进一篇短文 (确保它们真实出现)
function buildLearnedArticle(words: string[], topic: string): Article {
  const used = words.slice(0, 10)
  const title = topic ? `Words About ${capitalize(topic)}` : 'Words I Have Learned'
  const lead = topic
    ? `Today we will read a short story about ${topic}. As we read, we will meet some words that I have already learned. Seeing them again, in a new place, helps them stay in my mind.`
    : 'Here is a small story made with the words I have learned. None of them are new to me, but together they tell something I could not say before. That is the quiet magic of learning words one by one.'

  // 用多种句型把已学词编进句子, 让段落更自然
  const patterns = [
    (a: string, b: string) => `In the morning I read a page and found the word "${a}" and the word "${b}" right next to each other.`,
    (a: string, b: string) => `My friend asked me a question, and I answered with the words "${a}" and "${b}" without thinking too hard.`,
    (a: string, b: string) => `On the way home I saw a sign, and suddenly the words "${a}" and "${b}" made perfect sense to me.`,
    (a: string, b: string) => `At night I wrote a few lines in my notebook, and I used "${a}" and "${b}" to say how the day felt.`,
    (a: string, b: string) => `When I talked with someone new, the words "${a}" and "${b}" came to me at the right moment.`,
  ]

  const sentences: string[] = []
  let p = 0
  for (let i = 0; i < used.length; i += 2) {
    const a = used[i]
    const b = used[i + 1]
    if (a && b) {
      sentences.push(patterns[p % patterns.length](a, b))
      p++
    } else if (a) {
      sentences.push(`I feel proud that I still remember the word "${a}", and I can use it in a real sentence now.`)
    }
  }
  if (sentences.length === 0) {
    sentences.push('I am just getting started, and I am ready to learn many new words and read a little more every day.')
  }

  const paragraphs: string[] = [lead]
  // 把句子分成 2–3 段, 让阅读更有节奏
  const perPara = Math.max(2, Math.ceil(sentences.length / 3))
  for (let i = 0; i < sentences.length; i += perPara) {
    paragraphs.push(sentences.slice(i, i + perPara).join(' '))
  }
  paragraphs.push(
    'Each word looks small on its own. But when I put them together, they become sentences, and the sentences become stories.',
  )
  paragraphs.push(
    'Step by step, day by day, these words grow into a little forest in my mind. And I know that tomorrow I will plant a few more.',
  )
  return { title, paragraphs }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// —— 核心生成器 ——
function generateArticle(mode: Mode, topic: string, learnedWords: string[]): Article {
  const t = topic.trim()

  if (mode === 'learned' && learnedWords.length > 0) {
    return buildLearnedArticle(learnedWords, t)
  }

  // 直接生成: 默认短文; 有主题则加一句引子并改标题
  const paragraphs = [...DEFAULT_ARTICLE.paragraphs]
  let title = DEFAULT_ARTICLE.title

  if (t) {
    title = `Reading: ${capitalize(t)}`
    paragraphs.unshift(`Today we will read about ${t}. Let us begin with a small and friendly story.`)
  }
  return { title, paragraphs }
}

// ─────────────────────────────────────────────
// 统一朗读引擎 (hook): 「全文」与「单段」共用一套 暂停/继续 + 拖动定位
// scope: 'all' 全文 | 数字 段落下标 | null 空闲. 同一时刻只有一个朗读对象.
// 用「从某字符偏移切片重读」实现 (原生 pause/resume 在 Chrome 不可靠, 也无法任意定位).
// 提到页面层, 让顶栏(朗读控制)与文章(逐段高亮/喇叭)共享同一引擎.
// ─────────────────────────────────────────────
type Scope = 'all' | number | null
function useSpeechEngine(article: Article | null) {
  const [scope, setScope] = useState<Scope>(null)
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle')
  const [posChar, setPosChar] = useState(0)
  const [dragChar, setDragChar] = useState<number | null>(null)
  const genRef = useRef(0)
  const seekResumeRef = useRef(false)
  const [loop, setLoop] = useState(false)
  const loopRef = useRef(false)
  const [speed, setSpeed] = useState(1)
  const speedRef = useRef(1)

  const toggleLoop = () => setLoop((v) => { loopRef.current = !v; return !v })

  const fullText = article ? `${article.title}. ${article.paragraphs.join(' ')}` : ''

  // 每段在 fullText 中的起始字符偏移 (标题 + '. ' 之后, 段间一个空格)
  const paraOffsets = useMemo(() => {
    const offs: number[] = []
    if (!article) return offs
    let c = article.title.length + 2
    for (const p of article.paragraphs) { offs.push(c); c += p.length + 1 }
    return offs
  }, [article])

  const textOf = (s: Scope): string =>
    s === 'all' ? fullText : typeof s === 'number' ? article?.paragraphs[s] ?? '' : ''

  const toWordStart = (text: string, idx: number) => {
    const clamped = Math.max(0, Math.min(idx, text.length - 1))
    let i = clamped
    while (i > 0 && /[A-Za-z'-]/.test(text[i - 1])) i--
    return i
  }

  // 文章变化(重新生成) / 卸载 → 停止复位
  useEffect(() => {
    stopSpeech()
    genRef.current++
    setScope(null)
    setStatus('idle')
    setPosChar(0)
    setDragChar(null)
    return () => { stopSpeech(); genRef.current++ }
  }, [article])

  const startReading = (s: Exclude<Scope, null>, fromChar: number) => {
    const text = textOf(s)
    const from = toWordStart(text, fromChar)
    const gen = ++genRef.current
    stopSpeech()
    setScope(s)
    setStatus('playing')
    setPosChar(from)
    setDragChar(null)
    speakText(text.slice(from), {
      rate: 0.95 * speedRef.current,
      onBoundary: (ci) => { if (genRef.current === gen) setPosChar(from + ci) },
      onEnd: () => {
        if (genRef.current !== gen) return
        if (loopRef.current) startReading(s, 0)
        else { setScope(null); setStatus('idle'); setPosChar(0) }
      },
    })
  }

  const pause = () => { genRef.current++; stopSpeech(); setStatus('paused') }
  const stop = () => {
    genRef.current++
    stopSpeech()
    setScope(null)
    setStatus('idle')
    setPosChar(0)
    setDragChar(null)
  }

  const onMainButton = () => {
    if (status === 'playing') pause()
    else if (status === 'paused' && scope !== null) startReading(scope, posChar)
    else startReading('all', 0)
  }

  const changeSpeed = (v: number) => {
    speedRef.current = v
    setSpeed(v)
    if (status === 'playing' && scope !== null) startReading(scope, posChar)
  }

  const togglePara = (i: number) => {
    if (scope === i && status !== 'idle') stop()
    else startReading(i, 0)
  }

  const onSeekStart = () => {
    seekResumeRef.current = status === 'playing'
    if (status === 'playing') { genRef.current++; stopSpeech(); setStatus('paused') }
  }
  const onSeekInput = (v: number) => {
    if (scope === null) return
    setDragChar(Math.round(v * textOf(scope).length))
  }
  const onSeekCommit = () => {
    if (scope === null) return
    const target = dragChar ?? posChar
    const aligned = toWordStart(textOf(scope), target)
    setPosChar(aligned)
    setDragChar(null)
    if (seekResumeRef.current) startReading(scope, aligned)
    seekResumeRef.current = false
  }

  const active = status !== 'idle' && scope !== null
  const activeLen = scope !== null ? textOf(scope).length : 1
  const posOrDrag = dragChar ?? posChar
  const progress = Math.min(1, Math.max(0, posOrDrag / Math.max(1, activeLen)))
  const pct = Math.round(progress * 100)

  const spokenCharFor = (i: number): number | null => {
    if (!active) return null
    if (scope === 'all') return posOrDrag - paraOffsets[i]
    if (scope === i) return posOrDrag
    return null
  }
  const paraOn = (i: number) => scope === i && status !== 'idle'

  return {
    scope, status, loop, speed, active, progress, pct,
    toggleLoop, onMainButton, changeSpeed, togglePara, stop,
    onSeekStart, onSeekInput, onSeekCommit, spokenCharFor, paraOn,
  }
}
type SpeechEngine = ReturnType<typeof useSpeechEngine>

export default function ReadingPage() {
  const reduce = false

  const learnedWords = useLearningStore((s) => s.learnedWords)

  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<Mode>('direct')
  const [loading, setLoading] = useState(false)
  const [article, setArticle] = useState<Article | null>(null)
  const [composing, setComposing] = useState(false) // 有文章时, 顶栏临时切回生成表单
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const speech = useSpeechEngine(article)

  function handleGenerate() {
    if (timer.current) clearTimeout(timer.current)
    setLoading(true)
    setComposing(false)
    const snapMode = mode
    timer.current = setTimeout(() => {
      setArticle(generateArticle(snapMode, topic, learnedWords))
      setLoading(false)
    }, 900)
  }

  // —— 渐入编排 ——
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.1, delayChildren: reduce ? 0 : 0.05 } },
  }
  const item: Variants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 16 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
        },
      }

  // 顶栏单条随状态变形: 无文章/重写时是「生成表单」, 有文章时是「朗读控制」
  const learnedEmpty = mode === 'learned' && learnedWords.length === 0
  const showForm = !article || composing
  return (
    <div className="mx-auto flex h-[calc(100dvh-88px)] md:h-[calc(100dvh-56px)] max-w-content flex-col px-5 md:px-page-margin py-6">
      {/* 顶栏: 单条玻璃, 生成表单 ⇄ 朗读控制 流体切换 */}
      <Card pad={false} className="shrink-0 overflow-hidden !bg-white/65 px-4 py-3 backdrop-blur-xl backdrop-saturate-150">
        <AnimatePresence mode="wait" initial={false}>
          {showForm ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="想读什么？输入主题，留空随机一篇"
                  aria-label="阅读主题"
                  className="min-w-0 flex-1 rounded-full border border-light-gray/70 bg-white/70 px-5 py-2.5 cjk text-[15px] text-text-primary placeholder:text-text-hint transition-colors duration-200 focus:border-brand focus:bg-white focus:outline-none"
                />
                <Segmented
                  fluid
                  ariaLabel="生成方式"
                  value={mode}
                  onChange={setMode}
                  options={MODES.map((m) => ({ value: m.id, label: m.label, title: m.hint }))}
                />
                <Button variant="pop" onClick={handleGenerate} disabled={loading} className="shrink-0">
                  <SparkleIcon width={17} height={17} />
                  {loading ? 'AI 正在撰写…' : '生成文章'}
                </Button>
                {composing && article && (
                  <Button variant="ghost" onClick={() => setComposing(false)} className="shrink-0">
                    返回阅读
                  </Button>
                )}
              </div>
              {learnedEmpty && (
                <p className="mt-2 px-1 cjk text-[12px] text-warn">
                  你还没有学过的词，会先给你一篇入门短文。
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="reading"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <ReadingControls speech={speech} onRewrite={() => { speech.stop(); setComposing(true) }} />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 阅读区: 全宽居中; 卡片固定填满高度, 文字在卡片内部上下滚动 */}
      <section className="mt-6 min-h-0 flex-1">
        <div className="mx-auto h-full w-full max-w-reading">
          {loading ? (
            <LoadingArticle />
          ) : article ? (
            <ArticleView
              article={article}
              learnedWords={learnedWords}
              speech={speech}
              container={container}
              item={item}
            />
          ) : (
            <EmptyState container={container} item={item} />
          )}
        </div>
      </section>
    </div>
  )
}

/* ─── 顶栏·朗读控制 (有文章时) ─── */
function ReadingControls({ speech, onRewrite }: { speech: SpeechEngine; onRewrite: () => void }) {
  const { status, loop, speed, active, progress, pct, toggleLoop, onMainButton, changeSpeed, onSeekStart, onSeekInput, onSeekCommit } = speech
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* 主按钮: 朗读全文 / 暂停 / 继续 */}
        <button
          type="button"
          onClick={onMainButton}
          aria-label={status === 'playing' ? '暂停朗读' : status === 'paused' ? '继续朗读' : '朗读全文'}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors duration-200 cursor-pointer ${
            status === 'playing' ? 'bg-brand text-white' : 'bg-mint text-deep-green hover:bg-brand hover:text-white'
          }`}
        >
          {status === 'playing' ? <PauseIcon width={14} height={14} /> : <PlayIcon width={14} height={14} />}
          {status === 'playing' ? '暂停' : status === 'paused' ? '继续' : '朗读全文'}
        </button>

        {/* 语速 */}
        <Segmented
          size="sm"
          ariaLabel="语速"
          value={speed}
          onChange={changeSpeed}
          options={SPEEDS.map((s) => ({ value: s as number, label: `${s}×`, title: `语速 ${s}×` }))}
        />

        {/* 循环 */}
        <button
          type="button"
          onClick={toggleLoop}
          aria-label="循环播放"
          aria-pressed={loop}
          title={loop ? '循环播放：开' : '循环播放：关'}
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-200 cursor-pointer ${
            loop ? 'bg-brand text-white hover:bg-soft-green' : 'bg-off-white text-text-hint hover:bg-mint hover:text-deep-green'
          }`}
        >
          <RepeatIcon width={15} height={15} />
        </button>

        {/* 中段: 朗读时显示进度条, 空闲时显示提示 */}
        {active ? (
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onPointerDown={onSeekStart}
            onChange={(e) => onSeekInput(Number(e.target.value))}
            onPointerUp={onSeekCommit}
            onKeyUp={onSeekCommit}
            aria-label="朗读进度，可拖动定位"
            style={{ ['--p' as string]: progress }}
            className="reading-progress order-last mx-1 block h-3.5 min-w-0 grow basis-full cursor-pointer lg:order-none lg:basis-0"
          />
        ) : (
          <span className="order-last min-w-0 grow basis-full cjk text-[12px] text-text-hint lg:order-none lg:basis-0">点「朗读全文」边听边读，或点段落右侧喇叭单段朗读</span>
        )}

        {active && <span className="shrink-0 cjk tabular-nums text-[12px] text-text-hint">{pct}%</span>}

        {/* 再写一篇: 切回生成表单 */}
        <Button variant="ghost" onClick={onRewrite} className="shrink-0">
          <SparkleIcon width={15} height={15} />
          再写一篇
        </Button>
      </div>
    </div>
  )
}

/* ─── 加载骨架 ─── */
function LoadingArticle() {
  return (
    <Card>
      <div className="flex items-center gap-2 text-deep-green">
        <SparkleIcon width={16} height={16} className="animate-spark-pop" />
        <span className="cjk text-[14px] font-medium">AI 正在撰写…</span>
      </div>
      <Skeleton className="mt-5 h-7 w-2/3" />
      <div className="mt-6 space-y-3">
        {['w-full', 'w-[92%]', 'w-[97%]', 'w-3/4'].map((w, i) => (
          <Skeleton key={i} className={`h-4 ${w}`} />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {['w-[95%]', 'w-full', 'w-2/3'].map((w, i) => (
          <Skeleton key={i} className={`h-4 ${w}`} />
        ))}
      </div>
    </Card>
  )
}

/* ─── 文章视图 (纯展示; 朗读引擎在页面层, 逐段高亮/喇叭经 speech 注入) ─── */
function ArticleView({
  article,
  learnedWords,
  speech,
  container,
  item,
}: {
  article: Article
  learnedWords: string[]
  speech: SpeechEngine
  container: Variants
  item: Variants
}) {
  const { spokenCharFor, paraOn, togglePara } = speech
  return (
    <Card pad={false} className="flex h-full flex-col overflow-hidden">
      {/* 卡片固定; 仅此内层滚动 → 文字上下滚, 卡片不动 */}
      <div className="min-h-0 flex-1 overflow-y-auto p-card-pad">
      <motion.article variants={container} initial="hidden" animate="show">
        <motion.h2
          variants={item}
          className="vocab font-display text-headline leading-tight text-text-primary"
        >
          {article.title}
        </motion.h2>

        <div className="mt-5 space-y-5">
          {article.paragraphs.map((para, i) => {
            const on = paraOn(i)
            return (
              <motion.div key={i} variants={item} className="group flex items-start gap-2.5">
                <p className="flex-1 text-body-lg leading-relaxed text-text-primary">
                  <ClickableText text={para} highlight={learnedWords} spokenChar={spokenCharFor(i)} />
                </p>
                <button
                  type="button"
                  onClick={() => togglePara(i)}
                  aria-label={on ? '停止朗读这一段' : '朗读这一段'}
                  title={on ? '停止' : '朗读这一段'}
                  className={`mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 cursor-pointer md:h-7 md:w-7 ${
                    on
                      ? 'bg-brand text-white'
                      : 'bg-off-white text-text-hint opacity-100 hover:bg-mint hover:text-deep-green md:opacity-0 md:group-hover:opacity-100'
                  }`}
                >
                  {on ? <StopIcon width={12} height={12} /> : <SpeakerIcon width={14} height={14} />}
                </button>
              </motion.div>
            )
          })}
        </div>
      </motion.article>
      </div>
    </Card>
  )
}

/* ─── 空状态: 单一焦点 hero (模式说明已在上方 Segmented, 此处不再重复) ─── */
function EmptyState({
  container,
  item,
}: {
  container: Variants
  item: Variants
}) {
  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <Card className="relative flex flex-col items-center gap-4 overflow-hidden bg-soft-green py-14 text-center">
          {/* aurora 光晕垫底 — 青绿弥散, 营造发光空气感 */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 top-1/3 h-56 w-56 rounded-full bg-light-green/40 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-sunshine/25 blur-3xl"
          />
          {/* 螺旋几何漂浮 (右上, 破框) */}
          <motion.img
            src={`${import.meta.env.BASE_URL}spatial/obj-spiral.png`}
            alt=""
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 w-36 select-none opacity-45 blur-[1px]"
            animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* 主角破框悬浮 */}
          <motion.img
            src={`${import.meta.env.BASE_URL}spatial/companion-spark.png`}
            alt="陪伴精灵 Spark"
            className="relative h-24 w-24 select-none object-contain drop-shadow-[0_14px_30px_rgba(255,200,0,0.32)]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
            transition={{
              opacity: { duration: 0.5 },
              scale: { duration: 0.5, ease: 'easeOut' },
              y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
          <h3 className="relative font-display text-title text-text-primary">选好方式，点「生成文章」</h3>
          <p className="relative max-w-reading cjk text-[14px] text-deep-green">
            每一篇都是为你现写的小短文 —— 简单、温暖，正好适合现在的你。
          </p>
        </Card>
      </motion.div>
    </motion.div>
  )
}
