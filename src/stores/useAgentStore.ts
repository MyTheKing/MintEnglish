import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Agent, ChatMessage } from '../lib/types'
import { useCallStore } from './useCallStore'

// 一套智能体, 三入口(悬浮窗/语音/独立页)共享同一份对话记录 (EXPERIENCE 5.1)
const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'english-helper',
    name: '英语助手',
    persona: '你的随身英语伙伴，用简单友好的方式答疑解惑。',
    avatar: 'EN',
    builtin: true,
  },
  {
    id: 'business-helper',
    name: '商务助手',
    persona: '专注职场与商务英语，语气专业得体，善用商务场景例句。',
    avatar: 'BIZ',
    builtin: false,
  },
  {
    id: 'interview-helper',
    name: '面试助手',
    persona: '模拟英文面试官，引导你练习口语表达，温和纠正用词。',
    avatar: 'IT',
    builtin: false,
  },
]

const GREETING: Record<string, string> = {
  'english-helper': '你好呀 👋 我是你的英语助手。学习中遇到任何单词、语法或句子，随时问我！',
  'business-helper': 'Hello！我是商务助手，可以帮你打磨邮件、会议表达和谈判用语。今天想练点什么？',
  'interview-helper': "Hi, I'm your interview coach. 准备好就告诉我，我们可以从自我介绍开始练习。",
}

let idSeq = 1
const newId = () => `m${Date.now()}_${idSeq++}`

interface AgentState {
  agents: Agent[]
  currentAgentId: string
  conversations: Record<string, ChatMessage[]> // agentId → 消息流 (三入口互通)
  // actions
  setCurrentAgent: (id: string) => void
  sendMessage: (agentId: string, text: string) => void
  createAgent: (name: string, persona: string) => string
  newConversation: (agentId: string) => void
  ensureGreeting: (agentId: string) => void
}

// 占位 AI 回复 (纯前端 mock)
function mockReply(agent: Agent, userText: string): string {
  const t = userText.toLowerCase()
  if (/hello|hi|你好/.test(t)) return `Hi! 很高兴和你聊天。作为「${agent.name}」，我会${agent.persona}`
  if (/\b\w+\b/.test(userText) && userText.trim().split(/\s+/).length <= 2) {
    return `关于 "${userText.trim()}" — 这是个好问题。点击任意英文单词都能查看释义，要我用一个例句帮你记住它吗？`
  }
  return `我明白了。「${agent.name}」建议你试着用刚学的单词造一个句子，我来帮你检查 ✦`
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      agents: DEFAULT_AGENTS,
      currentAgentId: 'english-helper',
      conversations: {},

      setCurrentAgent: (id) => {
        // 切换到不同助手时, 若正在语音通话则自动挂断 (避免把对话错接到新助手)
        if (id !== get().currentAgentId && useCallStore.getState().open) {
          useCallStore.getState().closeCall()
        }
        set({ currentAgentId: id })
        get().ensureGreeting(id)
      },

      ensureGreeting: (agentId) => {
        const conv = get().conversations[agentId]
        if (conv && conv.length) return
        const greet = GREETING[agentId] ?? `你好，我是「${get().agents.find((a) => a.id === agentId)?.name ?? '助手'}」，开始聊聊吧 ✦`
        set((s) => ({
          conversations: { ...s.conversations, [agentId]: [{ id: newId(), role: 'assistant', text: greet, ts: Date.now() }] },
        }))
      },

      sendMessage: (agentId, text) => {
        const agent = get().agents.find((a) => a.id === agentId)
        if (!agent || !text.trim()) return
        const userMsg: ChatMessage = { id: newId(), role: 'user', text: text.trim(), ts: Date.now() }
        set((s) => ({
          conversations: { ...s.conversations, [agentId]: [...(s.conversations[agentId] ?? []), userMsg] },
        }))
        // 模拟思考延迟
        setTimeout(() => {
          const aiMsg: ChatMessage = { id: newId(), role: 'assistant', text: mockReply(agent, text), ts: Date.now() }
          set((s) => ({
            conversations: { ...s.conversations, [agentId]: [...(s.conversations[agentId] ?? []), aiMsg] },
          }))
        }, 600)
      },

      createAgent: (name, persona) => {
        const id = `agent_${Date.now()}`
        const avatar = name.slice(0, 2).toUpperCase()
        set((s) => ({ agents: [...s.agents, { id, name, persona, avatar, builtin: false }] }))
        return id
      },

      newConversation: (agentId) =>
        set((s) => ({ conversations: { ...s.conversations, [agentId]: [] } })),
    }),
    {
      name: 'mintenglish-agents',
      version: 1,
      // v1: 仅英语助手为内置, 其余 (含商务/面试) 改为非内置
      migrate: (persisted, version) => {
        const s = persisted as AgentState | undefined
        if (s && version < 1 && Array.isArray(s.agents)) {
          s.agents = s.agents.map((a) => ({ ...a, builtin: a.id === 'english-helper' }))
        }
        return s as AgentState
      },
    },
  ),
)
