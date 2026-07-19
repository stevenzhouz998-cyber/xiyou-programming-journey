import * as Blockly from 'blockly/core'
import type { FourSeasOpcode } from '../battle/types'
import { initializeWorkspaceBlock, renderWorkspaceTopBlocks } from './dragonPalaceBlocks'

export const FOUR_SEAS_BLOCK_OPCODE = {
  xiyou_request_regalia: 'request_regalia',
  xiyou_collect_gifts: 'collect_gifts',
  xiyou_receive_cloud_boots: 'receive_cloud_boots',
  xiyou_receive_golden_armor: 'receive_golden_armor',
  xiyou_receive_purple_crown: 'receive_purple_crown',
  xiyou_equip_regalia: 'equip_regalia',
  xiyou_wear_crown: 'wear_crown',
  xiyou_wear_armor: 'wear_armor',
  xiyou_wear_boots: 'wear_boots',
  xiyou_verify_regalia: 'verify_regalia',
} as const satisfies Record<string, FourSeasOpcode>

export type FourSeasBlockType = keyof typeof FOUR_SEAS_BLOCK_OPCODE

export const FOUR_SEAS_TOP_BLOCK_TYPES = [
  'xiyou_request_regalia',
  'xiyou_collect_gifts',
  'xiyou_equip_regalia',
  'xiyou_verify_regalia',
] as const satisfies readonly FourSeasBlockType[]

export const FOUR_SEAS_CHILD_BLOCK_TYPES = [
  'xiyou_receive_cloud_boots',
  'xiyou_receive_golden_armor',
  'xiyou_receive_purple_crown',
  'xiyou_wear_crown',
  'xiyou_wear_armor',
  'xiyou_wear_boots',
] as const satisfies readonly FourSeasBlockType[]

export const FOUR_SEAS_BLOCK_LABELS: Readonly<Record<FourSeasBlockType, string>> = {
  xiyou_request_regalia: '请求四海龙王赐下披挂',
  xiyou_collect_gifts: '收取三件礼物',
  xiyou_receive_cloud_boots: '收下藕丝步云履',
  xiyou_receive_golden_armor: '收下锁子黄金甲',
  xiyou_receive_purple_crown: '收下凤翅紫金冠',
  xiyou_equip_regalia: '穿戴齐天披挂',
  xiyou_wear_crown: '戴上凤翅紫金冠',
  xiyou_wear_armor: '穿上锁子黄金甲',
  xiyou_wear_boots: '穿上藕丝步云履',
  xiyou_verify_regalia: '验证齐天披挂',
}

const topTypes = new Set<string>(FOUR_SEAS_TOP_BLOCK_TYPES)
const childTypes = new Set<string>(FOUR_SEAS_CHILD_BLOCK_TYPES)

export function isFourSeasBlockType(type: string): type is FourSeasBlockType {
  return Object.prototype.hasOwnProperty.call(FOUR_SEAS_BLOCK_OPCODE, type)
}

export function isFourSeasTopBlockType(type: string): type is (typeof FOUR_SEAS_TOP_BLOCK_TYPES)[number] {
  return topTypes.has(type)
}

export function isFourSeasChildBlockType(type: string): type is (typeof FOUR_SEAS_CHILD_BLOCK_TYPES)[number] {
  return childTypes.has(type)
}

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
