import { describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createInitialProgress } from '../progress/schema';
import { createMissionSession } from '../progress/session';
import { compileCuilanBooleanDraft } from '../blockly/weekThreeCuilanBooleanContract';
const state = vi.hoisted(() => ({ api: null as any }));
const downloads = vi.hoisted(() => ({ text: vi.fn() }));
vi.mock('../context/ProgressContext', () => ({ useProgress: () => state.api }));
vi.mock('../utils/download', () => ({ downloadTextFile: downloads.text }));
import { WeekThreeCuilanBooleanExperience } from './WeekThreeCuilanBooleanExperience';

function setup(statuses: Array<'saved' | 'unsaved' | 'conflict'>, stable = false) {
  const progress = createInitialProgress(); let session = createMissionSession('w3-m2', '2026-08-27T00:00:00.000Z'); progress.sessions['w3-m2'] = session; if (stable) progress.abilities.conditionObservation = { acquiredAt: '2026-08-27T00:00:00.000Z', stableUnlockedAt: '2026-08-27T00:00:00.000Z' };
  const updates: any[] = []; state.api = { progress, updateMissionSession: vi.fn(async (_: string, update: any) => { const next = update(session); updates.push(next); const status = statuses.shift() ?? 'saved'; if (status === 'saved') { session = next; progress.sessions['w3-m2'] = next; } return { status, progress }; }) };
  return updates;
}
const Workspace = (props: any) => <><button onClick={() => void props.onDraftChange(props.draft)}>保存草稿</button><button onClick={() => props.onRun({ ok: true, draft: props.draft, trace: compileCuilanBooleanDraft(props.draft) })}>运行</button></>;
const SuccessfulWorkspace = (props: any) => <><button onClick={() => { const draft = structuredClone(props.draft); draft.blocks.find((block: any) => block.id === 'cuilan-identity-condition').type = 'w3_cuilan_condition_identity_is_cuilan'; void props.onDraftChange(draft); }}>修正第二道条件</button><button onClick={() => props.onRun({ ok: true, draft: props.draft, trace: compileCuilanBooleanDraft(props.draft) })}>运行</button></>;
const InspectWorkspace = (props: any) => <output data-testid="workspace-condition">{props.draft.blocks.find((block: any) => block.id === 'cuilan-identity-condition').type}</output>;
const Scene = (props: any) => <><button onClick={() => props.onResourceStateChange(true)}>资源就绪</button><button onClick={() => props.onPlaybackComplete()}>播放完成</button><output data-testid="scene-token">{props.replayToken}</output></>;
const MotionScene = (props: any) => <output data-testid="motion-scene" data-reduced-motion={String(props.reducedMotion)} data-muted={String(props.muted)} />;
const PreloadedScene = (props: any) => { useEffect(() => { props.onResourceStateChange(true); }, [props.replayToken]); return <><button onClick={() => props.onPlaybackComplete()}>播放完成</button><output data-testid="preloaded-token">{props.replayToken}</output></>; };
const ImmediateScene = (props: any) => { useEffect(() => { props.onResourceStateChange(true); if (props.replayToken > 0) props.onPlaybackComplete(); }, [props.replayToken]); return null; };

describe('W3-M2 persistence state machine', () => {
  it('does not treat the provider hydration revision as another tab while the initial workspace is mounting', async () => {
    const progress = createInitialProgress(); progress.sessions['w3-m2'] = createMissionSession('w3-m2', '2026-08-27T00:00:00.000Z');
    state.api = { progress, revision: 0, updateMissionSession: vi.fn() };
    const view = render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: Scene })} />);
    state.api = { ...state.api, revision: 1 };
    view.rerender(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: Scene })} />);
    expect(screen.queryByText('其他标签页已有新的学习进度，当前积木没有自动覆盖。')).toBeNull();
  });
  it('does not treat the revision published after its own saved draft as another tab', async () => {
    const progress = createInitialProgress(); const session = createMissionSession('w3-m2', '2026-08-27T00:00:00.000Z'); progress.sessions['w3-m2'] = session;
    state.api = { progress, revision: 1, updateMissionSession: vi.fn(async (_id: string, update: any) => ({ status: 'saved', progress: { ...progress, sessions: { ...progress.sessions, 'w3-m2': update(session) } } })) };
    const view = render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: Scene })} />);
    fireEvent.click(await screen.findByText('保存草稿'));
    await waitFor(() => expect(state.api.updateMissionSession).toHaveBeenCalled());
    state.api = { ...state.api, revision: 2 };
    view.rerender(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: Scene })} />);
    expect(screen.queryByText('其他标签页已有新的学习进度，当前积木没有自动覆盖。')).toBeNull();
  });
  it('draft fault retains same snapshot and blocks run until retry', async () => {
    const updates = setup(['unsaved', 'saved']); render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: Scene })} />);
    fireEvent.click(await screen.findByText('保存草稿')); expect(await screen.findByText('积木保存待重试')).toBeInTheDocument(); fireEvent.click(screen.getByText('重试保存'));
    await waitFor(() => expect(updates).toHaveLength(2)); expect(updates[0].workspace).toEqual(updates[1].workspace);
  });
  it('run fault hides observation until retry stores same trace', async () => {
    const updates = setup(['unsaved', 'saved'], true); render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: Scene })} />);
    fireEvent.click(await screen.findByText('运行')); expect(await screen.findByText('运行记录待重试')).toBeInTheDocument(); expect(screen.queryByText('外形和高翠兰相同')).toBeNull(); fireEvent.click(screen.getByText('重试保存'));
    await waitFor(() => expect(updates).toHaveLength(2)); expect(updates[0].lastTrace).toEqual(updates[1].lastTrace);
  });
  it('observation fault shows facts only after exactly one audit retry', async () => {
    setup(['saved', 'unsaved', 'saved'], true); render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: Scene })} />);
    fireEvent.click(await screen.findByText('运行')); await screen.findByText('第二道检查进入了继续装作高翠兰分支，先观察这次判断的证据。'); fireEvent.click(screen.getByText('使用火眼金睛观察这次判断')); expect(await screen.findByText('观察记录待重试')).toBeInTheDocument(); expect(screen.queryByText('外形和高翠兰相同')).toBeNull(); fireEvent.click(screen.getByText('重试保存')); await screen.findByText('外形和高翠兰相同');
  });
  it('preserves conflict status text and offers backup or external reload instead of a blind retry', async () => { setup(['conflict']); render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: Scene })} />); fireEvent.click(await screen.findByText('运行')); expect(await screen.findByText('运行记录待重试（其他标签页冲突）')).toBeInTheDocument(); expect(screen.queryByText('重试保存')).toBeNull(); expect(screen.getAllByText('下载当前积木备份')).toHaveLength(1); expect(screen.getAllByText('载入其他标签页进度')).toHaveLength(1); });

  it('persists a successful run before resource-ready playback and sends identical completion evidence once', async () => {
    const updates = setup(['saved']);
    const onComplete = vi.fn(() => true);
    render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={onComplete} workspaceLoader={async () => ({ default: SuccessfulWorkspace })} sceneLoader={async () => ({ default: Scene })} />);
    fireEvent.click(await screen.findByText('修正第二道条件'));
    await waitFor(() => expect(updates).toHaveLength(1));
    fireEvent.click(screen.getByText('运行'));
    await waitFor(() => expect(updates).toHaveLength(2));
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('资源就绪'));
    fireEvent.click(screen.getByText('播放完成'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete).toHaveBeenCalledWith({ stars: 3, hintsUsed: 0 });
    expect(updates[1].lastRun).toMatchObject({ completed: true });
  });
  it('completes a run when the scene assets were already ready before replay began', async () => {
    const updates = setup(['saved']); const onComplete = vi.fn(() => true);
    render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={onComplete} workspaceLoader={async () => ({ default: SuccessfulWorkspace })} sceneLoader={async () => ({ default: PreloadedScene })} />);
    fireEvent.click(await screen.findByText('修正第二道条件')); await waitFor(() => expect(updates).toHaveLength(1)); fireEvent.click(screen.getByText('运行'));
    await waitFor(() => expect(screen.getByTestId('preloaded-token')).toHaveTextContent('1')); fireEvent.click(screen.getByText('播放完成')); await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });
  it('keeps the ready gate when a reduced-motion scene reports resource readiness and playback completion in one effect', async () => {
    const updates = setup(['saved']); const onComplete = vi.fn(() => true);
    render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={onComplete} workspaceLoader={async () => ({ default: SuccessfulWorkspace })} sceneLoader={async () => ({ default: ImmediateScene })} />);
    fireEvent.click(await screen.findByText('修正第二道条件')); await waitFor(() => expect(updates).toHaveLength(1)); fireEvent.click(screen.getByText('运行'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });

  it.each([false, new Error('storage failed')])('keeps completion pending and retries only completion after %s', async (outcome) => {
    setup(['saved', 'saved']);
    const onComplete = vi.fn().mockImplementationOnce(() => { if (outcome instanceof Error) throw outcome; return outcome; }).mockReturnValue(true);
    render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={onComplete} workspaceLoader={async () => ({ default: SuccessfulWorkspace })} sceneLoader={async () => ({ default: Scene })} />);
    fireEvent.click(await screen.findByText('修正第二道条件'));
    await waitFor(() => expect(screen.getByText('运行')).toBeEnabled());
    fireEvent.click(screen.getByText('运行'));
    await waitFor(() => expect(screen.getByTestId('scene-token')).toHaveTextContent('1'));
    fireEvent.click(screen.getByText('资源就绪'));
    fireEvent.click(screen.getByText('播放完成'));
    expect(await screen.findByText('通关待保存')).toBeInTheDocument();
    const token = screen.getByTestId('scene-token').textContent;
    fireEvent.click(screen.getByText('重试保存'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('scene-token')).toHaveTextContent(token!);
  });

  it('replays persisted evidence without saving, incrementing runs, or completing again', async () => {
    const progress = createInitialProgress();
    const session = createMissionSession('w3-m2', '2026-08-27T00:00:00.000Z');
    const draft = structuredClone(session.workspace); draft.blocks.find((block) => block.id === 'cuilan-identity-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan';
    const trace = compileCuilanBooleanDraft(draft);
    const { runCuilanBooleanForDraft } = await import('../blockly/weekThreeCuilanBooleanContract');
    const run = runCuilanBooleanForDraft(draft, trace);
    Object.assign(session, { workspace: draft, lastTrace: trace, lastRun: run, totalRuns: 1, lastRunAt: '2026-08-27T00:00:00.000Z', checkpointResults: run.checkpointResults, failureSnapshot: null });
    progress.sessions['w3-m2'] = session;
    state.api = { progress, revision: 2, updateMissionSession: vi.fn() };
    const onComplete = vi.fn(() => true);
    render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={onComplete} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: Scene })} />);
    fireEvent.click(await screen.findByRole('button', { name: '重播上次运行' }));
    expect(state.api.updateMissionSession).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByText('资源就绪'));
    fireEvent.click(screen.getByText('播放完成'));
    await act(async () => {});
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not overwrite the visible draft after a provider conflict until the learner explicitly reloads it', async () => {
    const progress = createInitialProgress(); const backup = vi.fn();
    state.api = { progress, revision: 1, saveStatus: 'saved', updateMissionSession: vi.fn(), createBackup: backup, reloadExternalProgress: vi.fn() };
    const view = render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: InspectWorkspace })} sceneLoader={async () => ({ default: Scene })} />);
    const external = structuredClone(progress); const session = createMissionSession('w3-m2', '2026-08-27T00:00:00.000Z');
    session.workspace.blocks.find((block) => block.id === 'cuilan-identity-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan'; external.sessions['w3-m2'] = session;
    state.api = { ...state.api, progress: external, revision: 2, saveStatus: 'conflict', reloadExternalProgress: vi.fn(() => external) };
    view.rerender(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: InspectWorkspace })} sceneLoader={async () => ({ default: Scene })} />);
    expect(await screen.findByText('其他标签页已有新的学习进度，当前积木没有自动覆盖。')).toBeInTheDocument();
    expect(await screen.findByTestId('workspace-condition')).toHaveTextContent('w3_cuilan_condition_appearance_matches');
    fireEvent.click(screen.getByText('下载当前积木备份')); expect(backup).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('载入其他标签页进度'));
    await waitFor(() => expect(screen.getByTestId('workspace-condition')).toHaveTextContent('w3_cuilan_condition_identity_is_cuilan'));
  });

  it('allows same-page settings revisions to update scene props and run directly when the provider saved them', async () => {
    const updates = setup(['saved']);
    state.api = { ...state.api, revision: 1, saveStatus: 'idle' };
    const view = render(<WeekThreeCuilanBooleanExperience reducedMotion={false} muted={false} onComplete={() => true} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: MotionScene })} />);
    await screen.findByTestId('motion-scene');
    state.api = { ...state.api, revision: 2, saveStatus: 'saved' };
    view.rerender(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: MotionScene })} />);
    await waitFor(() => expect(screen.getByTestId('motion-scene')).toHaveAttribute('data-reduced-motion', 'true'));
    expect(screen.getByTestId('motion-scene')).toHaveAttribute('data-muted', 'true');
    expect(screen.queryByText('其他标签页已有新的学习进度，当前积木没有自动覆盖。')).toBeNull();
    fireEvent.click(screen.getByText('运行'));
    await waitFor(() => expect(updates).toHaveLength(1));
    expect(screen.queryByText('其他标签页已有新的学习进度，当前积木没有自动覆盖。')).toBeNull();
  });

  it('pauses the visible workspace when the progress provider reports an external conflict at the same revision and workspace', async () => {
    const progress = createInitialProgress();
    state.api = { progress, revision: 1, saveStatus: 'saved', updateMissionSession: vi.fn() };
    const view = render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: InspectWorkspace })} sceneLoader={async () => ({ default: Scene })} />);
    state.api = { ...state.api, saveStatus: 'conflict' };
    view.rerender(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: InspectWorkspace })} sceneLoader={async () => ({ default: Scene })} />);
    expect(await screen.findByText('其他标签页已有新的学习进度，当前积木没有自动覆盖。')).toBeInTheDocument();
    expect(await screen.findByTestId('workspace-condition')).toHaveTextContent('w3_cuilan_condition_appearance_matches');
  });

  it('keeps the workspace available when only the lazy scene loader fails', async () => {
    setup(['saved']); const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => { throw new Error('scene unavailable'); }} reloadPage={() => undefined} />);
      expect(await screen.findByText('变化高翠兰场景加载失败')).toBeInTheDocument();
      expect(await screen.findByText('运行')).toBeInTheDocument();
    } finally { error.mockRestore(); }
  });

  it('keeps the scene available when only the lazy workspace loader fails', async () => {
    setup(['saved']); const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => { throw new Error('workspace unavailable'); }} sceneLoader={async () => ({ default: Scene })} reloadPage={() => undefined} />);
      expect(await screen.findByText('变化高翠兰积木加载失败')).toBeInTheDocument();
      expect(await screen.findByText('资源就绪')).toBeInTheDocument();
    } finally { error.mockRestore(); }
  });

  it('does not mistake a revision published while its own draft save is pending for an external conflict', async () => {
    const progress = createInitialProgress(); let resolve!: (value: any) => void;
    state.api = { progress, revision: 1, updateMissionSession: vi.fn((_id: string, update: any) => new Promise((done) => { resolve = (result) => done(result); })) };
    const view = render(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: Scene })} />);
    fireEvent.click(await screen.findByText('保存草稿'));
    state.api = { ...state.api, revision: 2 };
    view.rerender(<WeekThreeCuilanBooleanExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: Scene })} />);
    expect(screen.queryByText('其他标签页已有新的学习进度，当前积木没有自动覆盖。')).toBeNull();
    resolve({ status: 'saved', progress: { ...progress, sessions: { 'w3-m2': createMissionSession('w3-m2', '2026-08-27T00:00:00.000Z') } } });
    await waitFor(() => expect(screen.queryByText('积木保存待重试')).toBeNull());
    expect(screen.queryByText('其他标签页已有新的学习进度，当前积木没有自动覆盖。')).toBeNull();
  });
});
