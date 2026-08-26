import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ManorHelpRuntimeEvent } from '../blockly/weekThreeManorHelpContract';
import { WeekThreeManorHelpScene } from './WeekThreeManorHelpScene';

const event = (overrides: Partial<ManorHelpRuntimeEvent> = {}): ManorHelpRuntimeEvent => ({
  type: 'run-started', scenarioId: null, opcode: null, sourceBlockId: null, parentBlockId: null,
  conditionSourceBlockId: null, conditionKind: null, conditionLabel: null, observedValue: null,
  evidenceCode: null, evidenceTextKey: null, actualBranch: null, ...overrides,
});

afterEach(() => vi.useRealTimers());

describe('WeekThreeManorHelpScene', () => {
  it('remains resource-ready and completes playback after StrictMode effect replay', () => {
    vi.useFakeTimers();
    const onResourceStateChange = vi.fn();
    const onPlaybackComplete = vi.fn();
    render(<StrictMode><WeekThreeManorHelpScene events={[]} replayToken={1} reducedMotion muted onResourceStateChange={onResourceStateChange} onPlaybackComplete={onPlaybackComplete} /></StrictMode>);
    fireEvent.load(screen.getByAltText('高老庄求助道路'));
    fireEvent.load(screen.getByAltText('高才回庄与庄客问路状态'));
    expect(screen.getByRole('img', { name: '庄上求助代码执行场景' })).toHaveAttribute('data-scene-ready', 'true');
    expect(onResourceStateChange).toHaveBeenLastCalledWith(true);
    vi.runOnlyPendingTimers();
    expect(onPlaybackComplete).toHaveBeenCalledTimes(1);
  });

  it('uses two approved sources and signals ready after both load', () => {
    const onResourceStateChange = vi.fn();
    render(<WeekThreeManorHelpScene events={[]} replayToken={0} reducedMotion muted onResourceStateChange={onResourceStateChange} />);
    const background = screen.getByAltText('高老庄求助道路');
    const states = screen.getByAltText('高才回庄与庄客问路状态');
    expect(background).toHaveAttribute('src', expect.stringContaining('/assets/week-three-manor-help/manor-help-background.webp'));
    expect(states).toHaveAttribute('src', expect.stringContaining('/assets/week-three-manor-help/manor-message-states.webp'));
    fireEvent.load(background); fireEvent.load(states);
    expect(screen.getByRole('img', { name: '庄上求助代码执行场景' })).toHaveAttribute('data-scene-ready', 'true');
    expect(onResourceStateChange).toHaveBeenLastCalledWith(true);
  });

  it.each([
    [[], '0', '高才说明求助'],
    [[event({ scenarioId: 'canon-gaocai-help', type: 'scenario-settled', actualBranch: 'then' })], '1', '高才回庄禀报'],
    [[event({ scenarioId: 'practice-manor-directions', type: 'message-received' })], '2', '庄客正在介绍高老庄的道路'],
    [[event({ scenarioId: 'practice-manor-directions', type: 'scenario-settled', actualBranch: 'else' })], '3', '庄客继续前行'],
  ])('maps runtime event to the visible narrative state', (events, cell, narrative) => {
    render(<WeekThreeManorHelpScene events={events as ManorHelpRuntimeEvent[]} replayToken={0} reducedMotion muted />);
    const scene = screen.getByRole('img', { name: '庄上求助代码执行场景' });
    expect(scene).toHaveAttribute('data-state-cell', cell);
    expect(screen.getByRole('status')).toHaveTextContent(narrative);
    expect(scene).not.toHaveTextContent(/true|false|evidence|正确答案/i);
  });

  it.each([
    ['0', []],
    ['1', [event({ scenarioId: 'canon-gaocai-help', type: 'scenario-settled', actualBranch: 'then' })]],
    ['2', [event({ scenarioId: 'practice-manor-directions', type: 'message-received' })]],
    ['3', [event({ scenarioId: 'practice-manor-directions', type: 'scenario-settled', actualBranch: 'else' })]],
  ] as const)('crops message state cell %s inside the approved sprite viewport', (cell, events) => {
    render(<WeekThreeManorHelpScene events={[...events]} replayToken={0} reducedMotion muted />);
    const scene = screen.getByRole('img', { name: '庄上求助代码执行场景' });
    expect(scene).toHaveStyle({ '--manor-state-cell': cell });
    expect(screen.getByTestId('week-three-manor-help-sprite-viewport')).toContainElement(screen.getByAltText('高才回庄与庄客问路状态'));
  });

  it('completes only after ready playback and protects retry and stale callbacks', () => {
    vi.useFakeTimers();
    const onPlaybackComplete = vi.fn();
    const { rerender, unmount } = render(<WeekThreeManorHelpScene events={[]} replayToken={1} reducedMotion={false} muted onPlaybackComplete={onPlaybackComplete} />);
    const [background, states] = [screen.getByAltText('高老庄求助道路'), screen.getByAltText('高才回庄与庄客问路状态')];
    fireEvent.load(background); fireEvent.load(states); vi.advanceTimersByTime(319); expect(onPlaybackComplete).not.toHaveBeenCalled();
    rerender(<WeekThreeManorHelpScene events={[]} replayToken={2} reducedMotion muted onPlaybackComplete={onPlaybackComplete} />);
    vi.runOnlyPendingTimers(); expect(onPlaybackComplete).toHaveBeenCalledTimes(1);
    fireEvent.error(background); expect(screen.getByRole('alert')).toHaveTextContent('庄上求助场景图片没有加载成功。');
    fireEvent.click(screen.getByRole('button', { name: '重试加载场景图片' }));
    fireEvent.error(background); fireEvent.load(states);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: '庄上求助代码执行场景' })).toHaveAttribute('data-scene-ready', 'false');
    fireEvent.load(screen.getByAltText('高老庄求助道路')); fireEvent.load(screen.getByAltText('高才回庄与庄客问路状态'));
    expect(screen.getByRole('img', { name: '庄上求助代码执行场景' })).toHaveAttribute('data-scene-ready', 'true');
    fireEvent.error(background); fireEvent.load(states);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: '庄上求助代码执行场景' })).toHaveAttribute('data-scene-ready', 'true');
    unmount(); vi.runOnlyPendingTimers(); expect(onPlaybackComplete).toHaveBeenCalledTimes(1);
  });
});
