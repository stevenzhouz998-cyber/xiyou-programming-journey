import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as Blockly from 'blockly';
import { compileCuilanBooleanDraft, createDefaultCuilanBooleanDraft, type CuilanBooleanWorkspaceDraftV1 } from '../blockly/weekThreeCuilanBooleanContract';
import { compileCuilanBooleanWorkspace } from '../blockly/weekThreeCuilanBooleanCompiler';
import { WeekThreeCuilanBooleanBlocklyWorkspace } from './WeekThreeCuilanBooleanBlocklyWorkspace';
afterEach(cleanup);
const props = () => ({ draft: createDefaultCuilanBooleanDraft(), locked: false, focusBlockId: null as string | null, onFocusHandled: vi.fn(), onDraftChange: vi.fn<(draft: CuilanBooleanWorkspaceDraftV1) => Promise<{ status: 'saved' | 'unsaved' | 'conflict' }>>().mockResolvedValue({ status: 'saved' }), onRun: vi.fn() });
const componentWorkspace = (before: ReadonlySet<Blockly.Workspace>) => {
  const workspace = Blockly.Workspace.getAll().find((candidate) => !before.has(candidate) && candidate.getAllBlocks(false).some((block) => block.type === 'w3_cuilan_if_identity_reveal'));
  if (!workspace) throw new Error('未找到变化高翠兰组件创建的 Blockly workspace');
  return workspace;
};
describe('W3-M2 Blockly workspace', () => {
  it('edits the second condition through the one real workspace and saves the resulting draft', async () => {
    const onDraftChange = vi.fn().mockResolvedValue({ status: 'saved' });
    render(<WeekThreeCuilanBooleanBlocklyWorkspace draft={createDefaultCuilanBooleanDraft()} locked={false} focusBlockId={null} onFocusHandled={() => undefined} onDraftChange={onDraftChange} onRun={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: '第二道条件换成：真实身份是高翠兰' }));
    await waitFor(() => expect(onDraftChange).toHaveBeenCalled());
    expect(onDraftChange.mock.calls.at(-1)?.[0].blocks).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'cuilan-identity-condition', type: 'w3_cuilan_condition_identity_is_cuilan' })]));
  });

  it('queues two rapid legal edits so the later snapshot is not swallowed by an earlier save', async () => {
    let resolveFirst: ((value: { status: 'saved' }) => void) | null = null;
    const onDraftChange = vi.fn().mockImplementation(() => new Promise<{ status: 'saved' }>((resolve) => { resolveFirst ??= resolve; }));
    render(<WeekThreeCuilanBooleanBlocklyWorkspace draft={createDefaultCuilanBooleanDraft()} locked={false} focusBlockId={null} onFocusHandled={() => undefined} onDraftChange={onDraftChange} onRun={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: '第二道条件换成：真实身份是高翠兰' }));
    await waitFor(() => expect(onDraftChange).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '第二道条件恢复：外形和高翠兰相同' }));
    (resolveFirst as ((value: { status: 'saved' }) => void) | null)?.({ status: 'saved' });
    await waitFor(() => expect(onDraftChange).toHaveBeenCalledTimes(2));
    expect(onDraftChange.mock.calls[1]?.[0].blocks).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'cuilan-identity-condition', type: 'w3_cuilan_condition_appearance_matches' })]));
  });

  it('supports keyboard correction and keeps the editor focus request connected to the real workspace', async () => {
    const onDraftChange = vi.fn().mockResolvedValue({ status: 'saved' }); const onFocusHandled = vi.fn();
    render(<WeekThreeCuilanBooleanBlocklyWorkspace draft={createDefaultCuilanBooleanDraft()} locked={false} focusBlockId="cuilan-identity-condition" onFocusHandled={onFocusHandled} onDraftChange={onDraftChange} onRun={vi.fn()} />);
    const button = await screen.findByRole('button', { name: '第二道条件换成：真实身份是高翠兰' });
    button.focus(); fireEvent.keyDown(button, { key: 'Enter' });
    await waitFor(() => expect(onDraftChange).toHaveBeenCalledTimes(1));
    expect(onFocusHandled).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(button);
  });

  it('does not update its status after an unmounted draft save resolves', async () => {
    let resolve!: (value: { status: 'saved' }) => void;
    const onDraftChange = vi.fn(() => new Promise<{ status: 'saved' }>((done) => { resolve = done; }));
    const view = render(<WeekThreeCuilanBooleanBlocklyWorkspace draft={createDefaultCuilanBooleanDraft()} locked={false} focusBlockId={null} onFocusHandled={() => undefined} onDraftChange={onDraftChange} onRun={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: '第二道条件换成：真实身份是高翠兰' }));
    await waitFor(() => expect(onDraftChange).toHaveBeenCalledTimes(1));
    view.unmount(); resolve({ status: 'saved' });
    await Promise.resolve();
    expect(onDraftChange).toHaveBeenCalledTimes(1);
  });

  it('deletes a real second gate block, exposes structural feedback, restores by keyboard, and disposes the workspace', async () => {
    const value = props(); const before = new Set(Blockly.Workspace.getAll());
    const { unmount } = render(<WeekThreeCuilanBooleanBlocklyWorkspace {...value} />);
    await screen.findByLabelText('变化高翠兰可连接积木图');
    const workspace = componentWorkspace(before);
    const gate = workspace.getBlockById('cuilan-identity-if')!;
    gate.getInputTargetBlock('ELSE')!.dispose(true);
    await waitFor(() => expect(screen.getByText('积木连接待修复，修复后会保存')).toBeInTheDocument());
    expect(value.onDraftChange).not.toHaveBeenCalled();
    const run = screen.getByRole('button', { name: '执行双闸门指令' });
    expect(run).toBeEnabled(); fireEvent.click(run);
    await waitFor(() => expect(value.onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: false })));
    expect(value.onRun.mock.calls.at(-1)?.[0].diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ concept: 'program-structure' })]));
    fireEvent.keyDown(screen.getByRole('button', { name: '恢复已保存积木' }), { key: 'Enter' });
    await waitFor(() => expect(compileCuilanBooleanWorkspace(workspace).ok).toBe(true));
    expect(value.onDraftChange).not.toHaveBeenCalled();
    value.onRun.mockClear(); fireEvent.click(run);
    await waitFor(() => expect(value.onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: true })));
    unmount(); expect(Blockly.Workspace.getAll()).not.toContain(workspace);
  });

  it('renders the restored default graph into the visible Blockly SVG', async () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'visual-workspace-unit-test' });
    try {
      const view = render(<WeekThreeCuilanBooleanBlocklyWorkspace {...props()} />);
      await waitFor(() => expect(view.container.querySelectorAll('.advanced-blockly-host .blocklyDraggable').length).toBeGreaterThan(0));
    } finally {
      Object.defineProperty(navigator, 'userAgent', { configurable: true, value: originalUserAgent });
    }
  });

  it('does not create a draft save while merely rendering a restored visual graph', async () => {
    const originalUserAgent = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'visual-workspace-unit-test' });
    try {
      const onDraftChange = vi.fn().mockResolvedValue({ status: 'saved' });
      render(<WeekThreeCuilanBooleanBlocklyWorkspace {...props()} onDraftChange={onDraftChange} />);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(onDraftChange).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, 'userAgent', { configurable: true, value: originalUserAgent });
    }
  });
});
