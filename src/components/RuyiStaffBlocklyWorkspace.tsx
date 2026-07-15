import * as Blockly from 'blockly/core'
import * as zhHans from 'blockly/msg/zh-hans'
import { ArrowsCounterClockwise, Play } from '@phosphor-icons/react'
import { createContext, useContext, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { initializeWorkspaceBlock, renderWorkspaceTopBlocks, RUYI_BLOCK_OPCODE, registerRuyiStaffBlocks, type RuyiBlockType } from '../blockly/ruyiStaffBlocks'
import { compileRuyiStaffWorkspace, type RuyiCompileResult } from '../blockly/ruyiStaffCompiler'
import { loadRuyiWorkspaceDraft, saveRuyiWorkspaceDraft, type RuyiWorkspaceDraftV1 } from '../blockly/ruyiStaffDraft'
import { PROGRESS_SCHEMA_LIMITS } from '../progress/schema'

interface Props {
  draft: RuyiWorkspaceDraftV1
  onDraftChange: (draft: RuyiWorkspaceDraftV1) => { status: 'saved' | 'unsaved' | 'conflict' } | Promise<{ status: 'saved' | 'unsaved' | 'conflict' }>
  onRun: (result: RuyiCompileResult) => void
  focusBlockId: string | null
  onFocusHandled: () => void
  saveRecoverySuperseded?: boolean
  locked?: boolean
}

export interface RuyiStaffBlocklyWorkspaceAdapter { create(host: HTMLDivElement): Blockly.Workspace }

const ACTIONS: ReadonlyArray<{ type: RuyiBlockType; label: string }> = [
  { type: 'xiyou_inspect_weights', label: '查看三件兵器重量' },
  { type: 'xiyou_choose_sabre', label: '选择大捍刀（3600斤）' },
  { type: 'xiyou_choose_halberd', label: '选择方天画戟（7200斤）' },
  { type: 'xiyou_choose_ruyi_staff', label: '选择定海神针（13500斤）' },
  { type: 'xiyou_shrink_ruyi_staff', label: '缩小定海神针' },
]
const LABEL_BY_TYPE = Object.fromEntries(ACTIONS.map(({ type, label }) => [type, label])) as Record<RuyiBlockType, string>
const LABEL_BY_OPCODE = Object.fromEntries(ACTIONS.map(({ type, label }) => [RUYI_BLOCK_OPCODE[type], label])) as Record<(typeof RUYI_BLOCK_OPCODE)[RuyiBlockType], string>
const MAX_WORKSPACE_BLOCKS = PROGRESS_SCHEMA_LIMITS.maxWorkspaceBlocks

Blockly.setLocale(zhHans as unknown as Record<string, string>)
const THEME = Blockly.Theme.defineTheme('xiyou-ruyi-staff', {
  name: 'xiyou-ruyi-staff', base: Blockly.Themes.Classic,
  componentStyles: { workspaceBackgroundColour: '#f7f0df', toolboxBackgroundColour: '#e5d6b6', flyoutBackgroundColour: '#efe4cb' },
})
const defaultAdapter: RuyiStaffBlocklyWorkspaceAdapter = {
  create(host) {
    if (navigator.userAgent.includes('jsdom')) return new Blockly.Workspace()
    return Blockly.inject(host, {
      toolbox: { kind: 'flyoutToolbox', contents: ACTIONS.map(({ type }) => ({ kind: 'block', type })) },
      trashcan: true, sounds: false, renderer: 'zelos', theme: THEME,
    })
  },
}
const AdapterContext = createContext(defaultAdapter)
export function RuyiStaffBlocklyWorkspaceAdapterProvider({ adapter, children }: { adapter: RuyiStaffBlocklyWorkspaceAdapter; children: ReactNode }) {
  return <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>
}

function withoutEvents<T>(operation: () => T): T {
  const enabled = Blockly.Events.isEnabled(); if (enabled) Blockly.Events.disable()
  try { return operation() } finally { if (enabled) Blockly.Events.enable() }
}
type Selectable = Blockly.Block & { select(): void }
type Centerable = Blockly.Workspace & { centerOnBlock(id: string): void }
type FlyoutWorkspace = Blockly.Workspace & { getFlyout(): { autoClose: boolean; setAutoClose?(autoClose: boolean): void; hide(): void } | null }
type SvgWorkspace = Blockly.Workspace & { getParentSvg(): SVGElement; resizeContents(): void; zoomToFit(): void; scrollX: number; scrollY: number; translate(x: number, y: number): void }
function canSelect(block: Blockly.Block): block is Selectable { return typeof (block as unknown as Partial<Selectable>).select === 'function' }
function canCenter(workspace: Blockly.Workspace): workspace is Centerable { return typeof (workspace as Partial<Centerable>).centerOnBlock === 'function' }
function canHideFlyout(workspace: Blockly.Workspace): workspace is FlyoutWorkspace { return typeof (workspace as Partial<FlyoutWorkspace>).getFlyout === 'function' }
function canResizeSvg(workspace: Blockly.Workspace): workspace is SvgWorkspace { return typeof (workspace as Partial<SvgWorkspace>).getParentSvg === 'function' }

function fitNarrowWorkspace(workspace: Blockly.Workspace) {
  if (typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width: 600px)').matches) return
  if (canHideFlyout(workspace)) {
    const flyout = workspace.getFlyout()
    if (flyout) { if (flyout.setAutoClose) flyout.setAutoClose(true); else flyout.autoClose = true; flyout.hide() }
  }
  const topBlock = workspace.getTopBlocks(false)[0]
  if (topBlock) {
    const position = topBlock.getRelativeToSurfaceXY()
    withoutEvents(() => topBlock.moveBy(12 - position.x, 10 - position.y))
  }
  if (canResizeSvg(workspace)) {
    Blockly.svgResize(workspace as Blockly.WorkspaceSvg)
    workspace.resizeContents()
    if (workspace.getTopBlocks(false).length > 0) workspace.zoomToFit()
    workspace.scrollX = 0
    workspace.scrollY = 0
    workspace.translate(0, 0)
  }
}

function activateButtonOnEnter(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== 'Enter' || !(event.target instanceof HTMLButtonElement) || event.target.disabled) return
  event.preventDefault()
  event.stopPropagation()
  event.target.click()
}

function issue(result: RuyiCompileResult): string | null {
  if (result.ok) return null
  switch (result.diagnostics[0]?.code) {
    case 'empty-workspace': return '指令卷轴还是空的，先加入一块积木吧。'
    case 'multiple-top-level': return '当前积木还不能形成唯一顺序：程序现在有多个开头。'
    case 'invalid-connection': return '当前积木还不能形成唯一顺序：有连接没有接好。'
    case 'unknown-block': return '当前积木还不能形成唯一顺序：发现无法识别的积木。'
  }
}

function orderedBlocks(workspace: Blockly.Workspace): Blockly.Block[] {
  const compare = (a: Blockly.Block, b: Blockly.Block) => {
    const left = a.getRelativeToSurfaceXY(); const right = b.getRelativeToSurfaceXY()
    return left.y - right.y || left.x - right.x || a.id.localeCompare(b.id)
  }
  const result: Blockly.Block[] = []; const visited = new Set<string>()
  for (const top of workspace.getTopBlocks(false).sort(compare)) {
    let block: Blockly.Block | null = top
    while (block && !visited.has(block.id)) { visited.add(block.id); result.push(block); block = block.getNextBlock() }
  }
  workspace.getAllBlocks(false).sort(compare).forEach((block) => { if (!visited.has(block.id)) result.push(block) })
  return result
}

function rebuild(workspace: Blockly.Workspace, blocks: Blockly.Block[]) {
  blocks.forEach((block) => block.nextConnection?.isConnected() && block.nextConnection.disconnect())
  for (let index = 0; index < blocks.length - 1; index += 1) {
    blocks[index].nextConnection?.connect(blocks[index + 1].previousConnection!)
  }
  renderWorkspaceTopBlocks(workspace)
}

export function RuyiStaffBlocklyWorkspace({ draft, onDraftChange, onRun, focusBlockId, onFocusHandled, saveRecoverySuperseded = false, locked = false }: Props) {
  const adapter = useContext(AdapterContext)
  const hostRef = useRef<HTMLDivElement>(null); const workspaceRef = useRef<Blockly.Workspace | null>(null)
  const itemRefs = useRef(new Map<string, HTMLLIElement>()); const onDraftRef = useRef(onDraftChange); const handledRef = useRef(onFocusHandled)
  const lastDraftRef = useRef<string | null>(null); const lastPropRef = useRef<string | null>(null)
  const mountedRef = useRef(false); const saveRequestRef = useRef<{ generation: number; bytes: string | null; status: 'idle' | 'pending' | 'saved' | 'unsaved' | 'conflict' }>({ generation: 0, bytes: null, status: 'idle' })
  const pendingDraftRef = useRef<RuyiWorkspaceDraftV1 | null>(null)
  const [ready, setReady] = useState(false); const [result, setResult] = useState<RuyiCompileResult>({ ok: false, trace: [], diagnostics: [{ code: 'empty-workspace', sourceBlockId: null, concept: 'program-structure' }] })
  const [blocks, setBlocks] = useState<Array<{ id: string; label: string }>>([])
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [capacityMessage, setCapacityMessage] = useState<string | null>(null)
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'pending' | 'saved' | 'unsaved' | 'conflict'>('idle')
  onDraftRef.current = onDraftChange; handledRef.current = onFocusHandled

  const persistDraft = (next: RuyiWorkspaceDraftV1) => {
    const bytes = JSON.stringify(next)
    const generation = saveRequestRef.current.generation + 1
    pendingDraftRef.current = next
    saveRequestRef.current = { generation, bytes, status: 'pending' }
    setDraftSaveStatus('pending')
    const settle = (status: 'saved' | 'unsaved' | 'conflict') => {
      if (!mountedRef.current || saveRequestRef.current.generation !== generation || saveRequestRef.current.bytes !== bytes) return
      saveRequestRef.current = { generation, bytes, status }
      setDraftSaveStatus(status)
      if (status === 'saved') pendingDraftRef.current = null
    }
    try {
      const pending = onDraftRef.current(next)
      void Promise.resolve(pending).then((value) => settle(value.status), () => settle('unsaved'))
    } catch { settle('unsaved') }
  }

  const refresh = (persist: boolean) => {
    const workspace = workspaceRef.current; if (!workspace) return
    const compiled = compileRuyiStaffWorkspace(workspace); setResult(compiled)
    const ordered = orderedBlocks(workspace)
    setBlocks(ordered.map((block) => ({ id: block.id, label: LABEL_BY_TYPE[block.type as RuyiBlockType] ?? '无法识别的积木' })))
    if (ordered.length < MAX_WORKSPACE_BLOCKS) setCapacityMessage(null)
    if (!persist) return
    let next: RuyiWorkspaceDraftV1
    try { next = saveRuyiWorkspaceDraft(workspace) } catch { setWorkspaceError('当前积木结构无法安全保存，原草稿保持不变。'); return }
    const bytes = JSON.stringify(next); if (bytes === lastDraftRef.current) return
    lastDraftRef.current = bytes
    persistDraft(next)
    setWorkspaceError(null)
  }

  useEffect(() => {
    const host = hostRef.current; if (!host) return
    mountedRef.current = true
    registerRuyiStaffBlocks(); const workspace = adapter.create(host); workspaceRef.current = workspace
    withoutEvents(() => loadRuyiWorkspaceDraft(workspace, draft)); lastDraftRef.current = JSON.stringify(draft); lastPropRef.current = JSON.stringify(draft)
    refresh(false)
    const listener = (event: Blockly.Events.Abstract) => {
      if (event.isUiEvent) return
      const allBlocks = workspace.getAllBlocks(false)
      if (allBlocks.length > MAX_WORKSPACE_BLOCKS) {
        const createdIds = 'ids' in event && Array.isArray(event.ids) ? event.ids as string[] : []
        withoutEvents(() => {
          const created = createdIds.map((id) => workspace.getBlockById(id)).filter((block): block is Blockly.Block => block !== null)
          const candidates = created.length > 0 ? created : orderedBlocks(workspace).slice(MAX_WORKSPACE_BLOCKS)
          const candidateIds = new Set(candidates.map((block) => block.id))
          const roots = candidates.filter((block) => {
            const parent = block.getParent()
            return parent === null || !candidateIds.has(parent.id)
          })
          roots.forEach((block) => workspace.getBlockById(block.id)?.dispose(false))
        })
        refresh(false)
        setCapacityMessage('指令卷轴最多放500块积木，刚加入的积木没有保存。')
        return
      }
      refresh(true)
    }
    const fit = () => fitNarrowWorkspace(workspace)
    fit(); const fitFrame = window.requestAnimationFrame(fit); const fitAfterFlyout = window.setTimeout(fit, 50); window.addEventListener('resize', fit)
    workspace.addChangeListener(listener); setReady(true)
    return () => { mountedRef.current = false; saveRequestRef.current.generation += 1; setReady(false); window.cancelAnimationFrame(fitFrame); window.clearTimeout(fitAfterFlyout); window.removeEventListener('resize', fit); workspace.removeChangeListener(listener); workspace.dispose(); if (workspaceRef.current === workspace) workspaceRef.current = null; itemRefs.current.clear() }
  }, [adapter])

  useEffect(() => {
    const workspace = workspaceRef.current; if (!ready || !workspace) return
    const incoming = JSON.stringify(draft); if (incoming === lastPropRef.current) return
    if (incoming === lastDraftRef.current) { lastPropRef.current = incoming; return }
    let fitFrame = 0
    try { withoutEvents(() => loadRuyiWorkspaceDraft(workspace, draft)); lastDraftRef.current = incoming; lastPropRef.current = incoming; refresh(false); fitNarrowWorkspace(workspace); fitFrame = window.requestAnimationFrame(() => fitNarrowWorkspace(workspace)); setWorkspaceError(null) }
    catch { setWorkspaceError('传入的积木草稿无法安全恢复，当前工作区保持不变。') }
    return () => { if (fitFrame) window.cancelAnimationFrame(fitFrame) }
  }, [draft, ready])

  useEffect(() => {
    if (!ready || focusBlockId === null) return
    const workspace = workspaceRef.current; const block = workspace?.getBlockById(focusBlockId) ?? null
    if (workspace && block) { if (canSelect(block)) block.select(); if (canCenter(workspace)) workspace.centerOnBlock(block.id); itemRefs.current.get(block.id)?.focus() }
    else hostRef.current?.focus()
    handledRef.current()
  }, [focusBlockId, ready])

  useEffect(() => {
    if (!saveRecoverySuperseded) return
    saveRequestRef.current.generation += 1
    pendingDraftRef.current = null
    setDraftSaveStatus('idle')
  }, [saveRecoverySuperseded])

  const mutate = (operation: (workspace: Blockly.Workspace) => void) => {
    if (locked) return
    const workspace = workspaceRef.current; if (!workspace) return
    try { operation(workspace); refresh(true); fitNarrowWorkspace(workspace) } catch { setWorkspaceError('当前积木结构需要先在编辑区连接成一条指令链。'); setResult(compileRuyiStaffWorkspace(workspace)) }
  }
  const run = () => {
    if (locked) return
    const workspace = workspaceRef.current; if (!workspace) return
    const compiled = compileRuyiStaffWorkspace(workspace); setResult(compiled)
    try { onRun(compiled); setWorkspaceError(null) }
    catch { setWorkspaceError('运行结果还没有交给任务保存，请再执行一次。') }
  }
  const retryDraftSave = () => { if (pendingDraftRef.current) persistDraft(pendingDraftRef.current) }
  const atCapacity = blocks.length >= MAX_WORKSPACE_BLOCKS

  return <section className="code-workspace ruyi-staff-workspace" aria-label="定海神针图形化编程工作台" onKeyDown={activateButtonOnEnter}>
    {locked ? <p className="workspace-lock-message" role="status">通关结果正在处理，先不要改动指令卷轴。保存完成后就能继续操作。</p> : null}
    <div className="command-palette"><p className="eyebrow">指令匣 · 点击加入卷轴</p><div className="command-buttons">{ACTIONS.map(({ type, label }) => <button type="button" className="command-button" key={type} disabled={locked || atCapacity} onClick={() => mutate((workspace) => {
      if (workspace.getTopBlocks(false).length > 1) throw new Error('multiple chains')
      const chain = orderedBlocks(workspace); const block = workspace.newBlock(type); initializeWorkspaceBlock(block)
      const tail = chain.at(-1); if (tail) tail.nextConnection?.connect(block.previousConnection!); rebuild(workspace, [...chain, block])
    })}>{`\u52a0\u5165\uff1a${label}`}</button>)}</div>{capacityMessage || atCapacity ? <p role="status">{capacityMessage ?? '指令卷轴已经装满500块积木。先删除一些积木，才能继续加入。'}</p> : null}</div>
    <div ref={hostRef} className={`blockly-host${locked ? ' blockly-host-locked' : ''}`} aria-label="Blockly 积木编辑区" aria-disabled={locked || undefined} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); run() } }} />
    <div className="command-scroll"><span className="eyebrow">当前指令卷轴</span>
      {!result.ok ? <p role="status">{issue(result)}</p> : null}
      {blocks.length > 0 ? <ol className="block-program-list" aria-label={result.ok ? '已连接的指令顺序' : '工作区积木（尚未形成唯一顺序）'}>{blocks.map((block, index) => <li key={block.id} tabIndex={-1} ref={(node) => { if (node) itemRefs.current.set(block.id, node); else itemRefs.current.delete(block.id) }}><span>{block.label}</span><span className="block-program-actions">
        <button type="button" aria-label={`\u4e0a\u79fb\uff1a${block.label}`} disabled={locked || !result.ok || index === 0} onClick={() => mutate((workspace) => { const chain = orderedBlocks(workspace); const current = chain.findIndex((item) => item.id === block.id); [chain[current - 1], chain[current]] = [chain[current], chain[current - 1]]; rebuild(workspace, chain) })}>上移</button>
        <button type="button" aria-label={`\u4e0b\u79fb\uff1a${block.label}`} disabled={locked || !result.ok || index === blocks.length - 1} onClick={() => mutate((workspace) => { const chain = orderedBlocks(workspace); const current = chain.findIndex((item) => item.id === block.id); [chain[current + 1], chain[current]] = [chain[current], chain[current + 1]]; rebuild(workspace, chain) })}>下移</button>
        <button type="button" aria-label={`\u5220\u9664\uff1a${block.label}`} disabled={locked} onClick={() => mutate((workspace) => { const chain = orderedBlocks(workspace); const target = workspace.getBlockById(block.id); target?.previousConnection?.isConnected() && target.previousConnection.disconnect(); target?.nextConnection?.isConnected() && target.nextConnection.disconnect(); target?.dispose(false); rebuild(workspace, chain.filter((item) => item.id !== block.id)) })}>删除</button>
      </span></li>)}</ol> : null}
    </div>
    {workspaceError ? <p role="alert">{workspaceError}</p> : null}
    {!locked && draftSaveStatus === 'unsaved' ? <div role="alert"><p>这次积木更改还没有保存。</p><button type="button" onClick={retryDraftSave}>重试保存积木</button></div> : null}
    {!locked && draftSaveStatus === 'conflict' ? <p role="alert">其他标签页已经更新，这次积木更改暂停保存。</p> : null}
    <div className="workspace-actions"><button type="button" className="button button-ghost" disabled={locked} onClick={() => mutate((workspace) => workspace.clear())}><ArrowsCounterClockwise size={20} />清空并重新开始</button><button type="button" className="button button-primary" disabled={locked} onClick={run}><Play size={20} weight="fill" />执行战斗指令</button></div>
  </section>
}
