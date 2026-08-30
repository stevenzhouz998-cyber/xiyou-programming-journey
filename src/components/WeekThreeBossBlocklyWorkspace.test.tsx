import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultWeekThreeBossDraft } from '../blockly/weekThreeBossContract';
import { WeekThreeBossBlocklyWorkspace } from './WeekThreeBossBlocklyWorkspace';

describe('W3-M5 Blockly 工作区恢复', () => {
  it('保存的草稿不合法时显示受控恢复错误，并保留现有合法图供孩子继续运行', async () => {
    const onRun = vi.fn();
    const view = render(<WeekThreeBossBlocklyWorkspace draft={createDefaultWeekThreeBossDraft()} onDraftChange={vi.fn()} onRun={onRun} />);
    const invalid = createDefaultWeekThreeBossDraft();
    invalid.blocks.find((block) => block.id === 'manor-if')!.inputs.CONDITION = 'missing';
    view.rerender(<WeekThreeBossBlocklyWorkspace draft={invalid} onDraftChange={vi.fn()} onRun={onRun} />);
    expect(await screen.findByRole('status')).toHaveTextContent('保存的积木图无法安全恢复');
    fireEvent.click(screen.getByRole('button', { name: '运行整套试炼' }));
    await waitFor(() => expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: true })));
  });
});
