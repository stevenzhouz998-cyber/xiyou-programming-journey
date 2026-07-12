import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecoveryNotice } from './RecoveryNotice';

describe('RecoveryNotice', () => {
  it('stays quiet for a normal saved load', () => {
    const { container } = render(<RecoveryNotice loadStatus="normal" persistence="saved" loadError={null} saveError={null} hasCorruptDownload={false} onRetry={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a gentle status after restoring a snapshot', () => {
    render(<RecoveryNotice loadStatus="recovered-from-snapshot" persistence="saved" loadError={null} saveError={null} hasCorruptDownload onRetry={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('学习进度已经安全恢复');
    expect(screen.getByRole('link', { name: '请家长查看详情' })).toHaveAttribute('href', '#/parent?recovery=1');
  });

  it('honestly reports a reset after corruption', () => {
    render(<RecoveryNotice loadStatus="reset-after-corruption" persistence="saved" loadError={null} saveError={null} hasCorruptDownload onRetry={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('无法恢复原进度，已建立新的本地进度');
  });

  it('prioritizes an unsaved warning and offers a real retry', () => {
    const onRetry = vi.fn();
    const view = render(<RecoveryNotice loadStatus="recovered-from-snapshot" persistence="unsaved" loadError={null} saveError="写回恢复存档失败" hasCorruptDownload onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('已从安全快照恢复到当前会话，但本次进度尚未保存');
    expect(screen.getByRole('alert')).toHaveTextContent('写回恢复存档失败');
    expect(screen.getByRole('link', { name: '请家长查看详情' })).toHaveAttribute('href', '#/parent?recovery=1');
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: /关闭/ })).not.toBeInTheDocument();
    view.rerender(<RecoveryNotice loadStatus="recovered-from-snapshot" persistence="unsaved" loadError={null} saveError="重试后仍无法写入" hasCorruptDownload onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('重试后仍无法写入');
    view.rerender(<RecoveryNotice loadStatus="recovered-from-snapshot" persistence="saved" loadError={null} saveError={null} hasCorruptDownload onRetry={onRetry} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('学习进度已经安全恢复');
  });

  it('keeps the parent details link whenever corrupt data is available', () => {
    render(<RecoveryNotice loadStatus="normal" persistence="saved" loadError={null} saveError={null} hasCorruptDownload onRetry={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('有一份存档信息需要家长查看');
    expect(screen.getByRole('link', { name: '请家长查看详情' })).toHaveAttribute('href', '#/parent?recovery=1');
  });

  it('returns focus to the main heading after keyboard dismissal', () => {
    render(<><main><h1 tabIndex={-1}>Current page</h1></main><RecoveryNotice loadStatus="recovered-from-snapshot" persistence="saved" loadError={null} saveError={null} hasCorruptDownload onRetry={vi.fn()} /></>);
    const close = screen.getByRole('button', { name: '关闭进度提示' });
    close.focus();
    fireEvent.keyDown(close, { key: 'Enter' });
    fireEvent.click(close);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Current page' })).toHaveFocus();
  });

  it('explains unavailable storage and links to preserved corruption details', () => {
    render(<RecoveryNotice loadStatus="storage-unavailable" persistence="unsaved" loadError="浏览器禁止本地存储" saveError={null} hasCorruptDownload onRetry={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('浏览器禁止本地存储');
    expect(screen.getByRole('alert')).not.toHaveTextContent('安全保存');
    expect(screen.getByRole('link', { name: '请家长查看详情' })).toHaveAttribute('href', '#/parent?recovery=1');
  });
});
