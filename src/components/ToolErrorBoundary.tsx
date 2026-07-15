import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ToolErrorBoundary extends Component<{
  children: ReactNode
  reloadPage: () => void
  label: string
}, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Visible recovery is rendered below. */ }

  render() {
    if (this.state.failed) return <div className="mission-tools-error" role="alert"><strong>{this.props.label}加载失败</strong><p>请确认网络恢复后重新加载页面，当前已保存的进度不会丢失。</p><button className="button button-primary" type="button" onClick={this.props.reloadPage}>重新加载页面</button></div>
    return this.props.children
  }
}
