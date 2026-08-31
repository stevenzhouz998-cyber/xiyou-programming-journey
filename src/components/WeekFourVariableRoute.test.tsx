import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WeekFourVariableRouteBoundary, weekFourVariableRouteBranch } from './MissionPageContent';

describe('W4-M2 route decision', () => {
  it('keeps locked and historical access outside the generic legacy mission tools path', () => {
    expect(weekFourVariableRouteBranch({ kind: 'locked' })).toBe('locked');
    expect(weekFourVariableRouteBranch({ kind: 'historical-read-only' })).toBe('historical-read-only');
    expect(weekFourVariableRouteBranch({ kind: 'formal', upgradingLegacy: false })).toBe('formal');
    expect(weekFourVariableRouteBranch({ kind: 'formal', upgradingLegacy: true })).toBe('formal');
  });
});

it('loads the formal W4-M2 experience through its local lazy boundary', async () => {
  const FormalExperience = () => <p>正式变量取证体验</p>;
  render(<WeekFourVariableRouteBoundary reducedMotion muted onComplete={async () => true} loader={async () => ({ default: FormalExperience })} />);
  expect(await screen.findByText('正式变量取证体验')).toBeTruthy();
});

it('retries a lazy W4-M2 chunk locally without requesting a full-page reload', async () => {
  let attempts = 0;
  const loader = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('chunk failed');
    return { default: () => <p>局部重试后的变量体验</p> };
  };
  const reloadPage = vi.fn();
  render(<WeekFourVariableRouteBoundary reducedMotion muted onComplete={async () => true} loader={loader} reloadPage={reloadPage} />);
  fireEvent.click(await screen.findByRole('button', { name: '重新加载页面' }));
  expect(await screen.findByText('局部重试后的变量体验')).toBeTruthy();
  expect(reloadPage).not.toHaveBeenCalled();
});
