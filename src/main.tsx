import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// HashRouter：兼容未来 Electron file:// 加载（EXPERIENCE.Foundation）
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
