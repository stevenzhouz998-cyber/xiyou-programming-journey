import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { compilePeachElixirDraft, createDefaultPeachElixirDraft } from '../blockly/weekTwoPeachElixirContract';
import { ProgressProvider } from '../context/ProgressContext';
import { createInitialProgress, serializeProgress } from '../progress/progress';
import { createMissionSession, updateWorkspaceDraft } from '../progress/session';
import { CURRENT_PROGRESS_KEY } from '../progress/storage';

async function loadExperience() {
  const modulePath = './WeekTwoPeachElixirExperience';
  return import(/* @vite-ignore */ modulePath).catch(() => null);
}

function correctDraft() {
  const draft = createDefaultPeachElixirDraft();
  const drink = draft.blocks.find((block) => block.id === 'peach-drink')!;
  const eat = draft.blocks.find((block) => block.id === 'peach-elixir')!;
  const tusita = draft.blocks.find((block) => block.id === 'peach-tusita')!;
  drink.nextId = tusita.id;
  tusita.previousId = drink.id;
  tusita.nextId = eat.id;
  eat.previousId = tusita.id;
  eat.nextId = null;
  return draft;
}

function seed(draft = createDefaultPeachElixirDraft()) {
  const progress = createInitialProgress();
  progress.sessions['w2-m3'] = updateWorkspaceDraft(createMissionSession('w2-m3'), draft, new Date(0).toISOString());
  localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
}

describe('WeekTwoPeachElixirExperience', () => {
  beforeEach(() => { localStorage.clear(); seed(); });

  it('persists and explains the real early-elixir block without completing', async () => {
    const module = await loadExperience();
    expect(module).not.toBeNull();
    const Experience = module!.WeekTwoPeachElixirExperience;
    const onComplete = vi.fn();
    render(<ProgressProvider><Experience reducedMotion muted onComplete={onComplete} /></ProgressProvider>);
    fireEvent.load(await screen.findByAltText('蟠桃园到兜率宫的天宫路线'));
    fireEvent.load(screen.getByAltText('蟠桃与金丹调试进度状态'));
    fireEvent.click(await screen.findByRole('button', { name: '运行调试后的故事' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('金丹积木跑得太早');
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w2-m3']).toMatchObject({ totalRuns: 1, runtimeFailures: 1, lastRun: { completed: false, diagnostic: { sourceBlockId: 'peach-elixir' } } }));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('durably saves a correct visible trace before playback can complete the mission', async () => {
    localStorage.clear();
    seed(correctDraft());
    expect(compilePeachElixirDraft(correctDraft())).toHaveLength(5);
    const module = await loadExperience();
    const Experience = module!.WeekTwoPeachElixirExperience;
    const onComplete = vi.fn();
    render(<ProgressProvider><Experience reducedMotion muted onComplete={onComplete} /></ProgressProvider>);
    fireEvent.load(await screen.findByAltText('蟠桃园到兜率宫的天宫路线'));
    fireEvent.load(screen.getByAltText('蟠桃与金丹调试进度状态'));
    fireEvent.click(await screen.findByRole('button', { name: '运行调试后的故事' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w2-m3']).toMatchObject({ lastRun: { completed: true, finalState: 'elixir-eaten' } }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
  });
});
