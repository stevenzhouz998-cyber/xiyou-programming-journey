import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeekTwoHorseScene } from './WeekTwoHorseScene';

describe('WeekTwoHorseScene', () => {
  it('shows the second completed loop iteration from approved raster slots', async () => {
    const onPlaybackComplete = vi.fn();
    render(<WeekTwoHorseScene
      events={[{ type: 'horse-cared', state: 'horses-cared-2' }] as any}
      replayToken={1}
      reducedMotion
      muted
      onPlaybackComplete={onPlaybackComplete}
    />);

    fireEvent.load(await screen.findByAltText('天宫御马监庭院'));
    fireEvent.load(screen.getByAltText('三匹天马循环照料状态'));

    expect(screen.getByRole('img', { name: '弼马温循环代码执行场景' })).toHaveAttribute('data-scene-state', 'horses-cared-2');
    expect(screen.getByAltText('三匹天马循环照料状态')).toHaveAttribute('data-sprite-stage', '2');
    await waitFor(() => expect(onPlaybackComplete).toHaveBeenCalledOnce());
  });
});
