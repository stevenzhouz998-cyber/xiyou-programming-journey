import { useEffect, useId, useRef } from 'react';
import { assetUrl } from '../utils/assets';

export function GameScene({ activeStep = 0 }: { activeStep?: number }) {
  const reactId = useId();
  const id = `game-${reactId.replaceAll(':', '')}`;
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);

  useEffect(() => {
    if (navigator.userAgent.includes('jsdom')) return;
    let cancelled = false;
    void import('phaser').then((module) => {
      if (cancelled) return;
      const Phaser = module.default;
      class QuestScene extends Phaser.Scene {
        preload() {
          this.load.image('world', assetUrl('/assets/world-map.png'));
          this.load.image('hero', assetUrl('/assets/young-hero.png'));
        }
        create() {
          const width = this.scale.width;
          const height = this.scale.height;
          this.add.image(width / 2, height / 2, 'world').setDisplaySize(width, height).setAlpha(0.92);
          const hero = this.add.image(width * 0.22, height * 0.7, 'hero').setDisplaySize(112, 112);
          hero.setOrigin(0.5);
          this.tweens.add({ targets: hero, x: width * (0.22 + Math.min(activeStep, 4) * 0.13), duration: 650, ease: 'Sine.inOut' });
        }
      }
      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: id,
        width: 760,
        height: 320,
        transparent: true,
        scene: QuestScene,
        render: { antialias: true, pixelArt: false },
      });
    });
    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [activeStep, id]);

  return <div id={id} className="game-scene" role="img" aria-label="水墨原著事件演示场景" />;
}
