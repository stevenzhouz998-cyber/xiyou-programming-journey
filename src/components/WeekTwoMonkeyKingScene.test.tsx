import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

async function loadScene() {
  const modulePath = './WeekTwoMonkeyKingScene';
  return import(/* @vite-ignore */ modulePath).catch(() => null);
}

describe('WeekTwoMonkeyKingScene', () => {
  it('renders the accepted-title stage from formal raster slots with reduced-motion parity', async () => {
    const module = await loadScene();
    expect(module).not.toBeNull();
    const onPlaybackComplete = vi.fn();
    const Scene = module!.WeekTwoMonkeyKingScene;
    render(<Scene events={[{ type: 'state-changed', state: 'title-accepted' }] as any} replayToken={1} reducedMotion muted onPlaybackComplete={onPlaybackComplete} />);

    fireEvent.load(await screen.findByAltText('花果山齐天大圣营地'));
    fireEvent.load(screen.getByAltText('齐天大圣事件进度状态'));

    expect(screen.getByRole('img', { name: '齐天大圣事件代码执行场景' })).toHaveAttribute('data-scene-state', 'title-accepted');
    expect(screen.getByAltText('齐天大圣事件进度状态')).toHaveAttribute('data-sprite-stage', '2');
    await waitFor(() => expect(onPlaybackComplete).toHaveBeenCalledOnce());
  });

  it('keeps the scene incomplete and offers visible asset retry', async () => {
    const module = await loadScene();
    expect(module).not.toBeNull();
    const Scene = module!.WeekTwoMonkeyKingScene;
    render(<Scene events={[]} replayToken={0} reducedMotion={false} muted={false} />);

    fireEvent.error(await screen.findByAltText('花果山齐天大圣营地'));
    expect(screen.getByRole('alert')).toHaveTextContent('场景图片没有加载成功');
    expect(screen.getByRole('button', { name: '重试加载场景图片' })).toBeEnabled();
  });
});
