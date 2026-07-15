import * as Blockly from 'blockly/core'
import * as zhHans from 'blockly/msg/zh-hans'
import { ArrowsCounterClockwise, Play } from '@phosphor-icons/react'
import { createContext, useContext, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { initializeWorkspaceBlock, renderWorkspaceTopBlocks, RUYI_BLOCK_OPCODE, registerRuyiStaffBlocks, type RuyiBlockType } from '../blockly/ruyiStaffBlocks'
import { compileRuyiStaffWorkspace, type RuyiCompileResult } from '../blockly/ruyiStaffCompiler'
import { loadRuyiWorkspaceDraft, saveRuyiWorkspaceDraft, type RuyiWorkspaceDraftV1 } from '../blockly/ruyiStaffDraft'

interface Props {
  draft: RuyiWorkspaceDraftV1
  onDraftChange: (draft: RuyiWorkspaceDraftV1) => { status: 'saved' | 'unsaved' | 'conflict' } | Promise<{ status: 'saved' | 'unsaved' | 'conflict' }>
  onRun: (result: RuyiCompileResult) => void
  focusBlockId: string | null
  onFocusHandled: () => void
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
function canSelect(block: Blockly.Block): block is Selectable { return typeof (block as unknown as Partial<Selectable>).select === 'function' }
function canCenter(workspace: Blockly.Workspace): workspace is Centerable { return typeof (workspace as Partial<Centerable>).centerOnBlock === 'function' }

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

export function RuyiStaffBlocklyWorkspace({ draft, onDraftChange, onRun, focusBlockId, onFocusHandled }: Props) {
  const adapter = useContext(AdapterContext)
  const hostRef = useRef<HTMLDivElement>(null); const workspaceRef = useRef<Blockly.Workspace | null>(null)
  const itemRefs = useRef(new Map<string, HTMLLIElement>()); const onDraftRef = useRef(onDraftChange); const handledRef = useRef(onFocusHandled)
  const lastDraftRef = useRef<string | null>(null); const lastPropRef = useRef<string | null>(null)
  const [ready, setReady] = useState(false); const [result, setResult] = useState<RuyiCompileResult>({ ok: false, trace: [], diagnostics: [{ code: 'empty-workspace', sourceBlockId: null, concept: 'program-structure' }] })
  const [blocks, setBlocks] = useState<Array<{ id: string; label: string }>>([]); const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'unsaved'>('idle')
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  onDraftRef.current = onDraftChange; handledRef.current = onFocusHandled

  const refresh = (persist: boolean, force = false) => {
    const workspace = workspaceRef.current; if (!workspace) return
    const compiled = compileRuyiStaffWorkspace(workspace); setResult(compiled)
    setBlocks(orderedBlocks(workspace).map((block) => ({ id: block.id, label: LABEL_BY_TYPE[block.type as RuyiBlockType] ?? '无法识别的积木' })))
    if (!persist) return
    let next: RuyiWorkspaceDraftV1
    try { next = saveRuyiWorkspaceDraft(workspace) } catch { setWorkspaceError('当前积木结构无法安全保存，原草稿保持不变。'); return }
    const bytes = JSON.stringify(next); if (!force && bytes === lastDraftRef.current) return
    lastDraftRef.current = bytes
    try {
      const pending = onDraftRef.current(next)
      const done = (value: { status: 'saved' | 'unsaved' | 'conflict' }) => setSaveStatus(value.status === 'saved' ? 'saved' : 'unsaved')
      if (pending instanceof Promise) void pending.then(done, () => setSaveStatus('unsaved')); else done(pending)
      setWorkspaceError(null)
    } catch { setSaveStatus('unsaved') }
  }

  useEffect(() => {
    const host = hostRef.current; if (!host) return
    registerRuyiStaffBlocks(); const workspace = adapter.create(host); workspaceRef.current = workspace
    withoutEvents(() => loadRuyiWorkspaceDraft(workspace, draft)); lastDraftRef.current = JSON.stringify(draft); lastPropRef.current = JSON.stringify(draft)
    refresh(false)
    const listener = (event: Blockly.Events.Abstract) => { if (!event.isUiEvent) refresh(true) }
    workspace.addChangeListener(listener); setReady(true)
    return () => { setReady(false); workspace.removeChangeListener(listener); workspace.dispose(); if (workspaceRef.current === workspace) workspaceRef.current = null; itemRefs.current.clear() }
  }, [adapter])

  useEffect(() => {
    const workspace = workspaceRef.current; if (!ready || !workspace) return
    const incoming = JSON.stringify(draft); if (incoming === lastPropRef.current) return
    if (incoming === lastDraftRef.current) { lastPropRef.current = incoming; return }
    try { withoutEvents(() => loadRuyiWorkspaceDraft(workspace, draft)); lastDraftRef.current = incoming; lastPropRef.current = incoming; refresh(false); setWorkspaceError(null) }
    catch { setWorkspaceError('传入的积木草稿无法安全恢复，当前工作区保持不变。') }
  }, [draft, ready])

  useEffect(() => {
    if (!ready || focusBlockId === null) return
    const workspace = workspaceRef.current; const block = workspace?.getBlockById(focusBlockId) ?? null
    if (workspace && block) { if (canSelect(block)) block.select(); if (canCenter(workspace)) workspace.centerOnBlock(block.id); itemRefs.current.get(block.id)?.focus() }
    else hostRef.current?.focus()
    handledRef.current()
  }, [focusBlockId, ready])

  const mutate = (operation: (workspace: Blockly.Workspace) => void) => {
    const workspace = workspaceRef.current; if (!workspace) return
    try { operation(workspace); refresh(true) } catch { setWorkspaceError('当前积木结构需要先在编辑区连接成一条指令链。'); setResult(compileRuyiStaffWorkspace(workspace)) }
  }
  const run = () => { const workspace = workspaceRef.current; if (!workspace) return; const compiled = compileRuyiStaffWorkspace(workspace); setResult(compiled); onRun(compiled) }

  return <section className="code-workspace ruyi-staff-workspace" aria-label="定海神针图形化编程工作台" onKeyDown={activateButtonOnEnter}>
    <div className="command-palette"><p className="eyebrow">指令匣 · 点击加入卷轴</p><div className="command-buttons">{ACTIONS.map(({ type, label }) => <button type="button" className="command-button" key={type} onClick={() => mutate((workspace) => {
      if (workspace.getTopBlocks(false).length > 1) throw new Error('multiple chains')
      const chain = orderedBlocks(workspace); const block = workspace.newBlock(type); initializeWorkspaceBlock(block)
      const tail = chain.at(-1); if (tail) tail.nextConnection?.connect(block.previousConnection!); rebuild(workspace, [...chain, block])
    })}>{`\u52a0\u5165\uff1a${label}`}</button>)}</div></div>
    <div ref={hostRef} className="blockly-host" aria-label="Blockly 积木编辑区" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); run() } }} />
    <div className="command-scroll"><span className="eyebrow">当前指令卷轴</span>
      {!result.ok ? <p role="status">{issue(result)}</p> : null}
      {blocks.length > 0 ? <ol className="block-program-list" aria-label={result.ok ? '已连接的指令顺序' : '工作区积木（尚未形成唯一顺序）'}>{blocks.map((block, index) => <li key={block.id} tabIndex={-1} ref={(node) => { if (node) itemRefs.current.set(block.id, node); else itemRefs.current.delete(block.id) }}><span>{block.label}</span><span className="block-program-actions">
        <button type="button" aria-label={`\u4e0a\u79fb\uff1a${block.label}`} disabled={!result.ok || index === 0} onClick={() => mutate((workspace) => { const chain = orderedBlocks(workspace); const current = chain.findIndex((item) => item.id === block.id); [chain[current - 1], chain[current]] = [chain[current], chain[current - 1]]; rebuild(workspace, chain) })}>上移</button>
        <button type="button" aria-label={`\u4e0b\u79fb\uff1a${block.label}`} disabled={!result.ok || index === blocks.length - 1} onClick={() => mutate((workspace) => { const chain = orderedBlocks(workspace); const current = chain.findIndex((item) => item.id === block.id); [chain[current + 1], chain[current]] = [chain[current], chain[current + 1]]; rebuild(workspace, chain) })}>下移</button>
        <button type="button" aria-label={`\u5220\u9664\uff1a${block.label}`} onClick={() => mutate((workspace) => { const chain = orderedBlocks(workspace); const target = workspace.getBlockById(block.id); rebuild(workspace, chain.filter((item) => item.id !== block.id)); target?.dispose(false) })}>删除</button>
      </span></li>)}</ol> : null}
    </div>
    {saveStatus === 'unsaved' ? <div className="unsaved-session" role="status"><p>尚未保存，请稍后重试。</p><button type="button" onClick={() => refresh(true, true)}>重试保存</button></div> : null}
    {workspaceError ? <p role="alert">{workspaceError}</p> : null}
    <div className="workspace-actions"><button type="button" className="button button-ghost" onClick={() => mutate((workspace) => workspace.clear())}><ArrowsCounterClockwise size={20} />清空并重新开始</button><button type="button" className="button button-primary" onClick={run}><Play size={20} weight="fill" />执行战斗指令</button></div>
  </section>
}
