import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  createParentAccessRecord,
  generateRecoveryCode,
  isLegacyParentPin,
  isParentAccessUnset,
  verifyParentPin,
  verifyRecoveryCode,
} from '../progress/parentAccess';

function validPin(value: string): boolean { return /^\d{4}$/.test(value); }

function RecoveryCodePanel({ code, onConfirmed }: { code: string; onConfirmed: () => void }) {
  const [saved, setSaved] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopyStatus('已复制'); }
    catch { setCopyStatus('复制失败，请手动抄写'); }
  };
  const download = () => {
    const blob = new Blob([`西游编程记家长恢复码\n\n${code}\n\n此恢复码仅显示一次，请离线保存。\n`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'xiyou-parent-recovery.txt'; link.click(); URL.revokeObjectURL(url);
  };
  return <main className="parent-gate"><section className="gate-card" aria-labelledby="recovery-heading"><span className="eyebrow">仅显示一次</span><h1 id="recovery-heading">请保存一次性恢复码</h1><p>忘记 PIN 时，需要它才能重设。网站不会保存恢复码原文，也无法替你找回。</p><output className="recovery-code" aria-label="一次性恢复码">{code}</output><div className="workspace-actions"><button type="button" className="button button-ghost" onClick={copy}>复制恢复码</button><button type="button" className="button button-ghost" onClick={download}>下载恢复码</button></div>{copyStatus && <p role="status">{copyStatus}</p>}<label><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} /> 我已安全保存恢复码</label><button type="button" className="button button-primary" disabled={!saved} onClick={onConfirmed}>确认已保存并进入</button></section></main>;
}

export function ParentAccessGate({ record, saveRecord, children }: {
  record: string;
  saveRecord: (record: string) => boolean;
  children: ReactNode;
}) {
  const [allowed, setAllowed] = useState(false);
  const [mode, setMode] = useState<'login' | 'setup' | 'recover'>(() => isParentAccessUnset(record) ? 'setup' : 'login');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [error, setError] = useState('');
  const [oneTimeRecovery, setOneTimeRecovery] = useState<string | null>(null);
  const [returnToReport, setReturnToReport] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => { headingRef.current?.focus(); }, [mode]);

  const saveNewAccess = async (newPin: string, afterReport: boolean) => {
    const recovery = generateRecoveryCode();
    const nextRecord = await createParentAccessRecord(newPin, recovery);
    if (!saveRecord(nextRecord)) { setError('无法安全保存家长设置，请检查浏览器存储后重试。'); return false; }
    setReturnToReport(afterReport); setOneTimeRecovery(recovery); setError('');
    return true;
  };

  const setup = async (event: FormEvent) => {
    event.preventDefault();
    if (!validPin(pin)) { setError('请设置 4 位数字 PIN。'); return; }
    if (pin !== confirmPin) { setError('两次输入的 PIN 不一致。'); return; }
    await saveNewAccess(pin, false);
  };

  const login = async (event: FormEvent) => {
    event.preventDefault();
    if (!await verifyParentPin(record, pin)) { setError('PIN 不正确，请再检查一次。'); return; }
    if (isLegacyParentPin(record)) { await saveNewAccess(pin, false); return; }
    setError(''); setAllowed(true);
  };

  const recover = async (event: FormEvent) => {
    event.preventDefault();
    if (!await verifyRecoveryCode(record, recoveryInput)) { setError('恢复码不正确，家长设置没有改变。'); return; }
    if (!validPin(pin)) { setError('请设置 4 位数字 PIN。'); return; }
    if (pin !== confirmPin) { setError('两次输入的新 PIN 不一致。'); return; }
    await saveNewAccess(pin, false);
  };

  const changePin = async (event: FormEvent) => {
    event.preventDefault();
    if (!await verifyParentPin(record, currentPin)) { setError('当前 PIN 不正确，设置没有改变。'); return; }
    if (!validPin(pin)) { setError('新 PIN 必须是 4 位数字。'); return; }
    if (pin !== confirmPin) { setError('两次输入的新 PIN 不一致。'); return; }
    await saveNewAccess(pin, true);
  };

  if (oneTimeRecovery) return <RecoveryCodePanel code={oneTimeRecovery} onConfirmed={() => { setOneTimeRecovery(null); setAllowed(true); if (!returnToReport) setMode('login'); }} />;

  if (!allowed) {
    if (mode === 'setup') return <main className="parent-gate"><form className="gate-card" onSubmit={setup}><span className="eyebrow">首次家长设置</span><h1 ref={headingRef} tabIndex={-1}>创建家长 PIN</h1><p>请由家长设置 4 位数字 PIN。它只是这台设备上的本地界面门禁，不是账号级安全保护。</p><label htmlFor="new-parent-pin">设置 4 位家长 PIN</label><input id="new-parent-pin" aria-label="设置 4 位家长 PIN" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} /><label htmlFor="confirm-parent-pin">确认家长 PIN</label><input id="confirm-parent-pin" aria-label="确认家长 PIN" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(event) => setConfirmPin(event.target.value)} />{error && <p className="form-error">{error}</p>}<button type="submit" className="button button-primary">创建家长 PIN</button><a href="#/">返回孩子的成长地图</a></form></main>;
    if (mode === 'recover') return <main className="parent-gate"><form className="gate-card" onSubmit={recover}><span className="eyebrow">家长恢复</span><h1 ref={headingRef} tabIndex={-1}>使用恢复码重设 PIN</h1><label htmlFor="parent-recovery">恢复码</label><input id="parent-recovery" aria-label="恢复码" autoCapitalize="characters" value={recoveryInput} onChange={(event) => setRecoveryInput(event.target.value)} /><label htmlFor="recovered-pin">新的 4 位 PIN</label><input id="recovered-pin" aria-label="新的 4 位 PIN" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} /><label htmlFor="recovered-confirm">确认新的 PIN</label><input id="recovered-confirm" aria-label="确认新的 PIN" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(event) => setConfirmPin(event.target.value)} />{error && <p className="form-error">{error}</p>}<button type="submit" className="button button-primary">验证并重设</button><button type="button" className="button button-ghost" onClick={() => { setMode('login'); setError(''); }}>返回 PIN 登录</button></form></main>;
    return <main className="parent-gate"><form className="gate-card" onSubmit={login}><span className="eyebrow">仅供家长查看</span><h1 ref={headingRef} tabIndex={-1}>家长周报</h1><p>请输入家长设置的 4 位 PIN。它只是这台设备上的本地界面门禁，不是账号级安全保护。</p><label htmlFor="parent-pin">家长 PIN</label><input id="parent-pin" aria-label="家长 PIN" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} />{error && <p className="form-error">{error}</p>}<button type="submit" className="button button-primary">进入周报</button>{!isLegacyParentPin(record) && <button type="button" className="button button-ghost" onClick={() => { setMode('recover'); setPin(''); setError(''); }}>忘记 PIN，使用恢复码</button>}<a href="#/">返回孩子的成长地图</a></form></main>;
  }

  return <>{children}<section className="parent-security-settings" aria-labelledby="parent-security-heading"><h2 id="parent-security-heading">家长访问设置</h2><p>这是本机界面门禁，不替代账号、系统用户或设备加密。</p><form onSubmit={changePin}><label htmlFor="current-parent-pin">当前 PIN</label><input id="current-parent-pin" aria-label="当前 PIN" inputMode="numeric" maxLength={4} value={currentPin} onChange={(event) => setCurrentPin(event.target.value)} /><label htmlFor="changed-parent-pin">新 PIN</label><input id="changed-parent-pin" aria-label="新 PIN" inputMode="numeric" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} /><label htmlFor="changed-parent-confirm">确认新 PIN</label><input id="changed-parent-confirm" aria-label="确认新 PIN" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(event) => setConfirmPin(event.target.value)} />{error && <p className="form-error">{error}</p>}<button type="submit" className="button button-primary">修改 PIN 并轮换恢复码</button></form></section></>;
}
