import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import * as Blockly from 'blockly';
import { createRef } from 'react';
import { createDefaultWeekFourMappingDraft } from '../blockly/weekFourMappingCompiler';
import { WeekFourMappingBlocklyWorkspace, type WeekFourMappingBlocklyWorkspaceHandle } from './WeekFourMappingBlocklyWorkspace';

afterEach(cleanup);

describe('W4-M1 Blockly reference workspace', () => {
  it('restores five real, non-editable Blockly blocks and compiles the visible graph', async () => {
    const before = new Set(Blockly.Workspace.getAll());
    const ref = createRef<WeekFourMappingBlocklyWorkspaceHandle>();
    render(<WeekFourMappingBlocklyWorkspace ref={ref} draft={createDefaultWeekFourMappingDraft()} focusBlockId={null} />);
    await screen.findByText('只读参考图');
    const workspace = Blockly.Workspace.getAll().find((item) => !before.has(item));
    expect(workspace?.getAllBlocks(false)).toHaveLength(5);
    expect(document.querySelectorAll('.blocklyDraggable[data-id]')).toHaveLength(5);
    expect(ref.current?.compile()).toMatchObject({ trace: expect.arrayContaining([expect.objectContaining({ field: 'identity' })]) });
    expect(screen.getByText('只读参考图')).toBeInTheDocument();
  });

  it('surfaces recovery errors and focuses the requested real block', async () => {
    const draft = createDefaultWeekFourMappingDraft();
    draft.blocks[0]!.type = 'unknown';
    render(<WeekFourMappingBlocklyWorkspace draft={draft} focusBlockId="mapping-if" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('无法恢复');
  });

  it('compiles from the actual visible workspace and rejects a damaged visible connection', async () => {
    const ref = createRef<WeekFourMappingBlocklyWorkspaceHandle>();
    const before = new Set(Blockly.Workspace.getAll());
    render(<WeekFourMappingBlocklyWorkspace ref={ref} draft={createDefaultWeekFourMappingDraft()} focusBlockId={null} />);
    await screen.findByText('只读参考图');
    const workspace = Blockly.Workspace.getAll().find((item) => !before.has(item)!);
    workspace!.getBlockById('mapping-if')!.getInput('CONDITION')!.connection!.disconnect();
    expect(() => ref.current!.compile()).toThrow('条件连接无效');
  });
});
