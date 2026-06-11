// ─────────────────────────────────────────────
// 课程结构: 把 ogden 850 词按 theme → 阶段(Stage) → 章节(Chapter)
// 三层下钻 (EXPERIENCE 今日学习计划): 阶段 → 章节 → 单词卡片流
// ─────────────────────────────────────────────
import { getAllRichWords } from './dictionary'
import type { Stage, Chapter } from './types'

const CHAPTER_SIZE = 6 // 每章单词数, 节奏舒缓

// theme → 展示元数据 (顺序 = 难度递进)
const STAGE_META: { theme: string; title: string; subtitle: string; accent: Stage['accent'] }[] = [
  { theme: '初学者·日常基础', title: '日常基础', subtitle: 'Everyday Basics', accent: 'green' },
  { theme: '奥格登·动作与虚词', title: '动作与虚词', subtitle: 'Actions & Operations', accent: 'sky' },
  { theme: '奥格登·具体事物', title: '具体事物', subtitle: 'Things', accent: 'gold' },
  { theme: '奥格登·性质形容词', title: '性质形容词', subtitle: 'Qualities', accent: 'coral' },
  { theme: '奥格登·一般概念', title: '一般概念', subtitle: 'General Ideas', accent: 'green' },
]

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

let _stages: Stage[] | null = null

export function getStages(): Stage[] {
  if (_stages) return _stages
  const all = getAllRichWords()
  const byTheme: Record<string, string[]> = {}
  for (const w of all) (byTheme[w.theme] ??= []).push(w.word)

  // 已知 theme 优先按 STAGE_META 顺序；其余 theme 兜底追加，保证 850 词全覆盖。
  const known = new Set(STAGE_META.map((m) => m.theme))
  const extraThemes = Object.keys(byTheme).filter((t) => !known.has(t))
  const accents: Stage['accent'][] = ['green', 'sky', 'gold', 'coral']
  const meta = [
    ...STAGE_META,
    ...extraThemes.map((theme, i) => ({
      theme,
      title: theme.replace(/^.*·/, ''),
      subtitle: 'Vocabulary',
      accent: accents[i % accents.length],
    })),
  ]

  _stages = meta
    .filter((m) => byTheme[m.theme]?.length)
    .map((m, si) => {
      const words = byTheme[m.theme]
      const chapters: Chapter[] = chunk(words, CHAPTER_SIZE).map((ws, ci) => ({
        id: `${si}-${ci}`,
        title: `第 ${ci + 1} 节`,
        words: ws,
      }))
      return {
        id: String(si),
        title: m.title,
        subtitle: m.subtitle,
        theme: m.theme,
        accent: m.accent,
        chapters,
        total: words.length,
      }
    })
  return _stages
}

export function getStage(id: string): Stage | undefined {
  return getStages().find((s) => s.id === id)
}

export function getChapter(stageId: string, chapterId: string): { stage: Stage; chapter: Chapter } | undefined {
  const stage = getStage(stageId)
  const chapter = stage?.chapters.find((c) => c.id === chapterId)
  if (stage && chapter) return { stage, chapter }
  return undefined
}
