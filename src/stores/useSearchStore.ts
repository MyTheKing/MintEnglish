import { create } from 'zustand'

interface SearchState {
  open: boolean
  openSearch: () => void
  closeSearch: () => void
}

// 全局单词搜索窗状态 — 桌面顶栏 / 移动端底部 Dock 共用同一个搜索弹窗
export const useSearchStore = create<SearchState>((set) => ({
  open: false,
  openSearch: () => set({ open: true }),
  closeSearch: () => set({ open: false }),
}))
