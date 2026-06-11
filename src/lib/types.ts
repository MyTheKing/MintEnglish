// ─────────────────────────────────────────────
// MintEnglish · 领域类型
// 唯一词源: ogden_basic_english_850.json (src/data/ogden.json, 850 词)
// ─────────────────────────────────────────────

export type Level = 'beginner' | 'elementary' | 'intermediate' | 'advanced' | 'expert'
export type Relation = 'synonym' | 'antonym' | 'root' | 'collocation'

export interface Definition {
  pos: string
  cn: string
  en: string
}

export interface Example {
  en: string
  cn: string
  highlight: string[]
}

export interface Illustration {
  alt: string
  image: string // 可能为空 → 用程序化占位插画
}

export interface Synonym {
  word: string
  cn: string
  nuance?: string
}

export interface Antonym {
  word: string
  cn: string
}

export interface Collocation {
  phrase: string
  cn: string
}

export interface GalaxyNode {
  id: string
  label: string
  cn: string
  relation: Relation
  expandable: boolean
}

export interface Galaxy {
  center: string
  nodes: GalaxyNode[]
}

/** 富词条 — 驱动学习卡片 / 词汇图谱 / 弹窗 */
export interface RichWord {
  word: string
  phonetic: string
  audio: string
  pos: string
  translation: string
  theme: string
  level: Level
  frq: string
  tags: string[]
  core: boolean
  definitions: Definition[]
  examples: Example[]
  illustration: Illustration
  etymology: string
  roots: string[]
  synonyms: Synonym[]
  antonyms: Antonym[]
  collocations: Collocation[]
  galaxy: Galaxy
}

/** 全局点词弹窗的归一化结果 — 命中富词或最小占位都映射到此 */
export interface WordLookup {
  word: string
  phonetic: string
  audio: string
  pos: string
  translation: string
  example?: Example
  /** 命中富数据 → 可进图谱 */
  rich: boolean
}

// —— 课程结构 ——
export interface Chapter {
  id: string        // stageId-index
  title: string
  words: string[]   // word 列表
}

export interface Stage {
  id: string
  title: string     // 中文阶段名
  subtitle: string  // 英文/说明
  theme: string     // 对应 ogden theme
  accent: 'green' | 'gold' | 'sky' | 'coral'
  chapters: Chapter[]
  total: number
}

// —— AI 智能体 ——
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  ts: number
}

export interface Agent {
  id: string
  name: string
  persona: string   // 一句话人设
  avatar: string    // 缩写 (渲染成绿色渐变圆)
  builtin: boolean
}
