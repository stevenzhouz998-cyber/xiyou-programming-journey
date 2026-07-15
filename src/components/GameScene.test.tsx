import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { runDragonPalaceBattle } from '../battle/dragonPalace'
import type { BattleInstruction } from '../battle/types'

type TweenConfig = { onComplete?: () => void }

function sceneNode() {
  const node = {
    setAlpha: vi.fn(),
    setCrop: vi.fn(),
    setDisplaySize: vi.fn(),
    setOrigin: vi.fn(),
    setScale: vi.fn(),
    setVisible: vi.fn(),
    setX: vi.fn(),
    setY: vi.fn(),
  }
  for (const method of Object.values(node)) method.mockReturnValue(node)
  return node
}

const nodes = {
  background: sceneNode(),
  dragonKing: sceneNode(),
  effects: sceneNode(),
  weapons: sceneNode(),
  wukong: sceneNode(),
}
const legacyNode = sceneNode()
const loadImage = vi.fn()
const addImage = vi.fn((_x: number, _y: number, key: keyof typeof nodes) => nodes[key] ?? legacyNode)
const tweenQueue: TweenConfig[] = []
const tweens = {
  add: vi.fn((config: TweenConfig) => {
    tweenQueue.push(config)
    return config
  }),
  killAll: vi.fn(),
  killTweensOf: vi.fn(),
}
const sound = { mute: false, play: vi.fn() }
const gameConstructor = vi.fn()
let deferSceneCreate = false
const pendingScenes: Array<{ create: () => void; emitLoadError: () => void }> = []
const gameDestroys: Array<ReturnType<typeof vi.fn>> = []

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
    constructor(config: { scene: new () => Scene & { create: () => void; preload: () => void } }) {
      gameConstructor(config)
      const scene = new config.scene()
      gameDestroys.push(this.destroy)
      scene.preload()
      if (deferSceneCreate) pendingScenes.push(scene)
      else scene.create()
    }
  }
  return { AUTO: 0, Scene, Game, default: { AUTO: 0, Scene, Game } }
})

import { GameScene } from './GameScene'

function instruction(
  instructionId: string,
  sourceBlockId: string,
  opcode: BattleInstruction['opcode'],
): BattleInstruction {
  return { instructionId, sourceBlockId, opcode }
}

const successEvents = runDragonPalaceBattle([
  instruction('enter', 'enter-block', 'enter_palace'),
  instruction('request', 'request-block', 'request_weapon'),
  instruction('test', 'test-block', 'test_weapon'),
]).events

const requestFirstEvents = runDragonPalaceBattle([
  instruction('request-first', 'request-first-block', 'request_weapon'),
]).events

const testFirstEvents = runDragonPalaceBattle([
  instruction('test-first', 'test-first-block', 'test_weapon'),
]).events

async function flushNextTween() {
  await act(async () => {
    tweenQueue.shift()?.onComplete?.()
  })
}

async function flushAllTweens() {
  while (tweenQueue.length > 0) await flushNextTween()
}

beforeEach(() => {
  vi.clearAllMocks()
  tweenQueue.length = 0
  sound.mute = false
  deferSceneCreate = false
  pendingScenes.length = 0
  gameDestroys.length = 0
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('test-browser')
})

it('preloads only the five provenance-gated Dragon Palace assets', () => {
  render(
    <GameScene events={successEvents} replayToken={1} reducedMotion muted />,
  )

  expect(loadImage.mock.calls).toEqual([
    ['background', '/assets/dragon-palace/background.webp'],
    ['wukong', '/assets/dragon-palace/wukong.webp'],
    ['dragonKing', '/assets/dragon-palace/dragon-king.webp'],
    ['weapons', '/assets/dragon-palace/weapons.webp'],
    ['effects', '/assets/dragon-palace/effects.webp'],
  ])
  expect(loadImage.mock.calls.flat().join(' ')).not.toMatch(/world-map|young-hero|\.png|\.jpe?g/i)
})

it('consumes accepted events in order and updates the actor, weapon, and scene state', async () => {
  render(
    <GameScene events={successEvents} replayToken={1} reducedMotion={false} muted />,
  )

  const scene = screen.getByRole('img', { name: '龙宫试兵代码执行场景' })
  expect(scene).toHaveAttribute('data-scene-state', 'outside-palace')

  await flushNextTween() // run-started
  await flushNextTween() // enter accepted
  expect(scene).toHaveAttribute('data-effect-cell', 'accepted')
  await flushNextTween() // entered-palace
  expect(scene).toHaveAttribute('data-scene-state', 'entered-palace')
  expect(scene).toHaveAttribute('data-effect-cell', 'none')
  expect(nodes.wukong.setX).toHaveBeenCalled()

  await flushNextTween() // request accepted
  await flushNextTween() // weapon-requested
  expect(scene).toHaveAttribute('data-scene-state', 'weapon-requested')
  expect(scene).toHaveAttribute('data-weapon-display', 'all')
  expect(nodes.weapons.setVisible).toHaveBeenLastCalledWith(true)
  expect(nodes.weapons.setCrop).toHaveBeenCalledWith()
  expect(nodes.weapons.setDisplaySize).toHaveBeenLastCalledWith(396, 198)

  await flushAllTweens()
  expect(scene).toHaveAttribute('data-scene-state', 'weapon-tested')
  expect(scene).toHaveAttribute('data-effect-cell', 'success')
  expect(scene).toHaveAttribute('data-weapon-display', 'tested')
  expect(nodes.weapons.setCrop).toHaveBeenLastCalledWith(682, 0, 342, 512)
  expect(nodes.weapons.setScale).toHaveBeenLastCalledWith(132 / 342, 198 / 512)
  expect(screen.getByRole('status')).toHaveTextContent(
    '战斗开始 进入龙宫指令已被接受 悟空进入龙宫 请求兵器指令已被接受 龙王展示三件兵器 试用兵器指令已被接受 悟空试起兵器 战斗结束：试兵完成',
  )
})

it('shows the blocked effect for a rejected instruction without advancing the reached state', async () => {
  const events = runDragonPalaceBattle([
    instruction('enter-1', 'enter-block-1', 'enter_palace'),
    instruction('enter-2', 'enter-block-2', 'enter_palace'),
  ]).events
  render(<GameScene events={events} replayToken={1} reducedMotion muted />)

  const scene = screen.getByRole('img', { name: '龙宫试兵代码执行场景' })
  expect(scene).toHaveAttribute('data-scene-state', 'entered-palace')
  expect(scene).toHaveAttribute('data-effect-cell', 'blocked')
  expect(nodes.effects.setVisible).toHaveBeenLastCalledWith(true)
  expect(nodes.effects.setCrop).toHaveBeenCalledWith(341, 0, 341, 512)
  expect(nodes.effects.setScale).toHaveBeenLastCalledWith(150 / 341, 120 / 512)
  expect(screen.getByRole('status')).toHaveTextContent('已经进入龙宫，不能再次进入，指令被挡住')
})

it('renders distinct evidence for equal-length wrong traces instead of a canned failure', () => {
  const requestView = render(
    <GameScene events={requestFirstEvents} replayToken={1} reducedMotion muted />,
  )
  const requestTranscript = screen.getByRole('status').textContent
  expect(requestView.getByRole('img')).toHaveAttribute('data-scene-state', 'outside-palace')

  requestView.rerender(
    <GameScene events={testFirstEvents} replayToken={2} reducedMotion muted />,
  )
  const testTranscript = screen.getByRole('status').textContent

  expect(requestFirstEvents).toHaveLength(testFirstEvents.length)
  expect(requestTranscript).toContain('还在龙宫外，龙王听不到兵器请求')
  expect(testTranscript).toContain('还没有拿到兵器，无法开始试用')
  expect(testTranscript).not.toBe(requestTranscript)
})

it('replays from the beginning without rebuilding Phaser and completes exactly once per current replay', async () => {
  const onPlaybackComplete = vi.fn()
  const view = render(
    <GameScene
      events={successEvents}
      replayToken={1}
      reducedMotion={false}
      muted
      onPlaybackComplete={onPlaybackComplete}
    />,
  )
  expect(gameConstructor).toHaveBeenCalledOnce()

  await flushNextTween()
  view.rerender(
    <GameScene
      events={requestFirstEvents}
      replayToken={2}
      reducedMotion={false}
      muted
      onPlaybackComplete={onPlaybackComplete}
    />,
  )
  await flushAllTweens()

  expect(gameConstructor).toHaveBeenCalledOnce()
  expect(onPlaybackComplete).toHaveBeenCalledOnce()
  expect(screen.getByRole('img')).toHaveAttribute('data-scene-state', 'outside-palace')
  expect(screen.getByRole('status')).toHaveTextContent('还在龙宫外，龙王听不到兵器请求')

  view.rerender(
    <GameScene
      events={testFirstEvents}
      replayToken={2}
      reducedMotion={false}
      muted
      onPlaybackComplete={onPlaybackComplete}
    />,
  )
  await flushAllTweens()
  expect(gameConstructor).toHaveBeenCalledOnce()
  expect(onPlaybackComplete).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('status')).toHaveTextContent('还没有拿到兵器，无法开始试用')

  view.rerender(
    <GameScene
      events={requestFirstEvents}
      replayToken={3}
      reducedMotion={false}
      muted
      onPlaybackComplete={onPlaybackComplete}
    />,
  )
  await flushAllTweens()
  expect(gameConstructor).toHaveBeenCalledOnce()
  expect(onPlaybackComplete).toHaveBeenCalledTimes(3)
})

it('uses tween callbacks in standard mode and reaches the same ordered result immediately with reduced motion', async () => {
  const standard = render(
    <GameScene events={successEvents} replayToken={1} reducedMotion={false} muted />,
  )
  await flushAllTweens()
  const standardState = standard.getByRole('img').getAttribute('data-scene-state')
  const standardTranscript = standard.getByRole('status').textContent
  expect(tweens.add).toHaveBeenCalled()
  standard.unmount()

  const tweenCount = tweens.add.mock.calls.length
  const reduced = render(
    <GameScene events={successEvents} replayToken={1} reducedMotion muted />,
  )
  expect(tweens.add).toHaveBeenCalledTimes(tweenCount)
  expect(reduced.getByRole('img')).toHaveAttribute('data-scene-state', standardState)
  expect(reduced.getByRole('status')).toHaveTextContent(standardTranscript ?? '')
})

it('applies mute to the scene sound manager without requesting nonexistent audio assets', () => {
  const view = render(
    <GameScene events={successEvents} replayToken={1} reducedMotion muted />,
  )
  expect(sound.mute).toBe(true)
  expect(sound.play).not.toHaveBeenCalled()
  expect(loadImage.mock.calls.flat().join(' ')).not.toMatch(/\.mp3|\.wav|\.ogg/i)

  view.rerender(
    <GameScene events={successEvents} replayToken={1} reducedMotion muted={false} />,
  )
  expect(sound.mute).toBe(false)
  expect(gameConstructor).toHaveBeenCalledOnce()
})

it('exposes an accessible live transcript and destroys the scene exactly once', () => {
  const view = render(
    <GameScene events={successEvents} replayToken={1} reducedMotion muted />,
  )
  expect(screen.getByRole('img', { name: '龙宫试兵代码执行场景' })).toHaveAttribute(
    'data-motion-mode',
    'reduced',
  )
  expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')

  view.rerender(
    <GameScene events={successEvents} replayToken={1} reducedMotion muted />,
  )
  expect(gameConstructor).toHaveBeenCalledOnce()
  view.unmount()
  expect(gameDestroys[0]).toHaveBeenCalledOnce()
})

it('starts the requested trace and applies mute when Phaser finishes creating asynchronously', async () => {
  deferSceneCreate = true
  const onPlaybackComplete = vi.fn()
  render(
    <GameScene
      events={successEvents}
      replayToken={1}
      reducedMotion
      muted
      onPlaybackComplete={onPlaybackComplete}
    />,
  )

  expect(screen.getByRole('status')).toBeEmptyDOMElement()
  expect(onPlaybackComplete).not.toHaveBeenCalled()
  await act(async () => {
    pendingScenes[0]?.create()
  })

  expect(sound.mute).toBe(true)
  expect(screen.getByRole('img')).toHaveAttribute('data-scene-state', 'weapon-tested')
  expect(onPlaybackComplete).toHaveBeenCalledOnce()
})

it('overrides the legacy CSS art background while the approved scene is loading', () => {
  deferSceneCreate = true
  render(<GameScene events={successEvents} replayToken={1} reducedMotion muted />)

  const scene = screen.getByRole('img', { name: '龙宫试兵代码执行场景' })
  expect(scene).toHaveStyle({ backgroundImage: 'none' })
  expect(scene.style.backgroundColor).not.toBe('')
  expect(loadImage.mock.calls.flat().join(' ')).not.toContain('world-map')
})

it('ignores a stale StrictMode scene that finishes creating after its replacement owns the component', async () => {
  deferSceneCreate = true
  const onPlaybackComplete = vi.fn()
  const view = render(
    <StrictMode>
      <GameScene
        events={successEvents}
        replayToken={1}
        reducedMotion
        muted
        onPlaybackComplete={onPlaybackComplete}
      />
    </StrictMode>,
  )

  expect(gameConstructor).toHaveBeenCalledTimes(2)
  expect(gameDestroys[0]).toHaveBeenCalledOnce()
  await act(async () => {
    pendingScenes[0]?.create()
  })
  expect(onPlaybackComplete).not.toHaveBeenCalled()
  expect(screen.getByRole('status')).toBeEmptyDOMElement()

  await act(async () => {
    pendingScenes[1]?.create()
  })
  expect(onPlaybackComplete).toHaveBeenCalledOnce()
  expect(screen.getByRole('img')).toHaveAttribute('data-scene-state', 'weapon-tested')

  view.unmount()
  expect(gameDestroys[0]).toHaveBeenCalledOnce()
  expect(gameDestroys[1]).toHaveBeenCalledOnce()
})

it('switches an active standard replay to reduced motion without duplicate completion or stale events', async () => {
  const onPlaybackComplete = vi.fn()
  const view = render(
    <GameScene
      events={successEvents}
      replayToken={1}
      reducedMotion={false}
      muted
      onPlaybackComplete={onPlaybackComplete}
    />,
  )
  await flushNextTween()
  const staleTween = tweenQueue[0]

  view.rerender(
    <GameScene
      events={successEvents}
      replayToken={1}
      reducedMotion
      muted
      onPlaybackComplete={onPlaybackComplete}
    />,
  )

  expect(screen.getByRole('img')).toHaveAttribute('data-scene-state', 'weapon-tested')
  expect(screen.getByRole('status')).toHaveTextContent(
    '战斗开始 进入龙宫指令已被接受 悟空进入龙宫 请求兵器指令已被接受 龙王展示三件兵器 试用兵器指令已被接受 悟空试起兵器 战斗结束：试兵完成',
  )
  expect(onPlaybackComplete).toHaveBeenCalledOnce()

  await act(async () => staleTween?.onComplete?.())
  expect(onPlaybackComplete).toHaveBeenCalledOnce()
  expect(screen.getByRole('img')).toHaveAttribute('data-scene-state', 'weapon-tested')
})

it('shows a recoverable load error and rebuilds the same approved scene before playback', async () => {
  deferSceneCreate = true
  const onPlaybackComplete = vi.fn()
  render(
    <GameScene
      events={successEvents}
      replayToken={1}
      reducedMotion
      muted
      onPlaybackComplete={onPlaybackComplete}
    />,
  )

  await act(async () => pendingScenes[0]?.emitLoadError())
  expect(screen.getByRole('alert')).toHaveTextContent('龙宫场景资源加载失败，请重试')
  expect(screen.getByRole('button', { name: '重新加载龙宫场景' })).toBeVisible()
  expect(screen.getByRole('img')).not.toHaveAttribute('data-scene-state')
  expect(onPlaybackComplete).not.toHaveBeenCalled()

  await act(async () => pendingScenes[0]?.create())
  expect(onPlaybackComplete).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '重新加载龙宫场景' }))
  expect(gameConstructor).toHaveBeenCalledTimes(2)
  expect(gameDestroys[0]).toHaveBeenCalledOnce()
  expect(loadImage).toHaveBeenCalledTimes(10)

  await act(async () => pendingScenes[1]?.create())
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.getByRole('img')).toHaveAttribute('data-scene-state', 'weapon-tested')
  expect(onPlaybackComplete).toHaveBeenCalledOnce()
})
