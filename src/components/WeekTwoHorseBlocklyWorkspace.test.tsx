import * as Blockly from 'blockly';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  WeekTwoHorseBlocklyWorkspace,
  WeekTwoHorseBlocklyWorkspaceAdapterProvider,
} from './WeekTwoHorseBlocklyWorkspace';

describe('WeekTwoHorseBlocklyWorkspace', () => {
  it('builds and compiles the real visible repeat graph through child controls', async () => {
    const workspace = new Blockly.Workspace();
    const onRun = vi.fn();
    const onDraftChange = vi.fn(async () => ({ status: 'saved' as const }));
    render(<WeekTwoHorseBlocklyWorkspaceAdapterProvider adapter={{ create: () => workspace }}>
      <WeekTwoHorseBlocklyWorkspace
        draft={{ version: 1, missionId: 'w2-m1', blocks: [] }}
        locked={false}
        focusBlockId={null}
        onFocusHandled={() => undefined}
        onDraftChange={onDraftChange}
        onRun={onRun}
      />
    </WeekTwoHorseBlocklyWorkspaceAdapterProvider>);

    for (const name of [
      '加入主程序：接受弼马温官职',
      '加入主程序：重复照料天马',
      '加入循环体：照料下一匹天马',
      '加入主程序：了解弼马温品级',
      '加入主程序：离开天庭返回花果山',
    ]) fireEvent.click(await screen.findByRole('button', { name }));
    fireEvent.click(screen.getByRole('button', { name: '执行弼马温循环' }));

    await waitFor(() => expect(onDraftChange).toHaveBeenCalled());
    expect(workspace.getBlockById(workspace.getAllBlocks(false).find((block) => block.type === 'xiyou_repeat_horse_care')!.id)?.getFieldValue('TIMES')).toBe(3);
    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({
      ok: true,
      trace: expect.arrayContaining([
        expect.objectContaining({ opcode: 'care_next_horse', iteration: 1 }),
        expect.objectContaining({ opcode: 'care_next_horse', iteration: 3 }),
      ]),
    }));
    workspace.dispose();
  });

  it('coalesces an in-flight draft save before running so a late duplicate cannot erase run evidence', async () => {
    const workspace = new Blockly.Workspace();
    const onRun = vi.fn();
    let resolveSave!: (value: { status: 'saved' }) => void;
    const pendingSave = new Promise<{ status: 'saved' }>((resolve) => { resolveSave = resolve; });
    const onDraftChange = vi.fn(() => pendingSave);
    const draft = {
      version: 1 as const,
      missionId: 'w2-m1' as const,
      blocks: [
        { id: 'accept', type: 'xiyou_accept_stable_post' as const, nextId: 'repeat', parentBlockId: null, repeatCount: null, x: 0, y: 0 },
        { id: 'repeat', type: 'xiyou_repeat_horse_care' as const, nextId: 'rank', parentBlockId: null, repeatCount: 3, x: 0, y: 50 },
        { id: 'care', type: 'xiyou_care_next_horse' as const, nextId: null, parentBlockId: 'repeat', repeatCount: null, x: 20, y: 70 },
        { id: 'rank', type: 'xiyou_learn_stable_rank' as const, nextId: 'leave', parentBlockId: null, repeatCount: null, x: 0, y: 120 },
        { id: 'leave', type: 'xiyou_leave_heaven' as const, nextId: null, parentBlockId: null, repeatCount: null, x: 0, y: 170 },
      ],
    };
    render(<WeekTwoHorseBlocklyWorkspaceAdapterProvider adapter={{ create: () => workspace }}>
      <WeekTwoHorseBlocklyWorkspace draft={draft} locked={false} focusBlockId={null} onFocusHandled={() => undefined} onDraftChange={onDraftChange} onRun={onRun} />
    </WeekTwoHorseBlocklyWorkspaceAdapterProvider>);

    fireEvent.click(await screen.findByRole('button', { name: '减少循环次数' }));
    await waitFor(() => expect(onDraftChange).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '执行弼马温循环' }));
    expect(onDraftChange).toHaveBeenCalledTimes(1);
    expect(onRun).not.toHaveBeenCalled();
    resolveSave({ status: 'saved' });
    await waitFor(() => expect(onRun).toHaveBeenCalledOnce());
    expect(onDraftChange).toHaveBeenCalledTimes(1);
    workspace.dispose();
  });
});
