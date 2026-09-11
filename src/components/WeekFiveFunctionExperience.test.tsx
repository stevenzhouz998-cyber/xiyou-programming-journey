import { forwardRef, StrictMode, useImperativeHandle } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_WEEK_FIVE_FUNCTION_PYTHON, parseWeekFiveFunctionPython } from '../engine/weekFiveFunctionPythonGrammar';
import {
  createWeekFiveFunctionSession, recordWeekFiveFunctionRun, recordWeekFiveFunctionValidationFailure,
  updateWeekFiveFunctionCode, type WeekFiveFunctionMissionSession,
} from '../progress/weekFiveFunctionSession';

const mocked = vi.hoisted(() => ({ context: null as any }));
const SOLVED_WEEK_FIVE_FUNCTION_PYTHON = `${DEFAULT_WEEK_FIVE_FUNCTION_PYTHON}\n\nrecord_sanqing()`;
vi.mock('../context/ProgressContext', () => ({ useProgress: () => mocked.context }));
vi.mock('./WeekFiveFunctionPythonEditor', () => ({
  WeekFiveFunctionPythonEditor: forwardRef((props: any, ref) => {
    useImperativeHandle(ref, () => ({ focusDefinition: vi.fn(), focusCall: vi.fn(), focusAction: vi.fn() }));
    return <section data-testid="function-editor" data-code={props.code}>
      <button type="button" disabled={props.disabled} onClick={() => props.onCodeChange(SOLVED_WEEK_FIVE_FUNCTION_PYTHON)}>写入一次调用</button>
      <button type="button" disabled={props.disabled} onClick={() => props.onCodeChange(DEFAULT_WEEK_FIVE_FUNCTION_PYTHON)}>只保留定义</button>
      <button type="button" disabled={props.disabled} onClick={() => props.onCodeChange('def record_sanqing(value):\n    record_arrival()')}>写入无效结构</button>
    </section>;
  }),
}));
vi.mock('./WeekFiveTempleScene', () => ({
  WeekFiveTempleScene: (props: any) => <section data-testid="temple-scene" data-state={props.state}>
    <button type="button" onClick={props.onAssetsReady}>场景资源已就绪</button>
    {props.showCanonEpilogue ? <p role="note">原著尾声</p> : null}
  </section>,
}));

import { WeekFiveFunctionExperience } from './WeekFiveFunctionExperience';

type Status = 'saved' | 'unsaved' | 'conflict';
const now = () => new Date().toISOString();

function solvedSession(): WeekFiveFunctionMissionSession {
  let session = createWeekFiveFunctionSession('2026-09-11T00:00:00.000Z');
  session = updateWeekFiveFunctionCode(session, SOLVED_WEEK_FIVE_FUNCTION_PYTHON, '2026-09-11T00:00:00.100Z');
  const parsed = parseWeekFiveFunctionPython(session.pythonCode);
  if ('state' in parsed) throw new Error('solved fixture invalid');
  return recordWeekFiveFunctionRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, '2026-09-11T00:00:00.200Z');
}

function formal(session: WeekFiveFunctionMissionSession) {
  const parsed = parseWeekFiveFunctionPython(session.pythonCode);
  if ('state' in parsed) throw new Error('formal fixture invalid');
  const verifiedAt = '2026-09-11T00:00:00.300Z';
  const work = { kind: 'python-function-call-v1', workId: 'w5-m2-sanqing-function-record', missionId: 'w5-m2', title: '三清观函数记录', pythonCode: session.pythonCode, canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run, createdAt: verifiedAt, verifiedAt };
  const evidence = { kind: 'formal-v3', completedAt: verifiedAt, verifiedAt, pythonCode: session.pythonCode, canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run, workId: work.workId };
  return { work, evidence, mission: { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: verifiedAt } };
}

function setup(options: { statuses?: Status[]; session?: WeekFiveFunctionMissionSession; existing?: boolean; completed?: boolean; strict?: boolean } = {}) {
  const statuses = [...(options.statuses ?? [])];
  let session = options.session ?? createWeekFiveFunctionSession('2026-09-11T00:00:00.000Z');
  let exists = options.existing ?? true;
  let completed = options.completed ?? false;
  let records = completed ? formal(session) : null;
  let pending: { kind: 'session'; value: WeekFiveFunctionMissionSession } | { kind: 'completion' } | null = null;
  const progress = () => ({ sessions: exists ? { 'w5-m2': session } : {}, missions: completed && records ? { 'w5-m2': records.mission } : {}, missionCompletionEvidence: completed && records ? { 'w5-m2': records.evidence } : {}, works: completed && records ? { 'w5-m2-sanqing-function-record': records.work } : {} });
  const publish = () => { mocked.context.progress = progress(); };
  const status = () => statuses.shift() ?? 'saved';
  const save = vi.fn(async (update: (current: WeekFiveFunctionMissionSession) => WeekFiveFunctionMissionSession) => {
    const candidate = update(exists ? session : createWeekFiveFunctionSession(now()));
    const next = status();
    if (next === 'saved') { session = candidate; exists = true; pending = null; } else if (next === 'unsaved') pending = { kind: 'session', value: candidate };
    publish();
    return { status: next, progress: progress(), ...(next === 'unsaved' ? { error: '写入失败' } : {}) };
  });
  const complete = vi.fn(async () => {
    const next = status();
    if (next === 'saved') { completed = true; records = formal(session); pending = null; } else if (next === 'unsaved') pending = { kind: 'completion' };
    publish();
    return { status: next, progress: progress(), ...(next === 'unsaved' ? { error: '封存失败' } : {}) };
  });
  const retrySave = vi.fn(async () => {
    const next = status();
    if (next === 'saved' && pending?.kind === 'session') { session = pending.value; exists = true; pending = null; }
    else if (next === 'saved' && pending?.kind === 'completion') { completed = true; records = formal(session); pending = null; }
    publish();
    return { status: next, progress: progress(), ...(next === 'unsaved' ? { error: '重试失败' } : {}) };
  });
  mocked.context = {
    progress: progress(), saveStatus: 'idle',
    saveWeekFiveFunctionDraft: vi.fn((code: string) => save((current) => updateWeekFiveFunctionCode(current, code, now()))),
    saveWeekFiveFunctionRun: vi.fn((input: any) => save((current) => recordWeekFiveFunctionRun(current, input, now()))),
    saveWeekFiveFunctionValidationFailure: vi.fn(() => save((current) => recordWeekFiveFunctionValidationFailure(current, now()))),
    saveWeekFiveFunctionInfrastructureFailure: vi.fn(), saveWeekFiveFunctionObservation: vi.fn(),
    completeWeekFiveFunction: complete, retrySave,
    createBackup: vi.fn(() => ({ filename: 'backup.json', contents: '{}', mimeType: 'application/json' })), reloadExternalProgress: vi.fn(() => progress()),
  };
  const runtime = { ready: vi.fn(async () => undefined), run: vi.fn(async (code: string) => {
    const parsed = parseWeekFiveFunctionPython(code); if ('state' in parsed) throw new Error('invalid runtime input'); return { trace: parsed.trace, run: parsed.run };
  }), cancel: vi.fn(), dispose: vi.fn() };
  const onComplete = vi.fn(async () => true);
  const element = <WeekFiveFunctionExperience reducedMotion muted runtimeFactory={() => runtime} onComplete={onComplete} />;
  const view = render(options.strict ? <StrictMode>{element}</StrictMode> : element);
  return { ...view, runtime, onComplete, complete, retrySave, session: () => session };
}

describe('WeekFiveFunctionExperience', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }).setSystemTime(new Date('2026-09-11T00:00:01.000Z')));
  afterEach(() => vi.useRealTimers());

  it('survives the development StrictMode effect cycle and saves the initial draft', async () => {
    const result = setup({ existing: false, strict: true });
    await screen.findByText(/默认函数草稿已保存/);
    expect(mocked.context.saveWeekFiveFunctionDraft).toHaveBeenCalled();
    expect(result.runtime.ready).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '运行三清观函数' })).toBeEnabled();
  });

  it('retries a returned-unsaved run through the coordinator without executing or counting twice', async () => {
    const result = setup({ statuses: ['saved', 'unsaved', 'saved'] });
    fireEvent.click(screen.getByRole('button', { name: '运行三清观函数' }));
    await screen.findByText(/运行结果尚未保存/);
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await screen.findByText(/函数已经定义.*没有调用/);
    expect(result.runtime.run).toHaveBeenCalledTimes(1);
    expect(mocked.context.saveWeekFiveFunctionRun).toHaveBeenCalledTimes(1);
    expect(result.retrySave).toHaveBeenCalledTimes(1);
    expect(result.session().totalRuns).toBe(1);
  });

  it('switches from a rejected write to coordinator retry when the repeated write returns unsaved', async () => {
    const result = setup({ statuses: ['saved', 'unsaved', 'saved'] });
    mocked.context.saveWeekFiveFunctionRun.mockRejectedValueOnce(new Error('transport rejected'));
    fireEvent.click(screen.getByRole('button', { name: '运行三清观函数' }));
    await screen.findByText(/运行结果保存异常/);
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await waitFor(() => expect(mocked.context.saveWeekFiveFunctionRun).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await screen.findByText(/函数已经定义.*没有调用/);
    expect(result.runtime.run).toHaveBeenCalledTimes(1);
    expect(mocked.context.saveWeekFiveFunctionRun).toHaveBeenCalledTimes(2);
    expect(result.retrySave).toHaveBeenCalledTimes(1);
    expect(result.session().totalRuns).toBe(1);
  });

  it('retries a returned-unsaved validation through the coordinator and counts it once', async () => {
    const result = setup({ statuses: ['saved', 'saved', 'unsaved', 'saved'] });
    fireEvent.click(await screen.findByRole('button', { name: '写入无效结构' }));
    await screen.findByText(/函数草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '运行三清观函数' }));
    await screen.findByText(/结构失败尚未保存/);
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await waitFor(() => expect(result.session().validationFailures).toBe(1));
    expect(mocked.context.saveWeekFiveFunctionValidationFailure).toHaveBeenCalledTimes(1);
    expect(result.retrySave).toHaveBeenCalledTimes(1);
    expect(result.runtime.run).not.toHaveBeenCalled();
  });

  it('clears old successful trace as soon as a changed draft is saved', async () => {
    const result = setup({ session: solvedSession(), statuses: ['saved'] });
    expect(screen.getByRole('button', { name: '逐步查看已保存轨迹' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '只保留定义' }));
    await screen.findByText(/函数草稿已保存/);
    expect(result.session().lastRun).toBeNull();
    expect(screen.queryByRole('button', { name: '逐步查看已保存轨迹' })).not.toBeInTheDocument();
    expect(screen.getByTestId('temple-scene')).toHaveAttribute('data-state', 'ready');
  });

  it('explicitly cancels an active Worker run and ignores its late result', async () => {
    const result = setup();
    let resolveRun!: (value: any) => void;
    result.runtime.run.mockImplementationOnce(() => new Promise((resolve) => { resolveRun = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: '运行三清观函数' }));
    fireEvent.click(await screen.findByRole('button', { name: '取消本次运行' }));
    expect(result.runtime.cancel).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/迟到的运行结果不会保存/)).toBeInTheDocument();
    const parsed = parseWeekFiveFunctionPython(DEFAULT_WEEK_FIVE_FUNCTION_PYTHON);
    if ('state' in parsed) throw new Error('default fixture invalid');
    resolveRun({ trace: parsed.trace, run: parsed.run } as any);
    await waitFor(() => expect(mocked.context.saveWeekFiveFunctionRun).not.toHaveBeenCalled());
    expect(result.session().totalRuns).toBe(0);
  });

  it('stops offering cancellation before the durable run save begins', async () => {
    const result = setup();
    let releaseSave!: () => void;
    const saveGate = new Promise<void>((resolve) => { releaseSave = resolve; });
    const saveRun = mocked.context.saveWeekFiveFunctionRun;
    saveRun.mockImplementationOnce(async (input: any) => { await saveGate; return saveRun(input); });
    fireEvent.click(screen.getByRole('button', { name: '运行三清观函数' }));
    await waitFor(() => expect(result.runtime.run).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(saveRun).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: '取消本次运行' })).not.toBeInTheDocument();
    releaseSave();
    await screen.findByText(/函数已经定义.*没有调用/);
    expect(result.session().totalRuns).toBe(1);
  });

  it('retries returned-unsaved atomic completion without a second completion write or Worker run', async () => {
    const result = setup({ statuses: ['saved', 'saved', 'saved', 'unsaved', 'saved'] });
    fireEvent.click(await screen.findByRole('button', { name: '写入一次调用' }));
    await screen.findByText(/函数草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '场景资源已就绪' }));
    fireEvent.click(screen.getByRole('button', { name: '运行三清观函数' }));
    await screen.findByText(/正式完成记录尚未保存/);
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await waitFor(() => expect(result.onComplete).toHaveBeenCalledTimes(1));
    expect(result.complete).toHaveBeenCalledTimes(1);
    expect(result.retrySave).toHaveBeenCalledTimes(1);
    expect(result.runtime.run).toHaveBeenCalledTimes(1);
    expect(result.session().totalRuns).toBe(1);
  });

  it('uses real readonly replay without changing runs, hints, or saved records', async () => {
    const session = solvedSession();
    session.usedHintTiers = ['observe'];
    const before = structuredClone(session);
    const result = setup({ session, completed: true });
    fireEvent.click(screen.getByRole('button', { name: '真实回放函数作品' }));
    await screen.findByText(/回放核验完成/);
    expect(result.runtime.run).toHaveBeenCalledTimes(1);
    expect(mocked.context.saveWeekFiveFunctionRun).not.toHaveBeenCalled();
    expect(result.complete).not.toHaveBeenCalled();
    expect(result.retrySave).not.toHaveBeenCalled();
    expect(result.session()).toEqual(before);
  });

  it('shows saved trace steps with source line and function boundary', async () => {
    setup({ session: solvedSession() });
    fireEvent.click(screen.getByRole('button', { name: '逐步查看已保存轨迹' }));
    expect(screen.getByText(/第 1 行：定义.*尚未执行/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText(/第 5 行：第 1 次调用/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '下一步' }));
    expect(screen.getByText(/第 2 行：函数内第 1 次调用/)).toBeInTheDocument();
  });
});
