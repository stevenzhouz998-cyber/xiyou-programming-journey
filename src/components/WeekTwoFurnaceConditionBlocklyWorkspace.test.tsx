import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultFurnaceConditionDraft } from '../blockly/weekTwoFurnaceConditionContract';
import { WeekTwoFurnaceConditionBlocklyWorkspace } from './WeekTwoFurnaceConditionBlocklyWorkspace';
describe('WeekTwoFurnaceConditionBlocklyWorkspace', () => {
  it('replaces the real condition socket through the visible sensor control', async () => {
    const changed = vi.fn(async () => ({ status: 'saved' as const }));
    render(<WeekTwoFurnaceConditionBlocklyWorkspace draft={createDefaultFurnaceConditionDraft()} locked={false} focusBlockId={null} onFocusHandled={() => undefined} onDraftChange={changed} onRun={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: '换成：听见炉头声响并看见光明' }));
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ blocks: expect.arrayContaining([expect.objectContaining({ type: 'xiyou_condition_furnace_open' })]) }));
  });
});
