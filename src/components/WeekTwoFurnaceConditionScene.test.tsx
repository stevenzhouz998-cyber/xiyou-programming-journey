import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeekTwoFurnaceConditionScene } from './WeekTwoFurnaceConditionScene';
describe('WeekTwoFurnaceConditionScene', () => {
  it('fails closed and offers an asset retry', async () => {
    render(<WeekTwoFurnaceConditionScene events={[]} replayToken={0} reducedMotion muted />);
    fireEvent.error(await screen.findByAltText('八卦炉内部与炉门'));
    expect(screen.getByRole('alert')).toHaveTextContent('场景图片没有加载成功');
    expect(screen.getByRole('button', { name: '重试加载场景图片' })).toBeEnabled();
  });
});
