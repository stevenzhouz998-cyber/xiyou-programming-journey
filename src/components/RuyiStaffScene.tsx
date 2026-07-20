import { useEffect, useId, useRef, useState } from 'react'
import * as Phaser from 'phaser'
import type { RuyiStaffBattleEvent, RuyiStaffOpcode, RuyiStaffState } from '../battle/types'
import { assetUrl } from '../utils/assets'

interface Props { events: RuyiStaffBattleEvent[]; replayToken: number; reducedMotion: boolean; muted: boolean; onPlaybackComplete?: () => void }
interface Nodes { background: Phaser.GameObjects.Image; dragonKing: Phaser.GameObjects.Image; effects: Phaser.GameObjects.Image; halberd: Phaser.GameObjects.Image; sabre: Phaser.GameObjects.Image | null; staff: Phaser.GameObjects.Image; wukong: Phaser.GameObjects.Image }
type Effect = 'none' | 'accepted' | 'blocked' | 'success'
type Selected = 'none' | 'all' | 'sabre' | 'halberd' | 'ruyi-staff' | 'ruyi-staff-shrunk'
type SabreAssetState = 'idle' | 'loading' | 'ready' | 'error'
type SabrePresentation = 'inspect' | 'wrong-choice'
type SabreLoadOutcome = 'ready' | 'error' | 'cancelled'
const STARTS = [0, 341, 682] as const; const WIDTHS = [341, 341, 342] as const; const SHEET_HEIGHT = 512
const opcodeLabels: Record<RuyiStaffOpcode, string> = {
  inspect_weights: '查看三件兵器重量', choose_sabre: '选择大捍刀', choose_halberd: '选择方天画戟', choose_ruyi_staff: '选择定海神针', shrink_ruyi_staff: '缩小定海神针',
}
function showCell(image: Phaser.GameObjects.Image, cell: 0 | 1 | 2, width = 132, height = 198) {
  image.setCrop(STARTS[cell], 0, WIDTHS[cell], SHEET_HEIGHT).setScale(width / WIDTHS[cell], height / SHEET_HEIGHT).setVisible(true)
}
function showSabre(image: Phaser.GameObjects.Image, width = 132, height = 198) {
  image.setCrop().setDisplaySize(width, height).setVisible(true)
}
function hideWeapons(nodes: Nodes) {
  nodes.sabre?.setVisible(false); nodes.halberd.setVisible(false); nodes.staff.setVisible(false)
}
function transcript(event: RuyiStaffBattleEvent): string {
  if (event.type === 'run-started') return '挑选兵器开始'
  if (event.type === 'instruction-accepted') return `${opcodeLabels[event.opcode]}指令已被接受`
  if (event.type === 'instruction-rejected') {
    if (event.opcode === 'choose_sabre') return '选中大捍刀：3600斤比13500斤轻，指令被挡住'
    if (event.opcode === 'choose_halberd') return '选中方天画戟：7200斤比13500斤轻，指令被挡住'
    return `${opcodeLabels[event.opcode]}在当前顺序不能执行，指令被挡住`
  }
  if (event.type === 'state-changed') {
    if (event.state === 'weights-inspected') return '已看到大捍刀3600斤、方天画戟7200斤、定海神针13500斤'
    if (event.state === 'ruyi-staff-selected') return '选中最重的13500斤定海神针'
    if (event.state === 'ruyi-staff-shrunk') return '定海神针缩小到随身大小'
  }
  if (event.messageCode.endsWith('.completed')) return '挑选结束：定海神针已变成如意金箍棒'
  if (event.messageCode.endsWith('.wrong-weapon-selected')) return '挑选结束：选中的不是最重兵器'
  if (event.messageCode.endsWith('.rejected')) return '挑选结束：指令顺序不正确'
  return '挑选结束：程序还缺少后续指令'
}
function xFor(state: RuyiStaffState, width: number) {
  if (state === 'awaiting-inspection') return width * .18
  if (state === 'weights-inspected') return width * .35
  if (state === 'wrong-weapon-selected') return width * .47
  if (state === 'ruyi-staff-selected') return width * .55
  return width * .63
}

export function RuyiStaffScene({ events, replayToken, reducedMotion, muted, onPlaybackComplete }: Props) {
  const reactId = useId(); const id = `ruyi-${reactId.replaceAll(':', '')}`
  const ownerRef = useRef<symbol | null>(null); const gameRef = useRef<{ owner: symbol; game: Phaser.Game } | null>(null)
  const sceneRef = useRef<{ owner: symbol; scene: Phaser.Scene } | null>(null); const nodesRef = useRef<{ owner: symbol; nodes: Nodes } | null>(null)
  const generationRef = useRef(0); const activeRef = useRef(false); const requestRef = useRef(0); const completedRef = useRef<number | null>(null)
  const pendingSabreCancelRef = useRef<(() => void) | null>(null); const sabreRetryRef = useRef<(() => Promise<SabreLoadOutcome>) | null>(null); const sabreAlertRef = useRef<HTMLDivElement>(null)
  const resumeAfterSabreRetryRef = useRef<(() => void) | null>(null)
  const previousReducedRef = useRef(reducedMotion); const eventsRef = useRef(events); const reducedRef = useRef(reducedMotion); const mutedRef = useRef(muted); const completeRef = useRef(onPlaybackComplete)
  const startRef = useRef<() => void>(() => undefined); const [attempt, setAttempt] = useState(0); const [loadError, setLoadError] = useState<string | null>(null)
  const [state, setState] = useState<RuyiStaffState>('awaiting-inspection'); const [effect, setEffect] = useState<Effect>('none'); const [selected, setSelected] = useState<Selected>('none'); const [messages, setMessages] = useState<string[]>([])
  const [sabreAssetState, setSabreAssetState] = useState<SabreAssetState>('idle'); const [sabreSpriteVisible, setSabreSpriteVisible] = useState(false)
  const [sabrePresentation, setSabrePresentation] = useState<SabrePresentation | null>(null); const [visibleWeapons, setVisibleWeapons] = useState('')
  eventsRef.current = events; reducedRef.current = reducedMotion; mutedRef.current = muted; completeRef.current = onPlaybackComplete

  const owned = () => {
    const owner = ownerRef.current
    if (!owner || sceneRef.current?.owner !== owner || nodesRef.current?.owner !== owner) return null
    return { owner, scene: sceneRef.current.scene, nodes: nodesRef.current.nodes }
  }
  const cancelPendingSabre = () => { pendingSabreCancelRef.current?.(); pendingSabreCancelRef.current = null }
  const reset = (owner: symbol, scene: Phaser.Scene, nodes: Nodes) => {
    if (ownerRef.current !== owner) return
    const { width, height } = scene.scale
    nodes.wukong.setX(xFor('awaiting-inspection', width)).setY(height * .69).setVisible(true)
    nodes.dragonKing.setX(width * .82).setY(height * .55).setVisible(true)
    nodes.sabre?.setX(width * .55).setY(height * .6); nodes.halberd.setX(width * .55).setY(height * .6); nodes.staff.setX(width * .55).setY(height * .6); hideWeapons(nodes)
    nodes.effects.setX(width * .55).setY(height * .44).setCrop().setVisible(false)
    setEffect('none'); setSelected('none'); setSabreAssetState('idle'); setSabreSpriteVisible(false); setSabrePresentation(null); setVisibleWeapons('')
  }
  const demandSabre = (owner: symbol, scene: Phaser.Scene, nodes: Nodes, presentation: SabrePresentation) => new Promise<SabreLoadOutcome>((resolve) => {
    const generation = generationRef.current
    let settled = false
    const cleanup = () => {
      scene.load.off('complete', ready)
      scene.load.off('loaderror', failed)
      if (pendingSabreCancelRef.current === cancel) pendingSabreCancelRef.current = null
    }
    const settle = (outcome: SabreLoadOutcome) => { if (settled) return; settled = true; cleanup(); resolve(outcome) }
    const current = () => generation === generationRef.current && ownerRef.current === owner
    const cancel = () => settle('cancelled')
    const publish = () => {
      if (nodes.sabre === null) nodes.sabre = scene.add.image(scene.scale.width * .55, scene.scale.height * .6, 'sabre').setOrigin(.5, .5)
      nodes.sabre.setTexture('sabre')
      if (presentation === 'inspect') {
        nodes.sabre.setX(scene.scale.width * .43); showSabre(nodes.sabre, 90, 135)
        setSelected('all'); setVisibleWeapons('sabre,halberd,ruyi-staff')
      } else {
        nodes.sabre.setX(scene.scale.width * .55); showSabre(nodes.sabre)
        setSelected('sabre'); setVisibleWeapons('sabre')
      }
      setSabreAssetState('ready'); setSabreSpriteVisible(true); sabreRetryRef.current = null
    }
    const failed = () => {
      if (!current()) { settle('cancelled'); return }
      nodes.sabre?.setVisible(false); setSabreAssetState('error'); setSabreSpriteVisible(false); setSelected('none')
      if (presentation === 'inspect') setVisibleWeapons('halberd,ruyi-staff')
      else setVisibleWeapons('')
      sabreRetryRef.current = () => demandSabre(owner, scene, nodes, presentation); settle('error')
    }
    const ready = () => {
      if (!current()) { settle('cancelled'); return }
      if (!scene.textures.exists('sabre')) { failed(); return }
      publish(); settle('ready')
    }
    pendingSabreCancelRef.current = cancel
    setSabrePresentation(presentation); setSabreAssetState('loading'); setSabreSpriteVisible(false); setSelected('none')
    if (presentation === 'inspect') setVisibleWeapons('halberd,ruyi-staff')
    else setVisibleWeapons('')
    if (scene.textures.exists('sabre')) { ready(); return }
    scene.load.once('complete', ready)
    scene.load.once('loaderror', failed)
    scene.load.image('sabre', assetUrl('/assets/dragon-palace/sabre.webp'))
    scene.load.start()
  })
  const apply = (owner: symbol, scene: Phaser.Scene, nodes: Nodes, event: RuyiStaffBattleEvent): Promise<SabreLoadOutcome> | null => {
    if (ownerRef.current !== owner) return null
    let pending: Promise<SabreLoadOutcome> | null = null
    if (event.type === 'run-started') reset(owner, scene, nodes)
    if (event.type === 'instruction-accepted') { showCell(nodes.effects, 0, 150, 120); setEffect('accepted') }
    if (event.type === 'state-changed') {
      nodes.wukong.setX(xFor(event.state, scene.scale.width)); nodes.effects.setVisible(false); setEffect('none')
      if (event.state === 'weights-inspected') {
        hideWeapons(nodes)
        setSabreSpriteVisible(false)
        showCell(nodes.halberd, 1, 90, 135); showCell(nodes.staff, 2, 90, 135)
        nodes.halberd.setX(scene.scale.width * .55); nodes.staff.setX(scene.scale.width * .67)
        setVisibleWeapons('halberd,ruyi-staff'); setSelected('none')
        pending = demandSabre(owner, scene, nodes, 'inspect')
      }
      if (event.state === 'ruyi-staff-selected') { hideWeapons(nodes); setSabreSpriteVisible(false); nodes.staff.setX(scene.scale.width * .55); showCell(nodes.staff, 2); setSelected('ruyi-staff'); setVisibleWeapons('ruyi-staff') }
      if (event.state === 'ruyi-staff-shrunk') { hideWeapons(nodes); setSabreSpriteVisible(false); nodes.staff.setX(scene.scale.width * .55); showCell(nodes.staff, 2, 52, 78); setSelected('ruyi-staff-shrunk'); setVisibleWeapons('ruyi-staff') }
    }
    if (event.type === 'instruction-rejected') {
      showCell(nodes.effects, 1, 150, 120); setEffect('blocked')
      if (event.opcode === 'choose_sabre') {
        hideWeapons(nodes); setSabreSpriteVisible(false); setSelected('none')
        pending = demandSabre(owner, scene, nodes, 'wrong-choice')
      }
      if (event.opcode === 'choose_halberd') { hideWeapons(nodes); setSabreSpriteVisible(false); nodes.halberd.setX(scene.scale.width * .55); showCell(nodes.halberd, 1); setSelected('halberd'); setVisibleWeapons('halberd') }
    }
    if (event.type === 'run-finished' && event.messageCode.endsWith('.completed')) { showCell(nodes.effects, 2, 150, 120); setEffect('success') }
    setState(event.state); setMessages((current) => [...current, transcript(event)])
    return pending
  }
  const start = () => {
    const current = owned(); if (!current || loadError) return
    cancelPendingSabre(); sabreRetryRef.current = null; resumeAfterSabreRetryRef.current = null
    const { owner, scene, nodes } = current; const generation = ++generationRef.current; const request = requestRef.current; const requested = eventsRef.current
    activeRef.current = true; scene.tweens.killAll(); reset(owner, scene, nodes); setState('awaiting-inspection'); setMessages([])
    const finish = () => { if (generation !== generationRef.current || ownerRef.current !== owner) return; activeRef.current = false; if (completedRef.current === request) return; completedRef.current = request; completeRef.current?.() }
    if (reducedRef.current) {
      const reducedNext = (index: number) => {
        if (generation !== generationRef.current || ownerRef.current !== owner) return
        const event = requested[index]
        if (!event) { finish(); return }
        const pending = apply(owner, scene, nodes, event)
        if (pending) void pending.then((outcome) => {
          if (outcome === 'ready') reducedNext(index + 1)
          else if (outcome === 'error') { resumeAfterSabreRetryRef.current = () => reducedNext(index + 1); finish() }
        })
        else reducedNext(index + 1)
      }
      reducedNext(0); return
    }
    let index = 0
    const next = () => {
      if (generation !== generationRef.current || ownerRef.current !== owner) return
      const event = requested[index++]; if (!event) { finish(); return }
      scene.tweens.add({ targets: nodes.wukong, x: xFor(event.state, scene.scale.width), duration: event.type === 'state-changed' ? 360 : 140, ease: 'Sine.inOut', onComplete: () => { if (generation !== generationRef.current || ownerRef.current !== owner) return; const pending = apply(owner, scene, nodes, event); if (pending) void pending.then((outcome) => { if (outcome === 'ready') next(); else if (outcome === 'error') { resumeAfterSabreRetryRef.current = next; finish() } }); else next() } })
    }
    next()
  }
  startRef.current = start
  useEffect(() => { requestRef.current += 1; completedRef.current = null; startRef.current() }, [events, replayToken])
  useEffect(() => { const was = previousReducedRef.current; previousReducedRef.current = reducedMotion; if (!was && reducedMotion && activeRef.current) startRef.current() }, [reducedMotion])

  useEffect(() => {
    if (navigator.userAgent.includes('jsdom')) return
    const owner = Symbol('ruyi-staff-scene'); let cancelled = false; let failed = false; let game: Phaser.Game | null = null; ownerRef.current = owner
    const owns = () => !cancelled && !failed && ownerRef.current === owner
    class Scene extends Phaser.Scene {
      initialFailure: (() => void) | null = null
      preload() {
        if (!owns()) return
        this.initialFailure = () => { if (!owns()) return; failed = true; generationRef.current += 1; activeRef.current = false; if (sceneRef.current?.owner === owner) sceneRef.current = null; if (nodesRef.current?.owner === owner) nodesRef.current = null; setMessages([]); setLoadError('龙宫场景资源加载失败，请重试。') }
        this.load.once('loaderror', this.initialFailure)
        this.load.image('background', assetUrl('/assets/dragon-palace/background.webp')); this.load.image('wukong', assetUrl('/assets/dragon-palace/wukong.webp')); this.load.image('dragonKing', assetUrl('/assets/dragon-palace/dragon-king.webp')); this.load.image('weapons', assetUrl('/assets/dragon-palace/weapons.webp')); this.load.image('effects', assetUrl('/assets/dragon-palace/effects.webp'))
      }
      create() {
        if (this.initialFailure) this.load.off('loaderror', this.initialFailure)
        if (!owns()) return; const { width, height } = this.scale
        const background = this.add.image(width / 2, height / 2, 'background').setDisplaySize(width, height)
        const wukong = this.add.image(width * .18, height * .69, 'wukong').setDisplaySize(150, 150).setOrigin(.5, .5)
        const dragonKing = this.add.image(width * .82, height * .55, 'dragonKing').setDisplaySize(175, 175).setOrigin(.5, .5)
        const sabre = null
        const halberd = this.add.image(width * .55, height * .6, 'weapons').setOrigin(.5, .5).setVisible(false)
        const staff = this.add.image(width * .55, height * .6, 'weapons').setOrigin(.5, .5).setVisible(false)
        const effects = this.add.image(width * .55, height * .44, 'effects').setOrigin(.5, .5).setVisible(false)
        if (!owns()) return; sceneRef.current = { owner, scene: this }; nodesRef.current = { owner, nodes: { background, wukong, dragonKing, sabre, halberd, staff, effects } }; this.sound.mute = mutedRef.current; startRef.current()
      }
    }
    game = new Phaser.Game({ type: Phaser.AUTO, parent: id, width: 760, height: 320, transparent: true, scene: Scene, render: { antialias: true, pixelArt: false } })
    if (owns()) gameRef.current = { owner, game }
    return () => { cancelled = true; cancelPendingSabre(); sabreRetryRef.current = null; resumeAfterSabreRetryRef.current = null; if (ownerRef.current === owner) { ownerRef.current = null; generationRef.current += 1; activeRef.current = false } if (sceneRef.current?.owner === owner) sceneRef.current = null; if (nodesRef.current?.owner === owner) nodesRef.current = null; if (gameRef.current?.owner === owner) gameRef.current = null; game?.destroy(true) }
  }, [id, attempt])
  useEffect(() => { const current = owned(); if (current) current.scene.sound.mute = muted }, [muted])
  useEffect(() => { if (sabreAssetState === 'error') sabreAlertRef.current?.focus() }, [sabreAssetState])
  const retrySabre = () => {
    const retry = sabreRetryRef.current
    if (!retry) return
    cancelPendingSabre()
    void retry().then((outcome) => {
      if (outcome !== 'ready') return
      const resume = resumeAfterSabreRetryRef.current
      resumeAfterSabreRetryRef.current = null
      resume?.()
    })
  }
  const retry = () => { cancelPendingSabre(); sabreRetryRef.current = null; resumeAfterSabreRetryRef.current = null; generationRef.current += 1; activeRef.current = false; setLoadError(null); setState('awaiting-inspection'); setSelected('none'); setSabreAssetState('idle'); setSabreSpriteVisible(false); setSabrePresentation(null); setVisibleWeapons(''); setMessages([]); setAttempt((value) => value + 1) }

  return <div className="game-scene-frame ruyi-staff-scene-frame">
    <div id={id} className="game-scene" style={{ backgroundImage: 'none', backgroundColor: '#e8e0cf' }} role="img" aria-label="龙宫定海神针代码执行场景" data-motion-mode={reducedMotion ? 'reduced' : 'standard'} data-scene-state={loadError ? undefined : state} data-selected-weapon={loadError || selected === 'none' ? undefined : selected} data-visible-weapons={loadError ? undefined : visibleWeapons} data-effect-cell={loadError ? undefined : effect} data-sabre-asset-state={loadError ? undefined : sabreAssetState} data-sabre-sprite-visible={loadError ? undefined : String(sabreSpriteVisible)} />
    <dl className="ruyi-weight-list" aria-label="三件兵器重量"><div><dt>大捍刀</dt><dd>3600斤</dd></div><div><dt>方天画戟</dt><dd>7200斤</dd></div><div><dt>定海神针</dt><dd>13500斤</dd></div></dl>
    {sabreAssetState === 'loading' ? <p role="status" aria-label="大捍刀画面状态">正在取来大捍刀画面，请稍候……</p> : null}
    {sabreAssetState === 'error' ? <div ref={sabreAlertRef} role="alert" tabIndex={-1}><p>{sabrePresentation === 'inspect' ? '三件兵器画面还没有齐。战斗结果已保留，你可以只重试画面。' : '大捍刀画面没有加载成功。战斗结果已保留，你可以只重试画面。'}</p><button type="button" onClick={retrySabre}>{sabrePresentation === 'inspect' ? '重试三件兵器画面' : '重试大捍刀画面'}</button></div> : null}
    {loadError ? <div className="game-scene-error" role="alert"><p>{loadError}</p><button type="button" onClick={retry}>重新加载龙宫场景</button></div> : null}
    <p className="battle-transcript" role="status" aria-live="polite" aria-atomic="true">{messages.join(' ')}</p>
  </div>
}
