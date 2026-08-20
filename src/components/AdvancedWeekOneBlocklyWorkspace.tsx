import * as Blockly from 'blockly'
import * as zhHans from 'blockly/msg/zh-hans'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { ADVANCED_WEEK_ONE_BLOCK_LABELS } from '../blockly/advancedWeekOneCatalogue'
import { registerAdvancedWeekOneBlocks } from '../blockly/advancedWeekOneBlocks'
import { compileAdvancedWeekOneWorkspace, type AdvancedWeekOneCompileResult } from '../blockly/advancedWeekOneCompiler'
import { ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS, type AdvancedWeekOneBlockType, type AdvancedWeekOneMissionId } from '../blockly/advancedWeekOneContract'
import type { AdvancedWeekOneWorkspaceDraftV1 } from '../blockly/advancedWeekOneDraft'

export interface AdvancedWeekOneBlocklyWorkspaceAdapter { create(host: HTMLDivElement): Blockly.Workspace }

interface Props {
  missionId: AdvancedWeekOneMissionId
  draft: AdvancedWeekOneWorkspaceDraftV1
  onDraftChange: (draft: AdvancedWeekOneWorkspaceDraftV1) => { status: 'saved' | 'unsaved' | 'conflict' } | Promise<{ status: 'saved' | 'unsaved' | 'conflict' }>
  onRun: (result: AdvancedWeekOneCompileResult) => void
  focusBlockId: string | null
  onFocusHandled: () => void
  locked: boolean
  decompositionView?: boolean
}

const defaultAdapter: AdvancedWeekOneBlocklyWorkspaceAdapter = {
  create(host) {
    if (navigator.userAgent.includes('jsdom')) return new Blockly.Workspace()
    return Blockly.inject(host, {
      toolbox: { kind: 'flyoutToolbox', contents: Object.keys(ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS).map((type) => ({ kind: 'block', type })) },
      trashcan: true,
      sounds: false,
      renderer: 'zelos',
    })
  },
}
const AdapterContext = createContext(defaultAdapter)
export function AdvancedWeekOneBlocklyWorkspaceAdapterProvider({ adapter, children }: { adapter: AdvancedWeekOneBlocklyWorkspaceAdapter; children: ReactNode }) {
  return <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>
}

Blockly.setLocale(zhHans as unknown as Record<string, string>)
const scopes = (missionId: AdvancedWeekOneMissionId) => Object.entries(ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS)
  .filter(([, value]) => value.missionId === missionId)
  .map(([type, value]) => ({ type: type as AdvancedWeekOneBlockType, scope: value.scope, label: ADVANCED_WEEK_ONE_BLOCK_LABELS[type as AdvancedWeekOneBlockType] }))

function snapshot(workspace: Blockly.Workspace, missionId: AdvancedWeekOneMissionId): AdvancedWeekOneWorkspaceDraftV1 {
  return {
    version: 1,
    missionId,
    blocks: workspace.getAllBlocks(false).map((block) => {
      const point = block.getRelativeToSurfaceXY()
      return { id: block.id, type: block.type as AdvancedWeekOneBlockType, nextId: block.getNextBlock()?.id ?? null, parentBlockId: block.getSurroundParent()?.id ?? null, x: point.x, y: point.y }
    }),
  }
}

function restore(workspace: Blockly.Workspace, draft: AdvancedWeekOneWorkspaceDraftV1) {
  Blockly.Events.disable()
  try {
    workspace.clear()
    const blocks = new Map<string, Blockly.Block>()
    for (const item of draft.blocks) {
      const block = workspace.newBlock(item.type, item.id)
      block.moveBy(item.x, item.y)
      blocks.set(item.id, block)
    }
    for (const item of draft.blocks) {
      if (!item.nextId) continue
      const from = blocks.get(item.id)?.nextConnection
      const to = blocks.get(item.nextId)?.previousConnection
      if (from && to) from.connect(to)
    }
    const predecessors = new Set(draft.blocks.flatMap((item) => item.nextId ? [item.nextId] : []))
    for (const item of draft.blocks) {
      if (!item.parentBlockId || predecessors.has(item.id)) continue
      const from = blocks.get(item.parentBlockId)?.getInput('CHILDREN')?.connection
      const to = blocks.get(item.id)?.previousConnection
      if (from && to) from.connect(to)
    }
  } finally { Blockly.Events.enable() }
}

function append(workspace: Blockly.Workspace, type: AdvancedWeekOneBlockType) {
  const definition = ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS[type]
  const block = workspace.newBlock(type)
  const candidates = workspace.getAllBlocks(false)
  const parent = definition.scope === 'top' ? null : candidates.find((candidate) => {
    const candidateDef = ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS[candidate.type as AdvancedWeekOneBlockType]
    return candidateDef && 'childScope' in candidateDef && candidateDef.childScope === definition.scope
  })
  const chain = parent ? parent.getInputTargetBlock('CHILDREN') : workspace.getTopBlocks(false).find((item) => item !== block)
  if (parent && !chain) parent.getInput('CHILDREN')?.connection?.connect(block.previousConnection!)
  else if (chain) {
    let tail = chain
    while (tail.getNextBlock()) tail = tail.getNextBlock()!
    tail.nextConnection?.connect(block.previousConnection!)
  }
  return block
}

export function AdvancedWeekOneBlocklyWorkspace({ missionId, draft, onDraftChange, onRun, focusBlockId, onFocusHandled, locked, decompositionView = false }: Props) {
  const adapter = useContext(AdapterContext)
  const hostRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.Workspace | null>(null)
  const applyingRef = useRef(false)
  const onDraftChangeRef = useRef(onDraftChange)
  const saveQueuedRef = useRef(false)
  const saveGenerationRef = useRef(0)
  onDraftChangeRef.current = onDraftChange
  const [version, setVersion] = useState(0)
  const [saveState, setSaveState] = useState<'idle' | 'unsaved' | 'conflict'>('idle')
  const save = async () => {
    const workspace = workspaceRef.current
    if (!workspace) return
    const generation = ++saveGenerationRef.current
    const result = await onDraftChangeRef.current(snapshot(workspace, missionId))
    if (generation === saveGenerationRef.current) setSaveState(result.status === 'saved' ? 'idle' : result.status)
  }
  const scheduleSave = () => {
    if (saveQueuedRef.current) return
    saveQueuedRef.current = true
    queueMicrotask(() => { saveQueuedRef.current = false; void save() })
  }
  useEffect(() => {
    registerAdvancedWeekOneBlocks()
    const workspace = adapter.create(hostRef.current!)
    workspaceRef.current = workspace
    const changed = () => {
      if (applyingRef.current) return
      setVersion((value) => value + 1)
      scheduleSave()
    }
    workspace.addChangeListener(changed)
    return () => { workspace.removeChangeListener(changed); workspace.dispose(); workspaceRef.current = null }
  }, [])
  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace) return
    applyingRef.current = true
    restore(workspace, draft)
    applyingRef.current = false
    setVersion((value) => value + 1)
  }, [draft])
  useEffect(() => {
    if (!focusBlockId) return
    const block = workspaceRef.current?.getBlockById(focusBlockId) as (Blockly.Block & { select?: () => void; getSvgRoot?: () => SVGElement }) | null
    block?.select?.()
    block?.getSvgRoot?.()?.focus()
    onFocusHandled()
  }, [focusBlockId, onFocusHandled])
  const actions = scopes(missionId)
  const display = workspaceRef.current?.getAllBlocks(false) ?? []
  const topLevelCount = display.filter((block) => block.getSurroundParent() === null).length
  const groups = display.flatMap((block) => {
    const definition = ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS[block.type as AdvancedWeekOneBlockType]
    if (!definition || !('childScope' in definition)) return []
    return [{
      label: ADVANCED_WEEK_ONE_BLOCK_LABELS[block.type as AdvancedWeekOneBlockType],
      childCount: display.filter((candidate) => candidate.getSurroundParent()?.id === block.id).length,
    }]
  })
  const title = missionId === 'w1-m4' ? '幽冥勾名' : '第三回总试炼'
  return <section className="advanced-week-one-workspace" aria-label={`${title} Blockly 工作区`}>
    <div className="advanced-week-one-palette" aria-label="积木工具箱">{actions.map(({ type, scope, label }) => <button key={type} type="button" disabled={locked} onClick={() => { if (workspaceRef.current) { append(workspaceRef.current, type); setVersion((value) => value + 1); scheduleSave() } }}>
      加入{scope === 'top' ? '主程序' : '查找子程序'}：{label}
    </button>)}</div>
    <div ref={hostRef} className="advanced-blockly-host" aria-label={`${title}可连接积木图`} />
    {decompositionView ? <section key={version} className="advanced-decomposition-view" aria-label={`${title}当前任务拆分图`}><h3>你当前的任务分组</h3><p>主程序：{topLevelCount} 块积木</p>{groups.map((group, index) => <p key={`${group.label}-${index}`}>{group.label}：{group.childCount} 块子任务积木</p>)}</section> : <ol key={version} aria-label={`${title}程序树`} className="advanced-program-tree">{display.map((block) => <li key={block.id}><span>{ADVANCED_WEEK_ONE_BLOCK_LABELS[block.type as AdvancedWeekOneBlockType]}</span><button type="button" disabled={locked} onClick={() => { block.dispose(true); setVersion((value) => value + 1); scheduleSave() }}>删除</button></li>)}</ol>}
    {saveState !== 'idle' ? <div role="alert">{saveState === 'conflict' ? '其他标签页已经更新，这次积木更改暂停保存。' : '这次积木更改还没有保存。'}{saveState === 'unsaved' ? <button type="button" onClick={() => void save()}>重试保存积木</button> : null}</div> : null}
    <div className="workspace-actions"><button type="button" className="button button-primary" disabled={locked} onClick={() => { const workspace = workspaceRef.current; if (workspace) onRun(compileAdvancedWeekOneWorkspace(missionId, workspace)) }}>执行{title}指令</button></div>
  </section>
}
