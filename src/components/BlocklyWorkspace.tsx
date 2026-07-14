import * as Blockly from 'blockly'
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

interface Props {
  missionId: 'w1-m1'
  draft: WorkspaceDraftV1
  onDraftChange: (draft: WorkspaceDraftV1) => { status: 'saved' | 'unsaved' }
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

const LEGACY_ACTION_LABELS = {
  '进入龙宫': 'xiyou_enter_palace',
  '请求兵器': 'xiyou_request_weapon',
  '试用兵器': 'xiyou_test_weapon',
} as const satisfies Record<string, DragonBlockType>

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
  Blockly.Events.disable()
  try {
    return operation()
  } finally {
    Blockly.Events.enable()
  }
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
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Legacy workspace payload is malformed')
  }

  registerLegacyActionBlock()
  const legacyWorkspace = new Blockly.Workspace()
  const validationWorkspace = new Blockly.Workspace()
  try {
    withoutBlocklyEvents(() => {
      Blockly.serialization.workspaces.load(parsed, legacyWorkspace)
    })

    const ids = new Set<string>()
    const predecessorIds = new Set<string>()
    const blocks = legacyWorkspace.getAllBlocks(false).map((block) => {
      if (block.type !== 'xiyou_action') throw new Error('Unknown legacy block type')
      if (ids.has(block.id)) throw new Error('Duplicate legacy block id')
      ids.add(block.id)
      assertLegacyConnection(block)

      const label = block.getFieldValue('ACTION')
      if (typeof label !== 'string' || !(label in LEGACY_ACTION_LABELS)) {
        throw new Error('Unknown legacy action label')
      }
      const position = block.getRelativeToSurfaceXY()
      if (
        !Number.isFinite(position.x)
        || !Number.isFinite(position.y)
        || Math.abs(position.x) > Number.MAX_SAFE_INTEGER
        || Math.abs(position.y) > Number.MAX_SAFE_INTEGER
      ) {
        throw new Error('Unsafe legacy block position')
      }
      const nextId = block.getNextBlock()?.id ?? null
      if (nextId !== null) {
        if (predecessorIds.has(nextId)) throw new Error('Legacy block has multiple predecessors')
        predecessorIds.add(nextId)
      }
      return {
        id: block.id,
        type: LEGACY_ACTION_LABELS[label as keyof typeof LEGACY_ACTION_LABELS],
        nextId,
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'unsaved'>('idle')
  const [migrationError, setMigrationError] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)

  onDraftChangeRef.current = onDraftChange
  onFocusHandledRef.current = onFocusHandled

  const refreshWorkspace = (persist: boolean) => {
    const workspace = workspaceRef.current
    if (workspace === null) return
    const compiled = compileDragonPalaceWorkspace(workspace)
    setCompileResult(compiled)
    if (!persist) return

    try {
      const nextDraft = saveWorkspaceDraft(workspace)
      const nextBytes = JSON.stringify(nextDraft)
      if (lastDraftBytesRef.current === nextBytes) return
      lastDraftBytesRef.current = nextBytes
      const result = onDraftChangeRef.current(nextDraft)
      setSaveStatus(result.status)
      if (result.status === 'saved' && pendingLegacyKeyRef.current !== null) {
        localStorage.removeItem(pendingLegacyKeyRef.current)
        pendingLegacyKeyRef.current = null
      }
      setWorkspaceError(null)
    } catch {
      setWorkspaceError('当前积木结构无法安全保存，原草稿保持不变。')
    }
  }

  useEffect(() => {
    const host = hostRef.current
    if (host === null) return undefined

    registerDragonPalaceBlocks()
    const workspace = adapter.create(host)
    workspaceRef.current = workspace
    setMigrationError(false)
    setWorkspaceError(null)
    setSaveStatus('idle')

    let initialDraft = draft
    const oldKey = legacyKey(missionId)
    if (draft.blocks.length === 0) {
      const oldBytes = localStorage.getItem(oldKey)
      if (oldBytes !== null) {
        try {
          initialDraft = convertLegacyWorkspace(oldBytes)
          pendingLegacyKeyRef.current = oldKey
        } catch {
          setMigrationError(true)
        }
      }
    }

    withoutBlocklyEvents(() => loadWorkspaceDraft(workspace, initialDraft))
    lastDraftBytesRef.current = JSON.stringify(initialDraft)
    lastPropDraftBytesRef.current = JSON.stringify(draft)
    setCompileResult(compileDragonPalaceWorkspace(workspace))

    if (pendingLegacyKeyRef.current !== null) {
      try {
        const result = onDraftChangeRef.current(initialDraft)
        setSaveStatus(result.status)
        if (result.status === 'saved') {
          localStorage.removeItem(pendingLegacyKeyRef.current)
          pendingLegacyKeyRef.current = null
        }
      } catch {
        setSaveStatus('unsaved')
      }
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
    lastPropDraftBytesRef.current = incomingBytes
    if (incomingBytes === lastDraftBytesRef.current) return

    try {
      withoutBlocklyEvents(() => loadWorkspaceDraft(workspace, draft))
      lastDraftBytesRef.current = incomingBytes
      setCompileResult(compileDragonPalaceWorkspace(workspace))
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
          <p role="status">{compileIssue(compileResult)}</p>
        )}
      </div>

      {saveStatus === 'unsaved' ? (
        <p className="unsaved-session" role="status">尚未保存，请稍后重试。</p>
      ) : null}
      {migrationError ? (
        <p role="alert">旧版积木草稿无法安全迁移，原始草稿已保留。</p>
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
