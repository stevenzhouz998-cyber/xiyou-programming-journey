import { useEffect, useId, useRef } from 'react';
import Phaser from 'phaser';
import { assetUrl } from '../utils/assets';

export function GameScene({ activeStep = 0, reducedMotion = false }: { activeStep?: number; reducedMotion?: boolean }) {
  const reactId = useId();
  const id = `game-${reactId.replaceAll(':', '')}`;
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);
  const heroRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const widthRef = useRef(760);
  const stateRef = useRef({ activeStep, reducedMotion });
  stateRef.current = { activeStep, reducedMotion };

  const updateHero = () => {
    const hero = heroRef.current;
    const scene = sceneRef.current;
    if (!hero || !scene) return;
    const state = stateRef.current;
    const targetX = widthRef.current * (0.22 + Math.min(state.activeStep, 4) * 0.13);
    scene.tweens.killTweensOf(hero);
    if (state.reducedMotion) hero.setX(targetX);
    else scene.tweens.add({ targets: hero, x: targetX, duration: 650, ease: 'Sine.inOut' });
  };

  useEffect(() => {
    if (navigator.userAgent.includes('jsdom')) return undefined;
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
          widthRef.current = width;
          heroRef.current = hero;
          sceneRef.current = this;
          updateHero();
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
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      heroRef.current = null;
      sceneRef.current = null;
    };
  }, [id]);

  useEffect(() => { updateHero(); }, [activeStep, reducedMotion]);

  return <div id={id} className="game-scene" role="img" aria-label="水墨原著事件演示场景" />;
}
