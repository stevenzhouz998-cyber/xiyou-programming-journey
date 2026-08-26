import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressProvider } from '../context/ProgressContext';
import { WeekTwoHeavenlySignalBossExperience } from './WeekTwoHeavenlySignalBossExperience';

describe('W2-M5 heavenly signal experience', () => {
  beforeEach(() => localStorage.clear());

  it('shows only the first visible loop mistake with zero punishment and no completion', async () => {
    const complete = vi.fn();
    render(<ProgressProvider><WeekTwoHeavenlySignalBossExperience reducedMotion muted onComplete={complete} /></ProgressProvider>);
    fireEvent.load(await screen.findByAltText('天宫信号调度台场景'));
    fireEvent.load(screen.getByAltText('天宫总试炼综合状态'));
    fireEvent.click(await screen.findByRole('button', { name: '执行天宫总试炼' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('还有一匹天马没有照料');
    expect(screen.getByText('本次错误不会扣除生命、资源或星级。')).toBeInTheDocument();
    expect(complete).not.toHaveBeenCalled();
  });

  it('does not let a restore-originated Blockly event clear a just-saved run', async () => {
    render(<ProgressProvider><WeekTwoHeavenlySignalBossExperience reducedMotion muted onComplete={() => undefined} /></ProgressProvider>);
    fireEvent.load(await screen.findByAltText('天宫信号调度台场景'));
    fireEvent.load(screen.getByAltText('天宫总试炼综合状态'));
    fireEvent.click(await screen.findByRole('button', { name: '执行天宫总试炼' }));
    await screen.findByRole('alert');
    await waitFor(() => expect(screen.getByRole('button', { name: '增加天马循环次数' })).toBeEnabled());
    expect(screen.queryByText('本次学习记录尚未保存，请重试。')).toBeNull();
  });

  it('unlocks after a saved draft retry without publishing a run or playback', async () => {
    let failDraft = true;
    const saveProgressCoordinated = vi.fn(async (progress: any) => {
      if (failDraft && progress.sessions['w2-m5']?.lastRun === null) return { status: 'unsaved' as const, progress, error: 'synthetic Boss draft fault' };
      localStorage.setItem('xiyou-programming-progress-v3', JSON.stringify(progress));
      return { status: 'saved' as const, revision: 1, progress };
    });
    const complete = vi.fn();
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as any)}><WeekTwoHeavenlySignalBossExperience reducedMotion muted onComplete={complete} /></ProgressProvider>);
    fireEvent.load(await screen.findByAltText('天宫信号调度台场景'));
    fireEvent.load(screen.getByAltText('天宫总试炼综合状态'));
    fireEvent.click(await screen.findByRole('button', { name: '增加天马循环次数' }));
    expect(await screen.findByText('本次学习记录尚未保存，请重试。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '执行天宫总试炼' })).toBeDisabled();
    expect(complete).not.toHaveBeenCalled();
    failDraft = false;
    fireEvent.click(screen.getByRole('button', { name: '重试保存本次记录' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '执行天宫总试炼' })).toBeEnabled());
    expect(screen.getByText('五道天宫信号正在等待你的积木安排。')).toBeInTheDocument();
    expect(complete).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('xiyou-programming-progress-v3')!).sessions['w2-m5'].lastRun).toBeNull();
  });
});
