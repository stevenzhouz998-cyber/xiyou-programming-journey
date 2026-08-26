import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as Blockly from 'blockly';
import { compileManorHelpDraft, createDefaultManorHelpDraft, runManorHelp, type ManorHelpWorkspaceDraftV1 } from '../blockly/weekThreeManorHelpContract';
import { WeekThreeManorHelpBlocklyWorkspace } from './WeekThreeManorHelpBlocklyWorkspace';

const props = () => ({
  draft: createDefaultManorHelpDraft(),
  locked: false,
  focusBlockId: null as string | null,
  onFocusHandled: vi.fn(),
  onDraftChange: vi.fn<(draft: ManorHelpWorkspaceDraftV1) => Promise<{ status: 'saved' | 'unsaved' | 'conflict' }>>().mockResolvedValue({ status: 'saved' }),
  onRun: vi.fn(),
});

const componentWorkspace = (before: ReadonlySet<Blockly.Workspace>) => {
  const workspace = Blockly.Workspace.getAll().find((candidate) => !before.has(candidate) && candidate.getAllBlocks(false).some((block) => block.type === 'w3_manor_if_message'));
  if (!workspace) throw new Error('未找到庄上求助组件创建的 Blockly workspace');
  return workspace;
};

describe('W3-M1 庄上求助 Blockly 工作区', () => {
  it('默认错误图执行的 trace 会在练习口信上暴露条件选择失败', async () => {
    const value = props();
    render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);

    fireEvent.click(await screen.findByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(value.onRun).toHaveBeenCalledOnce());
    const result = value.onRun.mock.calls[0]![0];
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('默认图应能由真实 Blockly 图编译');
    expect(runManorHelp(result.trace)).toMatchObject({
      completed: false,
      diagnostic: { concept: 'condition-selection', sourceBlockId: 'manor-condition' },
    });
  });

  it('初始显示错误条件，替换后保存同一真实图并编译出两种观察值', async () => {
    const value = props();
    render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);

    expect(await screen.findByText('口信提到了高老庄')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));

    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalled());
    const changed = value.onDraftChange.mock.calls.at(-1)![0];
    expect(changed.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'w3_manor_condition_explicit_demon_help' }),
    ]));
    expect(compileManorHelpDraft(changed).filter((instruction) => instruction.opcode === 'condition-checked').map((instruction) => instruction.observedValue)).toEqual([true, false]);
  });

  it('先完成保存才运行，并将真实 workspace 的编译结果交给运行器', async () => {
    let release!: (result: { status: 'saved' }) => void;
    const value = props();
    value.onDraftChange.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);

    fireEvent.click(await screen.findByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalledOnce());
    fireEvent.click(await screen.findByRole('button', { name: '执行两张口信' }));
    expect(value.onRun).not.toHaveBeenCalled();
    release({ status: 'saved' });
    await waitFor(() => expect(value.onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: true, trace: expect.any(Array) })));
  });

  it.each(['unsaved', 'conflict'] as const)('%s 保存结果阻止运行并给出可见提示', async (status) => {
    const value = props();
    value.onDraftChange.mockResolvedValue({ status });
    render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);

    fireEvent.click(await screen.findByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(value.onRun).not.toHaveBeenCalled();
    if (status === 'unsaved') expect(screen.getByRole('button', { name: '重试保存积木' })).toBeInTheDocument();
  });

  it('冲突后冻结运行和修复，鼠标或键盘均不会再隐式保存', async () => {
    const value = props();
    value.onDraftChange.mockResolvedValue({ status: 'conflict' });
    render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);
    fireEvent.click(await screen.findByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('其他标签页已经更新'));
    value.onDraftChange.mockClear();
    const run = screen.getByRole('button', { name: '执行两张口信' });
    const repair = screen.getByRole('button', { name: '恢复“主动应承”分支' });
    expect(run).toBeDisabled();
    expect(repair).toBeDisabled();
    fireEvent.click(run);
    fireEvent.keyDown(run, { key: 'Enter' });
    fireEvent.click(repair);
    expect(value.onDraftChange).not.toHaveBeenCalled();
    expect(value.onRun).not.toHaveBeenCalled();
  });

  it('未保存时只允许明确重试，重试成功后才重新允许运行', async () => {
    const value = props();
    value.onDraftChange.mockResolvedValue({ status: 'unsaved' });
    render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);
    fireEvent.click(await screen.findByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '重试保存积木' })).toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(value.onDraftChange).toHaveBeenCalledOnce();
    value.onDraftChange.mockClear();
    value.onDraftChange.mockResolvedValue({ status: 'saved' });
    const run = screen.getByRole('button', { name: '执行两张口信' });
    expect(run).toBeDisabled();
    fireEvent.click(run);
    fireEvent.keyDown(run, { key: 'Enter' });
    expect(value.onDraftChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '重试保存积木' }));
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole('button', { name: '重试保存积木' })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(value.onRun).toHaveBeenCalledOnce());
  });

  it('修复分支会覆盖真实 THEN 与 ELSE 根积木，且不改条件', async () => {
    const value = props();
    const swapped = createDefaultManorHelpDraft();
    swapped.blocks.find((block) => block.id === 'manor-then')!.type = 'w3_manor_continue_journey';
    swapped.blocks.find((block) => block.id === 'manor-else')!.type = 'w3_manor_accept_and_return_notice';
    render(<WeekThreeManorHelpBlocklyWorkspace {...value} draft={swapped} />);

    fireEvent.click(await screen.findByRole('button', { name: '恢复“主动应承”分支' }));
    fireEvent.click(await screen.findByRole('button', { name: '恢复“继续问路”分支' }));
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalled());
    const changed = value.onDraftChange.mock.calls.at(-1)![0];
    const ifBlock = changed.blocks.find((block: { type: string }) => block.type === 'w3_manor_if_message')!;
    expect(changed.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'w3_manor_accept_and_return_notice', parentBlockId: ifBlock.id, branch: 'then', previousId: null }),
      expect.objectContaining({ type: 'w3_manor_continue_journey', parentBlockId: ifBlock.id, branch: 'else', previousId: null }),
      expect.objectContaining({ type: 'w3_manor_condition_mentions_gao_manor' }),
    ]));
  });

  it('直接删除真实 THEN/ELSE 积木后，两个可见恢复按钮重建可编译图且卸载清理 workspace', async () => {
    const value = props();
    const before = new Set(Blockly.Workspace.getAll());
    const { unmount } = render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);
    await screen.findByLabelText('庄上求助可连接积木图');
    const workspace = componentWorkspace(before);
    const ifBlock = workspace.getAllBlocks(false).find((block) => block.type === 'w3_manor_if_message')!;

    ifBlock.getInputTargetBlock('THEN')!.dispose(true);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('积木连接待修复，修复后会保存'));
    expect(value.onDraftChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(value.onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: false })));
    value.onRun.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '恢复“主动应承”分支' }));
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalled());
    let changed = value.onDraftChange.mock.calls.at(-1)![0];
    expect(changed.blocks).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'w3_manor_accept_and_return_notice', parentBlockId: ifBlock.id, branch: 'then', previousId: null })]));

    value.onDraftChange.mockClear();
    ifBlock.getInputTargetBlock('ELSE')!.dispose(true);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('积木连接待修复，修复后会保存'));
    expect(value.onDraftChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(value.onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: false })));
    value.onRun.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '恢复“继续问路”分支' }));
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalled());
    changed = value.onDraftChange.mock.calls.at(-1)![0];
    expect(changed.blocks).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'w3_manor_continue_journey', parentBlockId: ifBlock.id, branch: 'else', previousId: null })]));
    expect(() => compileManorHelpDraft(changed)).not.toThrow();

    unmount();
    expect(Blockly.Workspace.getAll()).not.toContain(workspace);
  });

  it('拒绝不合法的 incoming draft，不产生保存回声且禁用操作', async () => {
    const value = props();
    const invalid = { version: 1, missionId: 'w3-m1', blocks: [] } as unknown as ManorHelpWorkspaceDraftV1;
    render(<WeekThreeManorHelpBlocklyWorkspace {...value} draft={invalid} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('积木存档无法安全恢复');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(value.onDraftChange).not.toHaveBeenCalled();
    const repair = screen.getByRole('button', { name: '换成：口信是在明确请求降妖帮助' });
    expect(repair).toBeDisabled();
    expect(screen.getByRole('button', { name: '执行两张口信' })).toBeDisabled();
    fireEvent.click(repair);
    expect(value.onDraftChange).not.toHaveBeenCalled();
  });

  it('保存中收到旧 incoming draft 时保留本地最新图，并在保存后运行该图', async () => {
    let release!: (result: { status: 'saved' }) => void;
    const value = props();
    value.onDraftChange.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    const { rerender } = render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);
    fireEvent.click(await screen.findByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalledOnce());

    const stale = createDefaultManorHelpDraft();
    stale.blocks.find((block) => block.id === 'manor-root')!.x = 99;
    rerender(<WeekThreeManorHelpBlocklyWorkspace {...value} draft={stale} />);
    expect(screen.getByText('口信是在明确请求降妖帮助')).toBeInTheDocument();
    release({ status: 'saved' });
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(value.onRun).toHaveBeenCalledOnce());
    const result = value.onRun.mock.calls[0]![0];
    expect(result.ok && result.trace[1]?.conditionKind).toBe('explicit-demon-help');
  });

  it('在没有本地修改时接受新的合法 incoming draft', async () => {
    const value = props();
    const { rerender } = render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);
    const incoming = createDefaultManorHelpDraft();
    incoming.blocks.find((block) => block.id === 'manor-condition')!.type = 'w3_manor_condition_explicit_demon_help';
    rerender(<WeekThreeManorHelpBlocklyWorkspace {...value} draft={incoming} />);

    expect(await screen.findByText('口信是在明确请求降妖帮助')).toBeInTheDocument();
    expect(value.onDraftChange).not.toHaveBeenCalled();
  });

  it('晚完成的 A 保存不会授权 B 运行，B 会在 A 后单独持久化', async () => {
    const releases: Array<(result: { status: 'saved' }) => void> = [];
    const value = props();
    value.onDraftChange.mockImplementation(() => new Promise((resolve) => { releases.push(resolve); }));
    render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);
    fireEvent.click(await screen.findByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: '换成：口信提到了高老庄' }));
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    releases[0]!({ status: 'saved' });
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalledTimes(2));
    expect(value.onDraftChange.mock.calls[0]![0].blocks).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'w3_manor_condition_explicit_demon_help' })]));
    expect(value.onDraftChange.mock.calls[1]![0].blocks).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'w3_manor_condition_mentions_gao_manor' })]));
    expect(value.onRun).not.toHaveBeenCalled();
    releases[1]!({ status: 'saved' });
    await waitFor(() => expect(value.onRun).toHaveBeenCalledOnce());
  });

  it('同一草稿的并发保存会合并', async () => {
    let release!: (result: { status: 'saved' }) => void;
    const value = props();
    value.onDraftChange.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    const { rerender } = render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);
    fireEvent.click(await screen.findByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalledOnce());
    release({ status: 'saved' });
    await waitFor(() => expect(value.onRun).toHaveBeenCalledOnce());

    rerender(<WeekThreeManorHelpBlocklyWorkspace {...value} />);
  });

  it('锁定时鼠标和键盘都不修改或运行', async () => {
    const value = { ...props(), locked: true };
    render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);
    const repair = await screen.findByRole('button', { name: '换成：口信是在明确请求降妖帮助' });
    const run = screen.getByRole('button', { name: '执行两张口信' });
    expect(repair).toBeDisabled();
    expect(run).toBeDisabled();
    fireEvent.click(repair);
    fireEvent.keyDown(repair, { key: 'Enter' });
    fireEvent.click(run);
    expect(value.onDraftChange).not.toHaveBeenCalled();
    expect(value.onRun).not.toHaveBeenCalled();
  });

  it('处理一次真实积木聚焦，并由键盘激活可访问的修复按钮', async () => {
    const value = props();
    const before = new Set(Blockly.Workspace.getAll());
    const { rerender } = render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);
    await screen.findByLabelText('庄上求助可连接积木图');
    const workspace = componentWorkspace(before);
    const condition = workspace.getAllBlocks(false).find((block) => block.type === 'w3_manor_condition_mentions_gao_manor')! as Blockly.Block & { select?: () => void };
    const originalSelect = condition.select;
    const select = vi.fn();
    condition.select = select;
    value.onDraftChange.mockClear();
    rerender(<WeekThreeManorHelpBlocklyWorkspace {...value} focusBlockId={condition.id} />);
    await waitFor(() => expect(select).toHaveBeenCalledOnce());
    expect(value.onFocusHandled).toHaveBeenCalledOnce();
    expect(value.onDraftChange).not.toHaveBeenCalled();
    rerender(<WeekThreeManorHelpBlocklyWorkspace {...value} focusBlockId={condition.id} />);
    expect(value.onFocusHandled).toHaveBeenCalledOnce();
    expect(select).toHaveBeenCalledOnce();
    condition.select = originalSelect;
    const control = screen.getByRole('button', { name: '换成：口信是在明确请求降妖帮助' });
    control.focus();
    fireEvent.keyDown(control, { key: 'Enter' });
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalled());
    expect(screen.getByLabelText('庄上求助可连接积木图')).toBeInTheDocument();
  });

  it('卸载后延迟保存完成不会运行或报 React 更新错误', async () => {
    let release!: (result: { status: 'saved' }) => void;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const value = props();
    value.onDraftChange.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    const { unmount } = render(<WeekThreeManorHelpBlocklyWorkspace {...value} />);
    fireEvent.click(await screen.findByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalledOnce());
    unmount();
    release({ status: 'saved' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(value.onRun).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
