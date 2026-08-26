import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProgressProvider } from '../context/ProgressContext';
import { completeMission, createInitialProgress, serializeProgress } from '../progress/progress';
import { CURRENT_PROGRESS_KEY } from '../progress/storage';
import { MissionPageContent } from './MissionPageContent';

describe('formal w2-m1 route', () => {
  beforeEach(() => {
    localStorage.clear();
    let progress = createInitialProgress();
    for (const missionId of ['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5']) {
      progress = completeMission(progress, missionId, { stars: 3, hintsUsed: 0 });
    }
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
  });

  it('loads the formal repeat-loop experience and never exposes the legacy builder', async () => {
    render(<MemoryRouter initialEntries={['/mission/w2-m1']}><ProgressProvider><Routes><Route path="/mission/:id" element={<MissionPageContent reducedMotion onGlobalModalOpenChange={() => undefined} onCompletionPersistenceActiveChange={() => undefined} />} /></Routes></ProgressProvider></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: '弼马温' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '加入主程序：接受弼马温官职' })).toBeInTheDocument();
    expect(screen.queryByText('兼容指令序列')).not.toBeInTheDocument();
  });
});
