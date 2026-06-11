// 全局单词搜索弹窗 — 桌面顶栏搜索按钮 / 移动端底部 Dock 中央搜索键共用唤起.
// 输入单词 → 跳词汇图谱 (/graph?w=).
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { SearchIcon, ArrowRightIcon, CloseIcon } from '../icons'
import { getRichWord, getAllRichWords } from '../../lib/dictionary'
import { useSearchStore } from '../../stores/useSearchStore'

export function WordSearchModal() {
  const navigate = useNavigate()
  const open = useSearchStore((s) => s.open)
  const closeSearch = useSearchStore((s) => s.closeSearch)
  const [query, setQuery] = useState('')

  const suggestions = useMemo(() => {
    const picks = ['good', 'come', 'make', 'water', 'work', 'love', 'mind', 'increase']
    const all = getAllRichWords()
    const byWord = new Map(all.map((w) => [w.word, w]))
    const out: string[] = []
    for (const p of picks) {
      const w = byWord.get(p)
      if (w?.galaxy?.nodes?.length) out.push(w.word)
    }
    for (const w of all) {
      if (out.length >= 6) break
      if (w.galaxy?.nodes?.length && !out.includes(w.word)) out.push(w.word)
    }
    return out.slice(0, 6)
  }, [])

  const goSearch = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    const w = getRichWord(t)
    navigate(`/graph?w=${encodeURIComponent(w?.word ?? t)}`)
    closeSearch()
    setQuery('')
  }

  // ESC 关闭
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeSearch])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-text-primary/25 px-4 pt-[14vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={closeSearch}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -24, scale: 0.92 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { type: 'spring', stiffness: 420, damping: 26 },
            }}
            exit={{ opacity: 0, y: -16, scale: 0.94, transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } }}
            style={{ transformOrigin: 'top center' }}
            className="relative w-full max-w-[560px] rounded-2xl border border-white/70 bg-white p-5 shadow-popup"
          >
            <button
              type="button"
              onClick={closeSearch}
              aria-label="关闭"
              className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full text-text-hint transition-colors hover:bg-off-white hover:text-text-primary cursor-pointer"
            >
              <CloseIcon width={16} height={16} />
            </button>

            <p className="cjk text-label-caps uppercase text-text-hint">搜索单词</p>
            <form
              className="mt-2 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                goSearch(query)
              }}
            >
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-hint">
                  <SearchIcon width={18} height={18} />
                </span>
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="输入任意单词，看它的词汇图谱"
                  aria-label="搜索单词"
                  className="vocab w-full rounded-xl border border-transparent bg-off-white py-3 pl-11 pr-4 text-[16px] text-text-primary outline-none transition-colors placeholder:font-sans placeholder:text-[15px] placeholder:text-text-hint focus:border-brand focus:bg-white"
                />
              </div>
              <motion.button
                type="submit"
                whileHover={{ y: -1 }}
                whileTap={{ y: 5 }}
                style={{
                  boxShadow:
                    'inset 0 2px 0 rgba(255,255,255,0.35), 0 6px 0 #2E7D00, 0 8px 8px rgba(46,125,0,0.25)',
                }}
                className="flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-5 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-soft-green cursor-pointer"
              >
                探索
                <ArrowRightIcon width={17} height={17} />
              </motion.button>
            </form>

            {suggestions.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="cjk mr-0.5 text-[13px] text-text-hint">试试：</span>
                {suggestions.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => goSearch(w)}
                    className="vocab rounded-full bg-mint px-3.5 py-1.5 text-[14px] font-semibold text-deep-green transition-all duration-200 hover:-translate-y-0.5 hover:bg-light-green hover:text-white cursor-pointer"
                  >
                    {w}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
