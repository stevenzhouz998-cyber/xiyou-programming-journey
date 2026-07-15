import { Component, type ErrorInfo, type ReactNode } from 'react';

export function reloadSectionPage() {
  const url = new URL(window.location.href);
  url.searchParams.set('section-retry', String(Date.now()));
  window.location.replace(url.toString());
}

export class LazySectionBoundary extends Component<{
  children: ReactNode;
  label: string;
  reloadPage?: () => void;
}, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The local fallback below keeps the rest of the application usable.
  }

  render() {
    if (this.state.failed) {
      return <section className="lazy-section-error" role="alert">
        <strong>{this.props.label}加载失败</strong>
        <p>请确认网络恢复后重新加载页面。当前已经保存的学习进度不会丢失。</p>
        <button className="button button-primary" type="button" onClick={this.props.reloadPage ?? reloadSectionPage}>重新加载页面</button>
      </section>;
    }
    return this.props.children;
  }
}
