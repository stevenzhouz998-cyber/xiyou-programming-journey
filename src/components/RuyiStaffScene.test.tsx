import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { runRuyiStaffBattle } from '../battle/ruyiStaff'
import type { RuyiStaffInstruction, RuyiStaffOpcode } from '../battle/types'

type Tween = { onComplete?: () => void }
function node() {
  const value = { setCrop: vi.fn(), setDisplaySize: vi.fn(), setOrigin: vi.fn(), setScale: vi.fn(), setVisible: vi.fn(), setX: vi.fn(), setY: vi.fn() }
  Object.values(value).forEach((method) => method.mockReturnValue(value))
  return value
}
const nodes = { background: node(), dragonKing: node(), effects: node(), weapons: node(), wukong: node() }
const loadImage = vi.fn()
const queue: Tween[] = []
const tweens = { add: vi.fn((config: Tween) => { queue.push(config); return config }), killAll: vi.fn() }
const sound = { mute: false }
const destroys: Array<ReturnType<typeof vi.fn>> = []
let failHandler: (() => void) | null = null

vi.mock('phaser', () => {
  class Scene {
    scale = { width: 760, height: 320 }
    load = { image: loadImage, once: vi.fn((_event: string, handler: () => void) => { failHandler = handler }) }
    add = { image: vi.fn((_x: number, _y: number, key: keyof typeof nodes) => nodes[key]) }
    tweens = tweens
    sound = sound
  }
  class Game {
    destroy = vi.fn()
    constructor(config: { scene: new () => Scene & { preload(): void; create(): void } }) {
      destroys.push(this.destroy)
      const scene = new config.scene(); scene.preload(); scene.create()
    }
  }
  return { AUTO: 0, Scene, Game, default: { AUTO: 0, Scene, Game } }
})

import { RuyiStaffScene } from './RuyiStaffScene'

function instruction(id: string, opcode: RuyiStaffOpcode): RuyiStaffInstruction {
  return { instructionId: `instruction:${id}`, sourceBlockId: id, opcode }
}
const correct = runRuyiStaffBattle([
  instruction('inspect', 'inspect_weights'), instruction('staff', 'choose_ruyi_staff'), instruction('shrink', 'shrink_ruyi_staff'),
]).events
const sabre = runRuyiStaffBattle([
  instruction('inspect', 'inspect_weights'), instruction('sabre', 'choose_sabre'),
]).events

beforeEach(() => {
  vi.clearAllMocks(); queue.length = 0; destroys.length = 0; failHandler = null; sound.mute = false
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('test-browser')
})

it('loads exactly the five approved Dragon Palace rasters and exposes exact weights', () => {
  render(<RuyiStaffScene events={correct} replayToken={1} reducedMotion muted />)
  expect(loadImage.mock.calls).toEqual([
    ['background', '/assets/dragon-palace/background.webp'],
    ['wukong', '/assets/dragon-palace/wukong.webp'],
    ['dragonKing', '/assets/dragon-palace/dragon-king.webp'],
    ['weapons', '/assets/dragon-palace/weapons.webp'],
    ['effects', '/assets/dragon-palace/effects.webp'],
  ])
  expect(screen.getByRole('list', { name: '\u4e09\u4ef6\u5175\u5668\u91cd\u91cf' })).toHaveTextContent('\u5927\u634d\u5200 3600\u65a4\u65b9\u5929\u753b\u621f 7200\u65a4\u5b9a\u6d77\u795e\u9488 13500\u65a4')
})

it('shows the selected wrong weapon and blocked effect from real events', () => {
  render(<RuyiStaffScene events={sabre} replayToken={1} reducedMotion muted />)
  const scene = screen.getByRole('img', { name: '\u9f99\u5bab\u5b9a\u6d77\u795e\u9488\u4ee3\u7801\u6267\u884c\u573a\u666f' })
  expect(scene).toHaveAttribute('data-scene-state', 'wrong-weapon-selected')
  expect(scene).toHaveAttribute('data-selected-weapon', 'sabre')
  expect(scene).toHaveAttribute('data-effect-cell', 'blocked')
  expect(screen.getByRole('status')).toHaveTextContent('3600\u65a4')
})

it('shrinks the selected staff and reaches success in reduced motion', () => {
  const onComplete = vi.fn()
  render(<RuyiStaffScene events={correct} replayToken={1} reducedMotion muted={false} onPlaybackComplete={onComplete} />)
  const scene = screen.getByRole('img')
  expect(scene).toHaveAttribute('data-scene-state', 'ruyi-staff-shrunk')
  expect(scene).toHaveAttribute('data-selected-weapon', 'ruyi-staff-shrunk')
  expect(scene).toHaveAttribute('data-effect-cell', 'success')
  expect(scene).toHaveAttribute('data-motion-mode', 'reduced')
  expect(sound.mute).toBe(false)
  expect(onComplete).toHaveBeenCalledOnce()
})

it('ignores stale tween callbacks when a newer replay owns playback', async () => {
  const onComplete = vi.fn()
  const view = render(<RuyiStaffScene events={correct} replayToken={1} reducedMotion={false} muted onPlaybackComplete={onComplete} />)
  const stale = queue[0]
  view.rerender(<RuyiStaffScene events={sabre} replayToken={2} reducedMotion muted onPlaybackComplete={onComplete} />)
  expect(onComplete).toHaveBeenCalledOnce()
  await act(async () => stale?.onComplete?.())
  expect(onComplete).toHaveBeenCalledOnce()
  expect(screen.getByRole('img')).toHaveAttribute('data-selected-weapon', 'sabre')
})

it('retries a local asset failure with the same approved asset set', async () => {
  render(<RuyiStaffScene events={correct} replayToken={1} reducedMotion muted />)
  await act(async () => failHandler?.())
  expect(screen.getByRole('alert')).toHaveTextContent('\u9f99\u5bab\u573a\u666f\u8d44\u6e90\u52a0\u8f7d\u5931\u8d25')
  fireEvent.click(screen.getByRole('button', { name: '\u91cd\u65b0\u52a0\u8f7d\u9f99\u5bab\u573a\u666f' }))
  expect(loadImage).toHaveBeenCalledTimes(10)
})
