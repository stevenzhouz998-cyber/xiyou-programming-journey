import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProgressProvider } from '../context/ProgressContext';
import { completeMission, createInitialProgress, serializeProgress } from '../progress/progress';
import { CURRENT_PROGRESS_KEY } from '../progress/storage';
import { MissionPageContent } from './MissionPageContent';

describe('formal w2-m5 route', () => {
  beforeEach(() => { localStorage.clear(); let progress = createInitialProgress(); for (const missionId of ['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5', 'w2-m1', 'w2-m2', 'w2-m3', 'w2-m4']) progress = completeMission(progress, missionId, { stars: 3, hintsUsed: 0 }); localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress)); });
  it('loads the Boss boundary and excludes legacy sequence tools', async () => {
    render(<MemoryRouter initialEntries={['/mission/w2-m5']}><ProgressProvider><Routes><Route path="/mission/:id" element={<MissionPageContent reducedMotion onGlobalModalOpenChange={() => undefined} onCompletionPersistenceActiveChange={() => undefined} />} /></Routes></ProgressProvider></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: '天宫总试炼' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '执行天宫总试炼' })).toBeInTheDocument();
    expect(screen.queryByText('兼容指令序列')).not.toBeInTheDocument();
  });

  it('persists each distinct Boss hint tier only once', async () => {
    render(<MemoryRouter initialEntries={['/mission/w2-m5']}><ProgressProvider><Routes><Route path="/mission/:id" element={<MissionPageContent reducedMotion onGlobalModalOpenChange={() => undefined} onCompletionPersistenceActiveChange={() => undefined} />} /></Routes></ProgressProvider></MemoryRouter>);
    const hint = await screen.findByRole('button', { name: '观察提示' });
    fireEvent.click(hint);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w2-m5']?.usedHintTiers ?? []).toEqual(['observe']));
    fireEvent.click(hint);
    fireEvent.click(hint);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w2-m5'].usedHintTiers).toEqual(['observe']));
  });
});
