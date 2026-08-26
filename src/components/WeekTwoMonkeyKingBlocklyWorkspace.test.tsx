import * as Blockly from 'blockly';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

async function loadWorkspace() {
  const modulePath = './WeekTwoMonkeyKingBlocklyWorkspace';
  return import(/* @vite-ignore */ modulePath).catch(() => null);
}

describe('WeekTwoMonkeyKingBlocklyWorkspace', () => {
  it('builds and compiles two real visible event-handler graphs', async () => {
    const module = await loadWorkspace();
    expect(module).not.toBeNull();
    const workspace = new Blockly.Workspace();
    const onRun = vi.fn();
    const onDraftChange = vi.fn(async () => ({ status: 'saved' as const }));
    const Component = module!.WeekTwoMonkeyKingBlocklyWorkspace;
    const Provider = module!.WeekTwoMonkeyKingBlocklyWorkspaceAdapterProvider;
    render(<Provider adapter={{ create: () => workspace }}><Component
      draft={{ version: 1, missionId: 'w2-m2', blocks: [] }}
      locked={false}
      focusBlockId={null}
      onFocusHandled={() => undefined}
      onDraftChange={onDraftChange}
      onRun={onRun}
    /></Provider>);

    for (const name of [
      '添加事件帽：返回花果山',
      '加入返回花果山：竖起齐天大圣旗',
      '添加事件帽：天庭正式授号',
      '加入天庭正式授号：接受齐天大圣名号',
      '加入天庭正式授号：建立齐天大圣府',
    ]) fireEvent.click(await screen.findByRole('button', { name }));
    fireEvent.click(screen.getByRole('button', { name: '派发两个事件' }));

    await waitFor(() => expect(onDraftChange).toHaveBeenCalled());
    expect(workspace.getTopBlocks(false)).toHaveLength(2);
    expect(workspace.getBlockById(workspace.getAllBlocks(false).find((block) => block.type === 'xiyou_raise_great_sage_flag')!.id)?.getSurroundParent()?.type).toBe('xiyou_on_return_flower_fruit');
    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: true, trace: expect.arrayContaining([
      expect.objectContaining({ kind: 'handler', eventType: 'return-to-flower-fruit' }),
      expect.objectContaining({ kind: 'action', opcode: 'build_great_sage_residence', parentBlockId: expect.any(String) }),
    ]) }));
    workspace.dispose();
  });

  it('keeps an incomplete single-handler draft savable but refuses to run it', async () => {
    const module = await loadWorkspace();
    expect(module).not.toBeNull();
    const workspace = new Blockly.Workspace();
    const onRun = vi.fn();
    const onDraftChange = vi.fn(async () => ({ status: 'saved' as const }));
    const Component = module!.WeekTwoMonkeyKingBlocklyWorkspace;
    const Provider = module!.WeekTwoMonkeyKingBlocklyWorkspaceAdapterProvider;
    render(<Provider adapter={{ create: () => workspace }}><Component draft={{ version: 1, missionId: 'w2-m2', blocks: [] }} locked={false} focusBlockId={null} onFocusHandled={() => undefined} onDraftChange={onDraftChange} onRun={onRun} /></Provider>);

    fireEvent.click(await screen.findByRole('button', { name: '添加事件帽：返回花果山' }));
    fireEvent.click(screen.getByRole('button', { name: '加入返回花果山：竖起齐天大圣旗' }));
    await waitFor(() => expect(onDraftChange).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '派发两个事件' }));

    await waitFor(() => expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: false, diagnostics: [{ code: 'missing-handler', sourceBlockId: expect.any(String), concept: 'program-structure' }] })));
    workspace.dispose();
  });
});
