import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DownloadSimple, UploadSimple } from '@phosphor-icons/react';
import type { ProgressV2 } from '../progress/progress';
import type { ClearResult, ImportResult, LoadStatus, ProgressBackup } from '../progress/storage';
import { focusAfterInert } from '../utils/focus';

type Download = (filename: string, contents: string, mime: string) => void;

export interface ParentDataToolsProps {
  progress: ProgressV2;
  loadStatus: LoadStatus;
  loadPersistence: 'idle' | 'saved' | 'unsaved';
  saveStatus: 'idle' | 'saved' | 'unsaved';
  corruptDownload: string | null;
  onImport: (raw: string) => ImportResult;
  onClear: () => ClearResult;
  onCreateBackup: () => ProgressBackup;
  onDownload: Download;
  onDialogOpenChange?: (open: boolean) => void;
}

function readFile(file: File): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'));
    reader.onabort = () => reject(new Error('文件读取已取消'));
    reader.readAsText(file);
  });
}

export function ParentDataTools(props: ParentDataToolsProps) {
  const [message, setMessage] = useState('');
  const [importAlert, setImportAlert] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(true);
  const cancelFocusRef = useRef<(() => void) | null>(null);
  const importSequenceRef = useRef(0);

  useEffect(() => {
    if (!confirmOpen) return;
    inputRef.current?.focus();
  }, [confirmOpen]);

  useEffect(() => () => { mountedRef.current = false; cancelFocusRef.current?.(); }, []);

  const openConfirm = () => {
    cancelFocusRef.current?.();
    setPhrase('');
    props.onDialogOpenChange?.(true);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    props.onDialogOpenChange?.(false);
    cancelFocusRef.current?.();
    cancelFocusRef.current = focusAfterInert(openerRef.current, () => mountedRef.current);
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    const sequence = ++importSequenceRef.current;
    setMessage(''); setImportAlert('');
    try {
      const raw = await readFile(file);
      if (!mountedRef.current || sequence !== importSequenceRef.current) return;
      const result = props.onImport(raw);
      if (result.status === 'saved') {
        setMessage(`导入成功：${result.sourceVersion === 1 ? '已将 V1 迁移为 V2' : '来源版本 V2'}。`);
      } else if (result.status === 'rollback-failed') {
        setImportAlert(`导入失败：${result.error}。当前页面进度未改变，但设备存储可能部分变化，请导出当前进度并刷新检查。`);
      } else {
        const detail = result.status === 'rejected' ? result.error : `存储失败：${result.error}`;
        setImportAlert(`导入失败：${detail}。当前进度未被修改。`);
      }
    } catch (error) {
      if (!mountedRef.current || sequence !== importSequenceRef.current) return;
      setImportAlert(`文件读取失败：${error instanceof Error ? error.message : String(error)}。当前进度未被修改。`);
    }
  };

  const exportBackup = () => {
    try {
      const backup = props.onCreateBackup();
      props.onDownload(backup.filename, backup.contents, backup.mimeType);
      setMessage('已生成当前进度的备份下载。');
    } catch (error) { setMessage(`备份下载未生成：${error instanceof Error ? error.message : String(error)}`); }
  };

  const clear = () => {
    if (phrase !== '清空') return;
    try {
      const backup = props.onCreateBackup();
      props.onDownload(backup.filename, backup.contents, backup.mimeType);
    } catch (error) {
      setMessage(`备份下载未生成，学习数据未清空：${error instanceof Error ? error.message : String(error)}`);
      return;
    }
    const result = props.onClear();
    if (result.status === 'unchanged') setMessage(`清空失败，当前进度未清空：${result.error}`);
    else if (result.status === 'unknown') setMessage(`设备中的清空结果无法确认；当前页面仍保留原进度，请保留刚生成的备份并在刷新前停止操作。${result.error}`);
    else setMessage('已生成备份下载并清空本地进度。');
    closeConfirm();
  };

  const onDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); closeConfirm(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])') ?? [])]
      .filter((node) => !node.hasAttribute('disabled'));
    const first = focusable[0]; const last = focusable.at(-1);
    if (!first || !last) return;
    if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    }
  };

  return <section className="data-tools" aria-labelledby="data-tools-heading">
    <div inert={confirmOpen ? true : undefined} aria-hidden={confirmOpen ? true : undefined}>
      <h2 id="data-tools-heading">进度备份与管理</h2>
      <p>数据仅保存在当前浏览器。</p>
      <dl className="data-status"><div><dt>载入状态</dt><dd>{props.loadStatus}</dd></div><div><dt>存储状态</dt><dd>{props.loadPersistence === 'idle' ? '尚未保存过' : props.loadPersistence === 'saved' ? '已保存' : '未保存'} / {props.saveStatus}</dd></div><div><dt>最后保存</dt><dd>{props.loadPersistence === 'idle' ? '尚无保存时间' : props.progress.savedAt}</dd></div></dl>
      <button type="button" className="button button-ghost" onClick={exportBackup}><DownloadSimple size={20} />导出进度</button>
      <button type="button" className="button button-ghost" onClick={() => importInputRef.current?.click()}><UploadSimple size={20} />导入进度</button>
      <input ref={importInputRef} aria-label="选择进度文件" type="file" accept="application/json,.json" onChange={(event) => { const input = event.currentTarget; void importFile(input.files?.[0]).finally(() => { input.value = ''; }); }} />
      {props.corruptDownload !== null && <button type="button" className="button button-ghost" onClick={() => props.onDownload('xiyou-corrupt-progress.json', props.corruptDownload!, 'application/json')}>下载损坏原文</button>}
      <button ref={openerRef} type="button" className="button button-danger" onClick={openConfirm}>清空学习数据</button>
      {message && <p role="status" aria-live="polite">{message}</p>}
      {importAlert && <p role="alert">{importAlert}</p>}
    </div>
    {confirmOpen && createPortal(<div ref={dialogRef} className="clear-progress-overlay" role="dialog" aria-modal="true" aria-labelledby="clear-progress-heading" onKeyDown={onDialogKeyDown}>
      <div className="clear-progress-card"><h3 id="clear-progress-heading">确认清空学习数据</h3><p>清空后会回到初始进度。请输入“清空”。</p>
        <label>输入“清空”以确认<input ref={inputRef} value={phrase} onChange={(event) => setPhrase(event.target.value)} /></label>
        <div><button type="button" onClick={closeConfirm}>取消</button><button type="button" disabled={phrase !== '清空'} onClick={clear}>备份并清空</button></div>
      </div>
    </div>, document.body)}
  </section>;
}
