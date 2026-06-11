// 独立 AI 聊天界面 (full-page sibling of GlobalAIWidget)
// 视觉: doc/index.md「智能镜面」语汇 — 玻璃轨道栏 + 主角 Hero + aurora 光晕 + 景深浮入。
// 与悬浮窗 / 语音三入口共享同一份 useAgentStore.conversations → 记录互通 (brief 5.1)。
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAgentStore } from '../stores/useAgentStore'
import { useCallStore } from '../stores/useCallStore'
import { ClickableText } from '../components/ClickableText'
import { Toast } from '../components/ui'
import { EASE_FLUID, staggerContainer, riseItem } from '../lib/motion'
import {
  PlusIcon,
  SendIcon,
  PhoneIcon,
  RefreshIcon,
  SparkleIcon,
  ChatIcon,
} from '../components/icons'
import type { ChatMessage } from '../lib/types'

// 守绿系状态驱动配色: 按 id 哈希派生一个绿系内微光色 (薄荷 / 嫩芽 / 柠黄点睛 / 柔绿)
const GLOWS = [
  'rgba(168,224,108,0.30)',
  'rgba(127,184,92,0.26)',
  'rgba(214,229,180,0.30)',
  'rgba(120,176,84,0.26)',
]
function agentGlow(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return GLOWS[h % GLOWS.length]
}

export default function AssistantPage() {
  const reduce = false
  const {
    agents,
    currentAgentId,
    conversations,
    setCurrentAgent,
    sendMessage,
    createAgent,
    newConversation,
    ensureGreeting,
    getCurrentAgent,
  } = useAgentStore()

  const agent = getCurrentAgent()
  const msgs: ChatMessage[] = (agent && conversations[agent.id]) ?? []

  const [input, setInput] = useState('')
  const [composing, setComposing] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPersona, setNewPersona] = useState('')
  const [nameError, setNameError] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const openGlobalCall = useCallStore((s) => s.openCall)

  // 移动端: 选会话即关抽屉
  const selectAgent = (id: string) => {
    setCurrentAgent(id)
    setDrawerOpen(false)
  }

  const scrollRef = useRef<HTMLDivElement>(null)

  // 进入页面 / 切换智能体 → 确保有问候语开场
  useEffect(() => {
    if (agent) ensureGreeting(agent.id)
  }, [agent, ensureGreeting])

  // 新消息 / 切换智能体 → 自动滚到底
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduce ? 'auto' : 'smooth',
    })
  }, [msgs.length, currentAgentId, reduce])

  // 末条是 user → 正在等待 AI 回复 → 显示三点气泡
  const awaiting = msgs.length > 0 && msgs[msgs.length - 1].role === 'user'
  // 是否已开聊 (有用户发言) → 决定主角 Hero 收起为紧凑头部
  const started = msgs.some((m) => m.role === 'user')

  const submit = () => {
    const t = input.trim()
    if (!t || !agent) return
    sendMessage(agent.id, t)
    setInput('')
  }

  const submitCreate = () => {
    const name = newName.trim()
    if (!name) {
      setNameError(true)
      return
    }
    const persona =
      newPersona.trim() || `你是我的「${name}」，用轻松友好的口语陪我练习英语。`
    const id = createAgent(name, persona)
    setCurrentAgent(id)
    setComposing(false)
    setNewName('')
    setNewPersona('')
    setNameError(false)
    setDrawerOpen(false)
  }

  // 语音电话：mic 不可用 → 温柔降级；否则打开全局通话窗 (与悬浮球同一个, 后台同步对话)
  const openCall = () => {
    if (!agent) return
    const hasMic = typeof navigator !== 'undefined' && !!navigator.mediaDevices
    if (!hasMic) {
      setToast('语音不可用，可文字聊天')
      return
    }
    openGlobalCall()
  }

  const glow = agent ? agentGlow(agent.id) : GLOWS[0]

  // 侧栏内容 (桌面常驻 aside / 移动端抽屉 共用一份)
  const sidebarBody = (inDrawer: boolean) => (
    <>
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <h2 className="font-display text-title text-text-primary">我的智能体</h2>
        <button
          onClick={() => {
            setComposing((v) => !v)
            setNameError(false)
          }}
          aria-label="新建智能体"
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors duration-200 cursor-pointer ${
            composing
              ? 'bg-brand text-white'
              : 'bg-mint text-deep-green hover:bg-mint-deep'
          }`}
        >
          <PlusIcon width={15} height={15} />
          新建
        </button>
      </div>

      {/* 新建智能体 composer (内联面板) */}
      <AnimatePresence initial={false}>
        {composing && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE_FLUID }}
            className="overflow-hidden px-4"
          >
            <div className="mb-3 rounded-lg border border-white/70 bg-white/80 p-3.5 shadow-card backdrop-blur-md">
              <p className="mb-2 flex items-center gap-1.5 cjk text-[12px] font-semibold text-deep-green">
                <SparkleIcon width={13} height={13} className="text-sunshine" />
                一句话，捏一个专属智能体
              </p>
              <input
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value)
                  if (e.target.value.trim()) setNameError(false)
                }}
                onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
                placeholder="给它起个名字，如：旅行达人"
                aria-label="智能体名称"
                className={`w-full rounded-md border bg-off-white px-3 py-2 text-[14px] outline-none transition-colors focus:ring-2 focus:ring-brand/40 ${
                  nameError ? 'border-warn' : 'border-light-gray'
                }`}
              />
              <textarea
                value={newPersona}
                onChange={(e) => setNewPersona(e.target.value)}
                placeholder="一句话描述人设，如：你是我的旅行英语助手，用轻松口语跟我聊旅行。"
                aria-label="智能体人设"
                rows={3}
                className="mt-2 w-full resize-none rounded-md border border-light-gray bg-off-white px-3 py-2 text-[13px] leading-relaxed outline-none transition-colors focus:ring-2 focus:ring-brand/40"
              />
              {nameError && (
                <p className="mt-1.5 cjk text-[12px] text-warn">
                  先给它起个名字吧 🌱
                </p>
              )}
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setComposing(false)
                    setNameError(false)
                  }}
                  className="rounded-full px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={submitCreate}
                  className="inline-flex items-center gap-1 rounded-full bg-brand px-4 py-1.5 text-[13px] font-semibold text-white shadow-[0_3px_0_#43C000] transition-colors hover:bg-soft-green cursor-pointer"
                >
                  创建
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 智能体轨道球列表 */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex-1 space-y-1 overflow-y-auto px-3 pb-4"
      >
        {agents.map((a) => {
          const active = a.id === currentAgentId
          return (
            <motion.button
              key={a.id}
              variants={riseItem}
              onClick={() => selectAgent(a.id)}
              aria-current={active}
              className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 cursor-pointer hover:bg-white/40"
            >
              {/* 选项卡式滑动高亮 — 与顶栏薄荷药丸一致, 在选项间滑动 */}
              {active && (
                <motion.span
                  layoutId={inDrawer ? 'agentActivePillDrawer' : 'agentActivePill'}
                  aria-hidden
                  className="absolute inset-0 z-0 rounded-xl bg-mint/70"
                  transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                />
              )}
              {/* 发光轨道球 */}
              <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                {active && (
                  <>
                    <span
                      style={{ background: agentGlow(a.id) }}
                      className="absolute -inset-1.5 rounded-full opacity-70 blur-md"
                    />
                    <span className="absolute inset-0 rounded-full bg-soft-green/20 animate-pulse-ring" />
                  </>
                )}
                <span
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#AED98C] to-[#7FB85C] text-[12px] font-bold text-white transition-opacity ${
                    active ? '' : 'opacity-80 group-hover:opacity-100'
                  }`}
                >
                  {a.avatar}
                </span>
              </span>
              <span className="relative z-10 min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`truncate text-[14px] font-semibold ${
                      active ? 'text-deep-green' : 'text-text-primary'
                    }`}
                  >
                    {a.name}
                  </span>
                  {a.builtin && (
                    <span className="shrink-0 rounded-full bg-light-yellow px-1.5 py-px text-[10px] font-semibold text-[#9A7400]">
                      内置
                    </span>
                  )}
                </span>
                <span
                  className={`mt-0.5 block truncate cjk text-[12px] ${
                    active ? 'text-deep-green/75' : 'text-text-secondary'
                  }`}
                >
                  {a.persona}
                </span>
              </span>
            </motion.button>
          )
        })}
      </motion.div>

      <p className="flex items-center gap-1.5 border-t border-white/50 px-5 py-3 cjk text-[11px] text-text-hint">
        <ChatIcon width={13} height={13} />
        对话与悬浮助手、语音通话实时互通
      </p>
    </>
  )

  return (
    <div className="relative h-[calc(100dvh-88px)] md:h-[calc(100dvh-56px)] overflow-hidden">
      {/* aurora 光晕垫底 — 青绿弥散 + 柠黄点睛 */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-mint blur-3xl opacity-50"
          animate={{ x: [0, 20, 0], y: [0, 14, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-light-yellow/50 blur-3xl opacity-40"
          animate={{ x: [0, -18, 0], y: [0, 18, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-soft-green/10 blur-3xl" />
      </div>

      {/* 整体收进居中有界面板, 不顶满整屏 */}
      <div className="relative z-10 mx-auto flex h-full max-w-5xl px-4 py-6">
        <div className="flex h-full w-full overflow-hidden rounded-2xl border border-white/60 bg-white/30 shadow-float backdrop-blur-sm">
      {/* ───── 左侧「轨道」玻璃栏：我的智能体 (桌面常驻, 移动端折叠为抽屉) ───── */}
      <aside className="relative z-10 hidden w-[260px] shrink-0 flex-col border-r border-white/60 bg-white/55 backdrop-blur-xl backdrop-saturate-150 md:flex">
        {sidebarBody(false)}
      </aside>

      {/* ───── 右侧对话区 ───── */}
      <section className="relative z-10 flex min-w-0 flex-1 flex-col">
        {!agent ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <motion.img
              src={`${import.meta.env.BASE_URL}spatial/companion-spark.png`}
              alt="陪伴精灵 Spark"
              className="h-28 w-28 select-none object-contain drop-shadow-[0_12px_28px_rgba(255,200,0,0.28)]"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <p className="cjk text-[15px] text-text-secondary">
              选择或新建一个智能体，开始对话
            </p>
          </div>
        ) : (
          <>
            {/* 主角 Hero ⇄ 紧凑头部 (流体切换) */}
            <AnimatePresence mode="wait" initial={false}>
              {!started ? (
                <motion.div
                  key="hero"
                  initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 0.98, filter: 'blur(6px)' }}
                  transition={{ duration: 0.45, ease: EASE_FLUID }}
                  className="relative flex shrink-0 flex-col items-center px-6 pb-6 pt-12 text-center"
                >
                  {/* 主角圈背后 aurora */}
                  <div
                    aria-hidden
                    style={{ background: glow }}
                    className="pointer-events-none absolute left-1/2 top-10 h-56 w-56 -translate-x-1/2 rounded-full opacity-70 blur-3xl"
                  />
                  {/* 中央主角圈 + 同心深环 */}
                  <div className="relative flex h-28 w-28 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-soft-green/15 animate-pulse-ring" />
                    <span className="absolute -inset-4 rounded-full border border-light-green/40" />
                    <span className="absolute -inset-8 rounded-full border border-light-green/20" />
                    <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#AED98C] to-[#7FB85C] text-[26px] font-bold text-white shadow-float">
                      {agent.avatar}
                    </span>
                  </div>
                  <h1 className="mt-6 font-display text-headline text-text-primary">
                    {agent.name}
                  </h1>
                  <p className="mt-2 max-w-md cjk text-[14px] leading-relaxed text-text-secondary">
                    {agent.persona}
                  </p>
                  {/* 一行快捷操作 (玻璃药丸) */}
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => setDrawerOpen(true)}
                      aria-label="会话列表"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-[13px] font-semibold text-deep-green shadow-card backdrop-blur-md transition-colors hover:bg-white cursor-pointer md:hidden"
                    >
                      <ChatIcon width={16} height={16} />
                      会话列表
                    </button>
                    <button
                      onClick={openCall}
                      aria-label="语音电话"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-[13px] font-semibold text-deep-green shadow-card backdrop-blur-md transition-colors hover:bg-white cursor-pointer"
                    >
                      <PhoneIcon width={16} height={16} />
                      语音电话
                    </button>
                    <button
                      onClick={() => newConversation(agent.id)}
                      aria-label="新对话"
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-4 py-2 text-[13px] font-semibold text-deep-green shadow-card backdrop-blur-md transition-colors hover:bg-white cursor-pointer"
                    >
                      <RefreshIcon width={16} height={16} />
                      新对话
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.header
                  key="compact"
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.32, ease: EASE_FLUID }}
                  className="flex items-center gap-3 border-b border-white/60 bg-white/65 px-4 py-3 backdrop-blur-xl backdrop-saturate-150 md:px-6"
                >
                  <button
                    onClick={() => setDrawerOpen(true)}
                    aria-label="会话列表"
                    title="会话列表"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-hint transition-colors hover:bg-off-white hover:text-deep-green cursor-pointer md:hidden"
                  >
                    <ChatIcon width={18} height={18} />
                  </button>
                  <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                    <span
                      style={{ background: glow }}
                      className="absolute -inset-1 rounded-full opacity-60 blur-md"
                    />
                    <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#AED98C] to-[#7FB85C] text-[13px] font-bold text-white">
                      {agent.avatar}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <h1 className="truncate text-[16px] font-semibold text-text-primary">
                      {agent.name}
                    </h1>
                    <p className="truncate cjk text-[12px] text-text-secondary">
                      {agent.persona}
                    </p>
                  </div>
                  <button
                    onClick={openCall}
                    aria-label="语音电话"
                    className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-2 text-[13px] font-semibold text-deep-green transition-colors hover:bg-mint-deep cursor-pointer"
                  >
                    <PhoneIcon width={16} height={16} />
                    语音电话
                  </button>
                  <button
                    onClick={() => newConversation(agent.id)}
                    aria-label="新对话"
                    title="新对话"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-hint transition-colors hover:bg-off-white hover:text-deep-green cursor-pointer"
                  >
                    <RefreshIcon width={17} height={17} />
                  </button>
                </motion.header>
              )}
            </AnimatePresence>

            {/* 消息流 */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-6 py-6"
            >
              <AnimatePresence initial={false}>
                {msgs.map((m) => (
                  <motion.div
                    key={m.id}
                    layout={!reduce}
                    initial={
                      reduce
                        ? false
                        : { opacity: 0, y: 18, scale: 0.96, filter: 'blur(6px)' }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 0.5, ease: EASE_FLUID }}
                    className={`flex items-end gap-2.5 ${
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {m.role === 'assistant' && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#AED98C] to-[#7FB85C] text-[10px] font-bold text-white">
                        {agent.avatar}
                      </span>
                    )}
                    <div
                      className={`max-w-[68%] rounded-lg px-4 py-2.5 text-[14.5px] leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-[#9FD17A] text-text-primary shadow-card'
                          : 'border border-white/70 bg-white/70 text-text-primary shadow-card backdrop-blur-md'
                      }`}
                    >
                      {m.role === 'assistant' ? (
                        <ClickableText text={m.text} />
                      ) : (
                        m.text
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 等待回复：三点脉冲气泡 */}
              {awaiting && (
                <div className="flex items-end gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#AED98C] to-[#7FB85C] text-[10px] font-bold text-white">
                    {agent.avatar}
                  </span>
                  <div className="flex items-center gap-1 rounded-lg border border-white/70 bg-white/70 px-4 py-3 shadow-card backdrop-blur-md">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full bg-light-green animate-dot-bounce"
                        style={{ animationDelay: `${i * 0.18}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 输入栏 */}
            <div className="flex items-center gap-3 border-t border-white/60 bg-white/65 px-6 py-3.5 backdrop-blur-xl backdrop-saturate-150">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="发消息…"
                aria-label={`给 ${agent.name} 发消息`}
                className="flex-1 rounded-full bg-off-white px-5 py-2.5 text-[14.5px] outline-none transition-shadow focus:ring-2 focus:ring-brand/40"
              />
              <button
                onClick={submit}
                disabled={!input.trim()}
                aria-label="发送"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_3px_0_#43C000] transition-colors hover:bg-soft-green disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none cursor-pointer"
              >
                <SendIcon width={18} height={18} />
              </button>
            </div>
          </>
        )}
      </section>
        </div>
      </div>

      {/* ───── 移动端: 会话列表抽屉 (从左滑出 + 遮罩) ───── */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-text-primary/30 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.32, ease: EASE_FLUID }}
              className="absolute inset-y-0 left-0 flex w-[82vw] max-w-[320px] flex-col border-r border-white/60 bg-warm-white/95 shadow-float backdrop-blur-xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {sidebarBody(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
