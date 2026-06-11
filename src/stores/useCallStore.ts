import { create } from 'zustand'

interface CallState {
  open: boolean
  openCall: () => void
  closeCall: () => void
}

// 全局语音通话窗状态 — 悬浮球 / AI 助手页共用同一个独立可拖拽通话窗
export const useCallStore = create<CallState>((set) => ({
  open: false,
  openCall: () => set({ open: true }),
  closeCall: () => set({ open: false }),
}))
