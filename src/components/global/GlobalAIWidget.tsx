// 全局悬浮 AI 助手 — 悬浮球(collapsed) ⇄ 聊天框(expanded), 可拖拽, 窗内可切换智能体.
// 互斥: 进 /assistant 独立页自动隐藏 (EXPERIENCE 状态机). 与独立页/语音共享同一份对话.
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useDragControls } from 'framer-motion'
import { useAgentStore } from '../../stores/useAgentStore'
import { useCallStore } from '../../stores/useCallStore'
import { ClickableText } from '../ClickableText'
import { CloseIcon, SendIcon, PhoneIcon, RefreshIcon, ChatIcon, CheckIcon } from '../icons'

export function GlobalAIWidget() {
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const openCall = useCallStore((s) => s.openCall)
  const [input, setInput] = useState('')
  const [switching, setSwitching] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const draggedRef = useRef(false) // 拖拽后抑制松手触发的 click
  // 悬浮球与聊天框各自持有独立位移: 球的位置只在拖球时变, 不受开/关聊天框影响.
  // 聊天框打开时从球的位置派生(并夹紧到视口内), 不回写球的位置。
  const ballX = useMotionValue(0)
  const ballY = useMotionValue(0)
  const chatX = useMotionValue(0)
  const chatY = useMotionValue(0)
  const dragControls = useDragControls() // 聊天框仅由顶栏触发拖拽
  // 拖拽边界按当前形态(球/聊天框)实时计算 → 避免 framer 缓存聊天框尺寸, 导致关闭后球无法上移
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  }))
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const { agents, currentAgentId, conversations, sendMessage, ensureGreeting, newConversation, setCurrentAgent, getCurrentAgent } = useAgentStore()
  const agent = getCurrentAgent()
  const msgs = conversations[currentAgentId] ?? []

  useEffect(() => { ensureGreeting(currentAgentId) }, [currentAgentId, ensureGreeting])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs.length, open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // 互斥规则: 独立 AI 聊天页隐藏悬浮窗
  if (location.pathname.startsWith('/assistant')) return null

  const submit = () => {
    if (!input.trim()) return
    sendMessage(currentAgentId, input)
    setInput('')
  }

  // 元素锚定 bottom-24/right-6 向左上展开 → 某形态(宽w高h)的拖拽边界(像素偏移)
  const ANCHOR_X = 24 // right-6
  const ANCHOR_Y = 96 // bottom-24 (上移, 不贴底)
  const boundsFor = (w: number, h: number) => ({
    top: Math.min(0, -(viewport.h - ANCHOR_Y - h)),
    left: Math.min(0, -(viewport.w - ANCHOR_X - w)),
    right: 0,
    bottom: ANCHOR_Y - 24, // 默认停在 bottom-24, 但允许向下拖到贴底(bottom-6)
  })
  // 移动端: 悬浮球默认停右上角, 距顶 70px (避开底部 Dock); 桌面: 右下角
  const isMobile = viewport.w < 768
  const BALL_TOP = 70
  const ballAnchorClass = isMobile
    ? 'fixed right-6 z-40'
    : 'fixed bottom-24 right-6 z-40'
  const ballBounds = isMobile
    ? {
        top: -(BALL_TOP - 8),
        bottom: Math.max(0, viewport.h - BALL_TOP - 56 - 8),
        left: Math.min(0, -(viewport.w - ANCHOR_X - 56)),
        right: 0,
      }
    : boundsFor(56, 56)
  // 聊天框尺寸随视口收缩(窄屏不超宽/超高), 拖拽边界用同一份实际尺寸
  const chatW = Math.min(360, viewport.w * 0.92)
  const chatH = Math.min(520, viewport.h * 0.7)
  const chatBounds = boundsFor(chatW, chatH)

  // 从球的位置展开聊天框, 仅夹紧聊天框自身位置(碰顶边/左边就贴边); 不改变球的位置
  const openChat = () => {
    // 移动端球停右上、聊天框锚右下, 锚点不同 → 直接回到默认锚点展开
    if (isMobile) {
      chatX.set(0)
      chatY.set(0)
      setOpen(true)
      return
    }
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
    chatX.set(clamp(ballX.get(), chatBounds.left, chatBounds.right))
    chatY.set(clamp(ballY.get(), chatBounds.top, chatBounds.bottom))
    setOpen(true)
  }

  return (
    <>
      {/* 球与聊天框是两个独立的可拖拽容器, 各自持有位置 → 开/关聊天框不会挪动球. */}
      <AnimatePresence mode="wait" initial={false}>
        {!open ? (
          <motion.div
            key="ball"
            drag
            dragMomentum={false}
            dragElastic={0.12}
            dragConstraints={ballBounds}
            onDragStart={() => { draggedRef.current = true }}
            onDragEnd={() => { setTimeout(() => { draggedRef.current = false }, 0) }}
            style={{ x: ballX, y: ballY, top: isMobile ? BALL_TOP : undefined }}
            className={ballAnchorClass}
          >
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => { if (draggedRef.current) return; openChat() }}
              aria-label="打开 AI 助手"
              className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border border-white/70 bg-white/55 shadow-float backdrop-blur-md backdrop-saturate-150"
            >
              <motion.img
                src={`${import.meta.env.BASE_URL}spatial/companion-spark.png`}
                alt=""
                aria-hidden
                draggable={false}
                className="pointer-events-none h-[3.4rem] w-[3.4rem] select-none object-contain drop-shadow-[0_4px_10px_rgba(255,200,0,0.4)]"
                animate={{ y: [0, -2.5, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="pointer-events-none absolute inset-0 rounded-full bg-brand/30 animate-pulse-ring" />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            drag
            dragListener={false}            // 聊天框仅顶栏经 dragControls 触发拖拽
            dragControls={dragControls}
            dragMomentum={false}
            dragElastic={0.12}
            dragConstraints={chatBounds}
            style={{ x: chatX, y: chatY }}
            className="fixed bottom-24 right-6 z-40"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2, ease: [0.34, 1.4, 0.64, 1] }}
              className="flex h-[min(520px,70dvh)] w-[min(360px,92vw)] origin-bottom-right flex-col overflow-hidden rounded-lg bg-white shadow-popup"
              role="dialog"
              aria-modal="false"
              aria-label={`与 ${agent.name} 对话`}
            >
              {/* 顶部工具栏 (暖白) — 兼作拖拽手柄, 按住空白处拖动; 点按钮不触发拖拽 */}
              <div
                onPointerDown={(e) => { if (!(e.target as HTMLElement).closest('button')) dragControls.start(e) }}
                className="relative flex select-none items-center gap-2.5 border-b border-light-gray bg-warm-white px-4 py-3 cursor-grab active:cursor-grabbing"
              >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-light-green to-brand text-[12px] font-bold text-white">
                {agent.avatar}
              </span>
              <button
                onClick={() => setSwitching((v) => !v)}
                className="flex-1 min-w-0 text-left cursor-pointer"
                aria-label="切换智能体"
              >
                <div className="truncate text-[14px] font-semibold text-text-primary">{agent.name} ▾</div>
              </button>
              <button onClick={() => newConversation(currentAgentId)} aria-label="新对话" className="text-text-hint hover:text-deep-green transition-colors cursor-pointer"><RefreshIcon width={17} height={17} /></button>
              <button onClick={openCall} aria-label="语音电话" className="text-text-hint hover:text-deep-green transition-colors cursor-pointer"><PhoneIcon width={17} height={17} /></button>
              <button onClick={() => { setOpen(false); navigate('/assistant') }} aria-label="展开为整页" className="text-text-hint hover:text-deep-green transition-colors cursor-pointer"><ChatIcon width={17} height={17} /></button>
              <button onClick={() => setOpen(false)} aria-label="收起" className="text-text-hint hover:text-text-primary transition-colors cursor-pointer"><CloseIcon width={18} height={18} /></button>

              {/* 智能体切换下拉 */}
              {switching && (
                <div className="absolute left-3 top-full z-50 mt-1 w-52 rounded-lg bg-white p-1.5 shadow-popup">
                  {agents.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { setCurrentAgent(a.id); setSwitching(false) }}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors cursor-pointer ${
                        a.id === currentAgentId ? 'bg-mint text-deep-green' : 'hover:bg-off-white text-text-primary'
                      }`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-light-green to-brand text-[10px] font-bold text-white">{a.avatar}</span>
                      <span className="flex-1 truncate font-medium">{a.name}</span>
                      {a.id === currentAgentId && <CheckIcon width={14} height={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 对话区 */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-off-white/40 px-4 py-4">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-lg px-3 py-2 text-[14px] leading-relaxed ${
                    m.role === 'user' ? 'bg-brand text-white' : 'bg-white text-text-primary shadow-card'
                  }`}>
                    {m.role === 'assistant' ? <ClickableText text={m.text} /> : m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* 输入 */}
            <div className="flex items-center gap-2 border-t border-light-gray bg-white px-3 py-2.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="发消息…"
                aria-label="给 AI 发消息"
                className="flex-1 rounded-full bg-off-white px-4 py-2 text-[14px] outline-none focus:ring-2 focus:ring-brand/40"
              />
              <button onClick={submit} aria-label="发送" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white hover:bg-soft-green transition-colors cursor-pointer">
                <SendIcon width={17} height={17} />
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  )
}

