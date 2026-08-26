import * as Blockly from 'blockly';
import { afterEach, describe, expect, it } from 'vitest';
import { registerFurnaceConditionBlocks } from './weekTwoFurnaceConditionBlocks';
import { compileFurnaceConditionWorkspace } from './weekTwoFurnaceConditionCompiler';

const workspaces: Blockly.Workspace[] = [];
afterEach(() => workspaces.splice(0).forEach((workspace) => workspace.dispose()));

function connectedWorkspace(conditionType = 'xiyou_condition_red_eyes') {
  registerFurnaceConditionBlocks();
  const workspace = new Blockly.Workspace();
  workspaces.push(workspace);
  const enter = workspace.newBlock('xiyou_enter_eight_trigram_furnace', 'enter');
  const shelter = workspace.newBlock('xiyou_shelter_in_xun', 'shelter');
  const loop = workspace.newBlock('xiyou_repeat_until_furnace_ready', 'loop');
  const condition = workspace.newBlock(conditionType, 'condition');
  const wait = workspace.newBlock('xiyou_wait_seven_days', 'wait');
  const observe = workspace.newBlock('xiyou_observe_furnace_door', 'observe');
  const leap = workspace.newBlock('xiyou_leap_out_of_furnace', 'leap');
  const kick = workspace.newBlock('xiyou_kick_over_furnace', 'kick');
  enter.nextConnection!.connect(shelter.previousConnection!);
  shelter.nextConnection!.connect(loop.previousConnection!);
  loop.getInput('CONDITION')!.connection!.connect(condition.outputConnection!);
  loop.getInput('CHILDREN')!.connection!.connect(wait.previousConnection!);
  wait.nextConnection!.connect(observe.previousConnection!);
  loop.nextConnection!.connect(leap.previousConnection!);
  leap.nextConnection!.connect(kick.previousConnection!);
  return { workspace, loop, condition };
}

describe('week two furnace Blockly compiler', () => {
  it('reads the actual connected condition socket and loop body', () => {
    const { workspace } = connectedWorkspace('xiyou_condition_furnace_open');

    expect(compileFurnaceConditionWorkspace(workspace)).toMatchObject({
      ok: true,
      trace: expect.arrayContaining([
        expect.objectContaining({ opcode: 'condition_checked', condition: 'furnace-open', conditionSourceBlockId: 'condition' }),
      ]),
    });
  });

  it('rejects a visible loop with no connected condition sensor', () => {
    const { workspace, loop, condition } = connectedWorkspace();
    condition.outputConnection!.disconnect();

    expect(compileFurnaceConditionWorkspace(workspace)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'missing-condition', sourceBlockId: loop.id })] });
  });
});
