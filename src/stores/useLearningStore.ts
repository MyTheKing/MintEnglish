import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LearningState {
  // onboarding
  onboarded: boolean
  level: string // beginner..expert
  goal: string
  // 进度
  learnedWords: string[]          // 已学单词
  completedChapters: string[]     // "stageId-chapterId"
  reviewWords: string[]           // 加入复习的单词 (WordPopup「加入复习」)
  streak: number                  // 连续打卡天数
  lastStudyDate: string | null
  // 今日日志 (记忆系统 / 邮件复习用)
  todayWords: string[]
  // 按天分组的学习日志: { 'YYYY-MM-DD': string[] }
  history: Record<string, string[]>
  // actions
  completeOnboarding: (level: string, goal: string) => void
  learnWord: (word: string) => void
  completeChapter: (key: string) => void
  addReview: (word: string) => void
  removeReview: (word: string) => void
  resetProgress: () => void
}

const todayStr = () => new Date().toISOString().slice(0, 10)

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      level: 'beginner',
      goal: '日常交流',
      learnedWords: [],
      completedChapters: [],
      reviewWords: [],
      streak: 1,
      lastStudyDate: null,
      todayWords: [],
      history: {},

      completeOnboarding: (level, goal) => set({ onboarded: true, level, goal }),

      learnWord: (word) => {
        const s = get()
        const today = todayStr()
        const isNewDay = s.lastStudyDate !== today
        const dayList = s.history[today] ?? []
        set({
          learnedWords: s.learnedWords.includes(word) ? s.learnedWords : [...s.learnedWords, word],
          todayWords: isNewDay
            ? [word]
            : s.todayWords.includes(word)
              ? s.todayWords
              : [...s.todayWords, word],
          history: {
            ...s.history,
            [today]: dayList.includes(word) ? dayList : [...dayList, word],
          },
          streak: isNewDay && s.lastStudyDate ? s.streak + 1 : s.streak,
          lastStudyDate: today,
        })
      },

      completeChapter: (key) =>
        set((s) => ({
          completedChapters: s.completedChapters.includes(key)
            ? s.completedChapters
            : [...s.completedChapters, key],
        })),

      addReview: (word) =>
        set((s) => ({
          reviewWords: s.reviewWords.includes(word) ? s.reviewWords : [...s.reviewWords, word],
        })),

      removeReview: (word) =>
        set((s) => ({
          reviewWords: s.reviewWords.filter((w) => w !== word),
        })),

      resetProgress: () =>
        set({
          learnedWords: [],
          completedChapters: [],
          reviewWords: [],
          todayWords: [],
          history: {},
          streak: 1,
          lastStudyDate: null,
        }),
    }),
    { name: 'mintenglish-learning' },
  ),
)
