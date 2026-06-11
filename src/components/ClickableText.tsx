// 把文本里的英文单词变成可点击 → 触发全局点词弹窗 (EXPERIENCE 全局核心交互).
// 用于例句 / 阅读文章 / AI 回复. 目标词(highlight)柔黄底.
import { useWordPopupStore } from '../stores/useWordPopupStore'

const TOKEN = /([A-Za-z][A-Za-z'-]*)/g

export function ClickableText({
  text,
  highlight = [],
  className = '',
  spokenChar = null,
}: {
  text: string
  highlight?: string[]
  className?: string
  /** 朗读到的字符位置 (相对本段 text); 落在某词区间则高亮该词. null 不高亮. */
  spokenChar?: number | null
}) {
  const show = useWordPopupStore((s) => s.show)
  const hi = new Set(highlight.map((w) => w.toLowerCase()))
  const parts = text.split(TOKEN)

  let cursor = 0
  return (
    <span className={className}>
      {parts.map((part, i) => {
        const start = cursor
        cursor += part.length
        if (i % 2 === 1) {
          const isHi = hi.has(part.toLowerCase())
          const isActive = spokenChar != null && spokenChar >= start && spokenChar < start + part.length
          return (
            <span
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`查词 ${part}`}
              ref={isActive ? scrollIntoViewRef : undefined}
              className={`clickable-word ${
                isActive ? 'reading-active' : isHi ? 'word-highlight font-medium' : ''
              }`}
              onClick={(e) => show(part, { x: e.clientX, y: e.clientY })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  const r = (e.target as HTMLElement).getBoundingClientRect()
                  show(part, { x: r.left + r.width / 2, y: r.bottom })
                }
              }}
            >
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

// 当前朗读词进入视口时, 轻柔滚动到可见区 (居中)
function scrollIntoViewRef(el: HTMLSpanElement | null) {
  if (!el) return
  const r = el.getBoundingClientRect()
  // 仅当当前词不在舒适可视区 (距顶/底过近) 才滚动, 避免每词都跳
  const top = 120
  const bottom = window.innerHeight - 160
  if (r.top < top || r.bottom > bottom) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
}
