import * as Blockly from 'blockly/core'
import * as zhHans from 'blockly/msg/zh-hans'
import { ArrowsCounterClockwise, Play } from '@phosphor-icons/react'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import {
  initializeWorkspaceBlock,
  isFourSeasBlockType,
  isFourSeasChildBlockType,
  isFourSeasTopBlockType,
  registerFourSeasRegaliaBlocks,
  renderWorkspaceTopBlocks,
  type FourSeasBlockType,
} from '../blockly/fourSeasRegaliaBlocks'
import {
  compileFourSeasRegaliaWorkspace,
  type FourSeasCompileResult,
} from '../blockly/fourSeasRegaliaCompiler'
import {
  FOUR_SEAS_WORKSPACE_LIMITS,
  loadFourSeasWorkspaceDraft,
  saveFourSeasWorkspaceDraft,
  type FourSeasWorkspaceDraftV1,
} from '../blockly/fourSeasRegaliaDraft'

interface Props {
  draft: FourSeasWorkspaceDraftV1
  onDraftChange: (
    draft: FourSeasWorkspaceDraftV1,
  ) => { status: 'saved' | 'unsaved' | 'conflict' } | Promise<{ status: 'saved' | 'unsaved' | 'conflict' }>
  onRun: (result: FourSeasCompileResult) => void
  focusBlockId: string | null
  onFocusHandled: () => void
  saveRecoverySuperseded?: boolean
  locked?: boolean
}

export interface FourSeasRegaliaBlocklyWorkspaceAdapter {
  create(host: HTMLDivElement): Blockly.Workspace
}

type Scope = 'top' | 'collect' | 'equip' | 'orphan'
type DisplayBlock = { id: string; type: FourSeasBlockType | null; label: string; scope: Scope }

const ACTIONS: ReadonlyArray<{
  type: FourSeasBlockType
  scope: Exclude<Scope, 'orphan'>
  label: string
}> = [
  { type: 'xiyou_request_regalia', scope: 'top', label: '向东海龙王请求披挂' },
  { type: 'xiyou_collect_gifts', scope: 'top', label: '收齐三海宝物' },
  { type: 'xiyou_equip_regalia', scope: 'top', label: '穿戴整副披挂' },
  { type: 'xiyou_verify_regalia', scope: 'top', label: '检查披挂是否齐全' },
  { type: 'xiyou_receive_cloud_boots', scope: 'collect', label: '收下北海的藕丝步云履' },
  { type: 'xiyou_receive_golden_armor', scope: 'collect', label: '收下西海的锁子黄金甲' },
  { type: 'xiyou_receive_purple_crown', scope: 'collect', label: '收下南海的凤翅紫金冠' },
  { type: 'xiyou_wear_crown', scope: 'equip', label: '戴上凤翅紫金冠' },
  { type: 'xiyou_wear_armor', scope: 'equip', label: '穿上锁子黄金甲' },
  { type: 'xiyou_wear_boots', scope: 'equip', label: '踏上藕丝步云履' },
]

const LABEL_BY_TYPE = Object.fromEntries(ACTIONS.map(({ type, label }) => [type, label])) as Record<FourSeasBlockType, string>
const TOP_ACTIONS = ACTIONS.filter(({ scope }) => scope === 'top')
const COLLECT_ACTIONS = ACTIONS.filter(({ scope }) => scope === 'collect')
const EQUIP_ACTIONS = ACTIONS.filter(({ scope }) => scope === 'equip')

Blockly.setLocale(zhHans as unknown as Record<string, string>)
const THEME = Blockly.Theme.defineTheme('xiyou-four-seas-regalia', {
  name: 'xiyou-four-seas-regalia',
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#f7f0df',
    toolboxBackgroundColour: '#e5d6b6',
    flyoutBackgroundColour: '#efe4cb',
  },
})

const defaultAdapter: FourSeasRegaliaBlocklyWorkspaceAdapter = {
  create(host) {
    if (navigator.userAgent.includes('jsdom')) return new Blockly.Workspace()
    return Blockly.inject(host, {
      toolbox: {
        kind: 'flyoutToolbox',
        contents: ACTIONS.map(({ type }) => ({ kind: 'block', type })),
      },
      trashcan: true,
      sounds: false,
      renderer: 'zelos',
      theme: THEME,
    })
  },
}

const AdapterContext = createContext(defaultAdapter)

export function FourSeasRegaliaBlocklyWorkspaceAdapterProvider({
  adapter,
  children,
}: {
  adapter: FourSeasRegaliaBlocklyWorkspaceAdapter
  children: ReactNode
}) {
  return <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>
}

function withoutEvents<T>(operation: () => T): T {
  const enabled = Blockly.Events.isEnabled()
  if (enabled) Blockly.Events.disable()
  try {
    return operation()
  } finally {
    if (enabled) Blockly.Events.enable()
  }
}

type Selectable = Blockly.Block & { select(): void }
type Centerable = Blockly.Workspace & { centerOnBlock(id: string): void }
type FlyoutWorkspace = Blockly.Workspace & {
  getFlyout(): { autoClose: boolean; setAutoClose?(autoClose: boolean): void; hide(): void } | null
}
type SvgWorkspace = Blockly.Workspace & {
  getParentSvg(): SVGElement
  resizeContents(): void
  zoomToFit(): void
  scrollX: number
  scrollY: number
  translate(x: number, y: number): void
}

function canSelect(block: Blockly.Block): block is Selectable {
  return typeof (block as unknown as Partial<Selectable>).select === 'function'
}
function canCenter(workspace: Blockly.Workspace): workspace is Centerable {
  return typeof (workspace as Partial<Centerable>).centerOnBlock === 'function'
}
function canHideFlyout(workspace: Blockly.Workspace): workspace is FlyoutWorkspace {
  return typeof (workspace as Partial<FlyoutWorkspace>).getFlyout === 'function'
}
function canResizeSvg(workspace: Blockly.Workspace): workspace is SvgWorkspace {
  return typeof (workspace as Partial<SvgWorkspace>).getParentSvg === 'function'
}

function fitNarrowWorkspace(workspace: Blockly.Workspace) {
  if (typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width: 600px)').matches) return
  if (canHideFlyout(workspace)) {
    const flyout = workspace.getFlyout()
    if (flyout !== null) {
      if (flyout.setAutoClose) flyout.setAutoClose(true)
      else flyout.autoClose = true
      flyout.hide()
    }
  }
  const root = workspace.getTopBlocks(false).find((block) => isFourSeasTopBlockType(block.type))
  if (root !== undefined) {
    const position = root.getRelativeToSurfaceXY()
    withoutEvents(() => root.moveBy(12 - position.x, 10 - position.y))
  }
  if (canResizeSvg(workspace)) {
    Blockly.svgResize(workspace as Blockly.WorkspaceSvg)
    workspace.resizeContents()
    if (workspace.getAllBlocks(false).length > 0) workspace.zoomToFit()
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

function chainFrom(head: Blockly.Block | null): Blockly.Block[] {
  const chain: Blockly.Block[] = []
  const visited = new Set<string>()
  let current = head
  while (current !== null && !visited.has(current.id)) {
    visited.add(current.id)
    chain.push(current)
    current = current.getNextBlock()
  }
  return chain
}

function topChains(workspace: Blockly.Workspace): Blockly.Block[][] {
  return workspace.getTopBlocks(false)
    .filter((block) => isFourSeasTopBlockType(block.type))
    .sort((left, right) => {
      const a = left.getRelativeToSurfaceXY()
      const b = right.getRelativeToSurfaceXY()
      return a.y - b.y || a.x - b.x || left.id.localeCompare(right.id)
    })
    .map((root) => chainFrom(root))
}

function containerForScope(workspace: Blockly.Workspace, scope: 'collect' | 'equip'): Blockly.Block | null {
  const type = scope === 'collect' ? 'xiyou_collect_gifts' : 'xiyou_equip_regalia'
  return workspace.getAllBlocks(false).find((block) => block.type === type) ?? null
}

function scopeChain(workspace: Blockly.Workspace, scope: Exclude<Scope, 'orphan'>): Blockly.Block[] {
  if (scope === 'top') return topChains(workspace)[0] ?? []
  const container = containerForScope(workspace, scope)
  if (container === null) return []
  return chainFrom(container.getInputTargetBlock(scope === 'collect' ? 'GIFTS' : 'GEAR'))
}

function scopeForBlock(block: Blockly.Block): Scope {
  if (isFourSeasTopBlockType(block.type)) return 'top'
  const parent = block.getSurroundParent()
  if (parent?.type === 'xiyou_collect_gifts') return 'collect'
  if (parent?.type === 'xiyou_equip_regalia') return 'equip'
  return 'orphan'
}

function deriveTree(workspace: Blockly.Workspace): DisplayBlock[] {
  const result: DisplayBlock[] = []
  const visited = new Set<string>()
  const append = (block: Blockly.Block, scope: Scope) => {
    if (visited.has(block.id)) return
    visited.add(block.id)
    result.push({
      id: block.id,
      type: isFourSeasBlockType(block.type) ? block.type : null,
      label: isFourSeasBlockType(block.type) ? LABEL_BY_TYPE[block.type] : '无法识别的积木',
      scope,
    })
    if (block.type === 'xiyou_collect_gifts') {
      chainFrom(block.getInputTargetBlock('GIFTS')).forEach((child) => append(child, 'collect'))
    } else if (block.type === 'xiyou_equip_regalia') {
      chainFrom(block.getInputTargetBlock('GEAR')).forEach((child) => append(child, 'equip'))
    }
  }
  for (const chain of topChains(workspace)) chain.forEach((block) => append(block, 'top'))
  workspace.getAllBlocks(false)
    .sort((left, right) => left.id.localeCompare(right.id))
    .forEach((block) => append(block, scopeForBlock(block)))
  return result
}

function inputConnection(workspace: Blockly.Workspace, scope: 'collect' | 'equip'): Blockly.Connection | null {
  const container = containerForScope(workspace, scope)
  return container?.getInput(scope === 'collect' ? 'GIFTS' : 'GEAR')?.connection ?? null
}

function rebuildScope(
  workspace: Blockly.Workspace,
  scope: Exclude<Scope, 'orphan'>,
  blocks: Blockly.Block[],
) {
  for (const block of blocks) {
    if (block.previousConnection?.isConnected()) block.previousConnection.disconnect()
    if (block.nextConnection?.isConnected()) block.nextConnection.disconnect()
  }
  for (let index = 0; index < blocks.length - 1; index += 1) {
    blocks[index].nextConnection?.connect(blocks[index + 1].previousConnection!)
  }
  if (scope !== 'top' && blocks[0] !== undefined) {
    const input = inputConnection(workspace, scope)
    if (input === null || blocks[0].previousConnection === null || !input.connect(blocks[0].previousConnection)) {
      throw new Error('unable to connect child scope')
    }
  }
  renderWorkspaceTopBlocks(workspace)
}

function appendBlock(workspace: Blockly.Workspace, type: FourSeasBlockType, scope: Exclude<Scope, 'orphan'>) {
  const chain = scopeChain(workspace, scope)
  if (scope !== 'top' && containerForScope(workspace, scope) === null) {
    throw new Error('container missing')
  }
  const block = workspace.newBlock(type)
  initializeWorkspaceBlock(block)
  rebuildScope(workspace, scope, [...chain, block])
}

function moveWithinScope(workspace: Blockly.Workspace, blockId: string, direction: -1 | 1) {
  const block = workspace.getBlockById(blockId)
  if (block === null) return
  const scope = scopeForBlock(block)
  if (scope === 'orphan') throw new Error('orphan block')
  const chain = scopeChain(workspace, scope)
  const index = chain.findIndex(({ id }) => id === blockId)
  const target = index + direction
  if (index < 0 || target < 0 || target >= chain.length) return
  ;[chain[index], chain[target]] = [chain[target], chain[index]]
  rebuildScope(workspace, scope, chain)
}

function moveAcrossScope(workspace: Blockly.Workspace, blockId: string, targetScope: 'collect' | 'equip') {
  const block = workspace.getBlockById(blockId)
  if (block === null || !isFourSeasChildBlockType(block.type)) return
  const sourceScope = scopeForBlock(block)
  if (sourceScope !== 'collect' && sourceScope !== 'equip') throw new Error('orphan child')
  if (sourceScope === targetScope) return
  if (containerForScope(workspace, targetScope) === null) throw new Error('target container missing')
  const source = scopeChain(workspace, sourceScope).filter(({ id }) => id !== blockId)
  const target = scopeChain(workspace, targetScope)
  const all = [...source, block, ...target]
  for (const item of all) {
    if (item.previousConnection?.isConnected()) item.previousConnection.disconnect()
    if (item.nextConnection?.isConnected()) item.nextConnection.disconnect()
  }
  rebuildScope(workspace, sourceScope, source)
  rebuildScope(workspace, targetScope, [...target, block])
}

function deleteBlock(workspace: Blockly.Workspace, blockId: string) {
  const block = workspace.getBlockById(blockId)
  if (block === null) return
  const scope = scopeForBlock(block)
  if (scope === 'orphan') {
    block.dispose(false)
    return
  }
  const remaining = scopeChain(workspace, scope).filter(({ id }) => id !== blockId)
  const original = scopeChain(workspace, scope)
  for (const item of original) {
    if (item.previousConnection?.isConnected()) item.previousConnection.disconnect()
    if (item.nextConnection?.isConnected()) item.nextConnection.disconnect()
  }
  block.dispose(false)
  rebuildScope(workspace, scope, remaining.filter(({ id }) => workspace.getBlockById(id) !== null))
}

function setWorkspaceBlocksLocked(workspace: Blockly.Workspace, locked: boolean) {
  withoutEvents(() => workspace.getAllBlocks(false).forEach((block) => {
    block.setMovable(!locked)
    block.setDeletable(!locked)
    block.setEditable(!locked)
  }))
}

function isUsableFocusTarget(target: HTMLElement | null, region: HTMLElement) {
  return target !== null
    && target.isConnected
    && region.contains(target)
    && target.closest('[inert]') === null
    && (!(target instanceof HTMLButtonElement) || !target.disabled)
    && target.tabIndex >= 0
}

function compileIssue(result: FourSeasCompileResult): string | null {
  if (result.ok) return null
  switch (result.diagnostics[0]?.code) {
    case 'empty-workspace': return '指令卷轴还是空的，先加入主任务吧。'
    case 'missing-child-chain': return '任务组里还没有子任务。'
    case 'multiple-main-chain': return '当前程序有多个主任务开头。'
    default: return '当前积木还没有连成可执行的嵌套任务树。'
  }
}

function scopeName(scope: Scope) {
  if (scope === 'top') return '主任务'
  if (scope === 'collect') return '收集子任务'
  if (scope === 'equip') return '穿戴子任务'
  return '未连接子任务'
}

export function FourSeasRegaliaBlocklyWorkspace({
  draft,
  onDraftChange,
  onRun,
  focusBlockId,
  onFocusHandled,
  saveRecoverySuperseded = false,
  locked = false,
}: Props) {
  const adapter = useContext(AdapterContext)
  const regionRef = useRef<HTMLElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const lockMessageRef = useRef<HTMLParagraphElement>(null)
  const workspaceRef = useRef<Blockly.Workspace | null>(null)
  const itemRefs = useRef(new Map<string, HTMLLIElement>())
  const onDraftRef = useRef(onDraftChange)
  const onFocusHandledRef = useRef(onFocusHandled)
  const lastDraftRef = useRef<string | null>(null)
  const lastPropRef = useRef<string | null>(null)
  const acceptedDraftRef = useRef<FourSeasWorkspaceDraftV1>(structuredClone(draft))
  const lockedRef = useRef(locked)
  const previousLockedRef = useRef(locked)
  const focusBeforeLockRef = useRef<HTMLElement | null>(null)
  const restoreFocusAfterUnlockRef = useRef(false)
  const lockedRestoreTimerRef = useRef<number | null>(null)
  const focusRestoreTimerRef = useRef<number | null>(null)
  const mountedRef = useRef(false)
  const saveRequestRef = useRef<{
    generation: number
    bytes: string | null
    status: 'idle' | 'pending' | 'saved' | 'unsaved' | 'conflict'
  }>({ generation: 0, bytes: null, status: 'idle' })
  const pendingDraftRef = useRef<FourSeasWorkspaceDraftV1 | null>(null)
  const [ready, setReady] = useState(false)
  const [compileResult, setCompileResult] = useState<FourSeasCompileResult>({
    ok: false,
    trace: [],
    diagnostics: [{ code: 'empty-workspace', sourceBlockId: null, concept: 'program-structure' }],
  })
  const [tree, setTree] = useState<DisplayBlock[]>([])
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [capacityMessage, setCapacityMessage] = useState<string | null>(null)
  const [draftSaveStatus, setDraftSaveStatus] = useState<'idle' | 'pending' | 'saved' | 'unsaved' | 'conflict'>('idle')

  onDraftRef.current = onDraftChange
  onFocusHandledRef.current = onFocusHandled
  lockedRef.current = locked
  if (locked !== previousLockedRef.current) {
    const active = document.activeElement
    if (locked) {
      focusBeforeLockRef.current = active instanceof HTMLElement && regionRef.current?.contains(active) ? active : null
      restoreFocusAfterUnlockRef.current = false
    } else {
      restoreFocusAfterUnlockRef.current = active === lockMessageRef.current
        || (active instanceof HTMLElement && active.closest('.completion-save-status') !== null)
    }
    previousLockedRef.current = locked
  }

  const persistDraft = (next: FourSeasWorkspaceDraftV1) => {
    const bytes = JSON.stringify(next)
    const generation = saveRequestRef.current.generation + 1
    pendingDraftRef.current = structuredClone(next)
    saveRequestRef.current = { generation, bytes, status: 'pending' }
    setDraftSaveStatus('pending')
    const settle = (status: 'saved' | 'unsaved' | 'conflict') => {
      if (!mountedRef.current || saveRequestRef.current.generation !== generation || saveRequestRef.current.bytes !== bytes) return
      saveRequestRef.current = { generation, bytes, status }
      setDraftSaveStatus(status)
      if (status === 'saved') pendingDraftRef.current = null
    }
    try {
      void Promise.resolve(onDraftRef.current(next)).then((value) => settle(value.status), () => settle('unsaved'))
    } catch {
      settle('unsaved')
    }
  }

  const refresh = (persist: boolean) => {
    const workspace = workspaceRef.current
    if (workspace === null) return
    setCompileResult(compileFourSeasRegaliaWorkspace(workspace))
    const nextTree = deriveTree(workspace)
    setTree(nextTree)
    if (nextTree.length < FOUR_SEAS_WORKSPACE_LIMITS.maxWorkspaceBlocks) setCapacityMessage(null)
    if (!persist) return
    let next: FourSeasWorkspaceDraftV1
    try {
      next = saveFourSeasWorkspaceDraft(workspace)
    } catch {
      setWorkspaceError('当前积木结构无法安全保存，原草稿保持不变。')
      return
    }
    const bytes = JSON.stringify(next)
    if (bytes === lastDraftRef.current) return
    lastDraftRef.current = bytes
    acceptedDraftRef.current = structuredClone(next)
    persistDraft(next)
    setWorkspaceError(null)
  }

  const restoreAcceptedDraft = (workspace: Blockly.Workspace) => {
    if (!mountedRef.current || workspaceRef.current !== workspace) return
    const accepted = structuredClone(acceptedDraftRef.current)
    withoutEvents(() => {
      // A locked native paste/delete can make the current graph intentionally
      // unsnapshotable. The accepted draft is already validated, so discard the
      // rejected mutation before restoring it instead of asking the draft loader
      // to snapshot invalid bytes for its ordinary incoming-draft rollback path.
      workspace.clear()
      loadFourSeasWorkspaceDraft(workspace, accepted)
    })
    lastDraftRef.current = JSON.stringify(accepted)
    refresh(false)
    setWorkspaceBlocksLocked(workspace, lockedRef.current)
  }

  const fitWorkspaceForViewport = (workspace: Blockly.Workspace) => {
    if (!lockedRef.current) fitNarrowWorkspace(workspace)
  }

  const scheduleLockedRestore = (workspace: Blockly.Workspace) => {
    setWorkspaceBlocksLocked(workspace, true)
    if (lockedRestoreTimerRef.current !== null) return
    lockedRestoreTimerRef.current = window.setTimeout(() => {
      lockedRestoreTimerRef.current = null
      if (lockedRef.current) restoreAcceptedDraft(workspace)
    }, 0)
  }

  useEffect(() => {
    const host = hostRef.current
    if (host === null) return
    mountedRef.current = true
    registerFourSeasRegaliaBlocks()
    const workspace = adapter.create(host)
    workspaceRef.current = workspace
    withoutEvents(() => loadFourSeasWorkspaceDraft(workspace, draft))
    acceptedDraftRef.current = structuredClone(draft)
    lastDraftRef.current = JSON.stringify(draft)
    lastPropRef.current = JSON.stringify(draft)
    refresh(false)

    const listener = (event: Blockly.Events.Abstract) => {
      if (event.isUiEvent) return
      if (lockedRef.current) {
        scheduleLockedRestore(workspace)
        return
      }
      if (workspace.getAllBlocks(false).length > FOUR_SEAS_WORKSPACE_LIMITS.maxWorkspaceBlocks) {
        const createdIds = 'ids' in event && Array.isArray(event.ids) ? event.ids as string[] : []
        withoutEvents(() => {
          const created = createdIds
            .map((id) => workspace.getBlockById(id))
            .filter((block): block is Blockly.Block => block !== null)
          const candidates = created.length > 0
            ? created
            : workspace.getAllBlocks(false).slice(FOUR_SEAS_WORKSPACE_LIMITS.maxWorkspaceBlocks)
          const candidateIds = new Set(candidates.map(({ id }) => id))
          candidates
            .filter((block) => block.getParent() === null || !candidateIds.has(block.getParent()!.id))
            .forEach((block) => workspace.getBlockById(block.id)?.dispose(false))
        })
        refresh(false)
        setCapacityMessage('指令卷轴最多放500块积木，刚加入的积木没有保存。')
        return
      }
      refresh(true)
    }
    const fit = () => fitWorkspaceForViewport(workspace)
    fit()
    const fitFrame = window.requestAnimationFrame(fit)
    const fitAfterFlyout = window.setTimeout(fit, 50)
    window.addEventListener('resize', fit)
    window.addEventListener('orientationchange', fit)
    workspace.addChangeListener(listener)
    setReady(true)
    return () => {
      mountedRef.current = false
      saveRequestRef.current.generation += 1
      window.cancelAnimationFrame(fitFrame)
      window.clearTimeout(fitAfterFlyout)
      if (lockedRestoreTimerRef.current !== null) window.clearTimeout(lockedRestoreTimerRef.current)
      if (focusRestoreTimerRef.current !== null) window.clearTimeout(focusRestoreTimerRef.current)
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', fit)
      workspace.removeChangeListener(listener)
      workspace.dispose()
      if (workspaceRef.current === workspace) workspaceRef.current = null
      itemRefs.current.clear()
    }
  }, [adapter])

  useEffect(() => {
    const workspace = workspaceRef.current
    if (!ready || workspace === null) return
    const incoming = JSON.stringify(draft)
    if (incoming === lastPropRef.current) return
    if (incoming === lastDraftRef.current) {
      lastPropRef.current = incoming
      return
    }
    let fitFrame = 0
    try {
      withoutEvents(() => loadFourSeasWorkspaceDraft(workspace, draft))
      acceptedDraftRef.current = structuredClone(draft)
      lastDraftRef.current = incoming
      lastPropRef.current = incoming
      refresh(false)
      setWorkspaceBlocksLocked(workspace, lockedRef.current)
      fitWorkspaceForViewport(workspace)
      fitFrame = window.requestAnimationFrame(() => fitWorkspaceForViewport(workspace))
      setWorkspaceError(null)
    } catch {
      setWorkspaceError('传入的积木草稿无法安全恢复，当前工作区保持不变。')
    }
    return () => { if (fitFrame !== 0) window.cancelAnimationFrame(fitFrame) }
  }, [draft, ready])

  useEffect(() => {
    const workspace = workspaceRef.current
    const host = hostRef.current
    if (!ready || workspace === null || host === null) return
    if (locked) {
      if (focusRestoreTimerRef.current !== null) window.clearTimeout(focusRestoreTimerRef.current)
      setWorkspaceBlocksLocked(workspace, true)
      const active = document.activeElement
      if (focusBeforeLockRef.current !== null || active === host || (active instanceof Node && host.contains(active))) {
        lockMessageRef.current?.focus()
      }
      return
    }
    if (lockedRestoreTimerRef.current !== null) {
      window.clearTimeout(lockedRestoreTimerRef.current)
      lockedRestoreTimerRef.current = null
      restoreAcceptedDraft(workspace)
    }
    setWorkspaceBlocksLocked(workspace, false)
    fitNarrowWorkspace(workspace)
    if (restoreFocusAfterUnlockRef.current && focusRestoreTimerRef.current === null) {
      focusRestoreTimerRef.current = window.setTimeout(() => {
        focusRestoreTimerRef.current = null
        if (!mountedRef.current || lockedRef.current) return
        const region = regionRef.current
        if (region === null) return
        const preferred = focusBeforeLockRef.current
        const fallback = region.querySelector<HTMLElement>('button:not(:disabled), .blockly-host:not([inert])')
        const target = isUsableFocusTarget(preferred, region) ? preferred : fallback
        if (target !== null && isUsableFocusTarget(target, region)) target.focus()
        focusBeforeLockRef.current = null
        restoreFocusAfterUnlockRef.current = false
      }, 0)
    }
  }, [locked, ready])

  useEffect(() => {
    if (!ready || focusBlockId === null) return
    const workspace = workspaceRef.current
    const block = workspace?.getBlockById(focusBlockId) ?? null
    if (workspace !== null && block !== null) {
      if (canSelect(block)) block.select()
      if (canCenter(workspace)) workspace.centerOnBlock(block.id)
      itemRefs.current.get(block.id)?.focus()
    } else hostRef.current?.focus()
    onFocusHandledRef.current()
  }, [focusBlockId, ready])

  useEffect(() => {
    if (!saveRecoverySuperseded) return
    saveRequestRef.current.generation += 1
    pendingDraftRef.current = null
    setDraftSaveStatus('idle')
  }, [saveRecoverySuperseded])

  const mutate = (operation: (workspace: Blockly.Workspace) => void) => {
    if (locked) return
    const workspace = workspaceRef.current
    if (workspace === null) return
    try {
      withoutEvents(() => operation(workspace))
      refresh(true)
      fitNarrowWorkspace(workspace)
    } catch {
      setWorkspaceError('当前积木结构需要先在编辑区连成一棵嵌套任务树。')
      setCompileResult(compileFourSeasRegaliaWorkspace(workspace))
    }
  }

  const run = () => {
    if (locked) return
    const workspace = workspaceRef.current
    if (workspace === null) return
    const compiled = compileFourSeasRegaliaWorkspace(workspace)
    setCompileResult(compiled)
    try {
      onRun(compiled)
      setWorkspaceError(null)
    } catch {
      setWorkspaceError('运行结果还没有交给任务保存，请再执行一次。')
    }
  }

  const retryDraftSave = () => {
    if (pendingDraftRef.current !== null) persistDraft(pendingDraftRef.current)
  }
  const atCapacity = tree.length >= FOUR_SEAS_WORKSPACE_LIMITS.maxWorkspaceBlocks

  const actionButton = (action: (typeof ACTIONS)[number]) => {
    const prefix = action.scope === 'top' ? '加入主任务' : action.scope === 'collect' ? '加入收集子任务' : '加入穿戴子任务'
    return (
      <button
        type="button"
        className="command-button"
        key={action.type}
        disabled={locked || atCapacity}
        onClick={() => mutate((workspace) => appendBlock(workspace, action.type, action.scope))}
      >
        {`${prefix}：${action.label}`}
      </button>
    )
  }

  return (
    <section
      ref={regionRef}
      className="code-workspace four-seas-regalia-workspace"
      aria-label="四海披挂图形化编程工作台"
      onKeyDown={activateButtonOnEnter}
    >
      {locked ? (
        <p ref={lockMessageRef} className="workspace-lock-message" role="status" tabIndex={-1}>
          通关结果正在处理，先不要改动指令卷轴。保存完成后就能继续操作。
        </p>
      ) : null}
      <div className="four-seas-helper">
        <div className="four-seas-helper-group">
          <p className="eyebrow">主任务 · 按故事顺序加入</p>
          <div className="command-buttons">{TOP_ACTIONS.map(actionButton)}</div>
        </div>
        <div className="four-seas-helper-group">
          <p className="eyebrow">收集子任务 · 放入“收齐三海宝物”</p>
          <div className="command-buttons">{COLLECT_ACTIONS.map(actionButton)}</div>
        </div>
        <div className="four-seas-helper-group">
          <p className="eyebrow">穿戴子任务 · 放入“穿戴整副披挂”</p>
          <div className="command-buttons">{EQUIP_ACTIONS.map(actionButton)}</div>
        </div>
        {capacityMessage || atCapacity ? (
          <p role="status">
            {capacityMessage ?? '指令卷轴已经装满500块积木。先删除一些积木，才能继续加入。'}
          </p>
        ) : null}
      </div>
      <div
        ref={hostRef}
        className="blockly-host"
        style={locked ? { pointerEvents: 'none' } : undefined}
        aria-label="Blockly 积木编辑区"
        aria-disabled={locked || undefined}
        inert={locked ? true : undefined}
        tabIndex={locked ? -1 : 0}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            run()
          }
        }}
      />
      <div className="command-scroll four-seas-program-tree">
        <span className="eyebrow">当前嵌套任务树</span>
        {!compileResult.ok ? <p role="status">{compileIssue(compileResult)}</p> : null}
        {tree.length > 0 ? (
          <ol className="block-program-list" aria-label="四海披挂程序树">
            {tree.map((block) => {
              const scope = block.scope
              const chain = scope === 'orphan' ? [] : scopeChain(workspaceRef.current!, scope)
              const index = chain.findIndex(({ id }) => id === block.id)
              const canReorder = index >= 0
              return (
                <li
                  key={block.id}
                  className={`four-seas-tree-${scope}`}
                  tabIndex={-1}
                  ref={(node) => {
                    if (node === null) itemRefs.current.delete(block.id)
                    else itemRefs.current.set(block.id, node)
                  }}
                >
                  <span><strong>{scopeName(scope)}</strong><span>{block.label}</span></span>
                  <span className="block-program-actions">
                    <button type="button" aria-label={`上移${scopeName(scope)}：${block.label}`} disabled={locked || !canReorder || index === 0} onClick={() => mutate((workspace) => moveWithinScope(workspace, block.id, -1))}>上移</button>
                    <button type="button" aria-label={`下移${scopeName(scope)}：${block.label}`} disabled={locked || !canReorder || index === chain.length - 1} onClick={() => mutate((workspace) => moveWithinScope(workspace, block.id, 1))}>下移</button>
                    {scope === 'collect' ? <button type="button" aria-label={`移到穿戴任务组：${block.label}`} disabled={locked || containerForScope(workspaceRef.current!, 'equip') === null} onClick={() => mutate((workspace) => moveAcrossScope(workspace, block.id, 'equip'))}>移到穿戴组</button> : null}
                    {scope === 'equip' ? <button type="button" aria-label={`移到收集任务组：${block.label}`} disabled={locked || containerForScope(workspaceRef.current!, 'collect') === null} onClick={() => mutate((workspace) => moveAcrossScope(workspace, block.id, 'collect'))}>移到收集组</button> : null}
                    <button type="button" aria-label={`删除：${block.label}`} disabled={locked} onClick={() => mutate((workspace) => deleteBlock(workspace, block.id))}>删除</button>
                  </span>
                </li>
              )
            })}
          </ol>
        ) : null}
      </div>
      {workspaceError ? <p role="alert">{workspaceError}</p> : null}
      {!locked && draftSaveStatus === 'unsaved' ? (
        <div className="unsaved-session" role="alert">
          <p>这次积木更改还没有保存。</p>
          <button type="button" onClick={retryDraftSave}>重试保存积木</button>
        </div>
      ) : null}
      {!locked && draftSaveStatus === 'conflict' ? (
        <p role="alert">其他标签页已经更新，这次积木更改暂停保存。</p>
      ) : null}
      <div className="workspace-actions">
        <button type="button" className="button button-ghost" disabled={locked} onClick={() => mutate((workspace) => workspace.clear())}>
          <ArrowsCounterClockwise size={20} />清空并重新开始
        </button>
        <button type="button" className="button button-primary" disabled={locked} onClick={run}>
          <Play size={20} weight="fill" />执行披挂指令
        </button>
      </div>
    </section>
  )
}
