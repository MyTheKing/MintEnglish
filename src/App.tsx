import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TopNav } from './components/layout/TopNav'
import { BottomTabBar } from './components/layout/BottomTabBar'
import { SpatialBackground } from './components/layout/SpatialBackground'
import { WordPopup } from './components/global/WordPopup'
import { GlobalAIWidget } from './components/global/GlobalAIWidget'
import { GlobalVoiceCall } from './components/global/GlobalVoiceCall'
import { WordSearchModal } from './components/global/WordSearchModal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { pageVariants } from './lib/motion'

import HomePage from './pages/HomePage'
import OnboardingPage from './pages/OnboardingPage'
import LearnPage from './pages/LearnPage'
import GraphPage from './pages/GraphPage'
import ReadingPage from './pages/ReadingPage'
import MemoryPage from './pages/MemoryPage'
import AssistantPage from './pages/AssistantPage'

export default function App() {
  const location = useLocation()
  // onboarding 沉浸式 (无导航栏)
  const bare = location.pathname.startsWith('/onboarding')
  // 按顶层路径段做流体转场 (在 /learn 内部子路由间切换时不重放整页, 交给 Learn 自己的动画)
  const seg = '/' + (location.pathname.split('/')[1] ?? '')

  // 词汇图谱 / AI 助手是固定满屏布局(内部各区自带滚动), 锁掉文档级滚动,
  // 避免 calc(100vh-56px) 亚像素取整 + 进场位移带来的一点点上下蹭动.
  const fullscreen = seg === '/graph' || seg === '/assistant'
  useEffect(() => {
    if (!fullscreen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [fullscreen])

  return (
    <div className="relative min-h-[100dvh] overflow-x-clip">
      <SpatialBackground />
      {!bare && <TopNav />}
      <main>
        {/* 进场动画按 seg 重放, 不做退场等待: 导航即时换页, 避免快速来回切换时
            新页卡在 initial(透明+模糊) 而白屏 (framer mode="wait" 被打断的经典问题). */}
        {/* 按 pathname 作 key → 某页渲染抛错时只兜底该页, 切换路由即重挂自动恢复. */}
        <ErrorBoundary key={location.pathname}>
          <motion.div
            key={seg}
            variants={pageVariants}
            initial="initial"
            animate="enter"
          >
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/learn/*" element={<LearnPage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/reading" element={<ReadingPage />} />
              <Route path="/memory" element={<MemoryPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
            </Routes>
          </motion.div>
        </ErrorBoundary>
      </main>

      {/* 全局机制: 点词弹窗 + 悬浮 AI 球 (后者在 /assistant 自动隐藏) + 全局语音通话窗 (全页面可用) */}
      <WordPopup />
      <GlobalAIWidget />
      <GlobalVoiceCall />
      <WordSearchModal />
      {!bare && <BottomTabBar />}
    </div>
  )
}
