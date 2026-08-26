import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProgressProvider } from '../context/ProgressContext';
import { completeMission, createInitialProgress, serializeProgress } from '../progress/progress';
import { CURRENT_PROGRESS_KEY } from '../progress/storage';
import { MissionPageContent } from './MissionPageContent';

describe('formal w2-m3 route', () => {
  beforeEach(() => {
    localStorage.clear();
    let progress = createInitialProgress();
    for (const missionId of ['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5', 'w2-m1', 'w2-m2']) progress = completeMission(progress, missionId, { stars: 3, hintsUsed: 0 });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
  });

  it('loads the demand-loaded sequence debugger and never exposes legacy tools', async () => {
    render(<MemoryRouter initialEntries={['/mission/w2-m3']}><ProgressProvider><Routes><Route path="/mission/:id" element={<MissionPageContent reducedMotion onGlobalModalOpenChange={() => undefined} onCompletionPersistenceActiveChange={() => undefined} />} /></Routes></ProgressProvider></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: '蟠桃与金丹' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '运行调试后的故事' })).toBeInTheDocument();
    expect(screen.getByLabelText('蟠桃与金丹可连接调试图')).toBeInTheDocument();
    expect(screen.queryByText('兼容指令序列')).not.toBeInTheDocument();
  });
});
