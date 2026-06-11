import { create } from 'zustand'

interface PopupState {
  open: boolean
  word: string | null
  anchor: { x: number; y: number } | null // 点击位置 (视口坐标)
  show: (word: string, anchor: { x: number; y: number }) => void
  close: () => void
}

// 全局点词弹窗状态 — 任意单词点击 → 释义卡片 (EXPERIENCE 全局核心交互)
export const useWordPopupStore = create<PopupState>((set) => ({
  open: false,
  word: null,
  anchor: null,
  show: (word, anchor) => set({ open: true, word, anchor }),
  close: () => set({ open: false, word: null, anchor: null }),
}))
