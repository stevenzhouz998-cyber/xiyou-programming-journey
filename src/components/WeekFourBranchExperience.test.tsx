import { forwardRef, StrictMode, useImperativeHandle } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  DEFAULT_WEEK_FOUR_BRANCH_PYTHON,
  INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON,
  NESTED_WEEK_FOUR_BRANCH_PYTHON,
  parseWeekFourBranchPython,
  SOLVED_WEEK_FOUR_BRANCH_PYTHON,
} from '../engine/weekFourBranchPythonGrammar';
import { WeekFourBranchRuntimeError } from '../engine/weekFourBranchPythonRunner';
import {
  createWeekFourBranchSession,
  recordWeekFourBranchInfrastructureFailure,
  recordWeekFourBranchObservation,
  recordWeekFourBranchRun,
  recordWeekFourBranchValidationFailure,
  updateWeekFourBranchCode,
  type WeekFourBranchMissionSession,
} from '../progress/weekFourBranchSession';

const mocked = vi.hoisted(() => ({
  context: null as any,
  focusConnector: vi.fn(),
  focusAction: vi.fn(),
}));

vi.mock('../context/ProgressContext', () => ({ useProgress: () => mocked.context }));
vi.mock('./WeekFourBranchPythonEditor', () => ({
  WeekFourBranchPythonEditor: forwardRef((props: any, ref) => {
    useImperativeHandle(ref, () => ({ focusConnector: mocked.focusConnector, focusAction: mocked.focusAction }));
    return <section className="week-four-branch-python-panel" data-code={props.code}>
      <button type="button" disabled={props.disabled} onClick={() => props.onCodeChange(NESTED_WEEK_FOUR_BRANCH_PYTHON)}>改成嵌套路线</button>
      <button type="button" disabled={props.disabled} onClick={() => props.onCodeChange(INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON)}>改成缩进错误</button>
      <button type="button" disabled={props.disabled} onClick={() => props.onCodeChange(SOLVED_WEEK_FOUR_BRANCH_PYTHON)}>归位分支</button>
      <button type="button" onClick={() => props.onError?.('编辑器加载失败')}>触发编辑器错误</button>
    </section>;
  }),
}));
vi.mock('./WeekFourBranchScene', () => ({
  WeekFourBranchScene: (props: any) => <section className="week-four-branch-scene" data-state={props.state}>
    <button type="button" onClick={props.onAssetsReady}>场景资源已就绪</button>
    <button type="button" onClick={() => props.onAssetsError('分支场景资源加载失败。')}>场景资源失败</button>
    <span>场景状态：{props.state}</span>
    {props.showCanonEpilogue ? <p role="note">安全尾声</p> : null}
  </section>,
}));

import { WeekFourBranchExperience } from './WeekFourBranchExperience';

type SaveStatus = 'saved' | 'unsaved' | 'conflict';

function solvedSession(): WeekFourBranchMissionSession {
  let session = createWeekFourBranchSession('2026-09-01T00:00:00.000Z');
  session = updateWeekFourBranchCode(session, SOLVED_WEEK_FOUR_BRANCH_PYTHON, '2026-09-01T00:00:00.100Z');
  const parsed = parseWeekFourBranchPython(session.pythonCode);
  if ('state' in parsed) throw new Error('solved fixture must be runnable');
  return recordWeekFourBranchRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, '2026-09-01T00:00:00.200Z');
}

function formalRecords(session: WeekFourBranchMissionSession) {
  const parsed = parseWeekFourBranchPython(session.pythonCode);
  if ('state' in parsed) throw new Error('formal fixture must be runnable');
  const work = {
    kind: 'python-branch-structure-v1', workId: 'w4-m3-branch-structure-record', missionId: 'w4-m3', title: '分支归位证明记录',
    pythonCode: session.pythonCode, canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run,
    createdAt: '2026-09-01T00:00:00.300Z', verifiedAt: '2026-09-01T00:00:00.300Z',
  };
  const evidence = {
    kind: 'formal-v3', completedAt: '2026-09-01T00:00:00.300Z', verifiedAt: work.verifiedAt,
    pythonCode: session.pythonCode, canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run,
    workId: work.workId,
  };
  return { work, evidence };
}

function variableWork() {
  return {
    kind: 'python-variable-evidence-v1', workId: 'w4-m2-variable-evidence-record', missionId: 'w4-m2',
    title: '第一次变化变量取证记录', pythonCode: 'hidden answer', canonicalTrace: [], workerTrace: [],
    run: { completed: true }, createdAt: '2026-08-31T00:00:00.000Z', verifiedAt: '2026-08-31T00:00:01.000Z',
  } as any;
}

function setup(options: {
  statuses?: SaveStatus[];
  existingSession?: boolean;
  completed?: boolean;
  runtimeRun?: (code: string) => Promise<any>;
  props?: Record<string, unknown>;
  strict?: boolean;
  rejectOnce?: string[];
} = {}) {
  const statuses = [...(options.statuses ?? [])];
  let session = options.completed ? solvedSession() : createWeekFourBranchSession('2026-09-01T00:00:00.000Z');
  let sessionExists = options.existingSession ?? true;
  if (options.completed) sessionExists = true;
  let pending: { kind: 'session'; session: WeekFourBranchMissionSession } | { kind: 'completion' } | null = null;
  let completed = Boolean(options.completed);
  let records = completed ? formalRecords(session) : null;

  const progress = () => ({
    sessions: sessionExists ? { 'w4-m3': session } : {},
    missions: completed ? { 'w4-m3': { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: '2026-09-01T00:00:00.300Z' } } : {},
    missionCompletionEvidence: completed && records ? { 'w4-m2': { kind: 'formal-v3' }, 'w4-m3': records.evidence } : {},
    works: completed && records ? { 'w4-m3-branch-structure-record': records.work } : {},
    settings: { muted: true },
  });
  const publishProgress = () => { mocked.context.progress = progress(); };
  const nextStatus = () => statuses.shift() ?? 'saved';
  const save = vi.fn(async (update: (current: WeekFourBranchMissionSession) => WeekFourBranchMissionSession) => {
    const current = sessionExists ? session : createWeekFourBranchSession(new Date().toISOString());
    const candidate = update(current);
    const status = nextStatus();
    if (status === 'saved') { session = candidate; sessionExists = true; pending = null; }
    else pending = { kind: 'session', session: candidate };
    publishProgress();
    return { status, progress: progress(), ...(status === 'unsaved' ? { error: '写入失败' } : {}) };
  });
  const retrySave = vi.fn(async () => {
    const status = nextStatus();
    if (status === 'saved' && pending?.kind === 'session') {
      session = pending.session;
      sessionExists = true;
      pending = null;
    } else if (status === 'saved' && pending?.kind === 'completion') {
      completed = true;
      records = formalRecords(session);
      pending = null;
    }
    publishProgress();
    return { status, progress: progress(), ...(status === 'unsaved' ? { error: '重试失败' } : {}) };
  });
  const complete = vi.fn(async () => {
    const status = nextStatus();
    if (status === 'saved') { completed = true; records = formalRecords(session); pending = null; }
    else pending = { kind: 'completion' };
    publishProgress();
    return { status, progress: progress(), ...(status === 'unsaved' ? { error: '原子封存失败' } : {}) };
  });
  const genericComplete = vi.fn(async () => ({ status: 'saved', progress: progress() }));
  mocked.context = {
    progress: progress(), saveStatus: 'idle', saveError: null,
    saveWeekFourBranchDraft: vi.fn((code: string) => save((current) => updateWeekFourBranchCode(current, code, new Date().toISOString()))),
    saveWeekFourBranchRun: vi.fn((input: any) => save((current) => recordWeekFourBranchRun(current, input, new Date().toISOString()))),
    saveWeekFourBranchObservation: vi.fn(() => save((current) => recordWeekFourBranchObservation(current, new Date().toISOString()))),
    saveWeekFourBranchInfrastructureFailure: vi.fn((input: any) => save((current) => recordWeekFourBranchInfrastructureFailure(current, input, new Date().toISOString()))),
    saveWeekFourBranchValidationFailure: vi.fn(() => save((current) => recordWeekFourBranchValidationFailure(current, new Date().toISOString()))),
    completeWeekFourBranch: complete,
    complete: genericComplete,
    retrySave,
    createBackup: vi.fn(() => ({ filename: 'branch-backup.json', contents: '{}', mimeType: 'application/json' })),
    reloadExternalProgress: vi.fn(() => progress()),
  };
  for (const method of options.rejectOnce ?? []) {
    const original = mocked.context[method];
    mocked.context[method] = vi.fn().mockRejectedValueOnce(new Error(`${method} rejected`)).mockImplementation(original);
  }
  const runtimeRun = options.runtimeRun ?? (async (code: string) => {
    const parsed = parseWeekFourBranchPython(code);
    if ('state' in parsed) throw new WeekFourBranchRuntimeError('validation', '结构错误');
    return { trace: parsed.trace, run: parsed.run };
  });
  const runtime = { ready: vi.fn(async () => undefined), run: vi.fn(runtimeRun), cancel: vi.fn(), dispose: vi.fn() };
  const onComplete = (options.props?.onComplete as any) ?? vi.fn(async () => true);
  const element = <WeekFourBranchExperience reducedMotion muted work={variableWork()} runtimeFactory={() => runtime} onComplete={onComplete} {...options.props} />;
  const view = render(options.strict ? <StrictMode>{element}</StrictMode> : element);
  return {
    ...view, runtime, save, complete, genericComplete, retrySave, onComplete,
    session: () => session,
    setExternal(next: WeekFourBranchMissionSession | undefined) {
      if (next) { session = next; sessionExists = true; } else sessionExists = false;
      publishProgress();
    },
  };
}

describe('WeekFourBranchExperience', () => {
  beforeEach(() => {
    mocked.focusConnector.mockReset();
    mocked.focusAction.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true }).setSystemTime(new Date('2026-09-01T00:00:01.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('persists the first default draft before the mission becomes runnable', async () => {
    const { runtime } = setup({ existingSession: false, statuses: ['saved'] });
    expect(screen.getByRole('button', { name: '运行分支' })).toBeDisabled();
    await screen.findByText(/默认 Python 草稿已安全保存/);
    expect(mocked.context.saveWeekFourBranchDraft).toHaveBeenCalledWith(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    expect(runtime.run).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '运行分支' })).toBeEnabled();
  });

  it('persists the default two-card conflict before showing it and blocks duplicate clicks', async () => {
    const { runtime, session } = setup();
    const run = screen.getByRole('button', { name: '运行分支' });
    fireEvent.click(run);
    fireEvent.click(run);
    await screen.findByText(/两条路线同时发生.*事实已保存/);
    expect(runtime.run).toHaveBeenCalledTimes(1);
    expect(runtime.run).toHaveBeenCalledWith(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    expect(session().lastRun?.state).toBe('branch-conflict');
    expect(screen.getByText('场景状态：branch-conflict')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /火眼金睛/ })).toBeEnabled();
  });

  it('atomically saves the current editor draft before every run and parses only the returned saved code', async () => {
    const result = setup();
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/两条路线同时发生/);
    expect(mocked.context.saveWeekFourBranchDraft).toHaveBeenCalledTimes(1);
    expect(mocked.context.saveWeekFourBranchDraft).toHaveBeenCalledWith(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    expect(mocked.context.saveWeekFourBranchDraft.mock.invocationCallOrder[0]).toBeLessThan(result.runtime.run.mock.invocationCallOrder[0]);
  });

  it('does not post the Worker when the mandatory pre-run draft save fails', async () => {
    const { runtime } = setup({ statuses: ['unsaved'] });
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/Python 草稿尚未保存/);
    expect(runtime.run).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '重试保存' })).toBeInTheDocument();
  });

  it('saves an invalid indentation failure and focuses its line without posting the Worker', async () => {
    const { runtime, session } = setup({ statuses: ['saved', 'saved'] });
    fireEvent.click(await screen.findByRole('button', { name: '改成缩进错误' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/Python 结构或缩进未通过.*已保存/);
    expect(runtime.run).not.toHaveBeenCalled();
    expect(mocked.context.saveWeekFourBranchValidationFailure).toHaveBeenCalledTimes(1);
    expect(session().validationFailures).toBe(1);
    expect(mocked.focusAction).toHaveBeenCalledTimes(1);
  });

  it('publishes solved work and proof atomically only after assets, then calls the parent once', async () => {
    const order: string[] = [];
    const onComplete = vi.fn(async () => { order.push('parent'); return true; });
    const result = setup({ statuses: ['saved', 'saved', 'saved', 'saved'], props: { onComplete } });
    result.complete.mockImplementation(async () => {
      order.push('atomic');
      const records = formalRecords(result.session());
      return {
        status: 'saved',
        progress: {
          ...mocked.context.progress,
          sessions: { 'w4-m3': result.session() },
          missions: { 'w4-m3': { status: 'completed', stars: 3 } },
          missionCompletionEvidence: { 'w4-m3': records.evidence },
          works: { 'w4-m3-branch-structure-record': records.work },
        },
      };
    });
    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/分支已证明.*等待场景资源/);
    expect(result.runtime.run).toHaveBeenCalledWith(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    expect(result.complete).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: '场景资源已就绪' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(result.complete).toHaveBeenCalledWith({ stars: 3, hintsUsed: 0 });
    expect(result.complete).toHaveBeenCalledTimes(1);
    expect(result.genericComplete).not.toHaveBeenCalled();
    expect(order).toEqual(['atomic', 'parent']);
    expect(screen.getByRole('note')).toHaveTextContent('安全尾声');
  });

  it.each([1, 2] as const)('reveals the persisted %s-star legacy-upgrade result instead of recomputing 3 stars from zero current hints', async (persistedStars) => {
    const onComplete = vi.fn(async () => true);
    const result = setup({ statuses: ['saved', 'saved', 'saved', 'saved'], props: { onComplete } });
    result.complete.mockImplementation(async () => {
      const records = formalRecords(result.session());
      return {
        status: 'saved' as const,
        progress: {
          ...mocked.context.progress,
          sessions: { 'w4-m3': result.session() },
          missions: { 'w4-m3': { status: 'completed', stars: persistedStars } },
          missionCompletionEvidence: { 'w4-m3': records.evidence },
          works: { 'w4-m3-branch-structure-record': records.work },
        },
      };
    });
    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '场景资源已就绪' }));
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete).toHaveBeenCalledWith({ stars: persistedStars, hintsUsed: 0 });
    expect(result.complete).toHaveBeenCalledTimes(1);
  });

  it('fails closed without revealing success when the saved atomic response omits the W4-M3 mission', async () => {
    const onComplete = vi.fn(async () => true);
    const result = setup({ statuses: ['saved', 'saved', 'saved', 'saved'], props: { onComplete } });
    result.complete.mockImplementation(async () => {
      const records = formalRecords(result.session());
      return {
        status: 'saved' as const,
        progress: {
          ...mocked.context.progress,
          sessions: { 'w4-m3': result.session() },
          missions: {},
          missionCompletionEvidence: { 'w4-m3': records.evidence },
          works: { 'w4-m3-branch-structure-record': records.work },
        },
      };
    });
    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '场景资源已就绪' }));
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/原子完成响应缺少已保存关卡/);
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.complete).toHaveBeenCalledTimes(1);
  });

  it('runs the complete conflict, observation, nested missing, invalid, and solved path from saved code', async () => {
    const order: string[] = [];
    const onComplete = vi.fn(async () => { order.push('parent'); return true; });
    const { runtime, complete } = setup({ props: { onComplete }, statuses: ['saved', 'saved', 'saved', 'saved', 'saved', 'saved', 'saved', 'saved'] });
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/两条路线同时发生.*事实已保存/);
    expect(runtime.run).toHaveBeenLastCalledWith(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    fireEvent.click(screen.getByRole('button', { name: /火眼金睛/ }));
    await screen.findByRole('status', { name: '已保存的实际路线' });
    const observation = screen.getByRole('status', { name: '已保存的实际路线' });
    expect(observation).toHaveTextContent('实际路线');
    expect(observation).not.toHaveTextContent(/添加\s*else|else:/i);

    fireEvent.click(await screen.findByRole('button', { name: '改成嵌套路线' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/原著卡路线冲突.*练习卡没有路线/);
    expect(runtime.run).toHaveBeenLastCalledWith(NESTED_WEEK_FOUR_BRANCH_PYTHON);

    fireEvent.click(await screen.findByRole('button', { name: '改成缩进错误' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/Python 结构或缩进未通过.*已保存/);
    expect(runtime.run).toHaveBeenCalledTimes(2);
    expect(mocked.focusAction).toHaveBeenCalled();

    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '场景资源已就绪' }));
    complete.mockImplementation(async () => {
      order.push('atomic');
      const records = formalRecords((mocked.context.progress.sessions['w4-m3'] ?? solvedSession()) as WeekFourBranchMissionSession);
      return { status: 'saved' as const, progress: { ...mocked.context.progress, missions: { 'w4-m3': { status: 'completed', stars: 3 } }, missionCompletionEvidence: { 'w4-m3': records.evidence }, works: { 'w4-m3-branch-structure-record': records.work } } };
    });
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(runtime.run).toHaveBeenLastCalledWith(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    expect(order).toEqual(['atomic', 'parent']);
    expect(screen.getByRole('note')).toHaveTextContent('安全尾声');
  });

  it('retries the exact unsaved edit without presenting it as saved', async () => {
    const { session } = setup({ statuses: ['unsaved', 'saved'] });
    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    await screen.findByText(/新的 Python 草稿尚未保存/);
    expect(session().pythonCode).toBe(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    expect(screen.getByRole('button', { name: '运行分支' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await screen.findByText('Python 草稿已保存。');
    expect(session().pythonCode).toBe(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
  });

  it('retries a saved run candidate without rerunning the Worker', async () => {
    const { runtime } = setup({ statuses: ['saved', 'unsaved', 'saved'] });
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/分支运行结果尚未保存/);
    expect(runtime.run).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await screen.findByText(/事实已保存/);
    expect(runtime.run).toHaveBeenCalledTimes(1);
  });

  it('retries observation persistence and reveals only the current saved actual routes', async () => {
    setup({ statuses: ['saved', 'saved', 'unsaved', 'saved'] });
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/事实已保存/);
    fireEvent.click(screen.getByRole('button', { name: /火眼金睛/ }));
    await screen.findByText(/观察尚未保存/);
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    const observation = await screen.findByRole('status', { name: '已保存的实际路线' });
    expect(observation).not.toHaveTextContent(/else|答案|照抄/i);
  });

  it.each([
    ['timeout', true],
    ['worker-error', false],
    ['worker-contract-mismatch', false],
    ['load-error', false],
  ] as const)('classifies %s as infrastructure with executionStarted=%s', async (code, executionStarted) => {
    setup({ runtimeRun: async () => { throw new WeekFourBranchRuntimeError(code, '运行故障'); }, statuses: ['saved'] });
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/运行环境故障已保存/);
    expect(mocked.context.saveWeekFourBranchInfrastructureFailure).toHaveBeenCalledWith({ executionStarted });
  });

  it('cancels a running Worker on edit and ignores its late result without recording infrastructure failure', async () => {
    let resolve!: (value: any) => void;
    const { runtime } = setup({ runtimeRun: () => new Promise((done) => { resolve = done; }) });
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await waitFor(() => expect(runtime.run).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    await waitFor(() => expect(runtime.cancel).toHaveBeenCalledTimes(1));
    const parsed = parseWeekFourBranchPython(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    if ('state' in parsed) throw new Error('fixture must run');
    resolve({ trace: parsed.trace, run: parsed.run });
    await screen.findByText(/新的 Python 草稿已保存/);
    expect(mocked.context.saveWeekFourBranchInfrastructureFailure).not.toHaveBeenCalled();
    expect(mocked.context.saveWeekFourBranchRun).not.toHaveBeenCalled();
  });

  it('blocks duplicate run clicks and releases persistence lock after a late unmounted result', async () => {
    let resolve!: (value: any) => void;
    const persistence = vi.fn();
    const { runtime, unmount } = setup({ runtimeRun: () => new Promise((done) => { resolve = done; }), props: { onSessionPersistenceActiveChange: persistence } });
    const run = screen.getByRole('button', { name: '运行分支' });
    fireEvent.click(run);
    fireEvent.click(run);
    await waitFor(() => expect(runtime.run).toHaveBeenCalledTimes(1));
    unmount();
    const parsed = parseWeekFourBranchPython(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    if ('state' in parsed) throw new Error('fixture must run');
    resolve({ trace: parsed.trace, run: parsed.run });
    await Promise.resolve();
    expect(persistence).toHaveBeenLastCalledWith(false);
  });

  it('retries the atomic work/proof completion without rerunning the Worker', async () => {
    const onComplete = vi.fn(async () => true);
    const { runtime, complete, retrySave } = setup({ statuses: ['saved', 'saved', 'saved', 'unsaved', 'saved'], props: { onComplete } });
    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '场景资源已就绪' }));
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/作品与通关证明尚未原子保存/);
    expect(runtime.run).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(retrySave).toHaveBeenCalledTimes(1);
    expect(runtime.run).toHaveBeenCalledTimes(1);
  });

  it('keeps a completed formal replay read-only and validates exact session, proof, work, trace, and run', async () => {
    const { runtime, save, complete, onComplete } = setup({ completed: true });
    const before = structuredClone(mocked.context.progress);
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/回放核验完成.*正式作品和证明未改动/);
    expect(runtime.run).toHaveBeenCalledWith(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    expect(onComplete).toHaveBeenCalledWith({ stars: 3, hintsUsed: 0 });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(mocked.context.progress).toEqual(before);
  });

  it.each(['false', 'throw'] as const)('retries a %s parent reveal after formal replay without rerunning Worker or writing progress', async (mode) => {
    const onComplete = mode === 'false'
      ? vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
      : vi.fn().mockRejectedValueOnce(new Error('UI unavailable')).mockResolvedValueOnce(true);
    const { runtime, save, complete, genericComplete } = setup({ completed: true, props: { onComplete } });
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    const retry = await screen.findByRole('button', { name: '重新显示完成结果' });
    expect(runtime.run).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    fireEvent.click(retry);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2));
    expect(runtime.run).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(genericComplete).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '重新显示完成结果' })).not.toBeInTheDocument();
  });

  it('keeps formal proof intact when completed replay is unavailable', async () => {
    const { save, complete } = setup({ completed: true, runtimeRun: async () => { throw new WeekFourBranchRuntimeError('worker-error', '回放故障'); } });
    const before = structuredClone(mocked.context.progress);
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/回放核验暂时不可用.*正式作品和证明未改动/);
    expect(save).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(mocked.context.progress).toEqual(before);
  });

  it.each([
    ['workId', (progress: any) => { progress.missionCompletionEvidence['w4-m3'].workId = 'wrong-work'; }],
    ['work kind', (progress: any) => { progress.works['w4-m3-branch-structure-record'].kind = 'wrong-kind'; }],
    ['work missionId', (progress: any) => { progress.works['w4-m3-branch-structure-record'].missionId = 'w4-m2'; }],
    ['mission status', (progress: any) => { progress.missions['w4-m3'].status = 'in-progress'; }],
    ['W4-M2 prerequisite', (progress: any) => { progress.missionCompletionEvidence['w4-m2'].kind = 'legacy-replay-only'; }],
    ['completion time', (progress: any) => { progress.missionCompletionEvidence['w4-m3'].verifiedAt = 'not-an-iso-time'; }],
  ])('fails closed on formal replay %s tampering without writes', async (_label, tamper) => {
    const { save, complete, genericComplete } = setup({ completed: true });
    tamper(mocked.context.progress);
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/回放核验暂时不可用/);
    expect(save).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(genericComplete).not.toHaveBeenCalled();
  });

  it('keeps persisted proof when the parent success reveal returns false', async () => {
    const onComplete = vi.fn(async () => false);
    const result = setup({ statuses: ['saved', 'saved', 'saved', 'saved'], props: { onComplete } });
    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '场景资源已就绪' }));
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/正式作品和证明已保存.*完成结果/);
    expect(result.complete).toHaveBeenCalledTimes(1);
    expect(result.genericComplete).not.toHaveBeenCalled();
    expect(screen.getByRole('note')).toHaveTextContent('安全尾声');
  });

  it('keeps persisted proof when the parent success reveal throws', async () => {
    const onComplete = vi.fn(async () => { throw new Error('success UI unavailable'); });
    const result = setup({ statuses: ['saved', 'saved', 'saved', 'saved'], props: { onComplete } });
    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '场景资源已就绪' }));
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/正式作品和证明已保存.*完成结果/);
    expect(result.complete).toHaveBeenCalledTimes(1);
    expect(result.genericComplete).not.toHaveBeenCalled();
    expect(screen.getByRole('note')).toHaveTextContent('安全尾声');
  });

  it('ignores a late older draft save after a newer edit has already been accepted', async () => {
    const result = setup();
    let resolveOld!: (value: any) => void;
    const oldCandidate = updateWeekFourBranchCode(result.session(), NESTED_WEEK_FOUR_BRANCH_PYTHON, '2026-09-01T00:00:01.100Z');
    const newCandidate = updateWeekFourBranchCode(result.session(), SOLVED_WEEK_FOUR_BRANCH_PYTHON, '2026-09-01T00:00:01.200Z');
    mocked.context.saveWeekFourBranchDraft = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce({ status: 'saved', progress: { ...mocked.context.progress, sessions: { 'w4-m3': newCandidate } } });
    fireEvent.click(await screen.findByRole('button', { name: '改成嵌套路线' }));
    fireEvent.click(screen.getByRole('button', { name: '归位分支' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    resolveOld({ status: 'saved', progress: { ...mocked.context.progress, sessions: { 'w4-m3': oldCandidate } } });
    await Promise.resolve();
    expect(screen.getByRole('button', { name: '运行分支' })).toBeEnabled();
    expect(document.querySelector('.week-four-branch-python-panel')).toHaveAttribute('data-code', SOLVED_WEEK_FOUR_BRANCH_PYTHON);
  });

  it('ignores a late draft save after unmount and releases the persistence lock', async () => {
    let resolve!: (value: any) => void;
    const persistence = vi.fn();
    const result = setup({ props: { onSessionPersistenceActiveChange: persistence } });
    mocked.context.saveWeekFourBranchDraft = vi.fn(() => new Promise((done) => { resolve = done; }));
    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    result.unmount();
    resolve({ status: 'saved', progress: { ...mocked.context.progress, sessions: { 'w4-m3': solvedSession() } } });
    await Promise.resolve();
    expect(persistence).toHaveBeenLastCalledWith(false);
  });

  it('shows CAS backup/load recovery and loads the external generation without overwriting it', async () => {
    const { rerender, setExternal } = setup({ statuses: ['conflict'] });
    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    await screen.findByText(/其他标签页.*没有自动覆盖/);
    expect(screen.getByRole('button', { name: '下载当前 Python 备份' })).toBeInTheDocument();
    const external = createWeekFourBranchSession('2026-09-01T00:00:00.500Z');
    setExternal(external);
    mocked.context.reloadExternalProgress = vi.fn(() => ({ ...mocked.context.progress, sessions: { 'w4-m3': external } }));
    fireEvent.click(screen.getByRole('button', { name: '载入其他标签页进度' }));
    rerender(<WeekFourBranchExperience reducedMotion muted work={variableWork()} runtimeFactory={() => ({ ready: async () => undefined, run: async () => { throw new Error('unused'); }, cancel: vi.fn(), dispose: vi.fn() })} onComplete={async () => true} />);
    await screen.findByText(/已载入其他标签页保存的分支进度/);
  });

  it('keeps editor and asset faults local and publishes no completion', async () => {
    const { complete, save } = setup();
    fireEvent.click(await screen.findByRole('button', { name: '触发编辑器错误' }));
    expect(await screen.findByRole('button', { name: '重试加载 Python 编辑器' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '场景资源失败' }));
    expect(await screen.findByText(/分支场景资源加载失败/)).toBeInTheDocument();
    expect(complete).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('keeps scene, review, editor, preview/feedback DOM order and one primary run action', async () => {
    const { container } = setup();
    await screen.findByRole('button', { name: '场景资源已就绪' });
    await screen.findByRole('button', { name: '归位分支' });
    const layout = container.querySelector('.week-four-branch-layout')!;
    const children = [...layout.children];
    expect(children[0]).toHaveClass('week-four-branch-scene');
    expect(children[1]).toHaveClass('week-four-variable-work-review');
    expect(children[2]).toHaveClass('week-four-branch-python-panel');
    expect(children[3]).toHaveClass('week-four-branch-preview-feedback');
    expect(screen.getAllByRole('button', { name: '运行分支' })).toHaveLength(1);
    expect(screen.getByRole('status', { name: /Python 运行环境/ })).toBeInTheDocument();
    expect(container.querySelector('.week-four-branch-experience')).toHaveAttribute('data-reduced-motion', 'true');
    expect(container.querySelector('.week-four-branch-experience')).toHaveAttribute('data-muted', 'true');
  });

  it('survives StrictMode setup cleanup and disposes the final runtime', async () => {
    const { runtime, unmount } = setup({ strict: true });
    await screen.findByRole('status', { name: /Python 运行环境/ });
    unmount();
    expect(runtime.dispose).toHaveBeenCalled();
  });

  it('recovers when the initial draft Context promise rejects', async () => {
    setup({ existingSession: false, rejectOnce: ['saveWeekFourBranchDraft'] });
    const retry = await screen.findByRole('button', { name: '重试保存' });
    expect(screen.getByText(/默认 Python 草稿保存异常/)).toBeInTheDocument();
    fireEvent.click(retry);
    await screen.findByText('Python 草稿已保存。');
    expect(mocked.context.saveWeekFourBranchDraft).toHaveBeenCalledTimes(2);
  });

  it('recovers when an edited draft Context promise rejects', async () => {
    setup({ rejectOnce: ['saveWeekFourBranchDraft'] });
    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    const retry = await screen.findByRole('button', { name: '重试保存' });
    expect(screen.getByText(/新的 Python 草稿保存异常/)).toBeInTheDocument();
    fireEvent.click(retry);
    await screen.findByText('Python 草稿已保存。');
  });

  it('does not start Worker and recovers when the mandatory pre-run draft promise rejects', async () => {
    const { runtime } = setup({ rejectOnce: ['saveWeekFourBranchDraft'] });
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    const retry = await screen.findByRole('button', { name: '重试保存' });
    expect(runtime.run).not.toHaveBeenCalled();
    expect(screen.getByText(/运行前 Python 草稿保存异常/)).toBeInTheDocument();
    fireEvent.click(retry);
    await screen.findByText('Python 草稿已保存。');
  });

  it('retries a rejected run-result save without rerunning Worker', async () => {
    const { runtime } = setup({ rejectOnce: ['saveWeekFourBranchRun'] });
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    const retry = await screen.findByRole('button', { name: '重试保存' });
    expect(screen.getByText(/分支运行结果保存异常/)).toBeInTheDocument();
    fireEvent.click(retry);
    await screen.findByText(/事实已保存/);
    expect(runtime.run).toHaveBeenCalledTimes(1);
  });

  it('retries a rejected validation save without starting Worker', async () => {
    const { runtime } = setup({ rejectOnce: ['saveWeekFourBranchValidationFailure'] });
    fireEvent.click(await screen.findByRole('button', { name: '改成缩进错误' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    const retry = await screen.findByRole('button', { name: '重试保存' });
    expect(screen.getByText(/结构失败保存异常/)).toBeInTheDocument();
    fireEvent.click(retry);
    await screen.findByText(/Python 运行状态已保存/);
    expect(runtime.run).not.toHaveBeenCalled();
  });

  it('retries a rejected observation save and reveals only the saved snapshot', async () => {
    setup({ rejectOnce: ['saveWeekFourBranchObservation'] });
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    await screen.findByText(/事实已保存/);
    fireEvent.click(screen.getByRole('button', { name: /火眼金睛/ }));
    const retry = await screen.findByRole('button', { name: '重试保存' });
    expect(screen.getByText(/观察保存异常/)).toBeInTheDocument();
    fireEvent.click(retry);
    expect(await screen.findByRole('status', { name: '已保存的实际路线' })).toBeInTheDocument();
  });

  it('retries a rejected infrastructure-failure save', async () => {
    setup({
      rejectOnce: ['saveWeekFourBranchInfrastructureFailure'],
      runtimeRun: async () => { throw new WeekFourBranchRuntimeError('worker-error', 'Worker failed'); },
    });
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    const retry = await screen.findByRole('button', { name: '重试保存' });
    expect(screen.getByText(/运行环境故障保存异常/)).toBeInTheDocument();
    fireEvent.click(retry);
    await screen.findByText(/Python 运行状态已保存/);
  });

  it('retries a rejected atomic completion without rerunning Worker', async () => {
    const onComplete = vi.fn(async () => true);
    const { runtime } = setup({ rejectOnce: ['completeWeekFourBranch'], props: { onComplete } });
    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '场景资源已就绪' }));
    fireEvent.click(screen.getByRole('button', { name: '运行分支' }));
    const retry = await screen.findByRole('button', { name: '重试保存' });
    expect(screen.getByText(/原子完成保存异常/)).toBeInTheDocument();
    fireEvent.click(retry);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(runtime.run).toHaveBeenCalledTimes(1);
  });

  it('keeps retry recovery available when context.retrySave rejects once', async () => {
    setup({ statuses: ['unsaved', 'saved'], rejectOnce: ['retrySave'] });
    fireEvent.click(await screen.findByRole('button', { name: '归位分支' }));
    fireEvent.click(await screen.findByRole('button', { name: '重试保存' }));
    expect(await screen.findByText(/重试保存异常/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await screen.findByText('Python 草稿已保存。');
  });
});
