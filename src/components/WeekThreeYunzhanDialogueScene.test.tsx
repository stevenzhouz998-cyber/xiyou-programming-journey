import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WeekThreeYunzhanDialogueScene } from './WeekThreeYunzhanDialogueScene';

describe('W3-M3 云栈洞场景', () => {
  afterEach(() => vi.useRealTimers());
  it('两张正式图片都就绪才报告可播放，减弱动画与静音不改变事件事实', async () => {
    const states: boolean[] = [];
    render(<WeekThreeYunzhanDialogueScene events={[{ type: 'action-selected', roundId: 'wukong-identity', observedValue: false, actualBranch: 'else', opcode: 'guard-cave', state: 'cave-guarded' }]} replayToken={1} reducedMotion muted onResourceStateChange={(ready) => states.push(ready)} onPlaybackComplete={() => undefined} />);
    const scene = await screen.findByRole('img', { name: '云栈洞执行场景' });
    expect(scene).toHaveAttribute('data-motion-mode', 'reduced');
    expect(scene).toHaveAttribute('data-muted', 'true');
    expect(scene).toHaveAttribute('data-scene-ready', 'false');
    expect(states).toContain(false);
  });

  it('同一个 replay token 即使完成回调随父组件重渲染也只完成一次', async () => {
    vi.useFakeTimers();
    const first = vi.fn(); const second = vi.fn();
    const view = render(<WeekThreeYunzhanDialogueScene events={[]} replayToken={1} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={first} />);
    const images = view.container.querySelectorAll('img');
    fireEvent.load(images[0]!); fireEvent.load(images[1]!);
    await act(async () => { vi.runOnlyPendingTimers(); });
    view.rerender(<WeekThreeYunzhanDialogueScene events={[]} replayToken={1} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={second} />);
    await act(async () => { vi.runOnlyPendingTimers(); });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
  it('说明观音点化来历时展示猪刚鬣放下钉耙的第四格状态', () => {
    render(<WeekThreeYunzhanDialogueScene events={[{ type: 'action-selected', roundId: 'pilgrimage-explicit', observedValue: true, actualBranch: 'then', opcode: 'explain-guanyin-origin', state: 'origin-explained' }]} replayToken={0} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={() => undefined} />);
    expect(screen.getByRole('img', { name: '云栈洞执行场景' })).toHaveAttribute('data-state-cell', '3');
    expect(screen.getByText('猪刚鬣放下钉耙，说明受观音点化的来历。')).toBeVisible();
  });
  it('按完整成功事件依次显示四格并只在最后完成一次', async () => {
    vi.useFakeTimers(); const complete = vi.fn();
    const events = [
      { type: 'round-started' as const, roundId: 'wukong-identity' as const, observedValue: false, actualBranch: 'else' as const, opcode: null, state: null },
      { type: 'action-selected' as const, roundId: 'wukong-identity' as const, observedValue: false, actualBranch: 'else' as const, opcode: 'guard-cave' as const, state: 'cave-guarded' as const },
      { type: 'round-started' as const, roundId: 'pilgrimage-explicit' as const, observedValue: true, actualBranch: 'then' as const, opcode: null, state: null },
      { type: 'action-selected' as const, roundId: 'pilgrimage-explicit' as const, observedValue: true, actualBranch: 'then' as const, opcode: 'explain-guanyin-origin' as const, state: 'origin-explained' as const },
    ];
    const view = render(<WeekThreeYunzhanDialogueScene events={events} replayToken={1} reducedMotion={false} muted onResourceStateChange={() => undefined} onPlaybackComplete={complete} />); const images = view.container.querySelectorAll('img'); fireEvent.load(images[0]!); fireEvent.load(images[1]!);
    const scene = screen.getByRole('img', { name: '云栈洞执行场景' }); expect(scene).toHaveAttribute('data-state-cell', '0'); await act(async () => { vi.advanceTimersByTime(200); }); expect(scene).toHaveAttribute('data-state-cell', '1'); await act(async () => { vi.advanceTimersByTime(200); }); expect(scene).toHaveAttribute('data-state-cell', '2'); await act(async () => { vi.advanceTimersByTime(200); }); expect(scene).toHaveAttribute('data-state-cell', '3'); expect(complete).toHaveBeenCalledTimes(1); view.rerender(<WeekThreeYunzhanDialogueScene events={events} replayToken={1} reducedMotion={false} muted onResourceStateChange={() => undefined} onPlaybackComplete={complete} />); await act(async () => { vi.runOnlyPendingTimers(); }); expect(complete).toHaveBeenCalledTimes(1);
  });
});
