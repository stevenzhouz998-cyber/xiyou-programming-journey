import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { updateWorkspaceDraft } from '../progress/session';
import { CURRENT_PROGRESS_KEY } from '../progress/storage';
import { ProgressProvider, useProgress } from './ProgressContext';

const draft = {
  version: 1 as const,
  missionId: 'w2-m1' as const,
  blocks: [
    { id: 'accept', type: 'xiyou_accept_stable_post' as const, nextId: null, parentBlockId: null, repeatCount: null, x: 0, y: 0 },
  ],
};

function Probe() {
  const progress = useProgress() as any;
  const [status, setStatus] = useState('idle');
  return <><button type="button" onClick={() => {
    void (async () => {
      try {
        const result = await progress.updateMissionSession('w2-m1', (session: any) => updateWorkspaceDraft(session, draft, new Date(0).toISOString()));
        setStatus(result.status);
      } catch {
        setStatus('error');
      }
    })();
  }}>保存弼马温草稿</button><output>{status}</output></>;
}

describe('ProgressContext w2-m1 dispatch', () => {
  beforeEach(() => localStorage.clear());

  it('creates and saves the formal horse-care session under its own mission id', async () => {
    render(<ProgressProvider><Probe /></ProgressProvider>);

    fireEvent.click(screen.getByRole('button', { name: '保存弼马温草稿' }));

    await waitFor(() => expect(screen.getByText('saved')).toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w2-m1'].workspace).toEqual(draft);
  });
});
