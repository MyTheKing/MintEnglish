import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  type Simulation,
} from 'd3-force'
import { Button, Chip, PlayButton, Toast } from '../components/ui'
import { ClickableText } from '../components/ClickableText'
import { GalaxyIcon, PlayIcon, MemoryIcon, CheckIcon } from '../components/icons'
import { getRichWord, getAllRichWords, speak } from '../lib/dictionary'
import { useLearningStore } from '../stores/useLearningStore'
import type { RichWord, Relation } from '../lib/types'

// ─────────────────────────────────────────────
// 词汇图谱 ⭐ — d3-force 力导向语义图
// 暖白画布(禁暗黑) · 节点按语义着色 · 拖拽/缩放/双击换中心
// ─────────────────────────────────────────────

interface SimNode {
  id: string
  label: string
  cn: string
  relation: Relation | 'center'
  expandable: boolean
  isCenter: boolean
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}
interface SimLink {
  source: string | SimNode
  sourceId: string
  target: string | SimNode
  targetId: string
}

// 关系 → 配色 (DESIGN graph-node-*)
const NODE_STYLE: Record<SimNode['relation'], { fill: string; text: string }> = {
  center: { fill: '#58CC02', text: '#FFFFFF' },
  synonym: { fill: '#A8E06C', text: '#2C6E00' },
  antonym: { fill: '#FFD4C7', text: '#C44A2E' },
  root: { fill: '#FFD54F', text: '#9A7400' },
  collocation: { fill: '#DCEEFB', text: '#2A7AB8' },
}
const RELATION_CN: Record<Relation, string> = {
  synonym: '同义',
  antonym: '反义',
  root: '词根',
  collocation: '搭配',
}
const CHIP_ACCENT: Record<Relation, 'mint' | 'coral' | 'gold' | 'sky'> = {
  synonym: 'mint',
  antonym: 'coral',
  root: 'gold',
  collocation: 'sky',
}

const R_CENTER = 34
const R_NODE = 26

// 由一个富词条派生力导向图的节点/连线
function buildGraph(rich: RichWord): { nodes: SimNode[]; links: SimLink[] } {
  const centerId = rich.word
  const nodes: SimNode[] = [
    { id: centerId, label: rich.word, cn: rich.translation, relation: 'center', expandable: false, isCenter: true },
  ]
  const links: SimLink[] = []
  const seen = new Set([centerId])
  for (const n of rich.galaxy?.nodes ?? []) {
    if (seen.has(n.id)) continue
    seen.add(n.id)
    nodes.push({ id: n.id, label: n.label, cn: n.cn, relation: n.relation, expandable: n.expandable, isCenter: false })
    links.push({ source: centerId, sourceId: centerId, target: n.id, targetId: n.id })
  }
  return { nodes, links }
}

export default function GraphPage() {
  const reduce = false
  const addReview = useLearningStore((s) => s.addReview)
  const reviewWords = useLearningStore((s) => s.reviewWords)
  const [searchParams, setSearchParams] = useSearchParams()
  const urlWord = searchParams.get('w') ?? ''

  // 中心富词条 (无则空状态)
  const [center, setCenter] = useState<RichWord | undefined>(() => (urlWord ? getRichWord(urlWord) : undefined))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false) // 移动端底部详情弹层
  const [hover, setHover] = useState<{ node: SimNode; x: number; y: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 画布渲染状态: 节点位置由 tick 同步进来
  const [nodes, setNodes] = useState<SimNode[]>([])
  const [links, setLinks] = useState<SimLink[]>([])
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  // 节点静态信息(label/cn)，与每帧位置解耦 → 详情面板/选中查找不随拖拽 tick 重渲染
  const [nodeMeta, setNodeMeta] = useState<Record<string, { label: string; cn: string }>>({})

  const simRef = useRef<Simulation<SimNode, undefined> | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const sizeRef = useRef({ w: 800, h: 600 })

  // URL ?w 变化 → 同步 center
  useEffect(() => {
    if (!urlWord) {
      setCenter(undefined)
      return
    }
    const w = getRichWord(urlWord)
    if (w) setCenter(w)
  }, [urlWord])

  // —— 构建 / 重建力导向模拟 ——
  useEffect(() => {
    if (!center) {
      simRef.current?.stop()
      simRef.current = null
      setNodes([])
      setLinks([])
      setNodeMeta({})
      return
    }

    setLoading(true)
    setSelectedId(center.word)
    setSheetOpen(false) // 切换中心 → 收起移动端弹层, 避免遮挡新图谱
    // 进入/切换中心 → 重置平移缩放，让中心球自动回到画面中央
    setView({ x: 0, y: 0, k: 1 })

    // 直接读 SVG 实际尺寸(ResizeObserver 可能还没量到), 否则中心会按默认 800×600 偏左上
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect && rect.width && rect.height) {
      sizeRef.current = { w: rect.width, h: rect.height }
    }
    const { w, h } = sizeRef.current
    const { nodes: gNodes, links: gLinks } = buildGraph(center)

    // 花瓣状初始布局 → 视觉更平衡; 半径随容器尺寸缩放, 避免小屏节点初始飞出画面
    const petals = gNodes.length - 1
    const ringR = Math.max(90, Math.min(w, h) * 0.28)
    gNodes.forEach((n, i) => {
      if (n.isCenter) {
        n.x = w / 2
        n.y = h / 2
      } else {
        const a = (2 * Math.PI * (i - 1)) / Math.max(petals, 1) - Math.PI / 2
        n.x = w / 2 + Math.cos(a) * ringR
        n.y = h / 2 + Math.sin(a) * ringR
      }
    })

    setNodes(gNodes)
    setLinks(gLinks)
    const meta: Record<string, { label: string; cn: string }> = {}
    for (const n of gNodes) meta[n.id] = { label: n.label, cn: n.cn }
    setNodeMeta(meta)

    simRef.current?.stop()
    const sim = forceSimulation<SimNode>(gNodes)
      .force(
        'link',
        forceLink<SimNode, SimLink>(gLinks)
          .id((d) => d.id)
          .distance(120)
          .strength(0.7),
      )
      .force('charge', forceManyBody().strength(-350))
      .force('center', forceCenter(w / 2, h / 2).strength(0.08))
      .force('collide', forceCollide<SimNode>().radius((d) => (d.isCenter ? R_CENTER + 16 : R_NODE + 14)))
      .alpha(1)
      .alphaDecay(0.045)

    if (reduce) {
      // 减少动效: 直接跑完布局再渲染一次
      sim.stop()
      for (let i = 0; i < 220; i++) sim.tick()
      setNodes([...gNodes])
      setLoading(false)
    }

    let loadTimer: ReturnType<typeof setTimeout> | undefined
    if (!reduce) {
      sim.on('tick', () => {
        setNodes(gNodes.map((n) => ({ ...n })))
      })
      sim.on('end', () => setLoading(false))
      // 短暂保留「生成中」感
      loadTimer = setTimeout(() => setLoading(false), 700)
    }

    simRef.current = sim
    return () => {
      if (loadTimer) clearTimeout(loadTimer)
      sim.stop()
    }
  }, [center, reduce])

  // 卸载清理
  useEffect(() => {
    return () => {
      simRef.current?.stop()
    }
  }, [])

  // 测量画布尺寸 → forceCenter 用
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      sizeRef.current = { w: r.width, h: r.height }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 选中节点的完整信息 (富词优先) —— 用静态 nodeMeta 查找，避免随每帧 tick 重渲染面板
  const selectedMeta = selectedId ? nodeMeta[selectedId] ?? null : null
  const selectedRich = useMemo(() => {
    if (!selectedMeta) return undefined
    return getRichWord(selectedMeta.label)
  }, [selectedMeta])

  // —— 缩放 (滚轮, 朝光标) ——
  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    setView((v) => {
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const k = Math.min(3, Math.max(0.3, v.k * factor))
      const ratio = k / v.k
      return { k, x: mx - (mx - v.x) * ratio, y: my - (my - v.y) * ratio }
    })
  }, [])

  // —— 缩放按钮 (触屏无滚轮) —— 朝画布中心缩放
  const zoomBy = useCallback((factor: number) => {
    const { w, h } = sizeRef.current
    const cx = w / 2
    const cy = h / 2
    setView((v) => {
      const k = Math.min(3, Math.max(0.3, v.k * factor))
      const ratio = k / v.k
      return { k, x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio }
    })
  }, [])

  // —— 平移 (拖画布) —— 节点不可拖拽(性能考量), 仅点击选中 / 双击换中心
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)

  const onCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current) return
    svgRef.current?.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: view.x, oy: view.y }
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current
    if (!d) return
    setView((v) => ({ ...v, x: d.ox + (e.clientX - d.startX), y: d.oy + (e.clientY - d.startY) }))
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = null
    svgRef.current?.releasePointerCapture?.(e.pointerId)
  }

  // 双击可展开节点 → 成为新中心
  const expandTo = useCallback(
    (node: SimNode) => {
      if (node.isCenter) return
      const rich = getRichWord(node.label)
      if (rich && rich.galaxy?.nodes?.length) {
        setSearchParams({ w: rich.word })
        setCenter(rich)
      } else {
        setToast(`「${node.label}」暂时没有更多图谱了，已为你展开它的释义`)
        setSelectedId(node.id)
      }
    },
    [setSearchParams],
  )

  // 推荐词 (有非空 galaxy)
  const recommended = useMemo(() => {
    const picks = ['good', 'come', 'make', 'increase', 'water', 'work', 'love', 'mind']
    const all = getAllRichWords()
    const byWord = new Map(all.map((w) => [w.word, w]))
    const result: RichWord[] = []
    for (const p of picks) {
      const w = byWord.get(p)
      if (w && w.galaxy?.nodes?.length) result.push(w)
    }
    if (result.length < 8) {
      for (const w of all) {
        if (result.length >= 8) break
        if (w.galaxy?.nodes?.length && !result.includes(w)) result.push(w)
      }
    }
    return result.slice(0, 8)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  // 入场动画改用一次性 CSS 关键帧(animate-spark-pop)，去掉 framer 每帧开销
  const enterClass = reduce ? '' : 'animate-spark-pop'

  return (
    <div className="flex h-[calc(100dvh-88px)] md:h-[calc(100dvh-56px)] overflow-hidden bg-warm-white">
      {/* —— 左：全宽图谱画布 —— */}
      <div className="relative flex-1 overflow-hidden">
        {/* 暖白底 + 极淡放射光 + 点阵 (保持明亮) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 42% 38%, rgba(168,224,108,0.16), transparent 60%), radial-gradient(circle at 78% 76%, rgba(255,213,79,0.10), transparent 55%), #FAFAF5',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage: 'radial-gradient(#E8E8E3 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />

        {/* 标题徽标 */}
        <div className="pointer-events-none absolute left-6 top-5 z-10 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint text-deep-green">
            <GalaxyIcon width={18} height={18} />
          </span>
          <div>
            <p className="text-label-caps uppercase text-text-hint">词汇图谱</p>
            {center && (
              <p className="font-display text-[15px] text-text-primary">
                以 <span className="vocab text-deep-green">{center.word}</span> 为中心
              </p>
            )}
          </div>
        </div>

        {center ? (
          <>
            <svg
              ref={svgRef}
              className="absolute inset-0 h-full w-full touch-none select-none"
              style={{ cursor: dragRef.current ? 'grabbing' : 'grab' }}
              onWheel={onWheel}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              role="application"
              aria-label="词汇图谱，力导向语义图，可拖拽、缩放、点击节点查看释义"
            >
              <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
                {/* 连线 */}
                {links.map((l, i) => {
                  const s = nodes.find((n) => n.id === l.sourceId)
                  const t = nodes.find((n) => n.id === l.targetId)
                  if (!s || !t) return null
                  const active = selectedId === l.sourceId || selectedId === l.targetId
                  return (
                    <line
                      key={i}
                      x1={s.x}
                      y1={s.y}
                      x2={t.x}
                      y2={t.y}
                      stroke={active ? '#A8E06C' : '#E8E8E3'}
                      strokeWidth={active ? 3 : 2}
                      strokeLinecap="round"
                      style={{ transition: 'stroke 0.25s' }}
                    />
                  )
                })}

                {/* 节点 — 外层 <g> 用 SVG transform 定位(每帧更新); 内层 <g> 仅一次性 CSS 入场动画, 围绕节点中心 */}
                {nodes.map((n) => {
                  const style = NODE_STYLE[n.relation]
                  const r = n.isCenter ? R_CENTER : R_NODE
                  const isSel = selectedId === n.id
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x ?? 0} ${n.y ?? 0})`}
                      style={{ cursor: 'pointer' }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedId(n.id)
                        setSheetOpen(true)
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        expandTo(n)
                      }}
                      onPointerEnter={() => setHover({ node: n, x: n.x ?? 0, y: n.y ?? 0 })}
                      onPointerLeave={() => setHover(null)}
                      tabIndex={0}
                      role="button"
                      aria-label={`${n.isCenter ? 'center' : n.relation}: ${n.label} ${n.cn}`}
                    >
                      <g
                        className={enterClass}
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                      >
                        {/* 中心词加载脉冲环 */}
                        {n.isCenter && loading && !reduce && (
                          <circle r={r} fill="none" stroke="#A8E06C" strokeWidth={3} className="animate-pulse-ring" />
                        )}
                        {isSel && (
                          <circle r={r + 6} fill="none" stroke={style.fill} strokeWidth={2.5} opacity={0.5} />
                        )}
                        <circle
                          r={r}
                          fill={style.fill}
                          stroke="#FFFFFF"
                          strokeWidth={3}
                          style={{ filter: 'drop-shadow(0 4px 10px rgba(45,52,54,0.10))' }}
                        />
                        <text
                          textAnchor="middle"
                          dy={n.cn ? '-0.05em' : '0.35em'}
                          className="vocab pointer-events-none"
                          fontSize={n.isCenter ? 17 : 14}
                          fontWeight={600}
                          fill={style.text}
                        >
                          {n.label}
                        </text>
                        {n.cn && (
                          <text
                            textAnchor="middle"
                            dy="1.15em"
                            className="cjk pointer-events-none"
                            fontSize={n.isCenter ? 10.5 : 9.5}
                            fill={style.text}
                            opacity={0.85}
                          >
                            {n.cn.length > 5 ? n.cn.slice(0, 5) + '…' : n.cn}
                          </text>
                        )}
                        {/* 发音图标：点它才发声，不影响选中/换中心 */}
                        <g
                          transform={`translate(0 ${r - 1})`}
                          style={{ cursor: 'pointer' }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            speak(n.label)
                          }}
                          role="button"
                          aria-label={`朗读 ${n.label}`}
                        >
                          <circle
                            r={9.5}
                            fill="#FFFFFF"
                            stroke={n.isCenter ? '#58CC02' : style.fill}
                            strokeWidth={1.5}
                            style={{ filter: 'drop-shadow(0 1px 2px rgba(45,52,54,0.18))' }}
                          />
                          <path
                            d="M-3.2,-1.6 H-1 L1.4,-3.4 V3.4 L-1,1.6 H-3.2 Z"
                            fill={n.isCenter ? '#58CC02' : style.text}
                          />
                          <path
                            d="M2.8,-2.4 A3.2,3.2 0 0 1 2.8,2.4"
                            fill="none"
                            stroke={n.isCenter ? '#58CC02' : style.text}
                            strokeWidth={1.2}
                            strokeLinecap="round"
                          />
                        </g>
                      </g>
                    </g>
                  )
                })}
              </g>
            </svg>

            {/* hover 工具提示 */}
            {hover && (
              <div
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg bg-white px-3 py-2 shadow-popup"
                style={{
                  left: (hover.node.x ?? 0) * view.k + view.x,
                  top: (hover.node.y ?? 0) * view.k + view.y - (hover.node.isCenter ? R_CENTER : R_NODE) * view.k - 8,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="vocab text-[15px] font-semibold text-text-primary">{hover.node.label}</span>
                  {!hover.node.isCenter && (
                    <Chip accent={CHIP_ACCENT[hover.node.relation as Relation]}>
                      {RELATION_CN[hover.node.relation as Relation]}
                    </Chip>
                  )}
                </div>
                <p className="cjk mt-0.5 text-[12px] text-text-secondary">{hover.node.cn || '—'}</p>
                {hover.node.expandable && (
                  <p className="cjk mt-1 text-[11px] text-deep-green">双击展开它的关联词</p>
                )}
              </div>
            )}

            {/* 加载提示 */}
            {loading && (
              <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-deep-green shadow-card">
                <span className="cjk">正在生成图谱…</span>
              </div>
            )}

            {/* 操作提示 */}
            <div className="pointer-events-none absolute bottom-5 left-6 z-10 cjk text-[12px] text-text-hint">
              <span className="hidden md:inline">滚轮缩放 · </span>单击查看 · 双击换中心
            </div>

            {/* 缩放按钮 (触屏用; 桌面也常驻便于精确缩放) */}
            <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
              <button
                onClick={() => zoomBy(1.2)}
                aria-label="放大"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-light-gray bg-white text-[20px] font-semibold text-deep-green shadow-card transition-colors hover:bg-mint cursor-pointer"
              >
                +
              </button>
              <button
                onClick={() => zoomBy(1 / 1.2)}
                aria-label="缩小"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-light-gray bg-white text-[22px] font-semibold text-deep-green shadow-card transition-colors hover:bg-mint cursor-pointer"
              >
                −
              </button>
            </div>
          </>
        ) : (
          <EmptyState
            recommended={recommended}
            onPick={(w) => {
              setSearchParams({ w: w.word })
              setCenter(w)
            }}
          />
        )}
      </div>

      {/* —— 右：320px 详情面板 (桌面常驻; 移动端改底部弹层) —— */}
      <aside className="z-10 hidden w-[320px] shrink-0 overflow-y-auto border-l border-light-gray bg-white shadow-popup md:block">
        {center && selectedMeta ? (
          <DetailPanel
            rich={selectedRich}
            node={selectedMeta}
            inReview={reviewWords.includes(selectedRich?.word ?? selectedMeta.label)}
            onAddReview={() => {
              const w = selectedRich?.word ?? selectedMeta.label
              addReview(w)
              setToast(`已把「${w}」加入复习`)
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-mint text-deep-green">
              <GalaxyIcon width={24} height={24} />
            </span>
            <p className="cjk text-[14px] text-text-secondary">
              选一个单词，这里会显示它的释义、例句与相关词。
            </p>
          </div>
        )}
      </aside>

      {/* —— 移动端: 节点详情底部弹层 —— */}
      <AnimatePresence>
        {center && selectedMeta && sheetOpen && (
          <div className="fixed inset-x-0 bottom-0 z-50 md:hidden" style={{ top: 0 }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSheetOpen(false)}
              className="absolute inset-0 bg-text-primary/20"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 bottom-0 flex max-h-[60dvh] flex-col rounded-t-2xl border-t border-light-gray bg-white shadow-popup"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* 抓手 + 关闭 */}
              <div className="relative flex shrink-0 items-center justify-center pb-1 pt-2.5">
                <span className="h-1 w-10 rounded-full bg-light-gray" />
                <button
                  onClick={() => setSheetOpen(false)}
                  aria-label="收起详情"
                  className="absolute right-3 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-text-hint transition-colors hover:bg-off-white hover:text-text-primary cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <DetailPanel
                  rich={selectedRich}
                  node={selectedMeta}
                  inReview={reviewWords.includes(selectedRich?.word ?? selectedMeta.label)}
                  onAddReview={() => {
                    const w = selectedRich?.word ?? selectedMeta.label
                    addReview(w)
                    setToast(`已把「${w}」加入复习`)
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

/* —— 右侧详情面板 —— */
function DetailPanel({
  rich,
  node,
  inReview,
  onAddReview,
}: {
  rich: RichWord | undefined
  node: { label: string; cn: string }
  inReview: boolean
  onAddReview: () => void
}) {
  const word = rich?.word ?? node.label
  const example = rich?.examples?.[0]
  return (
    <div className="flex min-h-full flex-col p-card-pad">
      {/* 词头 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="vocab break-words text-[34px] font-semibold leading-tight text-text-primary">{word}</h2>
          {(rich?.phonetic || rich?.pos) && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {rich?.phonetic && (
                <span className="font-mono text-phonetic text-text-secondary">{rich.phonetic}</span>
              )}
              {rich?.pos && <Chip accent="mint">{rich.pos}</Chip>}
            </div>
          )}
        </div>
        <PlayButton word={word} audio={rich?.audio} className="mt-1 shrink-0" />
      </div>

      {/* 中文释义 */}
      <p className="cjk mt-3 text-[16px] font-medium text-text-primary">
        {rich?.translation || node.cn || '（暂无释义）'}
      </p>

      {!rich && (
        <p className="cjk mt-2 rounded-md bg-light-yellow px-3 py-2 text-[12px] text-[#9A7400]">
          这个词暂无完整图谱数据，仅显示基础信息。
        </p>
      )}

      {/* 释义列表 */}
      {rich?.definitions?.length ? (
        <div className="mt-5">
          <p className="text-label-caps uppercase text-text-hint">释义</p>
          <ul className="mt-2 space-y-2">
            {rich.definitions.slice(0, 3).map((d, i) => (
              <li key={i} className="cjk text-[13px] leading-relaxed text-text-secondary">
                <span className="mr-1.5 rounded bg-off-white px-1.5 py-0.5 text-[11px] font-semibold text-text-hint">
                  {d.pos}
                </span>
                {d.cn}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 例句 */}
      {example && (
        <div className="mt-5">
          <p className="text-label-caps uppercase text-text-hint">例句</p>
          <div className="mt-2 flex items-start gap-2">
            <p className="flex-1 leading-relaxed">
              <ClickableText
                text={example.en}
                highlight={example.highlight}
                className="vocab text-[15px] text-text-primary"
              />
            </p>
            <PlayButton word={example.en} className="mt-0.5 h-6 w-6 shrink-0" />
          </div>
          <p className="cjk mt-1 text-[13px] text-text-secondary">{example.cn}</p>
        </div>
      )}

      {/* 相关词 chips */}
      {rich && (rich.synonyms?.length || rich.antonyms?.length || rich.collocations?.length) ? (
        <div className="mt-5 space-y-3">
          {rich.synonyms?.length ? (
            <ChipRow label="同义" accent="mint" items={rich.synonyms.map((s) => ({ text: `${s.word} · ${s.cn}`, say: s.word }))} />
          ) : null}
          {rich.antonyms?.length ? (
            <ChipRow label="反义" accent="coral" items={rich.antonyms.map((a) => ({ text: `${a.word} · ${a.cn}`, say: a.word }))} />
          ) : null}
          {rich.collocations?.length ? (
            <ChipRow label="搭配" accent="sky" items={rich.collocations.map((c) => ({ text: `${c.phrase} · ${c.cn}`, say: c.phrase }))} />
          ) : null}
        </div>
      ) : null}

      {/* CTA：加入复习 */}
      <div className="mt-auto pt-6">
        <Button
          className="w-full"
          variant={inReview ? 'ghost' : 'primary'}
          disabled={inReview}
          onClick={onAddReview}
        >
          {inReview ? <CheckIcon width={17} height={17} /> : <MemoryIcon width={17} height={17} />}
          {inReview ? '已在复习计划中' : '加入复习'}
        </Button>
      </div>
    </div>
  )
}

function ChipRow({
  label,
  accent,
  items,
}: {
  label: string
  accent: 'mint' | 'coral' | 'sky' | 'gold'
  items: { text: string; say: string }[]
}) {
  return (
    <div>
      <p className="text-label-caps uppercase text-text-hint">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {items.slice(0, 6).map((it, i) => (
          <Chip key={i} accent={accent} onClick={() => speak(it.say)} title={`朗读 ${it.say}`}>
            <PlayIcon width={13} height={13} className="shrink-0" />
            {it.text}
          </Chip>
        ))}
      </div>
    </div>
  )
}

/* —— 空状态：推荐词入口 (搜索走顶栏) —— */
function EmptyState({
  recommended,
  onPick,
}: {
  recommended: RichWord[]
  onPick: (w: RichWord) => void
}) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8">
      <img
        src={`${import.meta.env.BASE_URL}spatial/obj-orb.png`}
        alt=""
        aria-hidden
        className="animate-float mb-5 h-24 w-24 select-none object-contain drop-shadow-[0_14px_32px_rgba(88,204,2,0.26)]"
      />
      <h1 className="font-display text-headline text-text-primary">从顶部搜索单词，开启词汇探索</h1>
      <p className="cjk mt-2 text-[15px] text-text-secondary">
        以词为中心，顺着同义、反义、词根连成你的词汇网络。
      </p>

      {recommended.length > 0 && (
        <div className="mt-7 flex max-w-content flex-wrap items-center justify-center gap-2">
          <span className="cjk mr-1 text-[13px] text-text-hint">试试：</span>
          {recommended.map((w) => (
            <button
              key={w.word}
              onClick={() => onPick(w)}
              className="vocab rounded-full bg-white px-4 py-1.5 text-[15px] font-semibold text-deep-green shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:bg-mint hover:shadow-card-hover"
            >
              {w.word}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
