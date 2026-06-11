// 全局语音通话浮窗 (独立可拖动, 与聊天框/悬浮球互不影响)。
// 由 useCallStore 控制开关 → 悬浮球 与 AI 助手页共用同一个通话窗。
// 走同一份 useAgentStore：每 ~2.4s 注入一句用户转写 → store 自动回 AI 句，
// 同步到「当前」智能体；通话中切换智能体会自动挂断本次通话 (见 useAgentStore.setCurrentAgent)。
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAgentStore } from '../../stores/useAgentStore'
import { useCallStore } from '../../stores/useCallStore'
import { PhoneIcon, MicIcon, MicOffIcon } from '../icons'

const FAUX_LINES = [
  'Hi, can we talk about my weekend plans?',
  'I want to practice ordering food at a restaurant.',
  "I'd like a coffee and a sandwich, please.",
  'How do I say that more politely?',
]

export function GlobalVoiceCall() {
  const open = useCallStore((s) => s.open)
  return <AnimatePresence>{open && <CallCard />}</AnimatePresence>
}

function CallCard() {
  const closeCall = useCallStore((s) => s.closeCall)
  const { agents, currentAgentId, sendMessage, getCurrentAgent } = useAgentStore()
  const agent = getCurrentAgent()

  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const stepRef = useRef(0)
  const agentIdRef = useRef(currentAgentId)
  agentIdRef.current = currentAgentId
  const mutedRef = useRef(muted)
  mutedRef.current = muted

  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  }))
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // 计时
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // 后台注入: 始终发给最新的当前智能体 (对话写入 store, 不在通话窗里展示)
  // 静音时暂停采集 → 不再注入用户转写, 跟普通电话静音一致
  useEffect(() => {
    const t = setInterval(() => {
      if (mutedRef.current) return
      sendMessage(agentIdRef.current, FAUX_LINES[stepRef.current % FAUX_LINES.length])
      stepRef.current += 1
    }, 2400)
    return () => clearInterval(t)
  }, [sendMessage])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  // 拖拽边界: 锚定 bottom-24/left-6; 窄屏收窄通话条
  const CW = Math.min(288, viewport.w * 0.88)
  const CH = 64
  const bounds = {
    top: Math.min(0, -(viewport.h - 96 - CH)),
    bottom: 96 - 24, // 默认 bottom-24, 但允许向下拖到贴底(bottom-6)
    left: 0,
    right: Math.max(0, viewport.w - 24 - CW),
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={bounds}
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: [0.34, 1.4, 0.64, 1] }}
      className="fixed bottom-24 left-6 z-50 flex w-auto max-w-[88vw] cursor-grab items-center gap-2.5 rounded-full bg-warm-white py-2 pl-2 pr-2.5 shadow-popup active:cursor-grabbing md:w-[288px]"
      role="dialog"
      aria-label={`与 ${agent.name} 语音通话`}
    >
      {/* 头像 (静音时不再脉冲) */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
        {!muted && <span className="absolute inset-0 rounded-full bg-brand/30 animate-pulse-ring" />}
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-light-green to-brand text-[13px] font-bold text-white">
          {agent.avatar}
        </span>
      </div>

      {/* 名字 + 计时 (移动端按内容收窄, 桌面铺满) */}
      <div className="min-w-0 max-w-[42vw] md:max-w-none md:flex-1">
        <p className="truncate text-[13px] font-semibold text-text-primary">{agent.name}</p>
        <p className={`flex items-center gap-1 text-[11px] ${muted ? 'text-text-hint' : 'text-deep-green'}`}>
          {muted ? <MicOffIcon width={10} height={10} /> : <MicIcon width={10} height={10} />}
          <span className="font-mono">{mm}:{ss}</span>
          {muted && <span className="text-[10px]">已静音</span>}
        </p>
      </div>

      {/* 静音切换 */}
      <button
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? '取消静音' : '静音'}
        aria-pressed={muted}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer ${
          muted ? 'bg-coral/15 text-coral' : 'bg-mint text-deep-green hover:bg-light-green/40'
        }`}
      >
        {muted ? <MicOffIcon width={16} height={16} /> : <MicIcon width={16} height={16} />}
      </button>

      {/* 挂断 */}
      <button
        onClick={closeCall}
        aria-label="挂断"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral text-white transition-transform hover:scale-105 active:scale-95 cursor-pointer"
      >
        <PhoneIcon width={16} height={16} className="rotate-[135deg]" />
      </button>
    </motion.div>
  )
}
