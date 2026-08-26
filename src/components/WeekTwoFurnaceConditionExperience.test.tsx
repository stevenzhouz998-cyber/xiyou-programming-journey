import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressProvider } from '../context/ProgressContext';
import { WeekTwoFurnaceConditionExperience } from './WeekTwoFurnaceConditionExperience';
describe('WeekTwoFurnaceConditionExperience', () => {
  beforeEach(() => localStorage.clear());

  it('explains the default visible red-eyes condition without completing', async () => {
    const complete = vi.fn();
    render(<ProgressProvider><WeekTwoFurnaceConditionExperience reducedMotion muted onComplete={complete} /></ProgressProvider>);
    fireEvent.load(await screen.findByAltText('八卦炉内部与炉门'));
    fireEvent.load(screen.getByAltText('八卦炉七轮等待与脱身状态'));
    fireEvent.click(await screen.findByRole('button', { name: '执行八卦炉循环' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('眼睛变红只说明烟很大');
    expect(complete).not.toHaveBeenCalled();
  });

  it('unlocks after a saved draft retry without publishing playback', async () => {
    let failDraft = true;
    const saveProgressCoordinated = vi.fn(async (progress: any) => {
      if (failDraft && progress.sessions['w2-m4']?.lastRun === null) {
        return { status: 'unsaved' as const, progress, error: 'synthetic furnace draft fault' };
      }
      localStorage.setItem('xiyou-programming-progress-v3', JSON.stringify(progress));
      return { status: 'saved' as const, revision: 1, progress };
    });
    const complete = vi.fn();

    render(
      <ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as any)}>
        <WeekTwoFurnaceConditionExperience reducedMotion muted onComplete={complete} />
      </ProgressProvider>,
    );
    fireEvent.load(await screen.findByAltText('八卦炉内部与炉门'));
    fireEvent.load(screen.getByAltText('八卦炉七轮等待与脱身状态'));
    fireEvent.click(await screen.findByRole('button', { name: '换成：听见炉头声响并看见光明' }));

    expect(await screen.findByText('本次学习记录尚未保存，请重试。')).toBeVisible();
    expect(screen.getByRole('button', { name: '执行八卦炉循环' })).toBeDisabled();
    failDraft = false;
    fireEvent.click(screen.getByRole('button', { name: '重试保存本次记录' }));

    await waitFor(() => expect(screen.getByRole('button', { name: '执行八卦炉循环' })).toBeEnabled());
    expect(screen.queryByText('本次学习记录尚未保存，请重试。')).toBeNull();
    expect(screen.queryByText('这次积木更改还没有保存。')).toBeNull();
    expect(complete).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('xiyou-programming-progress-v3')!).sessions['w2-m4'].lastRun).toBeNull();
  });

  it('offers backup and external-load recovery for a draft conflict', async () => {
    const saveProgressCoordinated = vi.fn(async (progress: any) => ({
      status: 'conflict' as const,
      progress,
      error: 'synthetic furnace conflict',
    }));

    render(
      <ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as any)}>
        <WeekTwoFurnaceConditionExperience reducedMotion muted onComplete={() => undefined} />
      </ProgressProvider>,
    );
    fireEvent.load(await screen.findByAltText('八卦炉内部与炉门'));
    fireEvent.load(screen.getByAltText('八卦炉七轮等待与脱身状态'));
    fireEvent.click(await screen.findByRole('button', { name: '换成：听见炉头声响并看见光明' }));

    expect(await screen.findByText('本次记录与其他标签页冲突。')).toBeVisible();
    expect(screen.getAllByRole('button', { name: '下载本页备份' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '载入其他标签页版本' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '重试保存本次记录' })).toBeNull();
  });
});
