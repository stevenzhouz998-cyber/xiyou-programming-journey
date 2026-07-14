import * as Blockly from 'blockly'
import type { BattleOpcode } from '../battle/types'

export const DRAGON_BLOCK_OPCODE = {
  xiyou_enter_palace: 'enter_palace',
  xiyou_request_weapon: 'request_weapon',
  xiyou_test_weapon: 'test_weapon',
} as const satisfies Record<string, BattleOpcode>

export type DragonBlockType = keyof typeof DRAGON_BLOCK_OPCODE

const DRAGON_BLOCK_LABEL: Record<DragonBlockType, string> = {
  xiyou_enter_palace: '进入龙宫',
  xiyou_request_weapon: '请求兵器',
  xiyou_test_weapon: '试用兵器',
}

export function isDragonBlockType(type: string): type is DragonBlockType {
  return Object.prototype.hasOwnProperty.call(DRAGON_BLOCK_OPCODE, type)
}

export function registerDragonPalaceBlocks(): void {
  for (const type of Object.keys(DRAGON_BLOCK_OPCODE) as DragonBlockType[]) {
    if (Blockly.Blocks[type]) continue

    Blockly.defineBlocksWithJsonArray([
      {
        type,
        message0: DRAGON_BLOCK_LABEL[type],
        previousStatement: null,
        nextStatement: null,
        colour: 152,
        tooltip: DRAGON_BLOCK_LABEL[type],
      },
    ])
  }
}

type SvgBlockCapabilities = Blockly.Block & {
  getSvgRoot(): SVGGElement
  initSvg(): void
  render(): void
}

type SvgWorkspaceCapabilities = Blockly.Workspace & {
  getBlockCanvas(): SVGElement | null
}

function isSvgBlock(block: Blockly.Block): block is SvgBlockCapabilities {
  const candidate = block as unknown as Record<string, unknown>
  return (
    typeof candidate.getSvgRoot === 'function' &&
    typeof candidate.initSvg === 'function' &&
    typeof candidate.render === 'function'
  )
}

function isSvgWorkspace(workspace: Blockly.Workspace): workspace is SvgWorkspaceCapabilities {
  const candidate = workspace as unknown as Record<string, unknown>
  return typeof candidate.getBlockCanvas === 'function'
}

export function initializeWorkspaceBlock(block: Blockly.Block): void {
  if (!isSvgBlock(block) || !isSvgWorkspace(block.workspace)) return
  const canvas = block.workspace.getBlockCanvas()
  if (canvas?.contains(block.getSvgRoot())) return
  block.initSvg()
}

export function renderWorkspaceTopBlocks(workspace: Blockly.Workspace): void {
  if (!isSvgWorkspace(workspace)) return
  for (const topBlock of workspace.getTopBlocks(false)) {
    if (isSvgBlock(topBlock)) topBlock.render()
  }
}
