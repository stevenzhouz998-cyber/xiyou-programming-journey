import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import './ParentAccessGate.css';
import {
  createParentAccessRecord,
  generateRecoveryCode,
  isLegacyParentPin,
  isParentAccessUnset,
  verifyParentPin,
  verifyRecoveryCode,
} from '../progress/parentAccess';

type AccessMode = 'login' | 'setup' | 'recover';
type PendingAccess = { record: string; recoveryCode: string };
type SaveRecordResult = boolean | 'unknown';

function validPin(value: string): boolean { return /^\d{4}$/.test(value); }

function RecoveryCodePanel({ code, commitError, onConfirmed }: {
  code: string;
  commitError: string;
  onConfirmed: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => { headingRef.current?.focus(); }, []);
  useEffect(() => { if (commitError) errorRef.current?.focus(); }, [commitError]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopyStatus('已复制'); }
    catch { setCopyStatus('复制失败，请手动抄写'); }
  };
  const download = () => {
    const blob = new Blob([`西游编程记家长恢复码\n\n${code}\n\n此恢复码仅显示一次，请离线保存。\n`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'xiyou-parent-recovery.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="parent-gate">
      <section className="gate-card" aria-labelledby="recovery-heading">
        <span className="eyebrow">仅显示一次 · 等待存储确认</span>
        <h1 id="recovery-heading" ref={headingRef} tabIndex={-1}>请保存一次性恢复码</h1>
        <p>忘记 PIN 时，需要它才能重设。网站不会保存恢复码原文，也无法替你找回。只有浏览器确认写入成功后，页面才会进入家长区。</p>
        <output className="recovery-code" aria-label="一次性恢复码">{code}</output>
        <div className="workspace-actions">
          <button type="button" className="button button-ghost" onClick={copy}>复制恢复码</button>
          <button type="button" className="button button-ghost" onClick={download}>下载恢复码</button>
        </div>
        {copyStatus && <p role="status">{copyStatus}</p>}
        {commitError && <p className="form-error" role="alert" ref={errorRef} tabIndex={-1}>{commitError}</p>}
        <label><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} /> 我已安全保存恢复码</label>
        <button type="button" className="button button-primary" disabled={!saved} onClick={onConfirmed}>确认已保存并进入</button>
      </section>
    </main>
  );
}

export function ParentAccessGate({ record, saveRecord, children }: {
  record: string;
  saveRecord: (record: string) => SaveRecordResult | Promise<SaveRecordResult>;
  children: ReactNode;
}) {
  const [allowed, setAllowed] = useState(false);
  const [mode, setMode] = useState<AccessMode>(() => isParentAccessUnset(record) ? 'setup' : 'login');
  const [loginPin, setLoginPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [pending, setPending] = useState<PendingAccess | null>(null);
  const [error, setError] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const authorizedRecordRef = useRef<string | null>(null);
  const locallySavedSourceRecordRef = useRef<string | null>(null);
  const observedRecordRef = useRef(record);

  useEffect(() => { if (!pending) headingRef.current?.focus(); }, [mode, allowed, pending]);

  const clearSecrets = () => {
    setLoginPin('');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setRecoveryCode('');
  };

  const authorize = (authorizedRecord: string) => {
    authorizedRecordRef.current = authorizedRecord;
    locallySavedSourceRecordRef.current = record;
    setAllowed(true);
  };

  const relock = (nextMode: AccessMode) => {
    authorizedRecordRef.current = null;
    locallySavedSourceRecordRef.current = null;
    clearSecrets();
    setError('');
    setPending(null);
    setAllowed(false);
    setMode(nextMode);
  };

  useEffect(() => {
    const previousRecord = observedRecordRef.current;
    observedRecordRef.current = record;
    const matchesAuthorizedRecord = record === authorizedRecordRef.current || record === locallySavedSourceRecordRef.current;
    if (isParentAccessUnset(record)) {
      if (!allowed || previousRecord !== record || !matchesAuthorizedRecord) relock('setup');
      return;
    }
    if (allowed && !matchesAuthorizedRecord) relock('login');
  }, [record, allowed]);

  const newPinError = (value: string) => {
    if (!validPin(value)) return '请设置 4 位数字 PIN。';
    if (isParentAccessUnset(value)) return '不能使用已公开的旧默认码，请设置新的 PIN。';
    return '';
  };

  const prepareNewAccess = async (pin: string) => {
    const rawRecovery = generateRecoveryCode();
    const nextRecord = await createParentAccessRecord(pin, rawRecovery);
    clearSecrets();
    setError('');
    setPending({ record: nextRecord, recoveryCode: rawRecovery });
  };

  const commitPending = async () => {
    if (!pending) return;
    const saved = await saveRecord(pending.record);
    if (saved !== true) {
      setError(saved === 'unknown'
        ? '浏览器无法确认新 PIN 的存储状态。请保留本页恢复码，刷新后重新验证家长凭据。'
        : '浏览器未能完成新 PIN 的存储确认。请保留本页恢复码，检查存储后再重试。');
      return;
    }
    clearSecrets();
    setError('');
    setPending(null);
    setMode('login');
    authorize(pending.record);
  };

  const setup = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = newPinError(newPin);
    if (validationError) { setError(validationError); return; }
    if (newPin !== confirmPin) { setError('两次输入的 PIN 不一致。'); return; }
    await prepareNewAccess(newPin);
  };

  const login = async (event: FormEvent) => {
    event.preventDefault();
    if (!await verifyParentPin(record, loginPin)) {
      setLoginPin('');
      setError('PIN 不正确，请再检查一次。');
      return;
    }
    if (isLegacyParentPin(record)) {
      await prepareNewAccess(loginPin);
      return;
    }
    clearSecrets();
    setError('');
    authorize(record);
  };

  const recover = async (event: FormEvent) => {
    event.preventDefault();
    if (!await verifyRecoveryCode(record, recoveryCode)) {
      setRecoveryCode('');
      setError('恢复码不正确，家长设置没有改变。');
      return;
    }
    const validationError = newPinError(newPin);
    if (validationError) { setError(validationError); return; }
    if (newPin !== confirmPin) { setError('两次输入的新 PIN 不一致。'); return; }
    await prepareNewAccess(newPin);
  };

  const changePin = async (event: FormEvent) => {
    event.preventDefault();
    if (!await verifyParentPin(record, currentPin)) {
      setCurrentPin('');
      setError('当前 PIN 不正确，设置没有改变。');
      return;
    }
    const validationError = newPinError(newPin);
    if (validationError) { setError(validationError.replace('请设置', '新 PIN 必须是')); return; }
    if (newPin !== confirmPin) { setError('两次输入的新 PIN 不一致。'); return; }
    await prepareNewAccess(newPin);
  };

  const switchMode = (nextMode: AccessMode) => {
    clearSecrets();
    setError('');
    setMode(nextMode);
  };

  if (pending) return <RecoveryCodePanel code={pending.recoveryCode} commitError={error} onConfirmed={commitPending} />;

  if (!allowed) {
    if (mode === 'setup') return (
      <main className="parent-gate"><form className="gate-card" onSubmit={setup}>
        <span className="eyebrow">首次家长设置</span>
        <h1 ref={headingRef} tabIndex={-1}>创建家长 PIN</h1>
        <p>请由家长设置 4 位数字 PIN。它只是这台设备上的本地界面门禁，不是账号级安全保护。</p>
        <label htmlFor="new-parent-pin">设置 4 位家长 PIN</label>
        <input id="new-parent-pin" aria-label="设置 4 位家长 PIN" type="password" autoComplete="new-password" inputMode="numeric" maxLength={4} value={newPin} onChange={(event) => setNewPin(event.target.value)} />
        <label htmlFor="confirm-parent-pin">确认家长 PIN</label>
        <input id="confirm-parent-pin" aria-label="确认家长 PIN" type="password" autoComplete="new-password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(event) => setConfirmPin(event.target.value)} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="button button-primary">创建家长 PIN</button>
        <a href="#/">返回孩子的成长地图</a>
      </form></main>
    );
    if (mode === 'recover') return (
      <main className="parent-gate"><form className="gate-card" onSubmit={recover}>
        <span className="eyebrow">家长恢复</span>
        <h1 ref={headingRef} tabIndex={-1}>使用恢复码重设 PIN</h1>
        <label htmlFor="parent-recovery">恢复码</label>
        <input id="parent-recovery" aria-label="恢复码" type="password" autoComplete="off" autoCapitalize="characters" value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} />
        <label htmlFor="recovered-pin">新的 4 位 PIN</label>
        <input id="recovered-pin" aria-label="新的 4 位 PIN" type="password" autoComplete="new-password" inputMode="numeric" maxLength={4} value={newPin} onChange={(event) => setNewPin(event.target.value)} />
        <label htmlFor="recovered-confirm">确认新的 PIN</label>
        <input id="recovered-confirm" aria-label="确认新的 PIN" type="password" autoComplete="new-password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(event) => setConfirmPin(event.target.value)} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="button button-primary">验证并重设</button>
        <button type="button" className="button button-ghost" onClick={() => switchMode('login')}>返回 PIN 登录</button>
      </form></main>
    );
    return (
      <main className="parent-gate"><form className="gate-card" onSubmit={login}>
        <span className="eyebrow">仅供家长查看</span>
        <h1 ref={headingRef} tabIndex={-1}>家长周报</h1>
        <p>请输入家长设置的 4 位 PIN。它只是这台设备上的本地界面门禁，不是账号级安全保护。</p>
        <label htmlFor="parent-pin">家长 PIN</label>
        <input id="parent-pin" aria-label="家长 PIN" type="password" autoComplete="current-password" inputMode="numeric" maxLength={4} value={loginPin} onChange={(event) => setLoginPin(event.target.value)} />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="button button-primary">进入周报</button>
        {!isLegacyParentPin(record) && <button type="button" className="button button-ghost" onClick={() => switchMode('recover')}>忘记 PIN，使用恢复码</button>}
        <a href="#/">返回孩子的成长地图</a>
      </form></main>
    );
  }

  return <>{children}<section className="parent-security-settings" aria-labelledby="parent-security-heading">
    <div><span className="eyebrow">本机门禁</span><h2 id="parent-security-heading">家长访问设置</h2><p>修改 PIN 后会生成新的恢复码；确认保存前，旧凭据保持有效。</p></div>
    <form onSubmit={changePin}>
      <div className="parent-security-field"><label htmlFor="current-parent-pin">当前 PIN</label><input id="current-parent-pin" aria-label="当前 PIN" type="password" autoComplete="current-password" inputMode="numeric" maxLength={4} value={currentPin} onChange={(event) => setCurrentPin(event.target.value)} /></div>
      <div className="parent-security-field"><label htmlFor="changed-parent-pin">新 PIN</label><input id="changed-parent-pin" aria-label="新 PIN" type="password" autoComplete="new-password" inputMode="numeric" maxLength={4} value={newPin} onChange={(event) => setNewPin(event.target.value)} /></div>
      <div className="parent-security-field"><label htmlFor="changed-parent-confirm">确认新 PIN</label><input id="changed-parent-confirm" aria-label="确认新 PIN" type="password" autoComplete="new-password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(event) => setConfirmPin(event.target.value)} /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="parent-security-actions"><button type="submit" className="button button-primary">修改 PIN 并轮换恢复码</button><button type="button" className="button button-ghost" onClick={() => relock('login')}>退出家长周报</button></div>
    </form>
  </section></>;
}
