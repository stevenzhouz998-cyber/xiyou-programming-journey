import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createMissionSession } from '../progress/session';
import { compileBajieJoiningDraft } from '../blockly/weekThreeBajieJoiningContract';

let api: any;
vi.mock('../context/ProgressContext', () => ({ useProgress: () => api }));
import { WeekThreeBajieJoiningExperience } from './WeekThreeBajieJoiningExperience';

const Workspace = (props: any) => <>
  <button onClick={() => void props.onDraftChange(props.draft)}>保存草稿</button>
  <button onClick={() => props.onRun({ ok: true, draft: props.draft, trace: compileBajieJoiningDraft(props.draft) })}>执行入队判断</button>
</>;
const Scene = (props: any) => <>
  <button onClick={() => props.onResourceStateChange(true)}>场景就绪</button>
  <button onClick={props.onPlaybackComplete}>播放结束</button>
</>;

const setup = (statuses: Array<'saved' | 'unsaved' | 'conflict'>, saveStatus: 'idle' | 'conflict' = 'idle', retainUnpublished = false) => {
  const session = createMissionSession('w3-m4', '2026-08-28T00:00:00.000Z');
  api = {
    saveStatus,
    progress: { sessions: { 'w3-m4': session }, abilities: { conditionObservation: { acquiredAt: 'x', stableUnlockedAt: 'x' } } },
    updateMissionSession: vi.fn(async (_id: string, update: any) => {
      const next = update(session);
      const status = statuses.shift() ?? 'saved';
      if (status === 'saved' || retainUnpublished) Object.assign(session, next);
      return { status, progress: { sessions: { 'w3-m4': session } } };
    }),
    createBackup: () => ({ filename: 'backup.json', contents: '{}', mimeType: 'application/json' }),
    reloadExternalProgress: () => api.progress,
  };
  return session;
};

const renderExperience = (onComplete = vi.fn(async () => true)) => render(
  <WeekThreeBajieJoiningExperience
    reducedMotion
    muted
    onComplete={onComplete}
    workspaceLoader={async () => ({ default: Workspace })}
    sceneLoader={async () => ({ default: Scene })}
  />,
);

describe('W3-M4 保存优先 Experience', () => {
  it('从唯一公开情境数据渲染三张卡，并明确标记两张逻辑练习', async () => {
    setup([]);
    renderExperience();
    expect(await screen.findByText('原著情境·八戒归队')).toBeInTheDocument();
    expect(screen.getAllByText('逻辑练习·不改变原著')).toHaveLength(2);
    expect(screen.getAllByText(/这位同行者/)).toHaveLength(2);
  });

  it('先保存当前草稿，再保存同一快照的失败运行，才显示真实组合块反馈', async () => {
    setup(['saved', 'saved']);
    renderExperience();
    fireEvent.click(await screen.findByText('执行入队判断'));
    await waitFor(() => expect(api.updateMissionSession).toHaveBeenCalledTimes(2));
    expect(api.updateMissionSession.mock.calls[0]?.[0]).toBe('w3-m4');
    expect(screen.getByRole('alert')).toHaveTextContent('没有同时满足两个条件，程序却让它归队了');
    expect(screen.getByRole('alert')).not.toHaveTextContent('AND');
    expect(screen.getByText('火眼金睛：观察本次判断')).toBeInTheDocument();
  });

  it('运行写入未保存时不播放、不显示失败反馈，并按同一运行 payload 重试', async () => {
    setup(['saved', 'unsaved', 'saved']);
    renderExperience();
    fireEvent.click(await screen.findByText('执行入队判断'));
    expect(await screen.findByRole('alert')).toHaveTextContent('运行记录待重试');
    expect(screen.queryByText('火眼金睛：观察本次判断')).toBeNull();
    fireEvent.click(screen.getByText('重试保存'));
    await waitFor(() => expect(screen.getByText('火眼金睛：观察本次判断')).toBeInTheDocument());
  });

  it('草稿 B 未发布时重试持久化同一完整候选，不会被锁拦截或退回 A', async () => {
    const session = setup(['unsaved', 'saved'], 'idle', true);
    const BWorkspace = (props: any) => <button onClick={() => {
      const draft = structuredClone(props.draft);
      draft.blocks.find((block: any) => block.id === 'bajie-boolean-operation').operator = 'and';
      void props.onDraftChange(draft);
    }}>保存 B</button>;
    render(<WeekThreeBajieJoiningExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: BWorkspace })} sceneLoader={async () => ({ default: Scene })} />);
    fireEvent.click(await screen.findByText('保存 B'));
    expect(await screen.findByRole('alert')).toHaveTextContent('草稿待重试');
    fireEvent.click(screen.getByText('重试保存'));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(session.workspace.blocks.find((block) => block.id === 'bajie-boolean-operation')?.operator).toBe('and');
    expect(api.updateMissionSession).toHaveBeenCalledTimes(2);
  });

  it('运行候选未发布时重试不再 recordRun，保持一次运行与原始 lastRun', async () => {
    const session = setup(['saved', 'unsaved', 'saved'], 'idle', true);
    renderExperience();
    fireEvent.click(await screen.findByText('执行入队判断'));
    expect(await screen.findByRole('alert')).toHaveTextContent('运行记录待重试');
    const firstRun = structuredClone(session.lastRun);
    expect(session.totalRuns).toBe(1);
    fireEvent.click(screen.getByText('重试保存'));
    await waitFor(() => expect(screen.getByText('火眼金睛：观察本次判断')).toBeInTheDocument());
    expect(session.totalRuns).toBe(1);
    expect(session.lastRun).toEqual(firstRun);
  });

  it('观察候选未发布时重试只保存同一审计记录并显示观察', async () => {
    const session = setup(['saved', 'saved', 'unsaved', 'saved'], 'idle', true);
    renderExperience();
    fireEvent.click(await screen.findByText('执行入队判断'));
    await screen.findByText('火眼金睛：观察本次判断');
    fireEvent.click(screen.getByText('火眼金睛：观察本次判断'));
    expect(await screen.findByText('观察记录待重试')).toBeInTheDocument();
    expect(session.conditionObservationUses).toHaveLength(1);
    fireEvent.click(screen.getByText('重试保存'));
    expect(await screen.findByRole('status')).toHaveTextContent('当前可见 OR');
    expect(session.conditionObservationUses).toHaveLength(1);
  });

  it('结构失败候选未发布时重试不增加第二次 compile failure', async () => {
    const session = setup(['unsaved', 'saved'], 'idle', true);
    const BrokenWorkspace = (props: any) => <button onClick={() => props.onRun({ ok: false, draft: null, trace: [], diagnostics: [{ code: 'missing-boolean-input', sourceBlockId: 'bajie-boolean-operation', concept: 'program-structure' }] })}>结构错误</button>;
    render(<WeekThreeBajieJoiningExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: BrokenWorkspace })} sceneLoader={async () => ({ default: Scene })} />);
    fireEvent.click(await screen.findByText('结构错误'));
    expect(await screen.findByRole('alert')).toHaveTextContent('结构检查待重试');
    expect(session.compileFailures).toBe(1);
    fireEvent.click(screen.getByText('重试保存'));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(session.compileFailures).toBe(1);
  });

  it('completion retry reuses the existing success run instead of producing another run candidate', async () => {
    const session = setup(['saved', 'saved'], 'idle', true);
    session.workspace.blocks.find((block) => block.id === 'bajie-boolean-operation')!.operator = 'and';
    const onComplete = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderExperience(onComplete);
    fireEvent.click(await screen.findByText('执行入队判断'));
    await waitFor(() => expect(api.updateMissionSession).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByText('场景就绪'));
    fireEvent.click(screen.getByText('播放结束'));
    expect(await screen.findByRole('alert')).toHaveTextContent('通关待保存');
    fireEvent.click(screen.getByText('重试保存'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2));
    expect(session.totalRuns).toBe(1);
    expect(api.updateMissionSession).toHaveBeenCalledTimes(2);
  });

  it('先保存观察审计，再显示失败快照；编辑草稿会使旧快照失效', async () => {
    setup(['saved', 'saved', 'saved', 'saved']);
    renderExperience();
    fireEvent.click(await screen.findByText('执行入队判断'));
    await screen.findByText('火眼金睛：观察本次判断');
    fireEvent.click(screen.getByText('火眼金睛：观察本次判断'));
    expect(await screen.findByRole('status')).toHaveTextContent('当前可见 OR');
    expect(screen.getByRole('status')).toHaveTextContent('实际分支');
    fireEvent.click(screen.getByText('保存草稿'));
    await waitFor(() => expect(screen.queryByText('火眼金睛：观察本次判断')).toBeNull());
  });

  it('交换条件后按失败快照的真实 condition kind 标注真值', async () => {
    setup(['saved', 'saved', 'saved']);
    const SwappedWorkspace = (props: any) => <button onClick={() => {
      const draft = structuredClone(props.draft);
      const operation = draft.blocks.find((block: any) => block.id === 'bajie-boolean-operation');
      [operation.leftBlockId, operation.rightBlockId] = [operation.rightBlockId, operation.leftBlockId];
      props.onRun({ ok: true, draft, trace: compileBajieJoiningDraft(draft) });
    }}>交换并运行</button>;
    render(<WeekThreeBajieJoiningExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: SwappedWorkspace })} sceneLoader={async () => ({ default: Scene })} />);
    fireEvent.click(await screen.findByText('交换并运行'));
    await screen.findByText('火眼金睛：观察本次判断');
    fireEvent.click(screen.getByText('火眼金睛：观察本次判断'));
    expect(await screen.findByRole('status')).toHaveTextContent('明确愿随唐僧西去：假；观音劝善受戒：真');
  });

  it('把失败焦点交给 workspace 一次，确认后重渲染不再重复夺焦点', async () => {
    setup(['saved', 'saved']);
    const handled = vi.fn();
    const FocusWorkspace = (props: any) => { useEffect(() => { if (props.focusBlockId) { handled(props.focusBlockId); props.onFocusHandled(); } }, [props.focusBlockId, props.onFocusHandled]); return <button onClick={() => props.onRun({ ok: true, draft: props.draft, trace: compileBajieJoiningDraft(props.draft) })}>运行并聚焦</button>; };
    render(<WeekThreeBajieJoiningExperience reducedMotion muted onComplete={() => true} workspaceLoader={async () => ({ default: FocusWorkspace })} sceneLoader={async () => ({ default: Scene })} />);
    fireEvent.click(await screen.findByText('运行并聚焦'));
    await waitFor(() => expect(handled).toHaveBeenCalledTimes(1));
    expect(handled).toHaveBeenCalledWith('bajie-boolean-operation');
  });

  it('CAS 冲突提供备份与显式载入，不静默覆盖', async () => {
    setup([], 'conflict');
    renderExperience();
    expect(await screen.findByRole('alert')).toHaveTextContent('其他标签页已有新的学习进度');
    expect(screen.getByText('下载当前积木备份')).toBeInTheDocument();
    expect(screen.getByText('载入其他标签页进度')).toBeInTheDocument();
  });

  it('场景资源就绪和可见成功播放结束后，同一 replay token 只完成一次', async () => {
    const session = setup(['saved', 'saved']);
    session.workspace.blocks.find((block) => block.id === 'bajie-boolean-operation')!.operator = 'and';
    const onComplete = vi.fn(async () => true);
    renderExperience(onComplete);
    fireEvent.click(await screen.findByText('执行入队判断'));
    await waitFor(() => expect(api.updateMissionSession).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByText('播放结束'));
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('场景就绪'));
    fireEvent.click(screen.getByText('播放结束'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('播放结束'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
