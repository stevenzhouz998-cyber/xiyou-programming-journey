import * as Blockly from 'blockly/core'
import type { RuyiStaffOpcode } from '../battle/types'
import { initializeWorkspaceBlock, renderWorkspaceTopBlocks } from './dragonPalaceBlocks'

export const RUYI_BLOCK_OPCODE = {
  xiyou_inspect_weights: 'inspect_weights',
  xiyou_choose_sabre: 'choose_sabre',
  xiyou_choose_halberd: 'choose_halberd',
  xiyou_choose_ruyi_staff: 'choose_ruyi_staff',
  xiyou_shrink_ruyi_staff: 'shrink_ruyi_staff',
} as const satisfies Record<string, RuyiStaffOpcode>

export type RuyiBlockType = keyof typeof RUYI_BLOCK_OPCODE

const RUYI_BLOCK_LABEL: Record<RuyiBlockType, string> = {
  xiyou_inspect_weights: '查看三件兵器重量',
  xiyou_choose_sabre: '选择大捍刀（3600斤）',
  xiyou_choose_halberd: '选择方天画戟（7200斤）',
  xiyou_choose_ruyi_staff: '选择定海神针（13500斤）',
  xiyou_shrink_ruyi_staff: '缩小定海神针',
}

export function isRuyiBlockType(type: string): type is RuyiBlockType {
  return Object.prototype.hasOwnProperty.call(RUYI_BLOCK_OPCODE, type)
}

export function registerRuyiStaffBlocks(): void {
  for (const type of Object.keys(RUYI_BLOCK_OPCODE) as RuyiBlockType[]) {
    if (Blockly.Blocks[type]) continue
    Blockly.defineBlocksWithJsonArray([
      {
        type,
        message0: RUYI_BLOCK_LABEL[type],
        previousStatement: null,
        nextStatement: null,
        colour: 35,
        tooltip: RUYI_BLOCK_LABEL[type],
      },
    ])
  }
}

export { initializeWorkspaceBlock, renderWorkspaceTopBlocks }
