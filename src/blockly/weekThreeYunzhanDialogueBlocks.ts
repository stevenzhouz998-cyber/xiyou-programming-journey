import * as Blockly from 'blockly/core';
import type { YunzhanDialogueBlockType } from './weekThreeYunzhanDialogueContract';

export const YUNZHAN_DIALOGUE_BLOCK_LABELS: Readonly<Record<YunzhanDialogueBlockType, string>> = {
  w3_yunzhan_if_pilgrimage_explicit: '如果',
  w3_yunzhan_condition_pilgrimage_explicit: '当前话语明确说明唐三藏正在西行取经',
  w3_yunzhan_guard_cave: '继续守住云栈洞',
  w3_yunzhan_explain_guanyin_origin: '放下钉耙，说明受观音点化的来历',
};

export function registerYunzhanDialogueBlocks(): void {
  const statement = (type: Extract<YunzhanDialogueBlockType, 'w3_yunzhan_guard_cave' | 'w3_yunzhan_explain_guanyin_origin'>) => {
    if (Blockly.Blocks[type]) return;
    Blockly.Blocks[type] = { init() { this.appendDummyInput().appendField(YUNZHAN_DIALOGUE_BLOCK_LABELS[type]); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(28); this.setTooltip(YUNZHAN_DIALOGUE_BLOCK_LABELS[type]); } };
  };
  statement('w3_yunzhan_guard_cave'); statement('w3_yunzhan_explain_guanyin_origin');
  if (!Blockly.Blocks.w3_yunzhan_condition_pilgrimage_explicit) Blockly.Blocks.w3_yunzhan_condition_pilgrimage_explicit = { init() { this.appendDummyInput().appendField(YUNZHAN_DIALOGUE_BLOCK_LABELS.w3_yunzhan_condition_pilgrimage_explicit); this.setOutput(true, 'Boolean'); this.setColour(210); this.setTooltip(YUNZHAN_DIALOGUE_BLOCK_LABELS.w3_yunzhan_condition_pilgrimage_explicit); } };
  if (!Blockly.Blocks.w3_yunzhan_if_pilgrimage_explicit) Blockly.Blocks.w3_yunzhan_if_pilgrimage_explicit = { init() { this.appendValueInput('CONDITION').setCheck('Boolean').appendField(YUNZHAN_DIALOGUE_BLOCK_LABELS.w3_yunzhan_if_pilgrimage_explicit); this.appendStatementInput('THEN').appendField('成立时'); this.appendStatementInput('ELSE').appendField('不成立时'); this.setColour(230); this.setTooltip('两轮对话都会读取这一个固定条件。'); } };
}
