import * as Blockly from 'blockly/core'
import * as zhHans from 'blockly/msg/zh-hans'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ArrowsCounterClockwise, Play } from '@phosphor-icons/react'
import type { CompileResult } from '../blockly/compiler'
import { compileDragonPalaceWorkspace } from '../blockly/compiler'
import { loadWorkspaceDraft, saveWorkspaceDraft, type WorkspaceDraftV1 } from '../blockly/draft'
import {
  DRAGON_BLOCK_OPCODE,
  registerDragonPalaceBlocks,
  type DragonBlockType,
} from '../blockly/dragonPalaceBlocks'
import {
  appendActionBlock,
  deleteActionBlock,
  moveActionBlock,
} from '../blockly/workspaceCommands'
import { PROGRESS_SCHEMA_LIMITS } from '../progress/schema'

interface Props {
  missionId: 'w1-m1'
  draft: WorkspaceDraftV1
  onDraftChange: (draft: WorkspaceDraftV1) => { status: 'saved' | 'unsaved' | 'conflict' } | Promise<{ status: 'saved' | 'unsaved' | 'conflict' }>
  onRun: (result: CompileResult) => void
  focusBlockId: string | null
  onFocusHandled: () => void
}

export interface BlocklyWorkspaceAdapter {
  create(host: HTMLDivElement): Blockly.Workspace
}

const ACTIONS: ReadonlyArray<{ type: DragonBlockType; label: string }> = [
  { type: 'xiyou_enter_palace', label: '进入龙宫' },
  { type: 'xiyou_request_weapon', label: '请求兵器' },
  { type: 'xiyou_test_weapon', label: '试用兵器' },
]

const LABEL_BY_OPCODE = Object.fromEntries(
  ACTIONS.map(({ type, label }) => [DRAGON_BLOCK_OPCODE[type], label]),
) as Record<(typeof DRAGON_BLOCK_OPCODE)[DragonBlockType], string>

const LABEL_BY_TYPE = Object.fromEntries(
  ACTIONS.map(({ type, label }) => [type, label]),
) as Record<DragonBlockType, string>

const LEGACY_ACTION_LABELS = {
  '进入龙宫': 'xiyou_enter_palace',
  '请求兵器': 'xiyou_request_weapon',
  '试用兵器': 'xiyou_test_weapon',
} as const satisfies Record<string, DragonBlockType>

Blockly.setLocale(zhHans as unknown as Record<string, string>)

const XIYOU_THEME = Blockly.Theme.defineTheme('xiyou-dragon-palace', {
  name: 'xiyou-dragon-palace',
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#f7f0df',
    toolboxBackgroundColour: '#e5d6b6',
    flyoutBackgroundColour: '#efe4cb',
  },
})

const defaultAdapter: BlocklyWorkspaceAdapter = {
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
      theme: XIYOU_THEME,
    })
  },
}

const WorkspaceAdapterContext = createContext<BlocklyWorkspaceAdapter>(defaultAdapter)

export function BlocklyWorkspaceAdapterProvider({
  adapter,
  children,
}: {
  adapter: BlocklyWorkspaceAdapter
  children: ReactNode
}) {
  return (
    <WorkspaceAdapterContext.Provider value={adapter}>
      {children}
    </WorkspaceAdapterContext.Provider>
  )
}

function legacyKey(missionId: Props['missionId']): string {
  return ['xiyou', 'workspace', missionId].join('-')
}

function registerLegacyActionBlock(): void {
  if (Blockly.Blocks.xiyou_action) return
  Blockly.defineBlocksWithJsonArray([
    {
      type: 'xiyou_action',
      message0: '%1',
      args0: [{ type: 'field_input', name: 'ACTION', text: '原著动作' }],
      previousStatement: null,
      nextStatement: null,
      colour: 152,
      tooltip: '旧版原著事件指令',
    },
  ])
}

function withoutBlocklyEvents<T>(operation: () => T): T {
  const wasEnabled = Blockly.Events.isEnabled()
  if (wasEnabled) Blockly.Events.disable()
  try {
    return operation()
  } finally {
    if (wasEnabled) Blockly.Events.enable()
  }
}

type LegacyRawNode = {
  id: string
  label: keyof typeof LEGACY_ACTION_LABELS
  nextId: string | null
  isTop: boolean
  x: number | null
  y: number | null
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort()
  const canonical = [...expected].sort()
  if (actual.length !== canonical.length || actual.some((key, index) => key !== canonical[index])) {
    throw new Error(`${label} has unknown or missing fields`)
  }
}

function isSafeLegacyCoordinate(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Math.abs(value) <= Number.MAX_SAFE_INTEGER
}

function validateLegacyRaw(raw: string): { parsed: Record<string, unknown>; nodes: LegacyRawNode[] } {
  if (raw.length > PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes) {
    throw new Error('Legacy workspace exceeds the byte limit')
  }
  if (new TextEncoder().encode(raw).byteLength > PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes) {
    throw new Error('Legacy workspace exceeds the byte limit')
  }
  const parsed: unknown = JSON.parse(raw)
  if (!isPlainRecord(parsed)) throw new Error('Legacy workspace root is malformed')
  if (Object.keys(parsed).length === 0) return { parsed, nodes: [] }
  assertExactKeys(parsed, ['blocks'], 'Legacy workspace root')

  const container = parsed.blocks
  if (!isPlainRecord(container)) throw new Error('Legacy blocks container is malformed')
  assertExactKeys(container, ['languageVersion', 'blocks'], 'Legacy blocks container')
  if (container.languageVersion !== 0 || !Array.isArray(container.blocks)) {
    throw new Error('Legacy blocks container has an unsupported version')
  }

  const ids = new Set<string>()
  const nodes: LegacyRawNode[] = []
  const visit = (value: unknown, isTop: boolean, depth: number): LegacyRawNode => {
    if (
      depth > PROGRESS_SCHEMA_LIMITS.maxWorkspaceBlocks
      || nodes.length >= PROGRESS_SCHEMA_LIMITS.maxWorkspaceBlocks
    ) {
      throw new Error('Legacy workspace exceeds the node limit')
    }
    if (!isPlainRecord(value)) throw new Error('Legacy block is malformed')
    const hasNext = Object.prototype.hasOwnProperty.call(value, 'next')
    assertExactKeys(
      value,
      isTop
        ? ['type', 'id', 'x', 'y', 'fields', ...(hasNext ? ['next'] : [])]
        : ['type', 'id', 'fields', ...(hasNext ? ['next'] : [])],
      'Legacy block',
    )
    if (value.type !== 'xiyou_action') throw new Error('Unknown legacy block type')
    if (
      typeof value.id !== 'string'
      || value.id.length === 0
      || value.id.length > PROGRESS_SCHEMA_LIMITS.maxBlockOrSourceIdLength
      || ids.has(value.id)
    ) {
      throw new Error('Legacy block id is missing, duplicated, or too long')
    }
    ids.add(value.id)
    if (!isPlainRecord(value.fields)) throw new Error('Legacy block fields are malformed')
    assertExactKeys(value.fields, ['ACTION'], 'Legacy block fields')
    const label = value.fields.ACTION
    if (
      typeof label !== 'string'
      || !Object.prototype.hasOwnProperty.call(LEGACY_ACTION_LABELS, label)
    ) {
      throw new Error('Unknown legacy action label')
    }
    if (isTop && (!isSafeLegacyCoordinate(value.x) || !isSafeLegacyCoordinate(value.y))) {
      throw new Error('Legacy top block position is unsafe')
    }

    const node: LegacyRawNode = {
      id: value.id,
      label: label as keyof typeof LEGACY_ACTION_LABELS,
      nextId: null,
      isTop,
      x: isTop ? value.x as number : null,
      y: isTop ? value.y as number : null,
    }
    nodes.push(node)
    if (hasNext) {
      if (!isPlainRecord(value.next)) throw new Error('Legacy next connection is malformed')
      assertExactKeys(value.next, ['block'], 'Legacy next connection')
      const next = visit(value.next.block, false, depth + 1)
      node.nextId = next.id
    }
    return node
  }

  if (container.blocks.length > PROGRESS_SCHEMA_LIMITS.maxWorkspaceBlocks) {
    throw new Error('Legacy workspace exceeds the node limit')
  }
  for (const top of container.blocks) visit(top, true, 1)
  return { parsed, nodes }
}

function assertLegacyConnection(block: Blockly.Block): void {
  if (block.previousConnection === null || block.nextConnection === null) {
    throw new Error('Legacy block is missing statement connections')
  }

  const previous = block.previousConnection.targetConnection
  if (previous !== null) {
    const previousBlock = previous.getSourceBlock()
    if (
      previous !== previousBlock.nextConnection
      || previous.targetConnection !== block.previousConnection
      || block.getPreviousBlock() !== previousBlock
    ) {
      throw new Error('Legacy block has a broken previous connection')
    }
  } else if (block.getPreviousBlock() !== null) {
    throw new Error('Legacy block has an inconsistent previous connection')
  }

  const next = block.nextConnection.targetConnection
  if (next !== null) {
    const nextBlock = next.getSourceBlock()
    if (
      next !== nextBlock.previousConnection
      || next.targetConnection !== block.nextConnection
      || block.getNextBlock() !== nextBlock
    ) {
      throw new Error('Legacy block has a broken next connection')
    }
  } else if (block.getNextBlock() !== null) {
    throw new Error('Legacy block has an inconsistent next connection')
  }
}

function convertLegacyWorkspace(raw: string): WorkspaceDraftV1 {
  const validated = validateLegacyRaw(raw)
  if (validated.nodes.length === 0) return { version: 1, blocks: [] }

  registerLegacyActionBlock()
  const legacyWorkspace = new Blockly.Workspace()
  const validationWorkspace = new Blockly.Workspace()
  try {
    withoutBlocklyEvents(() => {
      Blockly.serialization.workspaces.load(validated.parsed, legacyWorkspace)
    })

    const loadedBlocks = legacyWorkspace.getAllBlocks(false)
    if (loadedBlocks.length !== validated.nodes.length) {
      throw new Error('Legacy loader changed the block count')
    }
    const rawTopIds = validated.nodes.filter((node) => node.isTop).map((node) => node.id).sort()
    const loadedTopIds = legacyWorkspace.getTopBlocks(false).map((block) => block.id).sort()
    if (JSON.stringify(rawTopIds) !== JSON.stringify(loadedTopIds)) {
      throw new Error('Legacy loader changed the top-level chains')
    }

    const blocks = validated.nodes.map((saved) => {
      const block = legacyWorkspace.getBlockById(saved.id)
      if (block === null) throw new Error('Legacy loader changed a block id')
      if (block.type !== 'xiyou_action') throw new Error('Unknown legacy block type')
      assertLegacyConnection(block)
      const label = block.getFieldValue('ACTION')
      if (label !== saved.label || (block.getNextBlock()?.id ?? null) !== saved.nextId) {
        throw new Error('Legacy loader changed block content or connections')
      }
      const position = block.getRelativeToSurfaceXY()
      if (!isSafeLegacyCoordinate(position.x) || !isSafeLegacyCoordinate(position.y)) {
        throw new Error('Unsafe legacy block position')
      }
      if (saved.isTop && (position.x !== saved.x || position.y !== saved.y)) {
        throw new Error('Legacy loader changed a top-level position')
      }
      return {
        id: saved.id,
        type: LEGACY_ACTION_LABELS[saved.label],
        nextId: saved.nextId,
        x: position.x,
        y: position.y,
      }
    })

    const draft: WorkspaceDraftV1 = {
      version: 1,
      blocks: blocks.sort((left, right) => left.id.localeCompare(right.id)),
    }
    withoutBlocklyEvents(() => loadWorkspaceDraft(validationWorkspace, draft))
    return draft
  } finally {
    legacyWorkspace.dispose()
    validationWorkspace.dispose()
  }
}

type SelectableBlock = Blockly.Block & { select(): void }
type CenterableWorkspace = Blockly.Workspace & { centerOnBlock(blockId: string): void }

function canSelect(block: Blockly.Block): block is SelectableBlock {
  return typeof (block as unknown as Partial<SelectableBlock>).select === 'function'
}

function canCenter(workspace: Blockly.Workspace): workspace is CenterableWorkspace {
  return typeof (workspace as Partial<CenterableWorkspace>).centerOnBlock === 'function'
}

function compileIssue(result: CompileResult): string | null {
  if (result.ok) return null
  switch (result.diagnostics[0]?.code) {
    case 'multiple-top-level':
      return '当前积木还不能形成唯一顺序：程序现在有多个开头。'
    case 'invalid-connection':
      return '当前积木还不能形成唯一顺序：有连接没有接好。'
    case 'unknown-block':
      return '当前积木还不能形成唯一顺序：发现无法识别的积木。'
    case 'empty-workspace':
      return '指令卷轴还是空的，先加入一块积木吧。'
    default:
      return '当前积木还不能形成唯一顺序。'
  }
}

type DisplayBlock = { id: string; label: string }

function displayBlocksFromWorkspace(workspace: Blockly.Workspace): DisplayBlock[] {
  const compare = (left: Blockly.Block, right: Blockly.Block) => {
    const leftPosition = left.getRelativeToSurfaceXY()
    const rightPosition = right.getRelativeToSurfaceXY()
    return leftPosition.y - rightPosition.y
      || leftPosition.x - rightPosition.x
      || left.id.localeCompare(right.id)
  }
  const ordered: Blockly.Block[] = []
  const visited = new Set<string>()
  for (const top of workspace.getTopBlocks(false).sort(compare)) {
    let block: Blockly.Block | null = top
    while (block !== null && !visited.has(block.id)) {
      visited.add(block.id)
      ordered.push(block)
      block = block.getNextBlock()
    }
  }
  for (const block of workspace.getAllBlocks(false).sort(compare)) {
    if (!visited.has(block.id)) ordered.push(block)
  }
  return ordered.map((block) => ({
    id: block.id,
    label: Object.prototype.hasOwnProperty.call(LABEL_BY_TYPE, block.type)
      ? LABEL_BY_TYPE[block.type as DragonBlockType]
      : '无法识别的积木',
  }))
}

export function BlocklyWorkspace({
  missionId,
  draft,
  onDraftChange,
  onRun,
  focusBlockId,
  onFocusHandled,
}: Props) {
  const adapter = useContext(WorkspaceAdapterContext)
  const hostRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<Blockly.Workspace | null>(null)
  const itemRefs = useRef(new Map<string, HTMLLIElement>())
  const onDraftChangeRef = useRef(onDraftChange)
  const onFocusHandledRef = useRef(onFocusHandled)
  const lastDraftBytesRef = useRef<string | null>(null)
  const lastPropDraftBytesRef = useRef<string | null>(null)
  const pendingLegacyKeyRef = useRef<string | null>(null)
  const [workspaceReady, setWorkspaceReady] = useState(false)
  const [compileResult, setCompileResult] = useState<CompileResult>(() => ({
    ok: false,
    trace: [],
    diagnostics: [{ code: 'empty-workspace', sourceBlockId: null, concept: 'program-structure' }],
  }))
  const [displayBlocks, setDisplayBlocks] = useState<DisplayBlock[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'unsaved'>('idle')
  const [migrationError, setMigrationError] = useState(false)
  const [legacyReadError, setLegacyReadError] = useState(false)
  const [legacyCleanupWarning, setLegacyCleanupWarning] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)

  onDraftChangeRef.current = onDraftChange
  onFocusHandledRef.current = onFocusHandled

  const removePendingLegacy = () => {
    const key = pendingLegacyKeyRef.current
    if (key === null) return
    try {
      localStorage.removeItem(key)
      pendingLegacyKeyRef.current = null
      setLegacyCleanupWarning(false)
    } catch {
      setLegacyCleanupWarning(true)
    }
  }

  const refreshWorkspace = (persist: boolean, force = false) => {
    const workspace = workspaceRef.current
    if (workspace === null) return
    const compiled = compileDragonPalaceWorkspace(workspace)
    setCompileResult(compiled)
    setDisplayBlocks(displayBlocksFromWorkspace(workspace))
    if (!persist) return

    let nextDraft: WorkspaceDraftV1
    try {
      nextDraft = saveWorkspaceDraft(workspace)
    } catch {
      setWorkspaceError('当前积木结构无法安全保存，原草稿保持不变。')
      return
    }
    const nextBytes = JSON.stringify(nextDraft)
    if (!force && lastDraftBytesRef.current === nextBytes) return
    lastDraftBytesRef.current = nextBytes
    try {
      const result = onDraftChangeRef.current(nextDraft)
      const handle = (resolved: { status: 'saved' | 'unsaved' | 'conflict' }) => {
        setSaveStatus(resolved.status === 'saved' ? 'saved' : 'unsaved')
        if (resolved.status === 'saved') removePendingLegacy()
      }
      if (result instanceof Promise) void result.then(handle, () => setSaveStatus('unsaved'))
      else handle(result)
      setWorkspaceError(null)
    } catch {
      setSaveStatus('unsaved')
    }
  }

  useEffect(() => {
    const host = hostRef.current
    if (host === null) return undefined

    setMigrationError(false)
    setLegacyReadError(false)
    setLegacyCleanupWarning(false)
    setWorkspaceError(null)
    setSaveStatus('idle')
    pendingLegacyKeyRef.current = null

    const oldKey = legacyKey(missionId)
    let oldBytes: string | null = null
    if (draft.blocks.length === 0) {
      try {
        oldBytes = localStorage.getItem(oldKey)
      } catch {
        setLegacyReadError(true)
      }
    }

    registerDragonPalaceBlocks()
    const workspace = adapter.create(host)
    workspaceRef.current = workspace
    let initialDraft = draft
    if (oldBytes !== null) {
      try {
        initialDraft = convertLegacyWorkspace(oldBytes)
        pendingLegacyKeyRef.current = oldKey
      } catch {
        setMigrationError(true)
      }
    }

    withoutBlocklyEvents(() => loadWorkspaceDraft(workspace, initialDraft))
    lastDraftBytesRef.current = JSON.stringify(initialDraft)
    lastPropDraftBytesRef.current = JSON.stringify(draft)
    refreshWorkspace(false)

    if (pendingLegacyKeyRef.current !== null) {
      refreshWorkspace(true, true)
    }

    const listener = (event: Blockly.Events.Abstract) => {
      if (event.isUiEvent) return
      refreshWorkspace(true)
    }
    workspace.addChangeListener(listener)
    setWorkspaceReady(true)

    return () => {
      setWorkspaceReady(false)
      workspace.removeChangeListener(listener)
      workspace.dispose()
      if (workspaceRef.current === workspace) workspaceRef.current = null
      itemRefs.current.clear()
    }
  }, [adapter, missionId])

  useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspaceReady || workspace === null) return
    const incomingBytes = JSON.stringify(draft)
    if (incomingBytes === lastPropDraftBytesRef.current) return
    if (incomingBytes === lastDraftBytesRef.current) {
      lastPropDraftBytesRef.current = incomingBytes
      return
    }

    try {
      withoutBlocklyEvents(() => loadWorkspaceDraft(workspace, draft))
      lastDraftBytesRef.current = incomingBytes
      lastPropDraftBytesRef.current = incomingBytes
      refreshWorkspace(false)
      setWorkspaceError(null)
    } catch {
      setWorkspaceError('传入的积木草稿无法安全恢复，当前工作区保持不变。')
    }
  }, [draft, workspaceReady])

  useEffect(() => {
    if (!workspaceReady || focusBlockId === null) return
    const workspace = workspaceRef.current
    const block = workspace?.getBlockById(focusBlockId) ?? null
    if (block !== null && workspace !== null) {
      if (canSelect(block)) block.select()
      if (canCenter(workspace)) workspace.centerOnBlock(block.id)
      itemRefs.current.get(block.id)?.focus()
    } else {
      hostRef.current?.focus()
    }
    onFocusHandledRef.current()
  }, [focusBlockId, workspaceReady])

  const mutate = (operation: (workspace: Blockly.Workspace) => void) => {
    const workspace = workspaceRef.current
    if (workspace === null) return
    try {
      operation(workspace)
      refreshWorkspace(true)
    } catch {
      setWorkspaceError('当前积木结构需要先在编辑区连接成一条指令链。')
      setCompileResult(compileDragonPalaceWorkspace(workspace))
    }
  }

  const run = () => {
    const workspace = workspaceRef.current
    if (workspace === null) return
    const result = compileDragonPalaceWorkspace(workspace)
    setCompileResult(result)
    onRun(result)
  }

  const trace = compileResult.ok ? compileResult.trace : []

  return (
    <section className="code-workspace" aria-label="图形化编程工作台">
      <div className="command-palette">
        <p className="eyebrow">指令匣 · 点击加入卷轴</p>
        <div className="command-buttons">
          {ACTIONS.map(({ type, label }) => (
            <button
              type="button"
              className="command-button"
              key={type}
              onClick={() => mutate((workspace) => { appendActionBlock(workspace, type) })}
            >
              {`加入：${label}`}
            </button>
          ))}
        </div>
      </div>

      <div
        className="blockly-host"
        ref={hostRef}
        aria-label="Blockly 积木编辑区"
        tabIndex={0}
      />

      <div className="command-scroll">
        <span className="eyebrow">当前指令卷轴</span>
        {compileResult.ok ? (
          <ol className="block-program-list">
            {trace.map((instruction, index) => {
              const label = LABEL_BY_OPCODE[instruction.opcode]
              return (
                <li
                  key={instruction.sourceBlockId}
                  tabIndex={-1}
                  ref={(node) => {
                    if (node === null) itemRefs.current.delete(instruction.sourceBlockId)
                    else itemRefs.current.set(instruction.sourceBlockId, node)
                  }}
                >
                  <span>{label}</span>
                  <span className="block-program-actions">
                    <button
                      type="button"
                      aria-label={`上移：${label}`}
                      disabled={index === 0}
                      onClick={() => mutate((workspace) => {
                        moveActionBlock(workspace, instruction.sourceBlockId, -1)
                      })}
                    >
                      上移
                    </button>
                    <button
                      type="button"
                      aria-label={`下移：${label}`}
                      disabled={index === trace.length - 1}
                      onClick={() => mutate((workspace) => {
                        moveActionBlock(workspace, instruction.sourceBlockId, 1)
                      })}
                    >
                      下移
                    </button>
                    <button
                      type="button"
                      aria-label={`删除：${label}`}
                      onClick={() => mutate((workspace) => {
                        deleteActionBlock(workspace, instruction.sourceBlockId)
                      })}
                    >
                      删除
                    </button>
                  </span>
                </li>
              )
            })}
          </ol>
        ) : (
          <>
            <p role="status">{compileIssue(compileResult)}</p>
            {displayBlocks.length > 0 ? (
              <ul className="block-program-list" aria-label="工作区积木（尚未形成唯一顺序）">
                {displayBlocks.map((block) => (
                  <li
                    key={block.id}
                    tabIndex={-1}
                    ref={(node) => {
                      if (node === null) itemRefs.current.delete(block.id)
                      else itemRefs.current.set(block.id, node)
                    }}
                  >
                    <span>{block.label}</span>
                    <span className="block-program-actions">
                      <button
                        type="button"
                        aria-label={`删除：${block.label}`}
                        onClick={() => mutate((workspace) => {
                          deleteActionBlock(workspace, block.id)
                        })}
                      >
                        删除
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      {saveStatus === 'unsaved' ? (
        <div className="unsaved-session" role="status">
          <p>尚未保存，请稍后重试。</p>
          <button type="button" onClick={() => refreshWorkspace(true, true)}>重试保存</button>
        </div>
      ) : null}
      {migrationError ? (
        <p role="alert">旧版积木草稿无法安全迁移，原始草稿已保留。</p>
      ) : null}
      {legacyReadError ? (
        <p role="alert">无法读取旧版积木草稿，已继续加载当前草稿。</p>
      ) : null}
      {legacyCleanupWarning ? (
        <div role="alert">
          <p>新草稿已保存但旧备份未清理。</p>
          <button type="button" onClick={() => refreshWorkspace(true, true)}>重试清理旧备份</button>
        </div>
      ) : null}
      {workspaceError ? <p role="alert">{workspaceError}</p> : null}

      <div className="workspace-actions">
        <button
          type="button"
          className="button button-ghost"
          onClick={() => mutate((workspace) => { workspace.clear() })}
        >
          <ArrowsCounterClockwise size={20} />清空并重新开始
        </button>
        <button type="button" className="button button-primary" onClick={run}>
          <Play weight="fill" size={20} />执行战斗指令
        </button>
      </div>
    </section>
  )
}
