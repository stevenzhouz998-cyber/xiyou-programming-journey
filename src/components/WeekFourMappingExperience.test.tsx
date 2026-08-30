import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { forwardRef, useImperativeHandle } from 'react';
import { traceForField } from '../blockly/weekFourMappingContract';
import { createWeekFourMappingSession, recordWeekFourMappingRun, updateWeekFourMappingCode } from '../progress/weekFourMappingSession';
import { compareWeekFourMappingTraces } from '../blockly/weekFourMappingContract';
import { SOLVED_WEEK_FOUR_MAPPING_PYTHON, parseWeekFourMappingPython } from '../engine/weekFourPythonMappingGrammar';

const mocked = vi.hoisted(() => ({ context: null as any }));
vi.mock('../context/ProgressContext', () => ({ useProgress: () => mocked.context }));
vi.mock('./WeekFourMappingBlocklyWorkspace', () => ({ WeekFourMappingBlocklyWorkspace: forwardRef((_p, ref) => { useImperativeHandle(ref, () => ({ compile: () => ({ trace: traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' }) }), focusBlock: vi.fn() })); return <div />; }) }));
vi.mock('./WeekFourMappingPythonEditor', () => ({ WeekFourMappingPythonEditor: forwardRef((p: any, ref) => { useImperativeHandle(ref, () => ({ focusField: () => document.getElementById('w4-field')?.focus() })); return <button id="w4-field" onClick={() => p.onCodeChange(p.code.replace('appearance', 'identity'))}>改为 identity</button>; }) }));
vi.mock('./WeekFourMappingScene', () => ({ WeekFourMappingScene: (p: any) => <button type="button" onClick={() => p.onAssetsReady()}>场景资源已就绪</button> }));
import { WeekFourMappingExperience } from './WeekFourMappingExperience';

const setup = (statuses: Array<'saved' | 'unsaved'>, run = vi.fn(async () => ({ trace: traceForField('appearance', { kind: 'python', line: 1, from: 3, to: 13 }) })), onComplete = vi.fn(async () => true), retainUnsavedDraft = false, runtimeOverride?: any, completed = false, evidenceKind?: 'formal-v3' | 'legacy-replay-only') => {
  let session = createWeekFourMappingSession('2026-08-30T00:00:00.000Z');
  const updates: any[] = [];
  const updateMissionSession = vi.fn(async (_id: string, update: any) => { const next = update(session); updates.push(structuredClone(next)); const status = statuses.shift() ?? 'saved'; if (status === 'saved' || retainUnsavedDraft) session = next; return { status, progress: { sessions: { 'w4-m1': session }, missions: {}, settings: { muted: true } } }; });
  mocked.context = { progress: { sessions: { 'w4-m1': session }, missions: completed ? { 'w4-m1': { status: 'completed' } } : {}, missionCompletionEvidence: evidenceKind ? { 'w4-m1': { kind: evidenceKind } } : {}, settings: { muted: true } }, updateMissionSession };
  const runtime = runtimeOverride ?? { ready: vi.fn(async () => undefined), run, cancel: vi.fn(), dispose: vi.fn() };
  const runtimeFactory = vi.fn(() => runtime);
  const rendered = render(<WeekFourMappingExperience reducedMotion muted onComplete={onComplete} runtimeFactory={runtimeFactory} />);
  return { updateMissionSession, run, onComplete, runtime, runtimeFactory, updates, session: () => session, ...rendered };
};
describe('W4-M1 save-first retries', () => {
  it('prewarms one runtime while the child can still read and edit, then reuses it for the first run', async () => {
    let resolveReady!: () => void;
    const ready = new Promise<void>((resolve) => { resolveReady = resolve; });
    const runtime = { ready: vi.fn(() => ready), run: vi.fn(async () => ({ trace: traceForField('appearance', { kind: 'python', line: 1, from: 3, to: 13 }) })), cancel: vi.fn(), dispose: vi.fn() };
    const value = setup(['saved', 'saved'], runtime.run, vi.fn(async () => true), false, runtime);
    await waitFor(() => expect(value.runtimeFactory).toHaveBeenCalledTimes(1));
    expect(value.runtime.ready).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '对照运行' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '改为 identity' })).toBeEnabled();
    resolveReady();
    fireEvent.click(screen.getByRole('button', { name: '对照运行' }));
    await waitFor(() => expect(runtime.run).toHaveBeenCalledTimes(1));
    expect(value.runtimeFactory).toHaveBeenCalledTimes(1);
  });

  it('does not prewarm a completed replay but creates the runtime on an explicit rerun', async () => {
    const runtime = { ready: vi.fn(async () => undefined), run: vi.fn(async () => ({ trace: traceForField('appearance', { kind: 'python', line: 1, from: 3, to: 13 }) })), cancel: vi.fn(), dispose: vi.fn() };
    const value = setup(['saved', 'saved'], runtime.run, vi.fn(async () => true), false, runtime, true, 'formal-v3');
    expect(value.runtimeFactory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '对照运行' }));
    await waitFor(() => expect(value.runtimeFactory).toHaveBeenCalledTimes(1));
    expect(runtime.ready).toHaveBeenCalledTimes(1);
  });

  it('keeps a legacy-replay-only completion editable so it can earn a formal proof', async () => {
    const runtime = { ready: vi.fn(async () => undefined), run: vi.fn(async () => ({ trace: traceForField('appearance', { kind: 'python', line: 1, from: 3, to: 13 }) })), cancel: vi.fn(), dispose: vi.fn() };
    const value = setup(['saved'], runtime.run, vi.fn(async () => true), false, runtime, true, 'legacy-replay-only');
    await waitFor(() => expect(value.runtimeFactory).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '改为 identity' }));
    await waitFor(() => expect(value.updateMissionSession).toHaveBeenCalledTimes(1));
    expect(value.session().pythonCode).toContain('identity');
  });

  it('runs a completed replay without persisting a draft, run, proof, work, or completion mutation', async () => {
    const solved = updateWeekFourMappingCode(createWeekFourMappingSession('2026-08-30T00:00:00.000Z'), SOLVED_WEEK_FOUR_MAPPING_PYTHON, '2026-08-30T00:00:01.000Z');
    const blocklyTrace = traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' });
    const pythonTrace = parseWeekFourMappingPython(solved.pythonCode).trace;
    const session = recordWeekFourMappingRun(solved, { blocklyTrace, pythonTrace, run: compareWeekFourMappingTraces(blocklyTrace, pythonTrace) }, '2026-08-30T00:00:02.000Z');
    const updateMissionSession = vi.fn();
    const runtime = { ready: vi.fn(async () => undefined), run: vi.fn(async () => ({ trace: pythonTrace })), cancel: vi.fn(), dispose: vi.fn() };
    const onComplete = vi.fn(async () => true);
    mocked.context = { progress: { sessions: { 'w4-m1': session }, missions: { 'w4-m1': { status: 'completed' } }, missionCompletionEvidence: { 'w4-m1': { kind: 'formal-v3' } }, settings: { muted: true } }, updateMissionSession };
    render(<WeekFourMappingExperience reducedMotion muted onComplete={onComplete} runtimeFactory={() => runtime} />);

    fireEvent.click(screen.getByRole('button', { name: '对照运行' }));
    await waitFor(() => expect(runtime.run).toHaveBeenCalledTimes(1));
    expect(updateMissionSession).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByText('回放核验完成，已保留正式作品和通关证明。')).toBeInTheDocument();
  });

  it('drops a rejected prewarm without persisting failure and rebuilds only when the child runs', async () => {
    const failed = { ready: vi.fn(async () => { throw new Error('offline'); }), run: vi.fn(), cancel: vi.fn(), dispose: vi.fn() };
    const recovered = { ready: vi.fn(async () => undefined), run: vi.fn(async () => ({ trace: traceForField('appearance', { kind: 'python', line: 1, from: 3, to: 13 }) })), cancel: vi.fn(), dispose: vi.fn() };
    const value = setup(['saved', 'saved'], recovered.run, vi.fn(async () => true), false, failed);
    value.runtimeFactory.mockImplementation(() => recovered);
    await waitFor(() => expect(failed.ready).toHaveBeenCalledTimes(1));
    expect(value.updateMissionSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '对照运行' }));
    await waitFor(() => expect(value.runtimeFactory).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(recovered.run).toHaveBeenCalledTimes(1));
    expect(value.session().runnerInfrastructureFailures).toBe(0);
  });
  it('retains the identity draft candidate across a failed save', async () => {
    const value = setup(['unsaved', 'saved']); fireEvent.click(screen.getByRole('button', { name: '改为 identity' }));
    expect(await screen.findByRole('button', { name: '重试保存' })).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await waitFor(() => expect(value.updateMissionSession).toHaveBeenCalledTimes(2)); expect(value.session().pythonCode).toContain('identity');
  });
  it('retries run persistence without another Worker request', async () => {
    const run = vi.fn(async () => ({ trace: traceForField('appearance', { kind: 'python', line: 1, from: 3, to: 13 }) })); setup(['saved', 'unsaved', 'saved'], run);
    fireEvent.click(screen.getByRole('button', { name: '对照运行' })); expect(await screen.findByRole('button', { name: '重试保存' })).toBeInTheDocument(); expect(run).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '重试保存' })); await waitFor(() => expect(screen.queryByRole('button', { name: '重试保存' })).not.toBeInTheDocument()); expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not increment total runs twice when ProgressContext retains an unsaved run candidate', async () => {
    const value = setup(['saved', 'unsaved', 'saved'], vi.fn(async () => ({ trace: traceForField('appearance', { kind: 'python', line: 1, from: 3, to: 13 }) })), vi.fn(async () => true), true);
    fireEvent.click(screen.getByRole('button', { name: '对照运行' }));
    fireEvent.click(await screen.findByRole('button', { name: '重试保存' }));
    await waitFor(() => expect(value.session().totalRuns).toBe(1));
  });

  it('retries an observation against the same saved snapshot exactly once without changing the workspace or code', async () => {
    const value = setup(['saved', 'saved', 'unsaved', 'saved']);
    fireEvent.click(screen.getByRole('button', { name: '对照运行' }));
    fireEvent.click(await screen.findByRole('button', { name: '火眼金睛：观察本次判断' }));
    expect(await screen.findByRole('button', { name: '重试保存' })).toBeInTheDocument();
    expect(screen.queryByText('火眼金睛：本次已保存的事实')).not.toBeInTheDocument();
    const savedRun = value.updates[1]; const failedObservation = value.updates[2];
    expect(failedObservation.failureSnapshot).toEqual(savedRun.failureSnapshot);
    expect(failedObservation.workspace).toEqual(savedRun.workspace);
    expect(failedObservation.pythonCode).toBe(savedRun.pythonCode);
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await screen.findByText('火眼金睛：本次已保存的事实');
    expect(value.session().conditionObservationUses).toHaveLength(1);
    expect(value.session().conditionObservationUses[0]!.snapshotId).toBe(savedRun.failureSnapshot.snapshotId);
    expect(value.updates[3]!.conditionObservationUses).toEqual([expect.objectContaining({
      snapshotId: failedObservation.failureSnapshot.snapshotId,
      workspace: failedObservation.workspace,
      pythonCode: failedObservation.pythonCode,
    })]);
  });

  it('retries the same successful completion candidate once after a failed completion save', async () => {
    const complete = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const value = setup(['saved', 'saved', 'saved'], vi.fn(async () => ({ trace: traceForField('identity', { kind: 'python', line: 1, from: 3, to: 11 }) })), complete);
    fireEvent.click(screen.getByRole('button', { name: '改为 identity' }));
    await screen.findByText('新的 Python 字段已保存；旧对照记录已失效。');
    fireEvent.click(screen.getByRole('button', { name: '场景资源已就绪' }));
    fireEvent.click(screen.getByRole('button', { name: '对照运行' }));
    expect(await screen.findByRole('button', { name: '重试保存' })).toBeInTheDocument();
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(2));
    expect(complete.mock.calls[1]).toEqual(complete.mock.calls[0]);
    await expect(complete.mock.results[1]!.value).resolves.toBe(true);
    expect(value.session().lastRun?.completed).toBe(true);
  });

  it('turns a double click into one Worker run and one persisted run record', async () => {
    const value = setup(['saved', 'saved']);
    const runButton = screen.getByRole('button', { name: '对照运行' });
    fireEvent.click(runButton); fireEvent.click(runButton);
    await waitFor(() => expect(value.run).toHaveBeenCalledTimes(1));
    expect(value.updateMissionSession).toHaveBeenCalledTimes(2);
  });

  it('ignores a late Worker result after unmount without saving a run or completing', async () => {
    let resolve!: (value: { trace: ReturnType<typeof traceForField> }) => void;
    const late = new Promise<{ trace: ReturnType<typeof traceForField> }>((done) => { resolve = done; });
    const run = vi.fn(() => late);
    const complete = vi.fn(async () => true);
    const value = setup(['saved'], run, complete);
    fireEvent.click(screen.getByRole('button', { name: '对照运行' }));
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    value.unmount();
    await act(async () => { resolve({ trace: traceForField('identity', { kind: 'python', line: 1, from: 3, to: 11 }) }); await late; });
    expect(value.updateMissionSession).toHaveBeenCalledTimes(1);
    expect(complete).not.toHaveBeenCalled();
  });

  it('blocks a stale W4-M1 tab and only replaces its local draft after explicit external reload', async () => {
    const value = setup(['saved']);
    const external = createWeekFourMappingSession('2026-08-30T00:01:00.000Z');
    external.pythonCode = external.pythonCode.replace('appearance', 'identity');
    const reloadExternalProgress = vi.fn(() => { mocked.context = { ...mocked.context, saveStatus: 'idle' }; return { ...mocked.context.progress, sessions: { 'w4-m1': external } }; });
    mocked.context = { ...mocked.context, saveStatus: 'conflict', createBackup: vi.fn(() => ({ filename: 'w4-backup.json', contents: '{}', mimeType: 'application/json' })), reloadExternalProgress };
    value.rerender(<WeekFourMappingExperience reducedMotion muted onComplete={vi.fn(async () => true)} runtimeFactory={() => value.runtime} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('其他标签页已有新的学习进度');
    expect(screen.getByRole('button', { name: '对照运行' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '载入其他标签页进度' }));
    await waitFor(() => expect(reloadExternalProgress).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '对照运行' })).toBeEnabled();
  });
});
