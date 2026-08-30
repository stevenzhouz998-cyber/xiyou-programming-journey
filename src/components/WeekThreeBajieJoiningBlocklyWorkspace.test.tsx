import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as Blockly from 'blockly';
import { compileBajieJoiningWorkspace } from '../blockly/weekThreeBajieJoiningCompiler';
import { createDefaultBajieJoiningDraft, type BajieJoiningWorkspaceDraftV1 } from '../blockly/weekThreeBajieJoiningContract';
import { WeekThreeBajieJoiningBlocklyWorkspace } from './WeekThreeBajieJoiningBlocklyWorkspace';

afterEach(cleanup);

const createProps = () => ({
  draft: createDefaultBajieJoiningDraft(),
  locked: false,
  focusBlockId: null as string | null,
  onFocusHandled: vi.fn(),
  onDraftChange: vi.fn<(draft: BajieJoiningWorkspaceDraftV1) => Promise<{ status: 'saved' | 'unsaved' | 'conflict' }>>().mockResolvedValue({ status: 'saved' }),
  onRun: vi.fn(),
});

const componentWorkspace = (before: ReadonlySet<Blockly.Workspace>) => {
  const workspace = Blockly.Workspace.getAll().find((candidate) => !before.has(candidate) && candidate.getBlockById('bajie-boolean-operation'));
  if (!workspace) throw new Error('未找到八戒归队组件创建的 Blockly workspace');
  return workspace;
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
};

describe('W3-M4 Blockly workspace', () => {
  it('restores the default visible OR graph and saves only the current serialized draft', async () => {
    const value = createProps();
    const before = new Set(Blockly.Workspace.getAll());
    render(<WeekThreeBajieJoiningBlocklyWorkspace {...value} />);
    await screen.findByLabelText('八戒归队可连接积木图');
    const workspace = componentWorkspace(before);
    expect(compileBajieJoiningWorkspace(workspace)).toMatchObject({ ok: true, draft: { blocks: expect.arrayContaining([expect.objectContaining({ id: 'bajie-boolean-operation', operator: 'or' })]) } });
    expect(value.onDraftChange).not.toHaveBeenCalled();

    workspace.getBlockById('bajie-boolean-operation')!.setFieldValue('and', 'OPERATOR');
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalledTimes(1));
    const compiled = compileBajieJoiningWorkspace(workspace);
    if (!compiled.ok) throw new Error('默认工作区改为 AND 后应仍可编译');
    expect(value.onDraftChange.mock.calls[0]?.[0]).toEqual(compiled.draft);
  });

  it('gives the independent Blockly host a real desktop/mobile height and uses project button classes', async () => {
    const value = createProps();
    render(<WeekThreeBajieJoiningBlocklyWorkspace {...value} />);
    const host = await screen.findByLabelText('八戒归队可连接积木图');
    expect(host).toHaveClass('advanced-blockly-host');
    expect(screen.getByRole('button', { name: '交换两个条件的位置' })).toHaveClass('button', 'button-ghost');
    expect(screen.getByRole('button', { name: '恢复已保存积木' })).toHaveClass('button', 'button-ghost');
    expect(screen.getByRole('button', { name: '执行入队判断' })).toHaveClass('button', 'button-primary');
    const css = readFileSync(resolve(process.cwd(), 'src/components/WeekThreeBajieJoiningExperience.css'), 'utf8');
    expect(css).toMatch(/\.week-three-bajie-joining-experience\s+\.advanced-blockly-host\s*\{[^}]*position:\s*relative[^}]*min-height:\s*380px/);
    expect(css).toMatch(/\.week-three-bajie-joining-experience\s+\.advanced-blockly-host\s+\.injectionDiv\s*,\s*\.week-three-bajie-joining-experience\s+\.advanced-blockly-host\s+\.blocklySvg\s*\{[^}]*width:\s*100%[^}]*height:\s*100%/);
    expect(css).toMatch(/\.week-three-bajie-joining-experience\s+\.advanced-week-one-workspace\s*\{[^}]*min-width:\s*0[^}]*overflow:\s*hidden/);
    expect(css).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]*?\.week-three-bajie-joining-experience\s+\.advanced-blockly-host\s*\{[^}]*min-height:\s*(?:360|380)px/);
  });

  it('fits restored SVG Blockly graphs on an animation frame and constrains the narrow viewport without changing the draft', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/WeekThreeBajieJoiningBlocklyWorkspace.tsx'), 'utf8');
    expect(source).toContain('const fitWorkspace =');
    expect(source).toContain('window.requestAnimationFrame');
    expect(source).toContain('Blockly.svgResize(visual)');
    expect(source).toContain('visual.resizeContents()');
    expect(source).toContain('visual.zoomToFit()');
    expect(source).toContain('visual.getBlocksBoundingBox().getWidth() * visual.scale');
    expect(source).toContain('visual.setScale(visual.scale * available / rendered)');
    expect(source).toContain('root.moveBy(12 - point.x, 10 - point.y)');
    expect(source).toContain('new ResizeObserver(() => fitWorkspace(workspace, hostRef.current))');
    expect(source).toContain('fitWorkspace(workspace, hostRef.current);');
  });

  it('edits the actual Blockly operator field with keyboard input and preserves AND after swapping sensors', async () => {
    const value = createProps();
    const before = new Set(Blockly.Workspace.getAll());
    render(<WeekThreeBajieJoiningBlocklyWorkspace {...value} />);
    const host = await screen.findByLabelText('八戒归队可连接积木图');
    const workspace = componentWorkspace(before);
    const operation = workspace.getBlockById('bajie-boolean-operation')!;
    const field = operation.getField('OPERATOR')!;
    expect(field.getValue()).toBe('or');
    host.focus();
    fireEvent.keyDown(host, { key: 'Enter' });
    expect(field.getValue()).toBe('and');
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '交换两个条件的位置' }));
    await waitFor(() => expect(value.onDraftChange.mock.calls.at(-1)?.[0].blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'bajie-boolean-operation', operator: 'and', leftBlockId: 'bajie-willing-westward', rightBlockId: 'bajie-guanyin-precepts' }),
    ])));
  });

  it('lets native Enter and Space activate each palette button exactly once without a duplicate key handler', async () => {
    expect(readFileSync(resolve(process.cwd(), 'src/components/WeekThreeBajieJoiningBlocklyWorkspace.tsx'), 'utf8')).not.toContain('keyboardClick');
    const value = createProps();
    const before = new Set(Blockly.Workspace.getAll());
    render(<WeekThreeBajieJoiningBlocklyWorkspace {...value} />);
    await screen.findByLabelText('八戒归队可连接积木图');
    const workspace = componentWorkspace(before);
    const swap = screen.getByRole('button', { name: '交换两个条件的位置' });
    swap.focus();
    if (fireEvent.keyDown(swap, { key: 'Enter' })) fireEvent.click(swap);
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalledTimes(1));
    expect(workspace.getBlockById('bajie-boolean-operation')!.getInputTargetBlock('LEFT')!.id).toBe('bajie-willing-westward');
    const recover = screen.getByRole('button', { name: '恢复已保存积木' });
    recover.focus();
    if (fireEvent.keyDown(recover, { key: ' ' })) fireEvent.click(recover);
    expect(workspace.getBlockById('bajie-boolean-operation')!.getInputTargetBlock('LEFT')!.id).toBe('bajie-guanyin-precepts');
    expect(value.onDraftChange).toHaveBeenCalledTimes(1);
  });

  it.each(['unsaved', 'conflict'] as const)('queues the newest B snapshot after an in-flight A %s and ignores stale parent A', async (firstStatus) => {
    const first = deferred<{ status: 'saved' | 'unsaved' | 'conflict' }>();
    const second = deferred<{ status: 'saved' | 'unsaved' | 'conflict' }>();
    const value = createProps();
    value.onDraftChange.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    const before = new Set(Blockly.Workspace.getAll());
    const view = render(<WeekThreeBajieJoiningBlocklyWorkspace {...value} />);
    await screen.findByLabelText('八戒归队可连接积木图');
    const workspace = componentWorkspace(before);
    const operation = workspace.getBlockById('bajie-boolean-operation')!;
    operation.setFieldValue('and', 'OPERATOR');
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalledTimes(1));
    operation.setFieldValue('or', 'OPERATOR');
    first.resolve({ status: firstStatus });
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalledTimes(2));
    expect(value.onDraftChange.mock.calls[1]?.[0].blocks.find((block) => block.id === 'bajie-boolean-operation')?.operator).toBe('or');
    second.resolve({ status: 'saved' });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(''));
    const staleA = createDefaultBajieJoiningDraft();
    staleA.blocks.find((block) => block.id === 'bajie-boolean-operation')!.operator = 'and';
    view.rerender(<WeekThreeBajieJoiningBlocklyWorkspace {...value} draft={staleA} />);
    expect(workspace.getBlockById('bajie-boolean-operation')!.getFieldValue('OPERATOR')).toBe('or');
  });

  it('accepts Space on the same visible Blockly operator field', async () => {
    const value = createProps();
    const before = new Set(Blockly.Workspace.getAll());
    render(<WeekThreeBajieJoiningBlocklyWorkspace {...value} />);
    const host = await screen.findByLabelText('八戒归队可连接积木图');
    const workspace = componentWorkspace(before);
    host.focus();
    fireEvent.keyDown(host, { key: ' ' });
    expect(workspace.getBlockById('bajie-boolean-operation')!.getFieldValue('OPERATOR')).toBe('and');
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalled());
  });

  it('reports a structural input error, focuses the real combination block, and never runs a compile error', async () => {
    const value = createProps();
    const before = new Set(Blockly.Workspace.getAll());
    render(<WeekThreeBajieJoiningBlocklyWorkspace {...value} focusBlockId="bajie-boolean-operation" />);
    await screen.findByLabelText('八戒归队可连接积木图');
    const workspace = componentWorkspace(before);
    workspace.getBlockById('bajie-boolean-operation')!.getInputTargetBlock('RIGHT')!.outputConnection!.disconnect();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('两个条件都要放进组合积木里'));
    fireEvent.click(screen.getByRole('button', { name: '执行入队判断' }));
    await waitFor(() => expect(value.onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: false, diagnostics: [expect.objectContaining({ code: 'missing-boolean-input', sourceBlockId: 'bajie-boolean-operation' })] })));
    expect(value.onFocusHandled).toHaveBeenCalledTimes(1);
  });

  it('restores only the saved draft when the child requests recovery', async () => {
    const saved = createDefaultBajieJoiningDraft();
    saved.blocks.find((block) => block.id === 'bajie-boolean-operation')!.operator = 'and';
    const value = createProps();
    const before = new Set(Blockly.Workspace.getAll());
    render(<WeekThreeBajieJoiningBlocklyWorkspace {...value} draft={saved} />);
    await screen.findByLabelText('八戒归队可连接积木图');
    const workspace = componentWorkspace(before);
    workspace.getBlockById('bajie-boolean-operation')!.setFieldValue('or', 'OPERATOR');
    await waitFor(() => expect(value.onDraftChange).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '恢复已保存积木' }));
    await waitFor(() => expect(workspace.getBlockById('bajie-boolean-operation')!.getFieldValue('OPERATOR')).toBe('and'));
    expect(value.onDraftChange.mock.calls.at(-1)?.[0].blocks.find((block) => block.id === 'bajie-boolean-operation')?.operator).toBe('or');
  });
});
