import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { forwardRef, StrictMode, useImperativeHandle } from 'react';
import { parseWeekFourVariablePython, SOLVED_WEEK_FOUR_VARIABLE_PYTHON } from '../engine/weekFourVariablePythonGrammar';
import { WeekFourVariableRuntimeError } from '../engine/weekFourVariablePythonRunner';
import { createWeekFourVariableSession, recordWeekFourVariableInfrastructureFailure, recordWeekFourVariableObservation, recordWeekFourVariableRun, recordWeekFourVariableValidationFailure, updateWeekFourVariableCode } from '../progress/weekFourVariableSession';

const mocked = vi.hoisted(() => ({ context: null as any, editorFocus: vi.fn() }));
vi.mock('../context/ProgressContext', () => ({ useProgress: () => mocked.context }));
vi.mock('./WeekFourVariableEvidencePythonEditor', () => ({
  WeekFourVariableEvidencePythonEditor: forwardRef((p: any, ref) => {
    useImperativeHandle(ref, () => ({ focusField: mocked.editorFocus }));
    return <><button type="button" onClick={() => p.onCodeChange(SOLVED_WEEK_FOUR_VARIABLE_PYTHON)}>改正变量</button><button type="button" onClick={() => p.onError?.('编辑器加载失败')}>触发编辑器加载错误</button></>;
  }),
}));
vi.mock('./WeekFourVariableEvidenceScene', () => ({
  WeekFourVariableEvidenceScene: (p: any) => <button type="button" onClick={() => p.onAssetsReady()}>场景资源已就绪</button>,
}));

import { WeekFourVariableEvidenceExperience } from './WeekFourVariableEvidenceExperience';

function setup(statuses: Array<'saved' | 'unsaved'>, runtimeRun = vi.fn(async (code: string) => {
  const parsed = (await import('../engine/weekFourVariablePythonGrammar')).parseWeekFourVariablePython(code);
  return { trace: parsed.trace, run: parsed.run };
}), props: Record<string, unknown> = {}, strict = false, completed = false) {
  let session = createWeekFourVariableSession('2026-08-31T00:00:00.000Z');
  let completedEvidence: any = null;
  let completedWork: any = null;
  if (completed) {
    session = updateWeekFourVariableCode(session, SOLVED_WEEK_FOUR_VARIABLE_PYTHON, '2026-08-31T00:00:00.000Z');
    const parsed = parseWeekFourVariablePython(session.pythonCode);
    session = recordWeekFourVariableRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, '2026-08-31T00:00:00.000Z');
    completedEvidence = { kind: 'formal-v3', pythonCode: session.pythonCode, canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run, workId: 'w4-m2-variable-evidence-record' };
    completedWork = { workId: 'w4-m2-variable-evidence-record', pythonCode: session.pythonCode, canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run };
  }
  const save = vi.fn(async (update: any) => {
    const next = update(session);
    const status = statuses.shift() ?? 'saved';
    if (status === 'saved') session = next;
    else pending = next;
    return { status, progress: { sessions: { 'w4-m2': session }, missions: {}, missionCompletionEvidence: {}, settings: { muted: true } } };
  });
  let pending: typeof session | null = null;
  const retrySave = vi.fn(async () => {
    const status = statuses.shift() ?? 'saved';
    if (status === 'saved' && pending) { session = pending; pending = null; }
    return { status, progress: { sessions: { 'w4-m2': session }, missions: {}, missionCompletionEvidence: {}, settings: { muted: true } } };
  });
  const complete = vi.fn(async () => ({ status: 'saved', progress: { sessions: { 'w4-m2': session }, missions: { 'w4-m2': { status: 'completed' } }, missionCompletionEvidence: { 'w4-m2': { kind: 'formal-v3' } }, settings: { muted: true } } }));
  const saveDraft = vi.fn((code: string) => save((current: any) => updateWeekFourVariableCode(current, code, new Date().toISOString())));
  const saveObservation = vi.fn(() => save((current: any) => recordWeekFourVariableObservation(current, new Date().toISOString())));
  mocked.context = {
    progress: { sessions: { 'w4-m2': session }, missions: completed ? { 'w4-m2': { status: 'completed' } } : {}, missionCompletionEvidence: completed ? { 'w4-m2': completedEvidence } : {}, works: completed ? { 'w4-m2-variable-evidence-record': completedWork } : {}, settings: { muted: true } },
    saveWeekFourVariableDraft: saveDraft,
    saveWeekFourVariableRun: (input: any) => save((current: any) => recordWeekFourVariableRun(current, input, new Date().toISOString())),
    saveWeekFourVariableObservation: saveObservation,
    saveWeekFourVariableInfrastructureFailure: ({ executionStarted }: any) => save((current: any) => recordWeekFourVariableInfrastructureFailure(current, { executionStarted }, new Date().toISOString())),
    saveWeekFourVariableValidationFailure: () => save((current: any) => recordWeekFourVariableValidationFailure(current, new Date().toISOString())),
    retrySave,
    completeWeekFourVariable: complete,
  };
  const runtime = { ready: vi.fn(async () => undefined), run: runtimeRun, cancel: vi.fn(), dispose: vi.fn() };
  const experience = <WeekFourVariableEvidenceExperience reducedMotion muted runtimeFactory={() => runtime as any} onComplete={async () => true} {...props} />;
  const view = render(strict ? <StrictMode>{experience}</StrictMode> : experience);
  return { save, saveDraft, saveObservation, complete, runtime, session: () => session, setSession: (next: typeof session) => { session = next; }, ...view };
}

describe('WeekFourVariableEvidenceExperience', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }).setSystemTime(new Date('2026-08-31T00:00:01.000Z')));
  afterEach(() => vi.useRealTimers());
  it('saves the draft before a worker reads it and persists an overwrite failure before revealing it', async () => {
    const { save, runtime } = setup(['saved', 'saved']);
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await screen.findByText(/事实已经保存/);
    expect(save).toHaveBeenCalledTimes(1);
    expect(runtime.run).toHaveBeenCalledWith(expect.stringContaining('appearance'));
    expect(runtime.run).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/外形匣被覆盖/)).toBeTruthy();
  });

  it('cancels and invalidates a running worker when the code changes', async () => {
    let resolve!: (value: any) => void;
    const run = vi.fn(() => new Promise((done) => { resolve = done; }));
    const { runtime } = setup(['saved', 'saved'], run as any);
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '改正变量' }));
    await waitFor(() => expect(runtime.cancel).toHaveBeenCalledTimes(1));
    resolve({ trace: [] });
    await waitFor(() => expect(screen.getByText(/新的 Python 草稿已保存/)).toBeTruthy());
  });

  it('retries an unsaved run record without running the worker a second time', async () => {
    const { runtime } = setup(['unsaved', 'saved']);
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await screen.findByText(/结果没有保存成功/);
    expect(runtime.run).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await screen.findByText(/失败事实已经保存/);
    expect(runtime.run).toHaveBeenCalledTimes(1);
  });

  it('retries the exact edited draft candidate instead of reading the old session again', async () => {
    const { session } = setup(['unsaved', 'saved']);
    fireEvent.click(screen.getByRole('button', { name: '改正变量' }));
    await screen.findByText(/新的 Python 草稿没有保存成功/);
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await screen.findByText('Python 草稿已保存。');
    expect(session().pythonCode).toBe(SOLVED_WEEK_FOUR_VARIABLE_PYTHON);
  });

  it('retries an unsaved saved observation once without being blocked by the old pending closure', async () => {
    const { save } = setup(['saved', 'unsaved', 'saved']);
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await screen.findByText(/失败事实已经保存/);
    fireEvent.click(screen.getByRole('button', { name: '火眼金睛：观察本次覆盖' }));
    await screen.findByText(/观察没有保存成功/);
    const retryButton = screen.getByRole('button', { name: '重试保存' });
    fireEvent.click(retryButton);
    fireEvent.click(retryButton);
    await screen.findByText(/只展示已保存的变量覆盖事实/);
    expect(save).toHaveBeenCalledTimes(3);
    expect(screen.getAllByText(/火眼金睛：已保存的变量事实/)).toHaveLength(1);
  });

  it('offers a local Python editor reload without changing the saved session', async () => {
    const { save } = setup([]);
    fireEvent.click(screen.getByRole('button', { name: '触发编辑器加载错误' }));
    expect(await screen.findByRole('button', { name: '重试加载 Python 编辑器' })).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
  });

  it('moves focus to saved failure feedback and offers a code-line focus action', async () => {
    setup(['saved', 'saved']);
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    const feedback = await screen.findByText(/失败事实已经保存/);
    expect(document.activeElement).toBe(feedback);
    fireEvent.click(screen.getByRole('button', { name: '查看问题代码行' }));
    expect(mocked.editorFocus).toHaveBeenCalledTimes(1);
  });

  it('places the read-only W4-M1 review after the scene and before the editor', () => {
    const { container } = setup([], undefined, { work: { workId: 'w4-m1-first-python-mapping', pythonCode: 'review = only', run: { cardResults: [] } } });
    const scene = screen.getByRole('button', { name: '场景资源已就绪' });
    const review = container.querySelector('.week-four-mapping-work-review')!;
    const editor = screen.getByRole('button', { name: '改正变量' });
    expect(Boolean(scene.compareDocumentPosition(review) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(review.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('does not complete until the scene assets are ready, then completes exactly once', async () => {
    const onComplete = vi.fn(async () => true);
    const { complete } = setup(['saved', 'saved'], undefined, { onComplete });
    fireEvent.click(screen.getByRole('button', { name: '改正变量' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '场景资源已就绪' }));
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ stars: 3, hintsUsed: 0 }));
    expect(complete).not.toHaveBeenCalled();
  });

  it('keeps completion recoverable when the shared completion flow declines it', async () => {
    const onComplete = vi.fn(async () => false);
    setup(['saved', 'saved'], undefined, { onComplete });
    fireEvent.click(screen.getByRole('button', { name: '改正变量' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '场景资源已就绪' }));
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await screen.findByText(/作品与通关证明暂未原子保存/);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: '重试保存' })).toBeNull();
  });

  it('returns to a runnable state after a validation failure counter is saved', async () => {
    const run = vi.fn(async () => { throw new WeekFourVariableRuntimeError('validation', '结构错误'); });
    const { save } = setup(['saved', 'saved'], run as any);
    const button = screen.getByRole('button', { name: '运行取证' });
    fireEvent.click(button);
    await screen.findByText(/Python 结构未通过安全检查/);
    expect(screen.queryByRole('button', { name: '重试保存' })).toBeNull();
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => expect(run).toHaveBeenCalledTimes(2));
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('retries the exact unpublished validation counter instead of counting the error twice', async () => {
    const run = vi.fn(async () => { throw new WeekFourVariableRuntimeError('validation', '结构错误'); });
    const { save, session } = setup(['unsaved', 'saved'], run as any);
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await screen.findByText(/Python 结构未通过安全检查/);
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await screen.findByText(/运行环境状态已保存/);
    expect(save).toHaveBeenCalledTimes(1);
    expect(mocked.context.retrySave).toHaveBeenCalledTimes(1);
    expect(session().validationFailures).toBe(1);
  });

  it('marks the runtime ready when a later ready attempt succeeds', async () => {
    const runtime = {
      ready: vi.fn()
        .mockRejectedValueOnce(new WeekFourVariableRuntimeError('load-error', '初次加载失败'))
        .mockResolvedValue(undefined),
      run: vi.fn(async (code: string) => {
        const parsed = parseWeekFourVariablePython(code);
        return { trace: parsed.trace, run: parsed.run };
      }),
      cancel: vi.fn(),
      dispose: vi.fn(),
    };
    setup(['saved'], undefined, { runtimeFactory: () => runtime });
    await waitFor(() => expect(runtime.ready).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Python 运行环境加载中')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await screen.findByText(/失败事实已经保存/);
    expect(screen.getByLabelText('Python 运行环境已准备')).toBeTruthy();
  });

  it('marks the runtime unavailable after a worker error terminates it', async () => {
    const runtime = {
      ready: vi.fn(async () => undefined),
      run: vi.fn(async () => { throw new WeekFourVariableRuntimeError('worker-error', 'Worker 错误'); }),
      cancel: vi.fn(),
      dispose: vi.fn(),
    };
    setup(['saved'], undefined, { runtimeFactory: () => runtime });
    await screen.findByLabelText('Python 运行环境已准备');
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await screen.findByText(/Python 运行环境暂时不可用/);
    expect(screen.getByLabelText('Python 运行环境加载中')).toBeTruthy();
  });

  it('drops the local completion handoff and reloads the external session after CAS recovery', async () => {
    let decline!: (saved: boolean) => void;
    const onComplete = vi.fn(() => new Promise<boolean>((resolve) => { decline = resolve; }));
    const { runtime, rerender, setSession } = setup(['saved', 'saved'], undefined, { onComplete });
    const runtimeFactory = () => runtime as any;
    fireEvent.click(screen.getByRole('button', { name: '改正变量' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '场景资源已就绪' }));
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    rerender(<WeekFourVariableEvidenceExperience reducedMotion muted locked runtimeFactory={runtimeFactory} onComplete={onComplete} />);
    decline(false);
    await screen.findByText(/重试保存通关/);

    const external = createWeekFourVariableSession('2026-08-31T00:00:00.500Z');
    setSession(external);
    mocked.context.progress = { ...mocked.context.progress, sessions: { 'w4-m2': external } };
    rerender(<WeekFourVariableEvidenceExperience reducedMotion muted locked={false} runtimeFactory={runtimeFactory} onComplete={onComplete} />);
    const runButton = screen.getByRole('button', { name: '运行取证' });
    await waitFor(() => expect(runButton).toBeEnabled());
    fireEvent.click(runButton);
    await waitFor(() => expect(runtime.run).toHaveBeenCalledTimes(2));
    expect(runtime.run).toHaveBeenLastCalledWith(external.pythonCode);
  });

  it('persists a fresh draft before running after completion CAS loads progress without a W4-M2 session', async () => {
    let decline!: (saved: boolean) => void;
    const onComplete = vi.fn(() => new Promise<boolean>((resolve) => { decline = resolve; }));
    const { runtime, rerender, saveDraft, setSession } = setup(['saved', 'saved', 'saved', 'saved'], undefined, { onComplete });
    const runtimeFactory = () => runtime as any;
    fireEvent.click(screen.getByRole('button', { name: '改正变量' }));
    await screen.findByText(/新的 Python 草稿已保存/);
    fireEvent.click(screen.getByRole('button', { name: '场景资源已就绪' }));
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    rerender(<WeekFourVariableEvidenceExperience reducedMotion muted locked runtimeFactory={runtimeFactory} onComplete={onComplete} />);
    decline(false);
    await screen.findByText(/重试保存通关/);

    const fresh = createWeekFourVariableSession('2026-08-31T00:00:01.000Z');
    setSession(fresh);
    mocked.context.progress = { ...mocked.context.progress, sessions: {} };
    rerender(<WeekFourVariableEvidenceExperience reducedMotion muted locked={false} runtimeFactory={runtimeFactory} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await waitFor(() => expect(runtime.run).toHaveBeenCalledTimes(2));
    expect(saveDraft).toHaveBeenCalledTimes(2);
    expect(saveDraft).toHaveBeenLastCalledWith(fresh.pythonCode);
  });

  it('persists a fresh draft before running after direct external reload has no W4-M2 session', async () => {
    const { runtime, rerender, saveDraft, setSession } = setup(['saved', 'saved']);
    const runtimeFactory = () => runtime as any;
    const fresh = createWeekFourVariableSession('2026-08-31T00:00:01.000Z');
    setSession(fresh);
    mocked.context.reloadExternalProgress = vi.fn(() => ({ ...mocked.context.progress, sessions: {} }));
    mocked.context.saveStatus = 'conflict';
    rerender(<WeekFourVariableEvidenceExperience reducedMotion muted runtimeFactory={runtimeFactory} onComplete={async () => true} />);
    fireEvent.click(screen.getByRole('button', { name: '载入其他标签页进度' }));
    mocked.context.saveStatus = 'idle';
    rerender(<WeekFourVariableEvidenceExperience reducedMotion muted runtimeFactory={runtimeFactory} onComplete={async () => true} />);
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await waitFor(() => expect(runtime.run).toHaveBeenCalledTimes(1));
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft).toHaveBeenCalledWith(fresh.pythonCode);
  });

  it('can observe again after an external reload invalidates a pending observation save', async () => {
    const { rerender, session, setSession } = setup(['saved']);
    const runtimeFactory = () => ({ ready: async () => undefined, run: async (code: string) => {
      const parsed = parseWeekFourVariablePython(code);
      return { trace: parsed.trace, run: parsed.run };
    }, cancel: vi.fn(), dispose: vi.fn() } as any);
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await screen.findByText(/失败事实已经保存/);
    const external = structuredClone(session());
    let resolveOld!: (value: any) => void;
    const saveObservation = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockImplementationOnce(async () => {
        const observed = recordWeekFourVariableObservation(external, '2026-08-31T00:00:01.000Z');
        setSession(observed);
        return { status: 'saved', progress: { ...mocked.context.progress, sessions: { 'w4-m2': observed } } };
      });
    mocked.context.saveWeekFourVariableObservation = saveObservation;
    fireEvent.click(screen.getByRole('button', { name: '火眼金睛：观察本次覆盖' }));
    await waitFor(() => expect(saveObservation).toHaveBeenCalledTimes(1));

    mocked.context.reloadExternalProgress = vi.fn(() => ({ ...mocked.context.progress, sessions: { 'w4-m2': external } }));
    mocked.context.saveStatus = 'conflict';
    rerender(<WeekFourVariableEvidenceExperience reducedMotion muted runtimeFactory={runtimeFactory} onComplete={async () => true} />);
    fireEvent.click(screen.getByRole('button', { name: '载入其他标签页进度' }));
    mocked.context.saveStatus = 'idle';
    rerender(<WeekFourVariableEvidenceExperience reducedMotion muted runtimeFactory={runtimeFactory} onComplete={async () => true} />);
    resolveOld({ status: 'saved', progress: { ...mocked.context.progress, sessions: { 'w4-m2': external } } });
    await Promise.resolve();
    fireEvent.click(screen.getByRole('button', { name: '火眼金睛：观察本次覆盖' }));
    await waitFor(() => expect(saveObservation).toHaveBeenCalledTimes(2));
  });

  it('marks the runtime unavailable when a completed replay terminates its worker', async () => {
    const runtime = {
      ready: vi.fn(async () => undefined),
      run: vi.fn(async () => { throw new WeekFourVariableRuntimeError('worker-error', 'Worker 错误'); }),
      cancel: vi.fn(),
      dispose: vi.fn(),
    };
    setup([], undefined, { runtimeFactory: () => runtime }, false, true);
    await screen.findByLabelText('Python 运行环境已准备');
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await screen.findByText(/回放核验暂时不可用/);
    expect(screen.getByLabelText('Python 运行环境加载中')).toBeTruthy();
  });

  it('drops a late worker result after unmount and releases the parent persistence lock', async () => {
    let resolve!: (value: any) => void;
    const run = vi.fn(() => new Promise((done) => { resolve = done; }));
    const persistence = vi.fn();
    const { unmount } = setup(['saved', 'saved'], run as any, { onSessionPersistenceActiveChange: persistence });
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    unmount();
    resolve((await import('../engine/weekFourVariablePythonGrammar')).parseWeekFourVariablePython('appearance = ordinary_eyes()\nappearance = fiery_eye_check()\nseal_record(appearance, identity)'));
    await Promise.resolve();
    expect(persistence).toHaveBeenLastCalledWith(false);
  });

  it('remains mounted after StrictMode setup-cleanup-setup and still ignores late results after the final unmount', async () => {
    let resolve!: (value: any) => void;
    const run = vi.fn(() => new Promise((done) => { resolve = done; }));
    const { unmount } = setup(['saved', 'saved'], run as any, {}, true);
    fireEvent.click(screen.getByRole('button', { name: '运行取证' }));
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    unmount();
    resolve((await import('../engine/weekFourVariablePythonGrammar')).parseWeekFourVariablePython('appearance = ordinary_eyes()\nappearance = fiery_eye_check()\nseal_record(appearance, identity)'));
    await Promise.resolve();
    expect(screen.queryByText(/失败事实已经保存/)).toBeNull();
  });

  it('replays a completed saved work through the real runtime without changing progress or completing again', async () => {
    const { runtime, complete } = setup([], undefined, {}, false, true);
    const before = structuredClone(mocked.context.progress);
    const button = screen.getByRole('button', { name: '运行取证' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await screen.findByText('回放核验完成，已保留正式作品和通关证明。');
    expect(runtime.run).toHaveBeenCalledWith(SOLVED_WEEK_FOUR_VARIABLE_PYTHON);
    expect(complete).not.toHaveBeenCalled();
    expect(mocked.context.progress).toEqual(before);
  });

  it('blocks duplicate completed replays and ignores a late replay after unmount', async () => {
    let resolve!: (value: any) => void;
    const run = vi.fn(() => new Promise((done) => { resolve = done; }));
    const { unmount } = setup([], run as any, {}, false, true);
    const button = screen.getByRole('button', { name: '运行取证' });
    fireEvent.click(button); fireEvent.click(button);
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    unmount();
    resolve((await import('../engine/weekFourVariablePythonGrammar')).parseWeekFourVariablePython(SOLVED_WEEK_FOUR_VARIABLE_PYTHON));
    await Promise.resolve();
    expect(screen.queryByText('回放核验完成，已保留正式作品和通关证明。')).toBeNull();
  });
});
