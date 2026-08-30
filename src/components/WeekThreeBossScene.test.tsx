import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeekThreeBossScene } from './WeekThreeBossScene';

const event = { instructionId: 'e', sourceBlockId: 'child-hidden', parentBlockId: 'root', stageId: 'bajie-joining', scenarioId: 'canon-bajie-ready', conditionKind: 'x', conditionTruth: true, operator: 'and', actualBranch: 'then', action: 'formally-join-team', stateBefore: 'bajie-joining', stateAfter: 'week-three-recap-complete' } as any;

describe('W3-M5 Scene', () => {
  it('只消费运行 events；两项正式资源均 ready 后才允许当前 token 的回放结束', () => {
    vi.useFakeTimers(); const complete = vi.fn(); const resource = vi.fn();
    const view = render(<WeekThreeBossScene events={[event]} replayToken={1} reducedMotion={false} muted onResourceStateChange={resource} onPlaybackComplete={complete} />);
    const images = view.container.querySelectorAll('img'); fireEvent.load(images[0]!); act(() => { vi.advanceTimersByTime(5000); }); expect(complete).not.toHaveBeenCalled();
    fireEvent.load(images[1]!); act(() => { vi.advanceTimersByTime(2000); }); expect(resource).toHaveBeenLastCalledWith(true); expect(complete).toHaveBeenCalledTimes(1); vi.useRealTimers();
  });

  it('资源错误不完成，旧 token 的计时器不能完成新回放', () => {
    vi.useFakeTimers(); const complete = vi.fn(); const view = render(<WeekThreeBossScene events={[event]} replayToken={1} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={complete} />);
    const first = view.container.querySelectorAll('img'); fireEvent.load(first[0]!); fireEvent.error(first[1]!); act(() => { vi.advanceTimersByTime(5000); }); expect(complete).not.toHaveBeenCalled();
    view.rerender(<WeekThreeBossScene events={[event]} replayToken={2} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={complete} />);
    const second = view.container.querySelectorAll('img'); fireEvent.load(second[0]!); fireEvent.load(second[1]!); act(() => { vi.advanceTimersByTime(10); }); expect(complete).toHaveBeenCalledTimes(1); vi.useRealTimers();
  });

  it('同一图片资源重播时不要求第二次 load，仍可完成当前 token', () => {
    vi.useFakeTimers(); const complete = vi.fn(); const view = render(<WeekThreeBossScene events={[event]} replayToken={1} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={complete} />);
    const images = view.container.querySelectorAll('img'); fireEvent.load(images[0]!); fireEvent.load(images[1]!);
    view.rerender(<WeekThreeBossScene events={[event]} replayToken={2} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={complete} />);
    act(() => { vi.advanceTimersByTime(10); }); expect(complete).toHaveBeenCalledTimes(1); vi.useRealTimers();
  });

  it('逐步展示当前公开卡和实际运行事实，未完成运行不会显示八戒西行终局', () => {
    const failure = { ...event, stageId: 'manor-request', scenarioId: 'practice-manor-directions', conditionKind: 'mentions-gaolao', conditionTruth: true, operator: null, atomicConditions: [{ kind: 'mentions-gaolao', value: true }], combinedCondition: null, actualBranch: 'then', action: 'accept-demon-help', stateBefore: 'manor-request', stateAfter: 'manor-request' } as any;
    const view = render(<WeekThreeBossScene events={[failure]} replayToken={1} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={() => undefined} />);
    expect(view.getByText('逻辑练习，不改变原著故事')).toBeInTheDocument();
    expect(view.getByText(/当前检查：提到高老庄，真/)).toBeInTheDocument();
    expect(view.queryByText(/八戒挑担随师徒西行/)).toBeNull();
  });

  it('按当前事件的 stateAfter 裁切单一状态格，空运行不加载状态图，失败不显示终局帧', () => {
    const failure = { ...event, stageId: 'manor-request', scenarioId: 'practice-manor-directions', stateAfter: 'manor-request' } as any;
    const empty = render(<WeekThreeBossScene events={[]} replayToken={1} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={() => undefined} />);
    expect(empty.container.querySelector('.week-three-boss-states')).toBeNull();
    const view = render(<WeekThreeBossScene events={[failure]} replayToken={2} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={() => undefined} />);
    const state = view.container.querySelector('.week-three-boss-states');
    expect(state).toHaveAttribute('data-state', 'manor-request');
    expect(state).toHaveAttribute('data-frame', '0');
    expect(state).toHaveStyle({ '--frame-x': '0', '--frame-y': '0' });
    expect(state).not.toHaveAttribute('data-frame', '4');
  });

  it('为四个当前故事阶段使用 2×2 精灵格，并显示当前回放事件而非 trace 终点', () => {
    const frames: Array<[any, string, string, string]> = [
      ['manor-request', '0', '0', '0'], ['cuilan-disguise', '1', '1', '0'], ['yunzhan-dialogue', '2', '0', '1'], ['bajie-joining', '3', '1', '1'],
    ];
    for (const [stateAfter, frame, x, y] of frames) {
      const view = render(<WeekThreeBossScene events={[{ ...event, stateAfter }]} replayToken={1} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={() => undefined} />);
      const sprite = view.container.querySelector('.week-three-boss-states')!;
      expect(sprite).toHaveAttribute('data-frame', frame);
      expect(sprite).toHaveStyle({ '--frame-x': x, '--frame-y': y });
      view.unmount();
    }
    const first = { ...event, stateAfter: 'manor-request' } as any;
    const view = render(<WeekThreeBossScene events={[first, event]} replayToken={1} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={() => undefined} />);
    expect(view.getByRole('status')).toHaveTextContent('当前公开故事阶段：manor-request');
  });
});
