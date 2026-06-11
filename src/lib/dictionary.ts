// ─────────────────────────────────────────────
// 查词层: 仅用富数据源 ogden 850; 未命中走最小占位 (仍可发音)
// "点任何词都能弹释义" (EXPERIENCE 全局核心交互)
// ─────────────────────────────────────────────
import wordsRaw from '../data/ogden.json'
import glossaryRaw from '../data/glossary.json'
import type { RichWord, WordLookup } from './types'

const RICH: Record<string, RichWord> = wordsRaw as unknown as Record<string, RichWord>

// 补充小词典: 页面文本里出现、但不在 ogden 850 课程词库内的词 (变形/虚词/例句词).
// 只供「点词弹卡」兜底翻译, 不进课程分组, 不污染 850 词数.
const GLOSS: Record<string, { pos?: string; translation: string }> =
  glossaryRaw as Record<string, { pos?: string; translation: string }>

const norm = (w: string) => w.trim().toLowerCase().replace(/[^a-z'-]/g, '')

/** 取富词条 (命中 850 词库) */
export function getRichWord(word: string): RichWord | undefined {
  return RICH[norm(word)] ?? RICH[word]
}

export function getAllRichWords(): RichWord[] {
  return Object.values(RICH)
}

export function getRichDict(): Record<string, RichWord> {
  return RICH
}

/**
 * 全局查词 — 任意英文单词 → 归一化结果.
 * 命中 ogden 850 富词库则返回完整词条, 否则返回最小占位 (至少能发音).
 */
export function lookupWord(raw: string): WordLookup {
  const key = norm(raw)
  const rich = getRichWord(key)
  if (rich) {
    return {
      word: rich.word,
      phonetic: rich.phonetic,
      audio: rich.audio,
      pos: rich.pos,
      translation: rich.translation,
      example: rich.examples?.[0],
      rich: true,
    }
  }
  // 补充小词典命中: 给出真实释义 (仍非富词条)
  const g = GLOSS[key]
  if (g) {
    return {
      word: raw,
      phonetic: '',
      audio: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(raw)}&type=2`,
      pos: g.pos ?? '',
      translation: g.translation,
      rich: false,
    }
  }
  // 未收录: 至少能发音
  return {
    word: raw,
    phonetic: '',
    audio: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(raw)}&type=2`,
    pos: '',
    translation: '（未收录该词释义）',
    rich: false,
  }
}

// 单例: 同一时刻只允许一个发音在播放, 再次点击会打断上一个 (避免声音叠加)
let currentAudio: HTMLAudioElement | null = null

/** 朗读: 优先在线音频, 失败回退浏览器 TTS */
export function speak(word: string, audioUrl?: string) {
  // 打断上一段: 在线音频 + TTS 都停掉
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel()

  const url = audioUrl || `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`
  try {
    const a = new Audio(url)
    currentAudio = a
    a.onended = () => { if (currentAudio === a) currentAudio = null }
    a.play().catch(() => { if (currentAudio === a) currentAudio = null; fallbackTTS(word) })
  } catch {
    fallbackTTS(word)
  }
}

function fallbackTTS(word: string) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(word)
    u.lang = 'en-US'
    speechSynthesis.speak(u)
  }
}

/** 朗读整段/整篇文本: 直接用浏览器 TTS (适合长文, 可停止); 开始前打断上一段.
 *  onBoundary 回传当前朗读到的字符位置 (相对 text), 用于进度条 + 逐词高亮. */
export function speakText(
  text: string,
  opts?: { rate?: number; onEnd?: () => void; onBoundary?: (charIndex: number) => void },
) {
  if (!('speechSynthesis' in window)) {
    opts?.onEnd?.()
    return
  }
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = opts?.rate ?? 0.95
  if (opts?.onEnd) {
    u.onend = opts.onEnd
    u.onerror = opts.onEnd
  }
  if (opts?.onBoundary) {
    u.onboundary = (e) => opts.onBoundary!(e.charIndex)
  }
  speechSynthesis.speak(u)
}

/** 停止当前朗读 (在线音频 + TTS) */
export function stopSpeech() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}
