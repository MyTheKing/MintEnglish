// 全局点词弹窗 ⭐ — 任意英文单词点击 → 释义卡片.
// 白底 popup 阴影 ≤320px, 小箭头指向单词; 命中富数据可"在图谱中探索".
import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useWordPopupStore } from '../../stores/useWordPopupStore'
import { useLearningStore } from '../../stores/useLearningStore'
import { lookupWord } from '../../lib/dictionary'
import { Chip, PlayButton, Button } from '../ui'
import { ClickableText } from '../ClickableText'
import { GalaxyIcon } from '../icons'

export function WordPopup() {
  const { open, word, anchor, close } = useWordPopupStore()
  const addReview = useLearningStore((s) => s.addReview)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const data = useMemo(() => (word ? lookupWord(word) : null), [word])

  // Esc 关闭 + 点击外部关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    window.addEventListener('keydown', onKey)
    // 延迟绑定避免触发它的那次点击立即关闭
    const t = setTimeout(() => window.addEventListener('mousedown', onDown), 0)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
      clearTimeout(t)
    }
  }, [open, close])

  if (!anchor || !data) return null

  // 定位: 单词下方, 防溢出; 弹窗宽度在窄屏收缩, 不超出屏宽
  const W = Math.min(320, window.innerWidth - 24)
  const pad = 12
  let left = anchor.x - W / 2
  left = Math.max(pad, Math.min(left, window.innerWidth - W - pad))
  const top = Math.min(anchor.y + 14, window.innerHeight - 280)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.94, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 4 }}
          transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
          className="fixed z-50 rounded-lg bg-white shadow-popup"
          style={{ left, top, width: W }}
          role="dialog"
          aria-label={`${data.word} 释义`}
        >
          {/* 指向箭头 */}
          <div
            className="absolute -top-2 h-4 w-4 rotate-45 bg-white"
            style={{ left: Math.min(Math.max(anchor.x - left - 8, 16), W - 32) }}
          />
          <div className="relative p-4">
            <div className="flex items-end justify-between gap-2">
              <div>
                <span className="vocab text-[28px] font-semibold leading-none text-text-primary">{data.word}</span>
                {data.pos && <Chip className="ml-2 align-middle">{data.pos}</Chip>}
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              {data.phonetic && <span className="font-mono text-[13px] text-text-secondary">{data.phonetic}</span>}
              <PlayButton word={data.word} audio={data.audio} />
            </div>
            <p className="mt-2 cjk text-[15px] text-text-primary">{data.translation}</p>

            {data.example && (
              <div className="mt-3 rounded-md bg-off-white p-2.5 text-[13px] leading-relaxed">
                <div className="flex items-start gap-2">
                  <ClickableText
                    text={data.example.en}
                    highlight={data.example.highlight}
                    className="flex-1"
                  />
                  <PlayButton word={data.example.en} className="mt-0.5 h-6 w-6 shrink-0" />
                </div>
                <div className="mt-0.5 cjk text-text-secondary">{data.example.cn}</div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              {data.rich ? (
                <button
                  onClick={() => { navigate(`/graph?w=${encodeURIComponent(data.word)}`); close() }}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-deep-green hover:text-brand transition-colors cursor-pointer"
                >
                  <GalaxyIcon width={15} height={15} /> 在图谱中探索
                </button>
              ) : (
                <span className="text-[12px] text-text-hint">兜底词典释义</span>
              )}
              <Button variant="ghost" size="md" className="!py-1.5 !px-3 !text-[13px]" onClick={() => { addReview(data.word); close() }}>
                加入复习
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
