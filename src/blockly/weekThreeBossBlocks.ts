import * as Blockly from 'blockly';

export const WEEK_THREE_BOSS_CONDITION_TYPES = {
  mentionsGaolao: 'w3_boss_condition_mentions_gaolao', explicitDemonHelp: 'w3_boss_condition_explicit_demon_help', appearanceMatchesCuilan: 'w3_boss_condition_appearance_matches_cuilan', identityIsCuilan: 'w3_boss_condition_identity_is_cuilan', pilgrimageExplicit: 'w3_boss_condition_pilgrimage_explicit', guanyinPrecepts: 'w3_boss_condition_guanyin_precepts', willingWestward: 'w3_boss_condition_willing_westward',
} as const;
export const WEEK_THREE_BOSS_BLOCK_TYPES = ['w3_boss_root', 'w3_boss_stage', 'w3_boss_if', ...Object.values(WEEK_THREE_BOSS_CONDITION_TYPES), 'w3_boss_combine', 'w3_boss_action'] as const;
export const WEEK_THREE_BOSS_TOOLBOX: Blockly.utils.toolbox.ToolboxDefinition = {
  kind: 'flyoutToolbox',
  contents: [
    { kind: 'block', type: WEEK_THREE_BOSS_CONDITION_TYPES.mentionsGaolao }, { kind: 'block', type: WEEK_THREE_BOSS_CONDITION_TYPES.explicitDemonHelp }, { kind: 'block', type: WEEK_THREE_BOSS_CONDITION_TYPES.appearanceMatchesCuilan }, { kind: 'block', type: WEEK_THREE_BOSS_CONDITION_TYPES.identityIsCuilan },
  ],
};

export function registerWeekThreeBossBlocks(): void {
  Blockly.Blocks.w3_boss_root = { init(this: Blockly.Block) { this.appendDummyInput().appendField('运行第三周总试炼'); this.appendStatementInput('STAGES'); this.setColour(28); this.setDeletable(false); } };
  Blockly.Blocks.w3_boss_stage = { init(this: Blockly.Block) {
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([['庄口求助','manor-request'],['后宅伪装','cuilan-disguise'],['云栈洞对话','yunzhan-dialogue'],['八戒归队','bajie-joining']]), 'STAGE'); this.appendStatementInput('BODY'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(210); this.setDeletable(false);
  } };
  Blockly.Blocks.w3_boss_if = { init(this: Blockly.Block) { this.appendValueInput('CONDITION').appendField('如果'); this.appendStatementInput('THEN').appendField('那么'); this.appendStatementInput('ELSE').appendField('否则'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(210); } };
  const condition = (label: string) => ({ init(this: Blockly.Block) { this.appendDummyInput().appendField(label); this.setOutput(true, 'Boolean'); this.setColour(120); } });
  Blockly.Blocks[WEEK_THREE_BOSS_CONDITION_TYPES.mentionsGaolao] = condition('提到高老庄'); Blockly.Blocks[WEEK_THREE_BOSS_CONDITION_TYPES.explicitDemonHelp] = condition('明确请求降妖帮助'); Blockly.Blocks[WEEK_THREE_BOSS_CONDITION_TYPES.appearanceMatchesCuilan] = condition('外形像高翠兰'); Blockly.Blocks[WEEK_THREE_BOSS_CONDITION_TYPES.identityIsCuilan] = condition('真实身份是高翠兰'); Blockly.Blocks[WEEK_THREE_BOSS_CONDITION_TYPES.pilgrimageExplicit] = condition('明确西行取经'); Blockly.Blocks[WEEK_THREE_BOSS_CONDITION_TYPES.guanyinPrecepts] = condition('观音受戒'); Blockly.Blocks[WEEK_THREE_BOSS_CONDITION_TYPES.willingWestward] = condition('愿意西去');
  Blockly.Blocks.w3_boss_combine = { init(this: Blockly.Block) { this.appendValueInput('LEFT'); this.appendDummyInput().appendField(new Blockly.FieldDropdown([['AND','and'],['OR','or']]), 'OPERATOR'); this.appendValueInput('RIGHT'); this.setOutput(true, 'Boolean'); this.setColour(120); } };
  Blockly.Blocks.w3_boss_action = { init(this: Blockly.Block) { this.appendDummyInput().appendField(new Blockly.FieldDropdown([['接受降妖请求','accept-demon-help'],['继续问路','continue-directions'],['保持伪装','keep-disguise'],['显出悟空并追赶','reveal-wukong-and-chase'],['守住洞口','guard-cave'],['说明观音点化','explain-guanyin-origin'],['正式加入队伍','formally-join-team'],['继续核对','continue-verification']]), 'ACTION'); this.setPreviousStatement(true); this.setColour(65); } };
}
