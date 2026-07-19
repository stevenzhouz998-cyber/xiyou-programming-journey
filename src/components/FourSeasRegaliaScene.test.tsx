import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { runFourSeasRegalia } from '../battle/fourSeasRegalia'
import type { FourSeasInstruction, FourSeasOpcode } from '../battle/types'

type Tween = { onComplete?: () => void; targets?: unknown }

function node() {
  const value = {
    setCrop: vi.fn(),
    setDisplaySize: vi.fn(),
    setOrigin: vi.fn(),
    setScale: vi.fn(),
    setVisible: vi.fn(),
    setX: vi.fn(),
    setY: vi.fn(),
  }
  Object.values(value).forEach((method) => method.mockReturnValue(value))
  return value
}

const nodes = {
  background: node(),
  boots: node(),
  crown: node(),
  dragonKing: node(),
  effects: node(),
  armor: node(),
  wukong: node(),
  wukongRegalia: node(),
}
const loadImage = vi.fn()
const addImage = vi.fn((_x: number, _y: number, key: string) => {
  if (key === 'regalia') {
    const regaliaNodes = [nodes.crown, nodes.armor, nodes.boots]
    return regaliaNodes[regaliaNodeIndex++ % regaliaNodes.length]
  }
  return nodes[key as keyof typeof nodes]
})
const queue: Tween[] = []
const tweens = {
  add: vi.fn((config: Tween) => {
    queue.push(config)
    return config
  }),
  killAll: vi.fn(),
}
const sound = { mute: false }
const destroys: Array<ReturnType<typeof vi.fn>> = []
let regaliaNodeIndex = 0
let deferSceneCreate = false
const sceneInstances: Array<{ create(): void; emitLoadError(): void }> = []

vi.mock('phaser', () => {
  class Scene {
    scale = { width: 760, height: 320 }
    loadErrorHandler: (() => void) | null = null
    load = {
      image: loadImage,
      once: vi.fn((event: string, handler: () => void) => {
        if (event === 'loaderror') this.loadErrorHandler = handler
      }),
    }
    add = { image: addImage }
    tweens = tweens
    sound = sound
    emitLoadError = () => this.loadErrorHandler?.()
  }
  class Game {
    destroy = vi.fn()
    constructor(config: { scene: new () => Scene & { preload(): void; create(): void } }) {
      destroys.push(this.destroy)
      const scene = new config.scene()
      sceneInstances.push(scene)
      scene.preload()
      if (!deferSceneCreate) scene.create()
    }
  }
  return { AUTO: 0, Scene, Game, default: { AUTO: 0, Scene, Game } }
})

import { FourSeasRegaliaScene } from './FourSeasRegaliaScene'

function instruction(
  id: string,
  opcode: FourSeasOpcode,
  parentBlockId: string | null,
): FourSeasInstruction {
  return {
    instructionId: `instruction:${id}`,
    sourceBlockId: id,
    parentBlockId,
    opcode,
  }
}

const correctTrace: FourSeasInstruction[] = [
  instruction('request', 'request_regalia', null),
  instruction('collect', 'collect_gifts', null),
  instruction('boots-gift', 'receive_cloud_boots', 'collect'),
  instruction('armor-gift', 'receive_golden_armor', 'collect'),
  instruction('crown-gift', 'receive_purple_crown', 'collect'),
  instruction('equip', 'equip_regalia', null),
  instruction('crown-wear', 'wear_crown', 'equip'),
  instruction('armor-wear', 'wear_armor', 'equip'),
  instruction('boots-wear', 'wear_boots', 'equip'),
  instruction('verify', 'verify_regalia', null),
]

const correct = runFourSeasRegalia(correctTrace).events
const wrongFirstGift = runFourSeasRegalia([
  ...correctTrace.slice(0, 2),
  instruction('crown-too-soon', 'receive_purple_crown', 'collect'),
]).events

beforeEach(() => {
  vi.clearAllMocks()
  queue.length = 0
  destroys.length = 0
  sceneInstances.length = 0
  regaliaNodeIndex = 0
  deferSceneCreate = false
  sound.mute = false
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('test-browser')
})

async function flushAllTweens() {
  while (queue.length > 0) await act(async () => queue.shift()?.onComplete?.())
}

it('loads the exact approved Four Seas raster slots through assetUrl', () => {
  render(<FourSeasRegaliaScene events={correct} replayToken={1} reducedMotion muted />)

  expect(loadImage.mock.calls).toEqual([
    ['background', '/assets/dragon-palace/background.webp'],
    ['wukong', '/assets/dragon-palace/wukong.webp'],
    ['wukongRegalia', '/assets/dragon-palace/wukong-regalia.webp'],
    ['dragonKing', '/assets/dragon-palace/dragon-king.webp'],
    ['regalia', '/assets/dragon-palace/regalia.webp'],
    ['effects', '/assets/dragon-palace/effects.webp'],
  ])
})

it('maps a wrong first gift to the real blocked state without inventing collected regalia', () => {
  render(<FourSeasRegaliaScene events={wrongFirstGift} replayToken={1} reducedMotion muted />)

  const scene = screen.getByRole('img', { name: '龙宫四海披挂代码执行场景' })
  expect(scene).toHaveAttribute('data-scene-state', 'collecting-gifts')
  expect(scene).toHaveAttribute('data-collected-regalia', 'none')
  expect(scene).toHaveAttribute('data-visible-regalia', 'rejected-crown')
  expect(scene).toHaveAttribute('data-effect-cell', 'blocked')
  expect(scene).toHaveAttribute('data-motion-mode', 'reduced')
  expect(screen.getByRole('status')).toHaveTextContent('紫金冠')
  expect(nodes.crown.setVisible).toHaveBeenLastCalledWith(true)
  expect(nodes.crown.setCrop).toHaveBeenLastCalledWith(0, 0, 341, 512)
  expect(nodes.armor.setVisible).toHaveBeenLastCalledWith(false)
  expect(nodes.boots.setVisible).toHaveBeenLastCalledWith(false)
  expect(nodes.wukongRegalia.setVisible).not.toHaveBeenLastCalledWith(true)
})

it('shows all three collected gifts before dressing while keeping base Wukong visible', () => {
  const collected = runFourSeasRegalia(correctTrace.slice(0, 5)).events
  render(<FourSeasRegaliaScene events={collected} replayToken={1} reducedMotion muted />)

  expect(screen.getByRole('img')).toHaveAttribute('data-scene-state', 'all-gifts-received')
  expect(screen.getByRole('img')).toHaveAttribute('data-visible-regalia', 'all-collected')
  expect(nodes.crown.setVisible).toHaveBeenLastCalledWith(true)
  expect(nodes.armor.setVisible).toHaveBeenLastCalledWith(true)
  expect(nodes.boots.setVisible).toHaveBeenLastCalledWith(true)
  expect(nodes.crown.setCrop).toHaveBeenLastCalledWith(0, 0, 341, 512)
  expect(nodes.armor.setCrop).toHaveBeenLastCalledWith(341, 0, 341, 512)
  expect(nodes.boots.setCrop).toHaveBeenLastCalledWith(682, 0, 342, 512)
  expect(nodes.wukong.setVisible).toHaveBeenLastCalledWith(true)
  expect(nodes.wukongRegalia.setVisible).toHaveBeenLastCalledWith(false)
})

it('moves approved crown and armor crops onto Wukong in wear order before switching actor', () => {
  const crownWorn = runFourSeasRegalia(correctTrace.slice(0, 7)).events
  const view = render(
    <FourSeasRegaliaScene events={crownWorn} replayToken={1} reducedMotion muted />,
  )
  const scene = view.getByRole('img')
  expect(scene).toHaveAttribute('data-scene-state', 'crown-equipped')
  expect(scene).toHaveAttribute('data-visible-regalia', 'crown-equipped')
  expect(nodes.crown.setVisible).toHaveBeenLastCalledWith(true)
  expect(nodes.crown.setX).toHaveBeenLastCalledWith(760 * 0.17)
  expect(nodes.crown.setY).toHaveBeenLastCalledWith(320 * 0.46)
  expect(nodes.armor.setVisible).toHaveBeenLastCalledWith(true)
  expect(nodes.armor.setX).toHaveBeenLastCalledWith(760 * 0.56)
  expect(nodes.boots.setVisible).toHaveBeenLastCalledWith(true)
  expect(nodes.boots.setX).toHaveBeenLastCalledWith(760 * 0.70)
  expect(nodes.wukongRegalia.setVisible).toHaveBeenLastCalledWith(false)

  const crownAndArmorWorn = runFourSeasRegalia(correctTrace.slice(0, 8)).events
  view.rerender(
    <FourSeasRegaliaScene
      events={crownAndArmorWorn}
      replayToken={2}
      reducedMotion
      muted
    />,
  )
  expect(scene).toHaveAttribute('data-scene-state', 'armor-equipped')
  expect(scene).toHaveAttribute('data-visible-regalia', 'crown-armor-equipped')
  expect(nodes.crown.setX).toHaveBeenLastCalledWith(760 * 0.17)
  expect(nodes.armor.setVisible).toHaveBeenLastCalledWith(true)
  expect(nodes.armor.setX).toHaveBeenLastCalledWith(760 * 0.17)
  expect(nodes.armor.setY).toHaveBeenLastCalledWith(320 * 0.68)
  expect(nodes.boots.setVisible).toHaveBeenLastCalledWith(true)
  expect(nodes.boots.setX).toHaveBeenLastCalledWith(760 * 0.70)
  expect(nodes.wukongRegalia.setVisible).toHaveBeenLastCalledWith(false)
})

it('uses equipped Wukong only after the complete wear sequence', () => {
  const beforeLastWear = runFourSeasRegalia(correctTrace.slice(0, 8)).events
  const view = render(
    <FourSeasRegaliaScene events={beforeLastWear} replayToken={1} reducedMotion muted />,
  )
  expect(view.getByRole('img')).toHaveAttribute('data-scene-state', 'armor-equipped')
  expect(view.getByRole('img')).toHaveAttribute('data-visible-regalia', 'crown-armor-equipped')
  expect(nodes.wukongRegalia.setVisible).toHaveBeenLastCalledWith(false)

  const afterLastWear = runFourSeasRegalia(correctTrace.slice(0, 9)).events
  view.rerender(
    <FourSeasRegaliaScene events={afterLastWear} replayToken={2} reducedMotion muted />,
  )
  expect(view.getByRole('img')).toHaveAttribute('data-scene-state', 'regalia-equipped')
  expect(view.getByRole('img')).toHaveAttribute('data-visible-regalia', 'equipped')
  expect(nodes.wukong.setVisible).toHaveBeenLastCalledWith(false)
  expect(nodes.wukongRegalia.setVisible).toHaveBeenLastCalledWith(true)
})

it('reaches the identical transcript and visual state in standard and reduced motion', async () => {
  const standard = render(
    <FourSeasRegaliaScene events={correct} replayToken={1} reducedMotion={false} muted />,
  )
  await flushAllTweens()
  const standardScene = standard.getByRole('img')
  const expected = {
    state: standardScene.getAttribute('data-scene-state'),
    regalia: standardScene.getAttribute('data-visible-regalia'),
    effect: standardScene.getAttribute('data-effect-cell'),
    transcript: standard.getByRole('status').textContent,
  }
  expect(tweens.add).toHaveBeenCalled()
  standard.unmount()
  const tweenCount = tweens.add.mock.calls.length

  const reduced = render(
    <FourSeasRegaliaScene events={correct} replayToken={1} reducedMotion muted />,
  )
  expect(tweens.add).toHaveBeenCalledTimes(tweenCount)
  expect(reduced.getByRole('img')).toHaveAttribute('data-scene-state', expected.state)
  expect(reduced.getByRole('img')).toHaveAttribute('data-visible-regalia', expected.regalia)
  expect(reduced.getByRole('img')).toHaveAttribute('data-effect-cell', expected.effect)
  expect(reduced.getByRole('status')).toHaveTextContent(expected.transcript ?? '')
})

it('moves the currently visible equipped actor during final verification playback', async () => {
  render(
    <FourSeasRegaliaScene events={correct} replayToken={1} reducedMotion={false} muted />,
  )
  await flushAllTweens()

  const finalTween = tweens.add.mock.calls.at(-1)?.[0] as Tween | undefined
  expect(finalTween?.targets).toEqual(expect.arrayContaining([nodes.wukongRegalia]))
  expect(screen.getByRole('img')).toHaveAttribute('data-scene-state', 'regalia-verified')
  expect(screen.getByRole('img')).toHaveAttribute('data-visible-regalia', 'equipped')
})

it('finishes an active standard replay immediately when reduced motion is enabled', async () => {
  const pure = render(
    <FourSeasRegaliaScene events={correct} replayToken={1} reducedMotion muted />,
  )
  const expected = {
    state: pure.getByRole('img').getAttribute('data-scene-state'),
    regalia: pure.getByRole('img').getAttribute('data-visible-regalia'),
    effect: pure.getByRole('img').getAttribute('data-effect-cell'),
    transcript: pure.getByRole('status').textContent,
  }
  pure.unmount()

  const onPlaybackComplete = vi.fn()
  const view = render(
    <FourSeasRegaliaScene
      events={correct}
      replayToken={1}
      reducedMotion={false}
      muted
      onPlaybackComplete={onPlaybackComplete}
    />,
  )
  const staleTween = queue[0]
  expect(staleTween).toBeDefined()
  expect(onPlaybackComplete).not.toHaveBeenCalled()

  view.rerender(
    <FourSeasRegaliaScene
      events={correct}
      replayToken={1}
      reducedMotion
      muted
      onPlaybackComplete={onPlaybackComplete}
    />,
  )
  expect(view.getByRole('img')).toHaveAttribute('data-scene-state', expected.state)
  expect(view.getByRole('img')).toHaveAttribute('data-visible-regalia', expected.regalia)
  expect(view.getByRole('img')).toHaveAttribute('data-effect-cell', expected.effect)
  expect(view.getByRole('status')).toHaveTextContent(expected.transcript ?? '')
  expect(onPlaybackComplete).toHaveBeenCalledOnce()

  await act(async () => staleTween?.onComplete?.())
  expect(view.getByRole('img')).toHaveAttribute('data-scene-state', expected.state)
  expect(view.getByRole('status')).toHaveTextContent(expected.transcript ?? '')
  expect(onPlaybackComplete).toHaveBeenCalledOnce()
})

it('ignores stale tween callbacks when a newer replay owns playback', async () => {
  const onComplete = vi.fn()
  const view = render(
    <FourSeasRegaliaScene
      events={correct}
      replayToken={1}
      reducedMotion={false}
      muted
      onPlaybackComplete={onComplete}
    />,
  )
  const stale = queue[0]
  view.rerender(
    <FourSeasRegaliaScene
      events={wrongFirstGift}
      replayToken={2}
      reducedMotion
      muted
      onPlaybackComplete={onComplete}
    />,
  )
  expect(onComplete).toHaveBeenCalledOnce()
  await act(async () => stale?.onComplete?.())
  expect(onComplete).toHaveBeenCalledOnce()
  expect(screen.getByRole('img')).toHaveAttribute('data-effect-cell', 'blocked')
})

it('reports an asset failure and retries only the local scene with the approved set', async () => {
  render(<FourSeasRegaliaScene events={correct} replayToken={1} reducedMotion muted />)
  await act(async () => sceneInstances[0]?.emitLoadError())

  expect(screen.getByRole('alert')).toHaveTextContent('四海披挂场景资源加载失败')
  fireEvent.click(screen.getByRole('button', { name: '重新加载四海披挂场景' }))
  expect(loadImage).toHaveBeenCalledTimes(12)
})

it('lets only the retry replacement owner create, fail, and complete playback', async () => {
  deferSceneCreate = true
  const onPlaybackComplete = vi.fn()
  render(
    <FourSeasRegaliaScene
      events={correct}
      replayToken={1}
      reducedMotion
      muted
      onPlaybackComplete={onPlaybackComplete}
    />,
  )

  const staleScene = sceneInstances[0]
  await act(async () => staleScene?.emitLoadError())
  expect(screen.getByRole('alert')).toHaveTextContent('四海披挂场景资源加载失败')
  expect(onPlaybackComplete).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: '重新加载四海披挂场景' }))
  expect(destroys[0]).toHaveBeenCalledOnce()
  expect(sceneInstances).toHaveLength(2)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()

  await act(async () => {
    staleScene?.create()
    staleScene?.emitLoadError()
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toBeEmptyDOMElement()
  expect(onPlaybackComplete).not.toHaveBeenCalled()

  await act(async () => sceneInstances[1]?.create())
  expect(screen.getByRole('img')).toHaveAttribute('data-scene-state', 'regalia-verified')
  expect(screen.getByRole('img')).toHaveAttribute('data-visible-regalia', 'equipped')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(onPlaybackComplete).toHaveBeenCalledOnce()

  await act(async () => {
    staleScene?.create()
    staleScene?.emitLoadError()
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('img')).toHaveAttribute('data-scene-state', 'regalia-verified')
  expect(onPlaybackComplete).toHaveBeenCalledOnce()
})

it('invalidates delayed tween and load-error callbacks when the owner unmounts', async () => {
  const onPlaybackComplete = vi.fn()
  const view = render(
    <FourSeasRegaliaScene
      events={correct}
      replayToken={1}
      reducedMotion={false}
      muted
      onPlaybackComplete={onPlaybackComplete}
    />,
  )
  const staleTween = queue[0]
  const staleScene = sceneInstances[0]

  view.unmount()
  expect(destroys[0]).toHaveBeenCalledOnce()
  await act(async () => {
    staleTween?.onComplete?.()
    staleScene?.emitLoadError()
    staleScene?.create()
  })
  expect(onPlaybackComplete).not.toHaveBeenCalled()
  expect(destroys[0]).toHaveBeenCalledOnce()
})

it('syncs mute changes and gives a retry replacement the latest muted value', async () => {
  const view = render(
    <FourSeasRegaliaScene events={correct} replayToken={1} reducedMotion muted={false} />,
  )
  expect(sound.mute).toBe(false)
  view.rerender(
    <FourSeasRegaliaScene events={correct} replayToken={1} reducedMotion muted />,
  )
  expect(sound.mute).toBe(true)
  view.rerender(
    <FourSeasRegaliaScene events={correct} replayToken={1} reducedMotion muted={false} />,
  )
  expect(sound.mute).toBe(false)

  await act(async () => sceneInstances[0]?.emitLoadError())
  view.rerender(
    <FourSeasRegaliaScene events={correct} replayToken={1} reducedMotion muted />,
  )
  fireEvent.click(screen.getByRole('button', { name: '重新加载四海披挂场景' }))
  expect(sound.mute).toBe(true)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(sceneInstances).toHaveLength(2)
})
