import { useEffect, useId, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import type { FourSeasBattleEvent, FourSeasOpcode, FourSeasState } from '../battle/types'
import { assetUrl } from '../utils/assets'

interface Props {
  events: FourSeasBattleEvent[]
  replayToken: number
  reducedMotion: boolean
  muted: boolean
  onPlaybackComplete?: () => void
}

interface Nodes {
  background: Phaser.GameObjects.Image
  wukong: Phaser.GameObjects.Image
  wukongRegalia: Phaser.GameObjects.Image
  dragonKing: Phaser.GameObjects.Image
  crown: Phaser.GameObjects.Image
  armor: Phaser.GameObjects.Image
  boots: Phaser.GameObjects.Image
  effects: Phaser.GameObjects.Image
}

type Effect = 'none' | 'accepted' | 'blocked' | 'success'
type VisibleRegalia = 'none' | 'cloud-boots' | 'boots-armor' | 'all-collected' | 'equipped'

const CELL_STARTS = [0, 341, 682] as const
const CELL_WIDTHS = [341, 341, 342] as const
const SHEET_HEIGHT = 512

const opcodeLabels: Record<FourSeasOpcode, string> = {
  request_regalia: '请四海龙王送披挂',
  collect_gifts: '收取三海礼物',
  receive_cloud_boots: '收下藕丝步云履',
  receive_golden_armor: '收下黄金锁子甲',
  receive_purple_crown: '收下凤翅紫金冠',
  equip_regalia: '穿戴整副披挂',
  wear_crown: '戴上凤翅紫金冠',
  wear_armor: '穿上黄金锁子甲',
  wear_boots: '穿上藕丝步云履',
  verify_regalia: '检查四海披挂',
}

function transcript(event: FourSeasBattleEvent): string {
  if (event.type === 'run-started') return '四海披挂任务开始'
  if (event.type === 'instruction-accepted') return `${opcodeLabels[event.opcode]}指令已被接受`
  if (event.type === 'instruction-rejected') {
    if (event.opcode === 'receive_purple_crown' && event.state === 'collecting-gifts') {
      return '北海龙王还没有送来藕丝步云履，现在不能先收凤翅紫金冠'
    }
    if (event.messageCode.includes('.container-scope.')) {
      return `${opcodeLabels[event.opcode]}放错了任务组，指令被挡住`
    }
    return `${opcodeLabels[event.opcode]}的顺序还不对，指令被挡住`
  }
  if (event.type === 'state-changed') {
    if (event.state === 'regalia-requested') return '四海龙王答应送来披挂'
    if (event.state === 'collecting-gifts') return '开始按顺序收取三海礼物'
    if (event.state === 'cloud-boots-received') return '已收下藕丝步云履'
    if (event.state === 'golden-armor-received') return '已收下黄金锁子甲'
    if (event.state === 'all-gifts-received') return '凤翅紫金冠也已收下，三件礼物齐全'
    if (event.state === 'equipping-regalia') return '开始按顺序穿戴整副披挂'
    if (event.state === 'crown-equipped') return '凤翅紫金冠已戴好'
    if (event.state === 'armor-equipped') return '黄金锁子甲已穿好'
    if (event.state === 'regalia-equipped') return '藕丝步云履已穿好，整副披挂完成'
    if (event.state === 'regalia-verified') return '四海披挂检查通过'
  }
  if (event.messageCode.endsWith('.completed')) return '任务结束：四海披挂已按程序收齐、穿好并验证'
  if (event.messageCode.endsWith('.rejected')) return '任务结束：指令的任务组或顺序不正确'
  return '任务结束：程序还缺少后续披挂步骤'
}

function visibleForState(state: FourSeasState): VisibleRegalia {
  if (state === 'cloud-boots-received') return 'cloud-boots'
  if (state === 'golden-armor-received') return 'boots-armor'
  if (state === 'all-gifts-received' || state === 'equipping-regalia'
    || state === 'crown-equipped' || state === 'armor-equipped') return 'all-collected'
  if (state === 'regalia-equipped' || state === 'regalia-verified') return 'equipped'
  return 'none'
}

function showCell(image: Phaser.GameObjects.Image, cell: 0 | 1 | 2, width: number, height: number) {
  image
    .setCrop(CELL_STARTS[cell], 0, CELL_WIDTHS[cell], SHEET_HEIGHT)
    .setScale(width / CELL_WIDTHS[cell], height / SHEET_HEIGHT)
    .setVisible(true)
}

function setRegaliaVisibility(nodes: Nodes, visible: VisibleRegalia) {
  nodes.crown.setVisible(false)
  nodes.armor.setVisible(false)
  nodes.boots.setVisible(false)
  nodes.wukong.setVisible(visible !== 'equipped')
  nodes.wukongRegalia.setVisible(visible === 'equipped')
  if (visible === 'cloud-boots' || visible === 'boots-armor' || visible === 'all-collected') {
    showCell(nodes.boots, 2, 112, 168)
  }
  if (visible === 'boots-armor' || visible === 'all-collected') showCell(nodes.armor, 1, 112, 168)
  if (visible === 'all-collected') showCell(nodes.crown, 0, 112, 168)
}

export function FourSeasRegaliaScene({
  events,
  replayToken,
  reducedMotion,
  muted,
  onPlaybackComplete,
}: Props) {
  const reactId = useId()
  const id = `four-seas-regalia-${reactId.replaceAll(':', '')}`
  const ownerRef = useRef<symbol | null>(null)
  const gameRef = useRef<{ owner: symbol; game: Phaser.Game } | null>(null)
  const sceneRef = useRef<{ owner: symbol; scene: Phaser.Scene } | null>(null)
  const nodesRef = useRef<{ owner: symbol; nodes: Nodes } | null>(null)
  const generationRef = useRef(0)
  const activeRef = useRef(false)
  const requestRef = useRef(0)
  const completedRef = useRef<number | null>(null)
  const previousReducedRef = useRef(reducedMotion)
  const eventsRef = useRef(events)
  const reducedRef = useRef(reducedMotion)
  const mutedRef = useRef(muted)
  const completeRef = useRef(onPlaybackComplete)
  const startRef = useRef<() => void>(() => undefined)
  const [attempt, setAttempt] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sceneState, setSceneState] = useState<FourSeasState>('awaiting-request')
  const [visibleRegalia, setVisibleRegalia] = useState<VisibleRegalia>('none')
  const [effect, setEffect] = useState<Effect>('none')
  const [messages, setMessages] = useState<string[]>([])

  eventsRef.current = events
  reducedRef.current = reducedMotion
  mutedRef.current = muted
  completeRef.current = onPlaybackComplete

  const owned = () => {
    const owner = ownerRef.current
    if (!owner || sceneRef.current?.owner !== owner || nodesRef.current?.owner !== owner) return null
    return { owner, scene: sceneRef.current.scene, nodes: nodesRef.current.nodes }
  }

  const reset = (owner: symbol, scene: Phaser.Scene, nodes: Nodes) => {
    if (ownerRef.current !== owner) return
    const { width, height } = scene.scale
    nodes.wukong.setX(width * 0.17).setY(height * 0.68).setVisible(true)
    nodes.wukongRegalia.setX(width * 0.17).setY(height * 0.68).setVisible(false)
    nodes.dragonKing.setX(width * 0.84).setY(height * 0.55).setVisible(true)
    nodes.crown.setX(width * 0.42).setY(height * 0.61)
    nodes.armor.setX(width * 0.56).setY(height * 0.61)
    nodes.boots.setX(width * 0.70).setY(height * 0.61)
    setRegaliaVisibility(nodes, 'none')
    nodes.effects.setX(width * 0.56).setY(height * 0.39).setCrop().setVisible(false)
    setVisibleRegalia('none')
    setEffect('none')
  }

  const apply = (owner: symbol, scene: Phaser.Scene, nodes: Nodes, event: FourSeasBattleEvent) => {
    if (ownerRef.current !== owner) return
    if (event.type === 'run-started') reset(owner, scene, nodes)
    if (event.type === 'instruction-accepted') {
      showCell(nodes.effects, 0, 150, 120)
      setEffect('accepted')
    }
    if (event.type === 'state-changed') {
      const visible = visibleForState(event.state)
      setRegaliaVisibility(nodes, visible)
      setVisibleRegalia(visible)
      nodes.effects.setVisible(false)
      setEffect('none')
    }
    if (event.type === 'instruction-rejected') {
      showCell(nodes.effects, 1, 150, 120)
      setEffect('blocked')
    }
    if (event.type === 'run-finished' && event.messageCode.endsWith('.completed')) {
      showCell(nodes.effects, 2, 150, 120)
      setEffect('success')
    }
    setSceneState(event.state)
    setMessages((current) => [...current, transcript(event)])
  }

  const start = () => {
    const current = owned()
    if (!current || loadError) return
    const { owner, scene, nodes } = current
    const generation = ++generationRef.current
    const request = requestRef.current
    const requested = eventsRef.current
    activeRef.current = true
    scene.tweens.killAll()
    reset(owner, scene, nodes)
    setSceneState('awaiting-request')
    setMessages([])

    const finish = () => {
      if (generation !== generationRef.current || ownerRef.current !== owner) return
      activeRef.current = false
      if (completedRef.current === request) return
      completedRef.current = request
      completeRef.current?.()
    }

    if (reducedRef.current) {
      requested.forEach((event) => apply(owner, scene, nodes, event))
      finish()
      return
    }

    let index = 0
    const next = () => {
      if (generation !== generationRef.current || ownerRef.current !== owner) return
      const event = requested[index]
      if (!event) {
        finish()
        return
      }
      index += 1
      scene.tweens.add({
        targets: nodes.wukong,
        x: scene.scale.width * (event.state === 'regalia-verified' ? 0.28 : 0.17),
        duration: event.type === 'state-changed' ? 360 : 140,
        ease: 'Sine.inOut',
        onComplete: () => {
          if (generation !== generationRef.current || ownerRef.current !== owner) return
          apply(owner, scene, nodes, event)
          next()
        },
      })
    }
    next()
  }

  startRef.current = start
  useEffect(() => {
    requestRef.current += 1
    completedRef.current = null
    startRef.current()
  }, [events, replayToken])
  useEffect(() => {
    const wasReduced = previousReducedRef.current
    previousReducedRef.current = reducedMotion
    if (!wasReduced && reducedMotion && activeRef.current) startRef.current()
  }, [reducedMotion])

  useEffect(() => {
    if (navigator.userAgent.includes('jsdom')) return undefined
    const owner = Symbol('four-seas-regalia-scene')
    let cancelled = false
    let failed = false
    let game: Phaser.Game | null = null
    ownerRef.current = owner
    const owns = () => !cancelled && !failed && ownerRef.current === owner

    class Scene extends Phaser.Scene {
      preload() {
        if (!owns()) return
        this.load.once('loaderror', () => {
          if (!owns()) return
          failed = true
          generationRef.current += 1
          activeRef.current = false
          if (sceneRef.current?.owner === owner) sceneRef.current = null
          if (nodesRef.current?.owner === owner) nodesRef.current = null
          setMessages([])
          setLoadError('四海披挂场景资源加载失败，请重试。')
        })
        this.load.image('background', assetUrl('/assets/dragon-palace/background.webp'))
        this.load.image('wukong', assetUrl('/assets/dragon-palace/wukong.webp'))
        this.load.image('wukongRegalia', assetUrl('/assets/dragon-palace/wukong-regalia.webp'))
        this.load.image('dragonKing', assetUrl('/assets/dragon-palace/dragon-king.webp'))
        this.load.image('regalia', assetUrl('/assets/dragon-palace/regalia.webp'))
        this.load.image('effects', assetUrl('/assets/dragon-palace/effects.webp'))
      }

      create() {
        if (!owns()) return
        const { width, height } = this.scale
        const background = this.add.image(width / 2, height / 2, 'background').setDisplaySize(width, height)
        const wukong = this.add.image(width * 0.17, height * 0.68, 'wukong').setDisplaySize(150, 150).setOrigin(0.5, 0.5)
        const wukongRegalia = this.add.image(width * 0.17, height * 0.68, 'wukongRegalia').setDisplaySize(150, 150).setOrigin(0.5, 0.5).setVisible(false)
        const dragonKing = this.add.image(width * 0.84, height * 0.55, 'dragonKing').setDisplaySize(175, 175).setOrigin(0.5, 0.5)
        const crown = this.add.image(width * 0.42, height * 0.61, 'regalia').setOrigin(0.5, 0.5).setVisible(false)
        const armor = this.add.image(width * 0.56, height * 0.61, 'regalia').setOrigin(0.5, 0.5).setVisible(false)
        const boots = this.add.image(width * 0.70, height * 0.61, 'regalia').setOrigin(0.5, 0.5).setVisible(false)
        const effects = this.add.image(width * 0.56, height * 0.39, 'effects').setOrigin(0.5, 0.5).setVisible(false)
        if (!owns()) return
        sceneRef.current = { owner, scene: this }
        nodesRef.current = { owner, nodes: { background, wukong, wukongRegalia, dragonKing, crown, armor, boots, effects } }
        this.sound.mute = mutedRef.current
        startRef.current()
      }
    }

    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: id,
      width: 760,
      height: 320,
      transparent: true,
      scene: Scene,
      render: { antialias: true, pixelArt: false },
    })
    if (owns()) gameRef.current = { owner, game }
    return () => {
      cancelled = true
      if (ownerRef.current === owner) {
        ownerRef.current = null
        generationRef.current += 1
        activeRef.current = false
      }
      if (sceneRef.current?.owner === owner) sceneRef.current = null
      if (nodesRef.current?.owner === owner) nodesRef.current = null
      if (gameRef.current?.owner === owner) gameRef.current = null
      game?.destroy(true)
    }
  }, [id, attempt])

  useEffect(() => {
    const current = owned()
    if (current) current.scene.sound.mute = muted
  }, [muted])

  const retry = () => {
    generationRef.current += 1
    activeRef.current = false
    setLoadError(null)
    setSceneState('awaiting-request')
    setVisibleRegalia('none')
    setEffect('none')
    setMessages([])
    setAttempt((value) => value + 1)
  }

  return (
    <div className="game-scene-frame four-seas-regalia-scene-frame">
      <div
        id={id}
        className="game-scene"
        style={{ backgroundImage: 'none', backgroundColor: '#e8e0cf' }}
        role="img"
        aria-label="龙宫四海披挂代码执行场景"
        data-motion-mode={reducedMotion ? 'reduced' : 'standard'}
        data-scene-state={loadError ? undefined : sceneState}
        data-visible-regalia={loadError ? undefined : visibleRegalia}
        data-effect-cell={loadError ? undefined : effect}
      />
      {loadError ? (
        <div className="game-scene-error" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={retry}>重新加载四海披挂场景</button>
        </div>
      ) : null}
      <p className="battle-transcript" role="status" aria-live="polite" aria-atomic="true">
        {messages.join(' ')}
      </p>
    </div>
  )
}
