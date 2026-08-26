import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

async function loadScene() {
  const modulePath = './WeekTwoPeachElixirScene';
  return import(/* @vite-ignore */ modulePath).catch(() => null);
}

describe('WeekTwoPeachElixirScene', () => {
  it('renders the Tusita stage with reduced-motion and mute parity', async () => {
    const module = await loadScene();
    expect(module).not.toBeNull();
    const onPlaybackComplete = vi.fn();
    const Scene = module!.WeekTwoPeachElixirScene;
    render(<Scene events={[{ type: 'state-changed', state: 'tusita-entered' }] as any} replayToken={1} reducedMotion muted onPlaybackComplete={onPlaybackComplete} />);
    fireEvent.load(await screen.findByAltText('蟠桃园到兜率宫的天宫路线'));
    fireEvent.load(screen.getByAltText('蟠桃与金丹调试进度状态'));
    expect(screen.getByRole('img', { name: '蟠桃与金丹代码执行场景' })).toHaveAttribute('data-scene-state', 'tusita-entered');
    expect(screen.getByAltText('蟠桃与金丹调试进度状态')).toHaveAttribute('data-sprite-stage', '4');
    await waitFor(() => expect(onPlaybackComplete).toHaveBeenCalledOnce());
  });

  it('fails closed and exposes an explicit asset retry', async () => {
    const module = await loadScene();
    const Scene = module!.WeekTwoPeachElixirScene;
    render(<Scene events={[]} replayToken={0} reducedMotion={false} muted={false} />);
    fireEvent.error(await screen.findByAltText('蟠桃园到兜率宫的天宫路线'));
    expect(screen.getByRole('alert')).toHaveTextContent('场景图片没有加载成功');
    expect(screen.getByRole('button', { name: '重试加载场景图片' })).toBeEnabled();
  });
});
