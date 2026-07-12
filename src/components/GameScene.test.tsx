import { act, render } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';

const hero = { setDisplaySize: vi.fn(), setOrigin: vi.fn(), setX: vi.fn() };
hero.setDisplaySize.mockReturnValue(hero); hero.setOrigin.mockReturnValue(hero);
const tweens = { add: vi.fn(), killTweensOf: vi.fn() };
const destroy = vi.fn();
const gameConstructor = vi.fn();

vi.mock('phaser', () => {
  class Scene {
    scale = { width: 760, height: 320 };
    load = { image: vi.fn() };
    add = { image: vi.fn((_x: number, _y: number, key: string) => key === 'hero' ? hero : { setDisplaySize: vi.fn().mockReturnThis(), setAlpha: vi.fn() }) };
    tweens = tweens;
  }
  class Game {
    destroy = destroy;
    constructor(config: { scene: new () => Scene }) {
      gameConstructor(config);
      const scene = new config.scene() as Scene & { create: () => void };
      scene.create();
    }
  }
  return { default: { AUTO: 0, Scene, Game } };
});

import { GameScene } from './GameScene';

beforeEach(() => { vi.clearAllMocks(); hero.setDisplaySize.mockReturnValue(hero); hero.setOrigin.mockReturnValue(hero); });

it('updates one Phaser scene without rebuilding and destroys it once', async () => {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('test-browser');
  const view = render(<GameScene activeStep={0} reducedMotion={false} />);
  await act(async () => undefined);
  expect(gameConstructor).toHaveBeenCalledOnce();
  expect(tweens.add).toHaveBeenCalled();
  view.rerender(<GameScene activeStep={2} reducedMotion={false} />);
  expect(gameConstructor).toHaveBeenCalledOnce();
  expect(tweens.killTweensOf).toHaveBeenCalledWith(hero);
  expect(tweens.add).toHaveBeenLastCalledWith(expect.objectContaining({ targets: hero }));
  view.rerender(<GameScene activeStep={2} reducedMotion />);
  expect(tweens.killTweensOf).toHaveBeenCalledWith(hero);
  expect(hero.setX).toHaveBeenCalled();
  const tweenCount = tweens.add.mock.calls.length;
  view.rerender(<GameScene activeStep={3} reducedMotion />);
  expect(tweens.add).toHaveBeenCalledTimes(tweenCount);
  view.unmount();
  expect(destroy).toHaveBeenCalledOnce();
});
