import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { compileWeekThreeBossDraft } from '../blockly/weekThreeBossCompiler';
import { weekThreeBossWorkspaceFingerprint } from '../blockly/weekThreeBossContract';
import { createSolvedWeekThreeBossDraftForTest } from '../blockly/weekThreeBossTestHelpers';
import { createMissionSession } from '../progress/session';

let api: any;
vi.mock('../context/ProgressContext', () => ({ useProgress: () => api }));
import { WeekThreeBossExperience } from './WeekThreeBossExperience';

const Workspace = (props: any) => <>
  <button onClick={() => void props.onDraftChange(props.draft)}>保存草稿</button>
  <button onClick={() => props.onRun(compileWeekThreeBossDraft(props.draft))}>运行整套试炼</button>
</>;
const Scene = (props: any) => <>
  <button onClick={() => props.onResourceStateChange(true)}>场景就绪</button>
  <button onClick={props.onPlaybackComplete}>播放结束</button>
</>;

function setup(statuses: Array<'saved' | 'unsaved' | 'conflict'>, saveStatus: 'idle' | 'conflict' = 'idle', keepFailedCandidate = false) {
  const session = createMissionSession('w3-m5', '2026-08-30T00:00:00.000Z');
  api = {
    saveStatus,
    progress: { sessions: { 'w3-m5': session }, abilities: { conditionObservation: { acquiredAt: '2026-08-30T00:00:00.000Z', stableUnlockedAt: '2026-08-30T00:00:00.000Z' } } },
    updateMissionSession: vi.fn(async (_id: string, update: any) => {
      const next = update(session);
      const status = statuses.shift() ?? 'saved';
      if (status === 'saved' || keepFailedCandidate) Object.assign(session, next);
      return { status, progress: { sessions: { 'w3-m5': session } } };
    }),
    createBackup: () => ({ filename: 'backup.json', contents: '{}', mimeType: 'application/json' }),
    reloadExternalProgress: () => api.progress,
  };
  return session;
}

function renderExperience(onComplete = vi.fn(async () => true), props: any = {}) {
  return render(<WeekThreeBossExperience reducedMotion muted onComplete={onComplete} workspaceLoader={async () => ({ default: Workspace })} sceneLoader={async () => ({ default: Scene })} {...props} />);
}

describe('W3-M5 保存优先 Experience', () => {
  it('连续编辑在首个保存晚到时合并队列，并只把第二版恢复为可见草稿', async () => {
    const session = createMissionSession('w3-m5', '2026-08-30T00:00:00.000Z');
    const releases: Array<() => void> = [];
    api = {
      saveStatus: 'idle', progress: { sessions: { 'w3-m5': session }, abilities: { conditionObservation: { acquiredAt: null, stableUnlockedAt: null } } }, createBackup: () => ({ filename: 'backup.json', contents: '{}', mimeType: 'application/json' }), reloadExternalProgress: () => api.progress,
      updateMissionSession: vi.fn((_id: string, update: any) => new Promise((resolve) => releases.push(() => {
        const next = update(session); Object.assign(session, next);
        resolve({ status: 'saved', progress: { sessions: { 'w3-m5': session } } });
      }))),
    };
    const QueueWorkspace = (props: any) => <><button onClick={() => props.onDraftChange({ ...props.draft, blocks: props.draft.blocks.map((block: any) => block.id === 'boss-run-all' ? { ...block, x: 111 } : block) })}>编辑一</button><button onClick={() => props.onDraftChange({ ...props.draft, blocks: props.draft.blocks.map((block: any) => block.id === 'boss-run-all' ? { ...block, x: 222 } : block) })}>编辑二</button></>;
    renderExperience(undefined, { workspaceLoader: async () => ({ default: QueueWorkspace }) });
    fireEvent.click(await screen.findByText('编辑一')); await waitFor(() => expect(releases).toHaveLength(1)); fireEvent.click(screen.getByText('编辑二'));
    releases.shift()!(); await waitFor(() => expect(releases).toHaveLength(1)); releases.shift()!();
    await waitFor(() => expect(session.workspace.blocks.find((block) => block.id === 'boss-run-all')!.x).toBe(222));
  });

  it('运行会先排空运行前已到达的草稿队列，再从最终保存图编译运行', async () => {
    const session = createMissionSession('w3-m5', '2026-08-30T00:00:00.000Z');
    const releases: Array<() => void> = [];
    api = {
      saveStatus: 'idle', progress: { sessions: { 'w3-m5': session }, abilities: { conditionObservation: { acquiredAt: null, stableUnlockedAt: null } } }, createBackup: () => ({ filename: 'backup.json', contents: '{}', mimeType: 'application/json' }), reloadExternalProgress: () => api.progress,
      updateMissionSession: vi.fn((_id: string, update: any) => new Promise((resolve) => releases.push(() => {
        const next = update(session); Object.assign(session, next);
        resolve({ status: 'saved', progress: { sessions: { 'w3-m5': session } } });
      }))),
    };
    const QueueWorkspace = (props: any) => <><button onClick={() => props.onDraftChange({ ...props.draft, blocks: props.draft.blocks.map((block: any) => block.id === 'boss-run-all' ? { ...block, x: 111 } : block) })}>编辑一</button><button onClick={() => props.onDraftChange({ ...props.draft, blocks: props.draft.blocks.map((block: any) => block.id === 'boss-run-all' ? { ...block, x: 222 } : block) })}>编辑二</button><button onClick={() => void props.onRun(compileWeekThreeBossDraft(props.draft))}>运行</button></>;
    renderExperience(undefined, { workspaceLoader: async () => ({ default: QueueWorkspace }) });
    fireEvent.click(await screen.findByText('编辑一')); await waitFor(() => expect(releases).toHaveLength(1));
    fireEvent.click(screen.getByText('编辑二')); fireEvent.click(screen.getByText('运行'));
    releases.shift()!(); await waitFor(() => expect(releases).toHaveLength(1));
    releases.shift()!(); await waitFor(() => expect(releases).toHaveLength(1));
    releases.shift()!();
    await waitFor(() => expect(session.workspace.blocks.find((block) => block.id === 'boss-run-all')!.x).toBe(222));
    expect(session.lastRun?.failure?.workspaceFingerprint).toBe(weekThreeBossWorkspaceFingerprint(session.workspace));
  });

  it('运行保存未完成时快速双击也只启动一条完整运行链', async () => {
    const session = createMissionSession('w3-m5', '2026-08-30T00:00:00.000Z');
    let release: (() => void) | undefined;
    api = {
      saveStatus: 'idle', progress: { sessions: { 'w3-m5': session }, abilities: { conditionObservation: { acquiredAt: null, stableUnlockedAt: null } } }, createBackup: () => ({ filename: 'backup.json', contents: '{}', mimeType: 'application/json' }), reloadExternalProgress: () => api.progress,
      updateMissionSession: vi.fn((_id: string, update: any) => new Promise((resolve) => { release = () => { const next = update(session); Object.assign(session, next); resolve({ status: 'saved', progress: { sessions: { 'w3-m5': session } } }); }; })),
    };
    renderExperience(); const run = await screen.findByText('运行整套试炼');
    fireEvent.click(run); fireEvent.click(run);
    await waitFor(() => expect(api.updateMissionSession).toHaveBeenCalledTimes(1));
    release!(); await waitFor(() => expect(api.updateMissionSession).toHaveBeenCalledTimes(2));
    release!(); await waitFor(() => expect(session.totalRuns).toBe(1));
  });

  it('先保存不可变草稿，再保存同一运行结果，才发布第一处阻塞反馈', async () => {
    setup(['saved', 'saved']); renderExperience();
    fireEvent.click(await screen.findByText('运行整套试炼'));
    await waitFor(() => expect(api.updateMissionSession).toHaveBeenCalledTimes(2));
    expect(api.updateMissionSession.mock.calls.map((call: any[]) => call[0])).toEqual(['w3-m5', 'w3-m5']);
    expect(screen.getByRole('alert')).toHaveTextContent('庄口求助');
    expect(screen.queryByText('火眼金睛：观察本次判断')).not.toBeNull();
  });

  it('运行保存失败时不发布反馈或观察，重试只持久化原运行候选', async () => {
    const session = setup(['saved', 'unsaved', 'saved'], 'idle', true); renderExperience();
    fireEvent.click(await screen.findByText('运行整套试炼'));
    expect(await screen.findByRole('alert')).toHaveTextContent('运行记录待重试');
    expect(screen.queryByText('火眼金睛：观察本次判断')).toBeNull(); expect(session.totalRuns).toBe(1);
    fireEvent.click(screen.getByText('重试保存'));
    await waitFor(() => expect(screen.getByText('火眼金睛：观察本次判断')).toBeInTheDocument());
    expect(session.totalRuns).toBe(1);
  });

  it('失败保存后才保存观察审计并显示观察；编辑图会清除旧运行和快照', async () => {
    setup(['saved', 'saved', 'saved', 'saved']); renderExperience();
    fireEvent.click(await screen.findByText('运行整套试炼')); await screen.findByText('火眼金睛：观察本次判断');
    fireEvent.click(screen.getByText('火眼金睛：观察本次判断'));
    const observation = await screen.findByRole('status');
    expect(observation).toHaveTextContent('实际分支');
    expect(observation).toHaveTextContent('接受降妖请求');
    expect(observation).toHaveTextContent('故事状态：庄口求助 → 庄口求助');
    expect(observation).toHaveTextContent('当前公开卡');
    expect(observation).toHaveTextContent('当前检查');
    expect(observation).toHaveTextContent('提到高老庄');
    expect(observation).not.toHaveTextContent(/明确请求降妖帮助|连接/);
    fireEvent.click(screen.getByText('保存草稿'));
    await waitFor(() => expect(screen.queryByText('火眼金睛：观察本次判断')).toBeNull());
  });

  it('资源就绪和当前 token 的成功播放均完成后，组件外完成函数只调用一次', async () => {
    const session = setup(['saved', 'saved']); session.workspace = createSolvedWeekThreeBossDraftForTest();
    const onComplete = vi.fn(async () => true); renderExperience(onComplete);
    fireEvent.click(await screen.findByText('运行整套试炼')); await waitFor(() => expect(api.updateMissionSession).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByText('播放结束')); expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('场景就绪')); fireEvent.click(screen.getByText('播放结束'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1)); fireEvent.click(screen.getByText('播放结束'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('CAS 冲突不覆盖其他标签页，提供备份和显式载入', async () => {
    setup([], 'conflict'); renderExperience();
    expect(await screen.findByRole('alert')).toHaveTextContent('其他标签页已有新的学习进度');
    expect(screen.getByText('下载当前积木备份')).toBeInTheDocument(); expect(screen.getByText('载入其他标签页进度')).toBeInTheDocument();
  });

  it('锁定时不允许重复运行', async () => {
    setup(['saved', 'saved']); renderExperience(undefined, { locked: true });
    fireEvent.click(await screen.findByText('运行整套试炼')); expect(api.updateMissionSession).not.toHaveBeenCalled();
  });
});
