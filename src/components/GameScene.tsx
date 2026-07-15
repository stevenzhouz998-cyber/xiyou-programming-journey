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

const WEAPON_CELL_WIDTH = 341
const EFFECT_CELL_WIDTH = 341

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
  if (event.type === 'instruction-accepted') {
    return `${opcodeLabels[event.opcode]}指令已被接受`
  }
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

export function GameScene({
  events,
  replayToken,
  reducedMotion,
  muted,
  onPlaybackComplete,
}: GameSceneProps) {
  const reactId = useId()
  const id = `game-${reactId.replaceAll(':', '')}`
  const gameRef = useRef<Phaser.Game | null>(null)
  const sceneRef = useRef<Phaser.Scene | null>(null)
  const nodesRef = useRef<SceneNodes | null>(null)
  const mountedRef = useRef(false)
  const playbackGenerationRef = useRef(0)
  const reducedMotionRef = useRef(reducedMotion)
  const mutedRef = useRef(muted)
  const onPlaybackCompleteRef = useRef(onPlaybackComplete)
  const playCurrentEventsRef = useRef<() => void>(() => undefined)
  const [sceneState, setSceneState] = useState<DragonPalaceState>('outside-palace')
  const [transcript, setTranscript] = useState<readonly string[]>([])

  reducedMotionRef.current = reducedMotion
  mutedRef.current = muted
  onPlaybackCompleteRef.current = onPlaybackComplete

  const resetScene = () => {
    const scene = sceneRef.current
    const nodes = nodesRef.current
    if (!scene || !nodes) return
    const { width, height } = scene.scale
    nodes.wukong.setX(stateX('outside-palace', width)).setY(height * 0.69).setVisible(true)
    nodes.dragonKing.setX(width * 0.82).setY(height * 0.55).setVisible(true)
    nodes.weapons.setX(width * 0.55).setY(height * 0.6).setVisible(false)
    nodes.weapons.setCrop(0, 0, WEAPON_CELL_WIDTH, 512)
    nodes.effects.setX(width * 0.55).setY(height * 0.45).setVisible(false)
    nodes.effects.setCrop(0, 0, EFFECT_CELL_WIDTH, 512)
  }

  const applyEvent = (event: BattleEvent) => {
    const scene = sceneRef.current
    const nodes = nodesRef.current
    if (!scene || !nodes) return

    if (event.type === 'run-started') resetScene()
    if (event.type === 'instruction-accepted') {
      nodes.effects.setCrop(0, 0, EFFECT_CELL_WIDTH, 512).setVisible(true)
    }
    if (event.type === 'state-changed') {
      nodes.wukong.setX(stateX(event.state, scene.scale.width))
      nodes.effects.setVisible(false)
      if (event.state === 'weapon-requested') {
        nodes.weapons.setCrop(0, 0, WEAPON_CELL_WIDTH, 512).setVisible(true)
      }
      if (event.state === 'weapon-tested') {
        nodes.weapons.setCrop(WEAPON_CELL_WIDTH * 2, 0, 342, 512).setVisible(true)
      }
    }
    if (event.type === 'instruction-rejected') {
      nodes.effects
        .setCrop(EFFECT_CELL_WIDTH, 0, EFFECT_CELL_WIDTH, 512)
        .setVisible(true)
    }
    if (event.type === 'run-finished' && event.messageCode.endsWith('.completed')) {
      nodes.effects
        .setCrop(EFFECT_CELL_WIDTH * 2, 0, 342, 512)
        .setVisible(true)
    }

    setSceneState(event.state)
    setTranscript((messages) => [...messages, eventTranscript(event)])
  }

  const playCurrentEvents = () => {
    const scene = sceneRef.current
    const nodes = nodesRef.current
    if (!scene || !nodes) return

    const generation = ++playbackGenerationRef.current
    scene.tweens.killAll()
    resetScene()
    setSceneState('outside-palace')
    setTranscript([])

    let completed = false
    const complete = () => {
      if (completed || generation !== playbackGenerationRef.current) return
      completed = true
      onPlaybackCompleteRef.current?.()
    }

    if (events.length === 0) {
      complete()
      return
    }

    if (reducedMotionRef.current) {
      for (const event of events) applyEvent(event)
      complete()
      return
    }

    let eventIndex = 0
    const playNext = () => {
      if (generation !== playbackGenerationRef.current) return
      const event = events[eventIndex]
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
          if (generation !== playbackGenerationRef.current) return
          applyEvent(event)
          playNext()
        },
      })
    }
    playNext()
  }

  playCurrentEventsRef.current = playCurrentEvents

  useEffect(() => {
    playCurrentEventsRef.current()
  }, [events, replayToken])

  useEffect(() => {
    if (navigator.userAgent.includes('jsdom')) return undefined
    mountedRef.current = true

    class DragonPalaceScene extends Phaser.Scene {
      preload() {
        this.load.image('background', assetUrl('/assets/dragon-palace/background.webp'))
        this.load.image('wukong', assetUrl('/assets/dragon-palace/wukong.webp'))
        this.load.image('dragonKing', assetUrl('/assets/dragon-palace/dragon-king.webp'))
        this.load.image('weapons', assetUrl('/assets/dragon-palace/weapons.webp'))
        this.load.image('effects', assetUrl('/assets/dragon-palace/effects.webp'))
      }

      create() {
        if (!mountedRef.current) return
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
          .setDisplaySize(132, 198)
          .setOrigin(0.5, 0.5)
          .setVisible(false)
        const effects = this.add
          .image(width * 0.55, height * 0.45, 'effects')
          .setDisplaySize(150, 120)
          .setOrigin(0.5, 0.5)
          .setVisible(false)

        sceneRef.current = this
        nodesRef.current = { background, dragonKing, effects, weapons, wukong }
        this.sound.mute = mutedRef.current
        playCurrentEventsRef.current()
      }
    }

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: id,
      width: 760,
      height: 320,
      transparent: true,
      scene: DragonPalaceScene,
      render: { antialias: true, pixelArt: false },
    })

    return () => {
      mountedRef.current = false
      playbackGenerationRef.current += 1
      sceneRef.current?.tweens.killAll()
      gameRef.current?.destroy(true)
      gameRef.current = null
      sceneRef.current = null
      nodesRef.current = null
    }
  }, [id])

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.sound.mute = muted
  }, [muted])

  return (
    <div className="game-scene-frame">
      <div
        id={id}
        className="game-scene"
        data-motion-mode={reducedMotion ? 'reduced' : 'standard'}
        data-scene-state={sceneState}
        role="img"
        aria-label="龙宫试兵代码执行场景"
      />
      <p className="battle-transcript" role="status" aria-live="polite" aria-atomic="true">
        {transcript.join(' ')}
      </p>
    </div>
  )
}
