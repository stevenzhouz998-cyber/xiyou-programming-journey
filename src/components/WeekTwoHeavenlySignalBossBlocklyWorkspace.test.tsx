import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultHeavenlySignalBossDraft } from '../blockly/weekTwoHeavenlySignalBossContract';
import { WeekTwoHeavenlySignalBossBlocklyWorkspace } from './WeekTwoHeavenlySignalBossBlocklyWorkspace';

describe('W2-M5 heavenly signal Blockly workspace', () => {
  it('repairs all four visible bugs through the same real Blockly workspace', async () => {
    const changed = vi.fn(async () => ({ status: 'saved' as const }));
    render(<WeekTwoHeavenlySignalBossBlocklyWorkspace draft={createDefaultHeavenlySignalBossDraft()} locked={false} focusBlockId="stable-repeat" onFocusHandled={() => undefined} onDraftChange={changed} onRun={() => undefined} />);
    for (const name of ['增加天马循环次数', '交换齐天事件动作', '把金丹放到误入兜率宫之后', '换成：听见炉头声响并看见光明']) fireEvent.click(await screen.findByRole('button', { name }));
    await waitFor(() => expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({ blocks: expect.arrayContaining([
      expect.objectContaining({ id: 'stable-repeat', repeatCount: 3 }),
      expect.objectContaining({ id: 'accept-title', handlerBlockId: 'title-handler' }),
      expect.objectContaining({ id: 'raise-flag', handlerBlockId: 'return-handler' }),
      expect.objectContaining({ type: 'xiyou_boss_condition_furnace_open' }),
    ]) })));
    expect(screen.getByLabelText('天宫总试炼可连接积木图')).toBeInTheDocument();
  });

  it('coalesces a same-draft save while a run waits for that durable save', async () => {
    let release!: (value: { status: 'saved' }) => void;
    const changed = vi.fn(() => new Promise<{ status: 'saved' }>((resolve) => { release = resolve; }));
    const run = vi.fn();
    render(<WeekTwoHeavenlySignalBossBlocklyWorkspace draft={createDefaultHeavenlySignalBossDraft()} locked={false} focusBlockId={null} onFocusHandled={() => undefined} onDraftChange={changed} onRun={run} />);
    fireEvent.click(await screen.findByRole('button', { name: '增加天马循环次数' }));
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: '执行天宫总试炼' }));
    expect(changed).toHaveBeenCalledOnce();
    expect(run).not.toHaveBeenCalled();
    release({ status: 'saved' });
    await waitFor(() => expect(run).toHaveBeenCalledOnce());
    expect(changed).toHaveBeenCalledOnce();
  });
});
