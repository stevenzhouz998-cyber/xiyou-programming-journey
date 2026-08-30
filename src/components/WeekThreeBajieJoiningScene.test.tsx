import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WeekThreeBajieJoiningScene } from './WeekThreeBajieJoiningScene';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const successEvents = [
  { type: 'action-selected', scenarioId: 'canon-bajie-joins', opcode: 'formally-join-team', actualBranch: 'then' },
] as any;

describe('W3-M4 scene', () => {
  afterEach(cleanup);
  it('只从运行事件消费故事状态，不决定程序是否成功', () => {
    render(<WeekThreeBajieJoiningScene events={successEvents} replayToken={0} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={() => undefined} />);
    expect(screen.getByRole('img', { name: '八戒归队故事画面' })).toHaveAttribute('data-story-step', 'guanyin-arrangement');
    expect(screen.queryByText('完成任务')).toBeNull();
  });

  it('依次呈现观音安排、唐僧另名八戒、八戒挑担西行，并在两张资源就绪后才结束播放', async () => {
    vi.useFakeTimers();
    const complete = vi.fn();
    const view = render(<WeekThreeBajieJoiningScene events={successEvents} replayToken={1} reducedMotion={false} muted onResourceStateChange={() => undefined} onPlaybackComplete={complete} />);
    const images = view.container.querySelectorAll('img');
    fireEvent.load(images[0]!);
    fireEvent.load(images[1]!);
    await act(async () => {});
    expect(screen.getByRole('img', { name: '八戒归队故事画面' })).toHaveAttribute('data-story-step', 'guanyin-arrangement');
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole('img', { name: '八戒归队故事画面' })).toHaveAttribute('data-story-step', 'bajie-name');
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole('img', { name: '八戒归队故事画面' })).toHaveAttribute('data-story-step', 'westward-departure');
    act(() => { vi.advanceTimersByTime(300); });
    expect(complete).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('资源失败保持局部可重试，reduced motion 和静音只改变呈现属性', () => {
    render(<WeekThreeBajieJoiningScene events={[]} replayToken={0} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={() => undefined} />);
    const scene = screen.getByRole('img', { name: '八戒归队故事画面' });
    expect(scene).toHaveAttribute('data-motion-mode', 'reduced');
    expect(scene).toHaveAttribute('data-muted', 'true');
    fireEvent.error(scene.querySelector('img')!);
    expect(screen.getByRole('alert')).toHaveTextContent('场景图片没有加载成功');
    fireEvent.click(screen.getByText('重试加载场景图片'));
    expect(scene.querySelector('img')).toHaveAttribute('src', expect.stringContaining('?retry=1'));
  });

  it('ignores a late generation-0 failure after retry generation 1 has loaded both required images', () => {
    render(<WeekThreeBajieJoiningScene events={[]} replayToken={0} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={() => undefined} />);
    const visual = screen.getByRole('img', { name: '八戒归队故事画面' });
    const staleBackground = visual.querySelectorAll('img')[0]!;
    fireEvent.error(staleBackground);
    fireEvent.click(screen.getByText('重试加载场景图片'));
    const currentImages = visual.querySelectorAll('img');
    expect(currentImages[0]).not.toBe(staleBackground);
    fireEvent.error(staleBackground);
    fireEvent.load(currentImages[0]!);
    fireEvent.load(currentImages[1]!);
    expect(visual).toHaveAttribute('data-scene-ready', 'true');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps only the scene container in the accessibility tree and disables motion in the matching data mode', () => {
    const view = render(<WeekThreeBajieJoiningScene events={[]} replayToken={0} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={() => undefined} />);
    const region = screen.getByRole('region', { name: '八戒归队执行场景' });
    const visual = screen.getByRole('img', { name: '八戒归队故事画面' });
    expect(region).toContainElement(visual);
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(region).toContainElement(screen.getByRole('status'));
    expect(visual).not.toContainElement(screen.getByRole('status'));
    for (const image of view.container.querySelectorAll('img')) { expect(image).toHaveAttribute('alt', ''); expect(image).toHaveAttribute('aria-hidden', 'true'); }
    expect(readFileSync(resolve(process.cwd(), 'src/components/WeekThreeBajieJoiningExperience.css'), 'utf8')).toContain("[data-motion-mode='reduced'] .week-three-bajie-joining-state-sheet { transition: none; }");
  });

  it('keeps every 724px state cell square in a centered, clipped sprite viewport over the 16:9 scene', () => {
    const view = render(<WeekThreeBajieJoiningScene events={successEvents} replayToken={0} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={() => undefined} />);
    const visual = screen.getByRole('img', { name: '八戒归队故事画面' });
    expect(visual.querySelector('.week-three-bajie-joining-sprite-viewport')).not.toBeNull();
    const css = readFileSync(resolve(process.cwd(), 'src/components/WeekThreeBajieJoiningExperience.css'), 'utf8');
    expect(css).toMatch(/\.week-three-bajie-joining-scene-visual\s*\{[^}]*aspect-ratio:\s*16\s*\/\s*9/);
    expect(css).toMatch(/\.week-three-bajie-joining-sprite-viewport\s*\{[^}]*left:\s*50%[^}]*top:\s*50%[^}]*width:\s*min\([^)]*%[^)]*rem\)[^}]*aspect-ratio:\s*1\s*\/\s*1[^}]*overflow:\s*hidden/);
    expect(css).not.toMatch(/\.week-three-bajie-joining-sprite-viewport\s*\{[^}]*inset:\s*0/);
    expect(css).toMatch(/@media\s*\(max-width:\s*720px\)[\s\S]*?\.week-three-bajie-joining-sprite-viewport\s*\{[^}]*width:\s*min\(88%/);
  });

  it('keeps the retry alert readable beside, not inside, the purely visual image container', () => {
    render(<WeekThreeBajieJoiningScene events={[]} replayToken={0} reducedMotion muted onResourceStateChange={() => undefined} onPlaybackComplete={() => undefined} />);
    const region = screen.getByRole('region', { name: '八戒归队执行场景' });
    const visual = screen.getByRole('img', { name: '八戒归队故事画面' });
    fireEvent.error(visual.querySelector('img')!);
    const alert = screen.getByRole('alert');
    expect(region).toContainElement(alert);
    expect(visual).not.toContainElement(alert);
  });

  it('does not complete stale token 2 before its new step 0 playback begins', async () => {
    vi.useFakeTimers();
    const complete = vi.fn();
    const view = render(<WeekThreeBajieJoiningScene events={successEvents} replayToken={1} reducedMotion={false} muted onResourceStateChange={() => undefined} onPlaybackComplete={complete} />);
    for (const image of view.container.querySelectorAll('img')) fireEvent.load(image);
    await act(async () => {});
    act(() => { vi.advanceTimersByTime(300); });
    act(() => { vi.advanceTimersByTime(300); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(complete).toHaveBeenCalledTimes(1);
    view.rerender(<WeekThreeBajieJoiningScene events={successEvents} replayToken={2} reducedMotion={false} muted onResourceStateChange={() => undefined} onPlaybackComplete={complete} />);
    expect(screen.getByRole('img', { name: '八戒归队故事画面' })).toHaveAttribute('data-story-step', 'guanyin-arrangement');
    expect(complete).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(300); });
    act(() => { vi.advanceTimersByTime(300); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(complete).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
