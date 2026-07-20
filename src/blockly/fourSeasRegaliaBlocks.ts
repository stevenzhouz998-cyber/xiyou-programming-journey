import * as Blockly from 'blockly/core'
import { initializeWorkspaceBlock, renderWorkspaceTopBlocks } from './dragonPalaceBlocks'
import { FOUR_SEAS_BLOCK_LABELS } from './fourSeasRegaliaCatalogue'
import {
  FOUR_SEAS_BLOCK_OPCODE,
  isFourSeasChildBlockType,
  type FourSeasBlockType,
} from './fourSeasRegaliaContract'

export { FOUR_SEAS_BLOCK_LABELS } from './fourSeasRegaliaCatalogue'
export {
  FOUR_SEAS_BLOCK_OPCODE,
  FOUR_SEAS_CHILD_BLOCK_TYPES,
  FOUR_SEAS_TOP_BLOCK_TYPES,
  isFourSeasBlockType,
  isFourSeasChildBlockType,
  isFourSeasTopBlockType,
  type FourSeasBlockType,
} from './fourSeasRegaliaContract'

export function registerFourSeasRegaliaBlocks(): void {
  for (const type of Object.keys(FOUR_SEAS_BLOCK_OPCODE) as FourSeasBlockType[]) {
    if (Blockly.Blocks[type]) continue
    const child = isFourSeasChildBlockType(type)
    const inputName = type === 'xiyou_collect_gifts' ? 'GIFTS' : type === 'xiyou_equip_regalia' ? 'GEAR' : null
    Blockly.defineBlocksWithJsonArray([
      {
        type,
        message0: inputName === null ? FOUR_SEAS_BLOCK_LABELS[type] : `${FOUR_SEAS_BLOCK_LABELS[type]} %1`,
        ...(inputName === null
          ? {}
          : {
              args0: [
                {
                  type: 'input_statement',
                  name: inputName,
                  check: 'FourSeasSubtask',
                },
              ],
            }),
        previousStatement: child ? 'FourSeasSubtask' : 'FourSeasTop',
        nextStatement: child ? 'FourSeasSubtask' : 'FourSeasTop',
        colour: child ? 210 : 260,
        tooltip: FOUR_SEAS_BLOCK_LABELS[type],
      },
    ])
  }
}

export { initializeWorkspaceBlock, renderWorkspaceTopBlocks }
