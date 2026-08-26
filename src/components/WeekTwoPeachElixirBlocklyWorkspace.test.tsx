import * as Blockly from 'blockly';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultPeachElixirDraft } from '../blockly/weekTwoPeachElixirContract';

async function loadWorkspace() {
  const modulePath = './WeekTwoPeachElixirBlocklyWorkspace';
  return import(/* @vite-ignore */ modulePath).catch(() => null);
}

describe('WeekTwoPeachElixirBlocklyWorkspace', () => {
  it('restores the visible wrong chain and moves the real problem block to produce the correct trace', async () => {
    const module = await loadWorkspace();
    expect(module).not.toBeNull();
    const workspace = new Blockly.Workspace();
    const onRun = vi.fn();
    const onDraftChange = vi.fn(async () => ({ status: 'saved' as const }));
    const Component = module!.WeekTwoPeachElixirBlocklyWorkspace;
    const Provider = module!.WeekTwoPeachElixirBlocklyWorkspaceAdapterProvider;
    render(<Provider adapter={{ create: () => workspace }}><Component draft={createDefaultPeachElixirDraft()} locked={false} focusBlockId={null} onFocusHandled={() => undefined} onDraftChange={onDraftChange} onRun={onRun} /></Provider>);

    expect(await screen.findByLabelText('蟠桃与金丹可连接调试图')).toBeInTheDocument();
    expect(workspace.getTopBlocks(false)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '将 吃下金丹 下移一步' }));
    fireEvent.click(screen.getByRole('button', { name: '运行调试后的故事' }));

    await waitFor(() => expect(onDraftChange).toHaveBeenCalled());
    await waitFor(() => expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: true, trace: expect.arrayContaining([
      expect.objectContaining({ sourceBlockId: 'peach-tusita', opcode: 'stumble_into_tusita', nextBlockId: 'peach-elixir' }),
    ]) })));
    workspace.dispose();
  });

  it('keeps deletion savable but returns the actual missing-action compile diagnostic', async () => {
    const module = await loadWorkspace();
    const workspace = new Blockly.Workspace();
    const onRun = vi.fn();
    const Component = module!.WeekTwoPeachElixirBlocklyWorkspace;
    const Provider = module!.WeekTwoPeachElixirBlocklyWorkspaceAdapterProvider;
    render(<Provider adapter={{ create: () => workspace }}><Component draft={createDefaultPeachElixirDraft()} locked={false} focusBlockId={null} onFocusHandled={() => undefined} onDraftChange={async () => ({ status: 'saved' })} onRun={onRun} /></Provider>);
    fireEvent.click(await screen.findByRole('button', { name: '删除 醉后误入兜率宫' }));
    fireEvent.click(screen.getByRole('button', { name: '运行调试后的故事' }));
    await waitFor(() => expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: false, diagnostics: [{ code: 'missing-action', sourceBlockId: expect.any(String), concept: 'program-structure' }] })));
    workspace.dispose();
  });

  it('waits for one in-flight corrected-draft save before running', async () => {
    const module = await loadWorkspace();
    const workspace = new Blockly.Workspace();
    const onRun = vi.fn();
    let resolveSave!: (value: { status: 'saved' }) => void;
    const pendingSave = new Promise<{ status: 'saved' }>((resolve) => { resolveSave = resolve; });
    const onDraftChange = vi.fn(() => pendingSave);
    const Component = module!.WeekTwoPeachElixirBlocklyWorkspace;
    const Provider = module!.WeekTwoPeachElixirBlocklyWorkspaceAdapterProvider;
    render(<Provider adapter={{ create: () => workspace }}><Component draft={createDefaultPeachElixirDraft()} locked={false} focusBlockId={null} onFocusHandled={() => undefined} onDraftChange={onDraftChange} onRun={onRun} /></Provider>);
    fireEvent.click(await screen.findByRole('button', { name: '将 吃下金丹 下移一步' }));
    await waitFor(() => expect(onDraftChange).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: '运行调试后的故事' }));
    expect(onDraftChange).toHaveBeenCalledOnce();
    expect(onRun).not.toHaveBeenCalled();
    resolveSave({ status: 'saved' });
    await waitFor(() => expect(onRun).toHaveBeenCalledOnce());
    expect(onDraftChange).toHaveBeenCalledOnce();
    workspace.dispose();
  });
});
