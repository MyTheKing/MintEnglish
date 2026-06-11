// 渲染兜底: 捕获子树渲染期抛错, 用守绿系友好页代替整站白屏。
// App 内按路由 key 挂载 → 切换路由即重挂、自动恢复; 顶层(main.tsx)再包一层做最终网。
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  onReset?: () => void
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private reset = () => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        <img
          src={`${import.meta.env.BASE_URL}spatial/companion-spark.png`}
          alt=""
          aria-hidden
          className="h-20 w-20 select-none object-contain opacity-90 drop-shadow-[0_8px_20px_rgba(255,200,0,0.25)]"
        />
        <h2 className="font-display text-headline text-text-primary">页面出了点小状况</h2>
        <p className="max-w-sm cjk text-[14px] leading-relaxed text-text-secondary">
          别担心，刚才的操作没有影响你的学习数据。重试一下就好 🌱
        </p>
        {import.meta.env.DEV && (
          <pre className="max-w-md overflow-auto rounded-md bg-off-white px-3 py-2 text-left text-[12px] text-coral">
            {this.state.error.message}
          </pre>
        )}
        <div className="mt-1 flex items-center gap-3">
          <button
            onClick={this.reset}
            className="rounded-full bg-brand px-5 py-2 text-[14px] font-semibold text-white shadow-[0_3px_0_#43C000] transition-colors hover:bg-soft-green cursor-pointer"
          >
            重试
          </button>
          <button
            onClick={() => {
              window.location.hash = '#/'
              this.reset()
            }}
            className="rounded-full bg-mint px-5 py-2 text-[14px] font-semibold text-deep-green transition-colors hover:bg-mint-deep cursor-pointer"
          >
            回到首页
          </button>
        </div>
      </div>
    )
  }
}
