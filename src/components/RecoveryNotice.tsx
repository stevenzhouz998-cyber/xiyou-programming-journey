import { useEffect, useState } from 'react';
import type { LoadStatus } from '../progress/storage';

interface RecoveryNoticeProps {
  loadStatus: LoadStatus;
  persistence: 'idle' | 'saved' | 'unsaved';
  loadError: string | null;
  corruptError?: string | null;
  saveError: string | null;
  hasCorruptDownload: boolean;
  onRetry: () => unknown;
  conflict?: boolean;
  onDownloadConflictBackup?: () => void;
  onReloadExternal?: () => void;
}

export function RecoveryNotice({ loadStatus, persistence, loadError, corruptError = null, saveError, hasCorruptDownload, onRetry, conflict = false, onDownloadConflictBackup, onReloadExternal }: RecoveryNoticeProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => setDismissed(false), [persistence, loadStatus]);

  const hasDetails = hasCorruptDownload
    || corruptError !== null
    || loadStatus === 'recovered-from-snapshot'
    || loadStatus === 'reset-after-corruption';

  if (persistence === 'unsaved') {
    if (conflict) return <aside className="recovery-notice recovery-notice-alert" role="alert">
      <div><strong>其他标签页已更新，已暂停保存</strong><p>{saveError ?? '本页草稿仍保留在内存中，不会自动覆盖其他标签页。'}</p></div>
      <button type="button" onClick={onDownloadConflictBackup}>下载本页备份</button>
      <button type="button" onClick={onReloadExternal}>载入其他标签页版本</button>
    </aside>;
    const message = loadStatus === 'recovered-from-snapshot'
      ? '已从安全快照恢复到当前会话，但本次进度尚未保存'
      : loadStatus === 'reset-after-corruption'
        ? '无法恢复原进度，已在当前会话建立新进度，但本次进度尚未保存'
        : '本次进度尚未保存';
    const error = saveError ?? loadError ?? '浏览器暂时无法保存本地学习进度。';
    return <aside className="recovery-notice recovery-notice-alert" role="alert">
      <div><strong>{message}</strong><p>{error} 学习结果仍保留在当前页面，请重试保存。</p></div>
      {hasDetails && <a href="#/parent?recovery=1">请家长查看详情</a>}
      <button type="button" onClick={onRetry}>重试保存</button>
    </aside>;
  }
  if (dismissed || (loadStatus === 'normal' && !hasDetails) || loadStatus === 'storage-unavailable') return null;

  const message = loadStatus === 'recovered-from-snapshot'
    ? '学习进度已经安全恢复'
    : loadStatus === 'reset-after-corruption'
      ? '无法恢复原进度，已建立新的本地进度'
      : loadStatus === 'migrated'
        ? '学习进度已升级'
        : '有一份存档信息需要家长查看';

  const dismiss = () => {
    setDismissed(true);
    const target = document.querySelector<HTMLElement>('main h1, main[tabindex="-1"]');
    if (target && !target.closest('[inert]')) {
      target.tabIndex = -1;
      target.focus();
    }
  };

  return <aside className="recovery-notice" role="status">
    <strong>{message}</strong>
    {corruptError && <p>{corruptError}</p>}
    {hasDetails && <a href="#/parent?recovery=1">请家长查看详情</a>}
    <button type="button" aria-label="关闭进度提示" onClick={dismiss}>关闭</button>
  </aside>;
}
