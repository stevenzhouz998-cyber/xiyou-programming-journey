import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeekTwoHeavenlySignalBossScene } from './WeekTwoHeavenlySignalBossScene';

describe('W2-M5 heavenly signal scene', () => {
  it('fails closed on an asset error and exposes a retry without creating success', async () => {
    render(<WeekTwoHeavenlySignalBossScene events={[]} replayToken={0} reducedMotion muted />);
    fireEvent.error(await screen.findByAltText('天宫信号调度台场景'));
    expect(screen.getByRole('alert')).toHaveTextContent('场景图片没有加载成功');
    expect(screen.getByRole('button', { name: '重试加载场景图片' })).toBeEnabled();
  });
});
