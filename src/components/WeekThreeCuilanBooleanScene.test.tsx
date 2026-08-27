import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WeekThreeCuilanBooleanScene } from './WeekThreeCuilanBooleanScene';
describe('W3-M2 scene', () => {
  afterEach(cleanup);
  it('starts fail-closed and derives its state only from runtime events', () => {
    render(<WeekThreeCuilanBooleanScene events={[]} replayToken={0} reducedMotion muted />);
    expect(screen.getByRole('img', { name: '变化高翠兰执行场景' })).toHaveAttribute('data-scene-ready', 'false');
    expect(screen.getByRole('img', { name: '变化高翠兰执行场景' })).toHaveAttribute('data-state', 'transforming');
  });

  it.each([
    ['disguised', 'disguise-ready'], ['clue', 'clue-acquired'], ['revealed', 'revealed'], ['fled', 'demon-fled'],
  ])('maps runtime state %s without creating story state', (cell, state) => {
    render(<WeekThreeCuilanBooleanScene events={[{ type: 'run-finished', checkpointId: null, sourceBlockId: null, parentBlockId: null, conditionSourceBlockId: null, conditionKind: null, observedValue: null, actualBranch: null, opcode: null, state: state as any }]} replayToken={0} reducedMotion muted />);
    expect(screen.getByRole('img', { name: '变化高翠兰执行场景' })).toHaveAttribute('data-state', cell);
  });

  it.each([
    ['transforming', [], '0'],
    ['disguised', ['disguise-ready'], '1'],
    ['clue', ['clue-acquired'], '2'],
    ['revealed', ['revealed'], '3'],
    ['fled', ['demon-fled'], '4'],
  ])('crops the approved five-cell state sheet for %s into cell %s', (_state, states, expectedCell) => {
    render(<WeekThreeCuilanBooleanScene events={states.map((state) => ({ type: 'run-finished', checkpointId: null, sourceBlockId: null, parentBlockId: null, conditionSourceBlockId: null, conditionKind: null, observedValue: null, actualBranch: null, opcode: null, state: state as any }))} replayToken={0} reducedMotion muted />);
    expect(screen.getByRole('img', { name: '变化高翠兰执行场景' })).toHaveAttribute('data-state-cell', expectedCell);
  });

  it('fails closed, cache-busts retry, and only completes after both resources are ready', () => {
    vi.useFakeTimers();
    const complete = vi.fn(); const resource = vi.fn();
    render(<WeekThreeCuilanBooleanScene events={[]} replayToken={1} reducedMotion muted onPlaybackComplete={complete} onResourceStateChange={resource} />);
    const images = [screen.getByRole('img', { name: '高老庄庭院等待场景' }), screen.getByRole('img', { name: '悟空变化、等候和显出本相状态' })];
    fireEvent.error(images[0]!);
    expect(screen.getByRole('alert')).toHaveTextContent('图片没有加载成功');
    fireEvent.click(screen.getByRole('button', { name: '重试加载场景图片' }));
    expect(screen.getByRole('img', { name: '高老庄庭院等待场景' })).toHaveAttribute('src', expect.stringContaining('?retry=1'));
    const retried = [screen.getByRole('img', { name: '高老庄庭院等待场景' }), screen.getByRole('img', { name: '悟空变化、等候和显出本相状态' })];
    fireEvent.load(retried[0]!);
    vi.runAllTimers();
    expect(complete).not.toHaveBeenCalled();
    fireEvent.load(retried[1]!);
    vi.runAllTimers();
    expect(resource).toHaveBeenLastCalledWith(true);
    expect(complete).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('ignores an in-flight stale image error after the child starts a retry', () => {
    const resource = vi.fn();
    render(<WeekThreeCuilanBooleanScene events={[]} replayToken={0} reducedMotion muted onResourceStateChange={resource} />);
    const staleBackground = screen.getByRole('img', { name: '高老庄庭院等待场景' });
    fireEvent.error(staleBackground);
    fireEvent.click(screen.getByRole('button', { name: '重试加载场景图片' }));
    fireEvent.error(staleBackground);
    fireEvent.load(screen.getByRole('img', { name: '高老庄庭院等待场景' }));
    fireEvent.load(screen.getByRole('img', { name: '悟空变化、等候和显出本相状态' }));
    expect(screen.getByRole('img', { name: '变化高翠兰执行场景' })).toHaveAttribute('data-scene-ready', 'true');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('accepts both successfully reloaded assets after a browser error races with the retry', () => {
    render(<WeekThreeCuilanBooleanScene events={[]} replayToken={0} reducedMotion muted />);
    fireEvent.error(screen.getByRole('img', { name: '高老庄庭院等待场景' }));
    fireEvent.click(screen.getByRole('button', { name: '重试加载场景图片' }));
    fireEvent.error(screen.getByRole('img', { name: '高老庄庭院等待场景' }));
    fireEvent.load(screen.getByRole('img', { name: '高老庄庭院等待场景' }));
    fireEvent.load(screen.getByRole('img', { name: '悟空变化、等候和显出本相状态' }));
    expect(screen.getByRole('img', { name: '变化高翠兰执行场景' })).toHaveAttribute('data-scene-ready', 'true');
  });


  it('cleans a pending timer on unmount', () => {
    vi.useFakeTimers(); const complete = vi.fn();
    const view = render(<WeekThreeCuilanBooleanScene events={[]} replayToken={1} reducedMotion={false} muted={false} onPlaybackComplete={complete} />);
    const images = [screen.getByRole('img', { name: '高老庄庭院等待场景' }), screen.getByRole('img', { name: '悟空变化、等候和显出本相状态' })]; fireEvent.load(images[0]!); fireEvent.load(images[1]!);
    view.unmount(); vi.runAllTimers();
    expect(complete).not.toHaveBeenCalled(); vi.useRealTimers();
  });

  it('re-announces ready when a persisted run starts a new playback token', () => {
    const resource = vi.fn();
    const view = render(<WeekThreeCuilanBooleanScene events={[]} replayToken={0} reducedMotion muted onResourceStateChange={resource} />);
    fireEvent.load(screen.getByRole('img', { name: '高老庄庭院等待场景' })); fireEvent.load(screen.getByRole('img', { name: '悟空变化、等候和显出本相状态' }));
    view.rerender(<WeekThreeCuilanBooleanScene events={[]} replayToken={1} reducedMotion muted onResourceStateChange={resource} />);
    expect(resource.mock.calls.filter(([ready]) => ready === true)).toHaveLength(2);
  });

  it('plays a newly persisted run after the already loaded assets re-announce ready', () => {
    vi.useFakeTimers(); const complete = vi.fn();
    const view = render(<WeekThreeCuilanBooleanScene events={[]} replayToken={0} reducedMotion muted onPlaybackComplete={complete} />);
    fireEvent.load(screen.getByRole('img', { name: '高老庄庭院等待场景' })); fireEvent.load(screen.getByRole('img', { name: '悟空变化、等候和显出本相状态' }));
    view.rerender(<WeekThreeCuilanBooleanScene events={[]} replayToken={1} reducedMotion muted onPlaybackComplete={complete} />);
    vi.runAllTimers(); expect(complete).toHaveBeenCalledOnce(); vi.useRealTimers();
  });
});
