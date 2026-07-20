import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { runRuyiStaffBattle } from '../battle/ruyiStaff'
import type { RuyiStaffInstruction, RuyiStaffOpcode } from '../battle/types'

type Tween = { onComplete?: () => void }
function node() {
  const value = { setCrop: vi.fn(), setDisplaySize: vi.fn(), setOrigin: vi.fn(), setScale: vi.fn(), setTexture: vi.fn(), setVisible: vi.fn(), setX: vi.fn(), setY: vi.fn() }
  Object.values(value).forEach((method) => method.mockReturnValue(value))
  return value
}
const nodes = { background: node(), dragonKing: node(), effects: node(), halberd: node(), sabre: node(), staff: node(), weapons: node(), wukong: node() }
const loadImage = vi.fn()
const queue: Tween[] = []
const tweens = { add: vi.fn((config: Tween) => { queue.push(config); return config }), killAll: vi.fn() }
const sound = { mute: false }
const destroys: Array<ReturnType<typeof vi.fn>> = []
let failHandler: (() => void) | null = null
let initialFailHandler: (() => void) | null = null
let completeHandler: (() => void) | null = null
let sabreTextureLoaded = false
let completeSabreImmediately = true

vi.mock('phaser', () => {
  class Scene {
    scale = { width: 760, height: 320 }
    textures = { exists: vi.fn((key: string) => key === 'sabre' && sabreTextureLoaded) }
    load = {
      image: vi.fn((key: string, url: string) => { loadImage(key, url) }),
      once: vi.fn((event: string, handler: () => void) => {
        if (event === 'loaderror') { if (initialFailHandler === null) initialFailHandler = handler; failHandler = handler }
        else completeHandler = handler
      }),
      off: vi.fn((event: string, handler: () => void) => {
        if (event === 'loaderror' && failHandler === handler) failHandler = null
        if (event === 'complete' && completeHandler === handler) completeHandler = null
      }),
      start: vi.fn(() => { if (completeSabreImmediately) { sabreTextureLoaded = true; completeHandler?.() } }),
    }
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
  vi.clearAllMocks(); queue.length = 0; destroys.length = 0; failHandler = null; initialFailHandler = null; completeHandler = null; sabreTextureLoaded = false; completeSabreImmediately = true; sound.mute = false
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('test-browser')
})

async function flushAllTweens() {
  while (queue.length > 0) await act(async () => queue.shift()?.onComplete?.())
}

it('defers the approved broad sabre until its command instead of adding it to cold load', () => {
  render(<RuyiStaffScene events={correct} replayToken={1} reducedMotion muted />)
  expect(loadImage.mock.calls).toEqual([
    ['background', '/assets/dragon-palace/background.webp'],
    ['wukong', '/assets/dragon-palace/wukong.webp'],
    ['dragonKing', '/assets/dragon-palace/dragon-king.webp'],
    ['weapons', '/assets/dragon-palace/weapons.webp'],
    ['effects', '/assets/dragon-palace/effects.webp'],
  ])
  expect(loadImage).not.toHaveBeenCalledWith('sabre', '/assets/dragon-palace/sabre.webp')
  const weights = screen.getByLabelText('\u4e09\u4ef6\u5175\u5668\u91cd\u91cf')
  expect(weights.tagName).toBe('DL')
  expect([...weights.children].map((group) => [
    within(group as HTMLElement).getByRole('term').textContent,
    within(group as HTMLElement).getByRole('definition').textContent,
  ])).toEqual([
    ['\u5927\u634d\u5200', '3600\u65a4'],
    ['\u65b9\u5929\u753b\u621f', '7200\u65a4'],
    ['\u5b9a\u6d77\u795e\u9488', '13500\u65a4'],
  ])
})

it('shows the selected wrong weapon and blocked effect from real events', () => {
  render(<RuyiStaffScene events={sabre} replayToken={1} reducedMotion muted />)
  const scene = screen.getByRole('img', { name: '\u9f99\u5bab\u5b9a\u6d77\u795e\u9488\u4ee3\u7801\u6267\u884c\u573a\u666f' })
  expect(scene).toHaveAttribute('data-scene-state', 'wrong-weapon-selected')
  expect(scene).toHaveAttribute('data-selected-weapon', 'sabre')
  expect(scene).toHaveAttribute('data-effect-cell', 'blocked')
  expect(screen.getByRole('status')).toHaveTextContent('3600\u65a4')
  expect(loadImage).toHaveBeenCalledWith('sabre', '/assets/dragon-palace/sabre.webp')
  expect(nodes.sabre.setDisplaySize).toHaveBeenCalledWith(132, 198)
  expect(nodes.sabre.setVisible).toHaveBeenLastCalledWith(true)
})

it('keeps the sabre unselected while its real texture is delayed and publishes ready only after a visible textured sprite', async () => {
  completeSabreImmediately = false
  const onComplete = vi.fn()
  render(<RuyiStaffScene events={sabre} replayToken={1} reducedMotion muted onPlaybackComplete={onComplete} />)
  const scene = screen.getByRole('img')
  expect(screen.getByRole('status', { name: '大捍刀画面状态' })).toHaveTextContent('正在取来大捍刀画面')
  expect(scene).toHaveAttribute('data-sabre-asset-state', 'loading')
  expect(scene).toHaveAttribute('data-sabre-sprite-visible', 'false')
  expect(scene).not.toHaveAttribute('data-selected-weapon', 'sabre')
  expect(nodes.sabre.setVisible).not.toHaveBeenCalledWith(true)
  expect(onComplete).not.toHaveBeenCalled()

  sabreTextureLoaded = true
  await act(async () => completeHandler?.())

  expect(nodes.sabre.setTexture).toHaveBeenCalledWith('sabre')
  expect(nodes.sabre.setVisible).toHaveBeenLastCalledWith(true)
  expect(scene).toHaveAttribute('data-sabre-asset-state', 'ready')
  expect(scene).toHaveAttribute('data-sabre-sprite-visible', 'true')
  expect(scene).toHaveAttribute('data-selected-weapon', 'sabre')
  expect(screen.queryByRole('status', { name: '大捍刀画面状态' })).not.toBeInTheDocument()
  expect(onComplete).toHaveBeenCalledOnce()
})

it('keeps a failed lazy sabre unpublished and retries only the same visible asset', async () => {
  completeSabreImmediately = false
  const onComplete = vi.fn()
  render(<RuyiStaffScene events={sabre} replayToken={1} reducedMotion muted onPlaybackComplete={onComplete} />)
  const scene = screen.getByRole('img')
  expect(onComplete).not.toHaveBeenCalled()

  await act(async () => failHandler?.())
  expect(scene).toHaveAttribute('data-sabre-asset-state', 'error')
  expect(scene).toHaveAttribute('data-sabre-sprite-visible', 'false')
  expect(scene).not.toHaveAttribute('data-selected-weapon', 'sabre')
  expect(onComplete).toHaveBeenCalledOnce()
  const alert = screen.getByRole('alert')
  expect(alert).toHaveTextContent('大捍刀画面没有加载成功')
  expect(alert).toHaveTextContent('战斗结果已保留')
  expect(alert).toHaveFocus()

  fireEvent.click(screen.getByRole('button', { name: '重试大捍刀画面' }))
  expect(scene).toHaveAttribute('data-sabre-asset-state', 'loading')
  expect(screen.getByRole('status', { name: '大捍刀画面状态' })).toBeVisible()
  expect(onComplete).toHaveBeenCalledOnce()

  await act(async () => failHandler?.())
  expect(screen.getByRole('alert')).toHaveFocus()
  fireEvent.click(screen.getByRole('button', { name: '重试大捍刀画面' }))
  sabreTextureLoaded = true
  await act(async () => completeHandler?.())
  expect(scene).toHaveAttribute('data-sabre-asset-state', 'ready')
  expect(scene).toHaveAttribute('data-sabre-sprite-visible', 'true')
  expect(scene).toHaveAttribute('data-selected-weapon', 'sabre')
  expect(onComplete).toHaveBeenCalledOnce()
})

it('ignores a stale sabre completion after a newer replay selected the staff', async () => {
  completeSabreImmediately = false
  const view = render(<RuyiStaffScene events={sabre} replayToken={1} reducedMotion muted />)
  const staleComplete = completeHandler

  view.rerender(<RuyiStaffScene events={correct} replayToken={2} reducedMotion muted />)
  const scene = screen.getByRole('img')
  expect(scene).toHaveAttribute('data-selected-weapon', 'ruyi-staff-shrunk')
  expect(scene).toHaveAttribute('data-sabre-asset-state', 'idle')

  sabreTextureLoaded = true
  await act(async () => staleComplete?.())
  expect(scene).toHaveAttribute('data-selected-weapon', 'ruyi-staff-shrunk')
  expect(scene).toHaveAttribute('data-sabre-asset-state', 'idle')
  expect(scene).toHaveAttribute('data-sabre-sprite-visible', 'false')
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

it('reaches identical state, weapon, effect and transcript in standard and reduced motion', async () => {
  const standard = render(<RuyiStaffScene events={correct} replayToken={1} reducedMotion={false} muted />)
  await flushAllTweens()
  const standardScene = standard.getByRole('img')
  const expected = {
    state: standardScene.getAttribute('data-scene-state'),
    weapon: standardScene.getAttribute('data-selected-weapon'),
    effect: standardScene.getAttribute('data-effect-cell'),
    transcript: standard.getByRole('status').textContent,
  }
  expect(tweens.add).toHaveBeenCalled()
  standard.unmount()
  const tweenCount = tweens.add.mock.calls.length

  const reduced = render(<RuyiStaffScene events={correct} replayToken={1} reducedMotion muted />)
  const reducedScene = reduced.getByRole('img')
  expect(tweens.add).toHaveBeenCalledTimes(tweenCount)
  expect(reducedScene).toHaveAttribute('data-scene-state', expected.state)
  expect(reducedScene).toHaveAttribute('data-selected-weapon', expected.weapon)
  expect(reducedScene).toHaveAttribute('data-effect-cell', expected.effect)
  expect(reduced.getByRole('status')).toHaveTextContent(expected.transcript ?? '')
})

it('ignores stale tween callbacks when a newer replay owns playback', async () => {
  const onComplete = vi.fn()
  const view = render(<RuyiStaffScene events={correct} replayToken={1} reducedMotion={false} muted onPlaybackComplete={onComplete} />)
  const stale = queue[0]
  view.rerender(<RuyiStaffScene events={sabre} replayToken={2} reducedMotion muted onPlaybackComplete={onComplete} />)
  await act(async () => undefined)
  expect(onComplete).toHaveBeenCalledOnce()
  await act(async () => stale?.onComplete?.())
  expect(onComplete).toHaveBeenCalledOnce()
  expect(screen.getByRole('img')).toHaveAttribute('data-selected-weapon', 'sabre')
})

it('retries a local asset failure with the same approved asset set', async () => {
  render(<RuyiStaffScene events={correct} replayToken={1} reducedMotion muted />)
  await act(async () => initialFailHandler?.())
  expect(screen.getByRole('alert')).toHaveTextContent('\u9f99\u5bab\u573a\u666f\u8d44\u6e90\u52a0\u8f7d\u5931\u8d25')
  fireEvent.click(screen.getByRole('button', { name: '\u91cd\u65b0\u52a0\u8f7d\u9f99\u5bab\u573a\u666f' }))
  expect(loadImage).toHaveBeenCalledTimes(10)
})
