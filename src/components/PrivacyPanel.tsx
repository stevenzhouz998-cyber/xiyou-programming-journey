import { useEffect, useRef, useState } from 'react';

type AcknowledgeResult = { status: 'saved' } | { status: 'unsaved'; error: string };

export function PrivacyPanel({
  acknowledged,
  onAcknowledge,
}: {
  acknowledged: boolean;
  onAcknowledge: () => AcknowledgeResult;
}) {
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const primaryActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (acknowledged) return undefined;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    primaryActionRef.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, [acknowledged]);

  if (acknowledged) return null;

  const acknowledge = () => {
    const result = onAcknowledge();
    if (result.status === 'unsaved') setError('确认尚未保存，请保持页面打开并稍后重试。');
  };

  const keepFocusInside = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])]
      .filter((element) => !element.hasAttribute('disabled'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (focusable.length === 1 || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  };

  return <section ref={dialogRef} className="privacy-panel" role="dialog" aria-modal="true" aria-labelledby="local-data-heading" aria-describedby={error ? 'privacy-save-error' : undefined} onKeyDown={keepFocusInside}>
    <div className="privacy-card">
      <h2 id="local-data-heading">你的学习数据保存在这台设备</h2>
      <p>我们不会发送广告、分析或儿童行为数据，也不会要求姓名、学校或联系方式。</p>
      <ul>
        <li><strong>保存内容：</strong>关卡进度、星数、提示使用情况与声音、动画设置。</li>
        <li><strong>导出：</strong>家长可以下载本地备份，换设备前请先导出。</li>
        <li><strong>清空：</strong>只有通过家长验证并再次确认后才能清空。</li>
        <li><strong>恢复：</strong>存档损坏时会优先尝试使用本机快照恢复。</li>
      </ul>
      {error && <p className="form-error" id="privacy-save-error" role="status" aria-live="polite">{error}</p>}
      <button ref={primaryActionRef} className="button button-primary" type="button" onClick={acknowledge}>我知道了</button>
    </div>
  </section>;
}
