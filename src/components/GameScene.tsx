import { useEffect, useId, useRef, useState } from 'react'
import Phaser from 'phaser'
import type { BattleEvent, BattleOpcode, DragonPalaceState } from '../battle/types'
import { assetUrl } from '../utils/assets'

interface GameSceneProps {
  events: BattleEvent[]
  replayToken: number
  reducedMotion: boolean
  muted: boolean
  onPlaybackComplete?: () => void
}

interface SceneNodes {
  background: Phaser.GameObjects.Image
  dragonKing: Phaser.GameObjects.Image
  effects: Phaser.GameObjects.Image
  weapons: Phaser.GameObjects.Image
  wukong: Phaser.GameObjects.Image
}

interface OwnedScene {
  owner: symbol
  scene: Phaser.Scene
}

interface OwnedNodes {
  owner: symbol
  nodes: SceneNodes
}

const SHEET_HEIGHT = 512
const CELL_STARTS = [0, 341, 682] as const
const CELL_WIDTHS = [341, 341, 342] as const
const WEAPON_CELL_DISPLAY = { width: 132, height: 198 }
const EFFECT_CELL_DISPLAY = { width: 150, height: 120 }
const WEAPON_SHEET_DISPLAY = {
  width: WEAPON_CELL_DISPLAY.width * 3,
  height: WEAPON_CELL_DISPLAY.height,
}

const opcodeLabels: Record<BattleOpcode, string> = {
  enter_palace: '进入龙宫',
  request_weapon: '请求兵器',
  test_weapon: '试用兵器',
}

function rejectedMessage(event: Extract<BattleEvent, { type: 'instruction-rejected' }>): string {
  if (event.state === 'outside-palace' && event.opcode === 'request_weapon') {
    return '还在龙宫外，龙王听不到兵器请求，指令被挡住'
  }
  if (event.state === 'outside-palace' && event.opcode === 'test_weapon') {
    return '还没有拿到兵器，无法开始试用，指令被挡住'
  }
  if (event.state === 'entered-palace' && event.opcode === 'enter_palace') {
    return '已经进入龙宫，不能再次进入，指令被挡住'
  }
  if (event.state === 'entered-palace' && event.opcode === 'test_weapon') {
    return '还没有提出兵器请求，无法开始试用，指令被挡住'
  }
  if (event.state === 'weapon-requested' && event.opcode === 'request_weapon') {
    return '龙王已经展示兵器，不需要再次请求，指令被挡住'
  }
  return `${opcodeLabels[event.opcode]}在当前情形不能执行，指令被挡住`
}

function eventTranscript(event: BattleEvent): string {
  if (event.type === 'run-started') return '战斗开始'
  if (event.type === 'instruction-accepted') return `${opcodeLabels[event.opcode]}指令已被接受`
  if (event.type === 'instruction-rejected') return rejectedMessage(event)
  if (event.type === 'state-changed') {
    if (event.state === 'entered-palace') return '悟空进入龙宫'
    if (event.state === 'weapon-requested') return '龙王展示三件兵器'
    if (event.state === 'weapon-tested') return '悟空试起兵器'
  }
  if (event.messageCode.endsWith('.completed')) return '战斗结束：试兵完成'
  if (event.messageCode.endsWith('.rejected')) return '战斗结束：指令在当前状态无法执行'
  return '战斗结束：程序还缺少后续指令'
}

function stateX(state: DragonPalaceState, width: number): number {
  if (state === 'outside-palace') return width * 0.12
  if (state === 'entered-palace') return width * 0.28
  if (state === 'weapon-requested') return width * 0.4
  return width * 0.52
}

function showSheetCell(
  image: Phaser.GameObjects.Image,
  cell: 0 | 1 | 2,
  display: { width: number; height: number },
) {
  const sourceWidth = CELL_WIDTHS[cell]
  image
    .setCrop(CELL_STARTS[cell], 0, sourceWidth, SHEET_HEIGHT)
    .setScale(display.width / sourceWidth, display.height / SHEET_HEIGHT)
    .setVisible(true)
}

function showWeaponSheet(image: Phaser.GameObjects.Image) {
  image
    .setCrop()
    .setDisplaySize(WEAPON_SHEET_DISPLAY.width, WEAPON_SHEET_DISPLAY.height)
    .setVisible(true)
}

export function GameScene({
  events,
  replayToken,
  reducedMotion,
  muted,
  onPlaybackComplete,
}: GameSceneProps) {
  const reactId = useId()
  const id = `game-${reactId.replaceAll(':', '')}`
  const ownerRef = useRef<symbol | null>(null)
  const gameRef = useRef<{ owner: symbol; game: Phaser.Game } | null>(null)
  const sceneRef = useRef<OwnedScene | null>(null)
  const nodesRef = useRef<OwnedNodes | null>(null)
  const playbackGenerationRef = useRef(0)
  const playbackActiveRef = useRef(false)
  const requestIdRef = useRef(0)
  const completedRequestRef = useRef<number | null>(null)
  const previousReducedMotionRef = useRef(reducedMotion)
  const eventsRef = useRef(events)
  const reducedMotionRef = useRef(reducedMotion)
  const mutedRef = useRef(muted)
  const onPlaybackCompleteRef = useRef(onPlaybackComplete)
  const startPlaybackRef = useRef<() => void>(() => undefined)
  const [sceneAttempt, setSceneAttempt] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sceneState, setSceneState] = useState<DragonPalaceState>('outside-palace')
  const [transcript, setTranscript] = useState<readonly string[]>([])

  eventsRef.current = events
  reducedMotionRef.current = reducedMotion
  mutedRef.current = muted
  onPlaybackCompleteRef.current = onPlaybackComplete

  const currentOwnedScene = () => {
    const currentOwner = ownerRef.current
    const ownedScene = sceneRef.current
    const ownedNodes = nodesRef.current
    if (!currentOwner || ownedScene?.owner !== currentOwner || ownedNodes?.owner !== currentOwner) {
      return null
    }
    return { owner: currentOwner, scene: ownedScene.scene, nodes: ownedNodes.nodes }
  }

  const resetScene = (owner: symbol, scene: Phaser.Scene, nodes: SceneNodes) => {
    if (ownerRef.current !== owner) return
    const { width, height } = scene.scale
    nodes.wukong.setX(stateX('outside-palace', width)).setY(height * 0.69).setVisible(true)
    nodes.dragonKing.setX(width * 0.82).setY(height * 0.55).setVisible(true)
    nodes.weapons
      .setX(width * 0.55)
      .setY(height * 0.6)
      .setCrop()
      .setDisplaySize(WEAPON_SHEET_DISPLAY.width, WEAPON_SHEET_DISPLAY.height)
      .setVisible(false)
    nodes.effects.setX(width * 0.55).setY(height * 0.45).setCrop().setVisible(false)
  }

  const applyEvent = (owner: symbol, scene: Phaser.Scene, nodes: SceneNodes, event: BattleEvent) => {
    if (ownerRef.current !== owner) return

    if (event.type === 'run-started') resetScene(owner, scene, nodes)
    if (event.type === 'instruction-accepted') {
      showSheetCell(nodes.effects, 0, EFFECT_CELL_DISPLAY)
    }
    if (event.type === 'state-changed') {
      nodes.wukong.setX(stateX(event.state, scene.scale.width))
      nodes.effects.setVisible(false)
      if (event.state === 'weapon-requested') showWeaponSheet(nodes.weapons)
      if (event.state === 'weapon-tested') {
        showSheetCell(nodes.weapons, 2, WEAPON_CELL_DISPLAY)
      }
    }
    if (event.type === 'instruction-rejected') {
      showSheetCell(nodes.effects, 1, EFFECT_CELL_DISPLAY)
    }
    if (event.type === 'run-finished' && event.messageCode.endsWith('.completed')) {
      showSheetCell(nodes.effects, 2, EFFECT_CELL_DISPLAY)
    }

    setSceneState(event.state)
    setTranscript((messages) => [...messages, eventTranscript(event)])
  }

  const startPlayback = () => {
    const owned = currentOwnedScene()
    if (!owned || loadError) return
    const { owner, scene, nodes } = owned
    const generation = ++playbackGenerationRef.current
    const requestId = requestIdRef.current
    const requestedEvents = eventsRef.current
    playbackActiveRef.current = true
    scene.tweens.killAll()
    resetScene(owner, scene, nodes)
    setSceneState('outside-palace')
    setTranscript([])

    const complete = () => {
      if (generation !== playbackGenerationRef.current || ownerRef.current !== owner) return
      playbackActiveRef.current = false
      if (completedRequestRef.current === requestId) return
      completedRequestRef.current = requestId
      onPlaybackCompleteRef.current?.()
    }

    if (requestedEvents.length === 0) {
      complete()
      return
    }

    if (reducedMotionRef.current) {
      for (const event of requestedEvents) applyEvent(owner, scene, nodes, event)
      complete()
      return
    }

    let eventIndex = 0
    const playNext = () => {
      if (generation !== playbackGenerationRef.current || ownerRef.current !== owner) return
      const event = requestedEvents[eventIndex]
      if (!event) {
        complete()
        return
      }
      eventIndex += 1
      scene.tweens.add({
        targets: nodes.wukong,
        x: stateX(event.state, scene.scale.width),
        duration: event.type === 'state-changed' ? 360 : 140,
        ease: 'Sine.inOut',
        onComplete: () => {
          if (generation !== playbackGenerationRef.current || ownerRef.current !== owner) return
          applyEvent(owner, scene, nodes, event)
          playNext()
        },
      })
    }
    playNext()
  }

  startPlaybackRef.current = startPlayback

  useEffect(() => {
    requestIdRef.current += 1
    completedRequestRef.current = null
    startPlaybackRef.current()
  }, [events, replayToken])

  useEffect(() => {
    const wasReduced = previousReducedMotionRef.current
    previousReducedMotionRef.current = reducedMotion
    if (!wasReduced && reducedMotion && playbackActiveRef.current) {
      startPlaybackRef.current()
    }
  }, [reducedMotion])

  useEffect(() => {
    if (navigator.userAgent.includes('jsdom')) return undefined

    const owner = Symbol('dragon-palace-scene')
    let cancelled = false
    let failed = false
    let localGame: Phaser.Game | null = null
    ownerRef.current = owner

    const ownsScene = () => !cancelled && !failed && ownerRef.current === owner

    class DragonPalaceScene extends Phaser.Scene {
      preload() {
        if (!ownsScene()) return
        this.load.once('loaderror', () => {
          if (!ownsScene()) return
          failed = true
          playbackGenerationRef.current += 1
          playbackActiveRef.current = false
          if (sceneRef.current?.owner === owner) sceneRef.current = null
          if (nodesRef.current?.owner === owner) nodesRef.current = null
          setTranscript([])
          setLoadError('龙宫场景资源加载失败，请重试。')
        })
        this.load.image('background', assetUrl('/assets/dragon-palace/background.webp'))
        this.load.image('wukong', assetUrl('/assets/dragon-palace/wukong.webp'))
        this.load.image('dragonKing', assetUrl('/assets/dragon-palace/dragon-king.webp'))
        this.load.image('weapons', assetUrl('/assets/dragon-palace/weapons.webp'))
        this.load.image('effects', assetUrl('/assets/dragon-palace/effects.webp'))
      }

      create() {
        if (!ownsScene()) return
        const { width, height } = this.scale
        const background = this.add
          .image(width / 2, height / 2, 'background')
          .setDisplaySize(width, height)
        const wukong = this.add
          .image(width * 0.12, height * 0.69, 'wukong')
          .setDisplaySize(150, 150)
          .setOrigin(0.5, 0.5)
        const dragonKing = this.add
          .image(width * 0.82, height * 0.55, 'dragonKing')
          .setDisplaySize(175, 175)
          .setOrigin(0.5, 0.5)
        const weapons = this.add
          .image(width * 0.55, height * 0.6, 'weapons')
          .setOrigin(0.5, 0.5)
          .setVisible(false)
        const effects = this.add
          .image(width * 0.55, height * 0.45, 'effects')
          .setOrigin(0.5, 0.5)
          .setVisible(false)

        if (!ownsScene()) return
        sceneRef.current = { owner, scene: this }
        nodesRef.current = { owner, nodes: { background, dragonKing, effects, weapons, wukong } }
        this.sound.mute = mutedRef.current
        startPlaybackRef.current()
      }
    }

    localGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: id,
      width: 760,
      height: 320,
      transparent: true,
      scene: DragonPalaceScene,
      render: { antialias: true, pixelArt: false },
    })
    if (ownsScene()) gameRef.current = { owner, game: localGame }

    return () => {
      cancelled = true
      if (ownerRef.current === owner) {
        ownerRef.current = null
        playbackGenerationRef.current += 1
        playbackActiveRef.current = false
      }
      if (sceneRef.current?.owner === owner) sceneRef.current = null
      if (nodesRef.current?.owner === owner) nodesRef.current = null
      if (gameRef.current?.owner === owner) gameRef.current = null
      localGame?.destroy(true)
    }
  }, [id, sceneAttempt])

  useEffect(() => {
    const owned = currentOwnedScene()
    if (owned) owned.scene.sound.mute = muted
  }, [muted])

  const retryLoad = () => {
    playbackGenerationRef.current += 1
    playbackActiveRef.current = false
    setLoadError(null)
    setSceneState('outside-palace')
    setTranscript([])
    setSceneAttempt((attempt) => attempt + 1)
  }

  return (
    <div className="game-scene-frame">
      <div
        id={id}
        className="game-scene"
        style={{ backgroundImage: 'none', backgroundColor: '#e8e0cf' }}
        data-motion-mode={reducedMotion ? 'reduced' : 'standard'}
        data-scene-state={loadError ? undefined : sceneState}
        role="img"
        aria-label="龙宫试兵代码执行场景"
      />
      {loadError ? (
        <div className="game-scene-error" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={retryLoad}>重新加载龙宫场景</button>
        </div>
      ) : null}
      <p className="battle-transcript" role="status" aria-live="polite" aria-atomic="true">
        {transcript.join(' ')}
      </p>
    </div>
  )
}
