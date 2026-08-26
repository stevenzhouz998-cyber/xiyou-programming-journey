import * as Blockly from 'blockly';
import { afterEach, describe, expect, it } from 'vitest';
import { registerHeavenlySignalBossBlocks } from './weekTwoHeavenlySignalBossBlocks';
import { compileHeavenlySignalBossWorkspace } from './weekTwoHeavenlySignalBossCompiler';

const workspaces: Blockly.Workspace[] = [];
afterEach(() => workspaces.splice(0).forEach((workspace) => workspace.dispose()));

function block(workspace: Blockly.Workspace, type: string, id: string) { return workspace.newBlock(type, id); }
function append(first: Blockly.Block, second: Blockly.Block) { first.nextConnection!.connect(second.previousConnection!); }
function handler(workspace: Blockly.Workspace, type: string, id: string, first: Blockly.Block) {
  const hat = block(workspace, type, id); hat.getInput('HANDLER')!.connection!.connect(first.previousConnection!); return hat;
}
function correctWorkspace() {
  registerHeavenlySignalBossBlocks(); const workspace = new Blockly.Workspace(); workspaces.push(workspace);
  const accept = block(workspace, 'xiyou_boss_accept_stable_post', 'accept-post'); const repeat = block(workspace, 'xiyou_boss_repeat_horse_care', 'stable-repeat'); repeat.setFieldValue('3', 'TIMES'); const care = block(workspace, 'xiyou_boss_care_next_horse', 'care-horse'); const rank = block(workspace, 'xiyou_boss_learn_stable_rank', 'learn-rank'); const leave = block(workspace, 'xiyou_boss_leave_heaven', 'leave-heaven'); append(accept, repeat); append(repeat, rank); append(rank, leave); repeat.getInput('CHILDREN')!.connection!.connect(care.previousConnection!); handler(workspace, 'xiyou_boss_on_stable_duty', 'stable-handler', accept);
  handler(workspace, 'xiyou_boss_on_returned_flower_fruit', 'return-handler', block(workspace, 'xiyou_boss_raise_great_sage_flag', 'raise-flag'));
  const title = block(workspace, 'xiyou_boss_accept_great_sage_title', 'accept-title'); const residence = block(workspace, 'xiyou_boss_build_great_sage_residence', 'build-residence'); append(title, residence); handler(workspace, 'xiyou_boss_on_heavenly_title', 'title-handler', title);
  const garden = block(workspace, 'xiyou_boss_guard_peach_garden', 'guard-garden'); const learn = block(workspace, 'xiyou_boss_learn_peach_banquet', 'learn-banquet'); const drink = block(workspace, 'xiyou_boss_drink_at_banquet', 'drink-banquet'); const stumble = block(workspace, 'xiyou_boss_stumble_into_tusita', 'stumble-tusita'); const elixir = block(workspace, 'xiyou_boss_eat_golden_elixir', 'eat-elixir'); append(garden, learn); append(learn, drink); append(drink, stumble); append(stumble, elixir); handler(workspace, 'xiyou_boss_on_peach_message', 'peach-handler', garden);
  const enter = block(workspace, 'xiyou_boss_enter_furnace', 'enter-furnace'); const shelter = block(workspace, 'xiyou_boss_shelter_xun', 'shelter-xun'); const loop = block(workspace, 'xiyou_boss_repeat_until_furnace_ready', 'furnace-loop'); const open = block(workspace, 'xiyou_boss_condition_furnace_open', 'furnace-open-signal'); const wait = block(workspace, 'xiyou_boss_wait_seven_days', 'wait-seven-days'); const observe = block(workspace, 'xiyou_boss_observe_furnace', 'observe-furnace'); const escape = block(workspace, 'xiyou_boss_escape_furnace', 'escape-furnace'); const topple = block(workspace, 'xiyou_boss_topple_furnace', 'topple-furnace'); append(enter, shelter); append(shelter, loop); append(loop, escape); append(escape, topple); loop.getInput('CONDITION')!.connection!.connect(open.outputConnection!); loop.getInput('CHILDREN')!.connection!.connect(wait.previousConnection!); append(wait, observe); handler(workspace, 'xiyou_boss_on_furnace_refining', 'furnace-handler', enter);
  return { workspace, loop, open, elixir, stumble };
}

describe('W2-M5 real Blockly compiler', () => {
  it('uses actual event, statement, loop-body, and condition connections for the canonical trace', () => {
    const { workspace } = correctWorkspace();
    const result = compileHeavenlySignalBossWorkspace(workspace);
    expect(result).toMatchObject({ ok: true, trace: expect.arrayContaining([
      expect.objectContaining({ kind: 'event-dispatch', eventType: 'stable-duty' }),
      expect.objectContaining({ kind: 'action', sourceBlockId: 'care-horse', iteration: 3 }),
      expect.objectContaining({ kind: 'condition-checked', conditionSourceBlockId: 'furnace-open-signal', elapsedDays: 49 }),
    ]) });
  });

  it('returns a real missing-handler diagnostic for a partial event graph', () => {
    registerHeavenlySignalBossBlocks(); const workspace = new Blockly.Workspace(); workspaces.push(workspace);
    const stable = block(workspace, 'xiyou_boss_on_stable_duty', 'stable-handler'); const repeat = block(workspace, 'xiyou_boss_repeat_horse_care', 'stable-repeat'); repeat.setFieldValue('3', 'TIMES'); stable.getInput('HANDLER')!.connection!.connect(repeat.previousConnection!);
    expect(compileHeavenlySignalBossWorkspace(workspace)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'missing-handler' })] });
  });

  it('detects a removed real condition connection and coordinate-independent changes', () => {
    const { workspace, loop, open } = correctWorkspace();
    open.outputConnection!.disconnect();
    expect(compileHeavenlySignalBossWorkspace(workspace)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'missing-condition', sourceBlockId: loop.id })] });
    loop.getInput('CONDITION')!.connection!.connect(open.outputConnection!);
    workspace.getBlockById('peach-handler')!.moveBy(320, 240);
    workspace.getBlockById('furnace-handler')!.moveBy(-160, 120);
    const result = compileHeavenlySignalBossWorkspace(workspace);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.trace.filter((item) => item.kind === 'action' && item.eventType === 'peach-message').map((item) => item.sourceBlockId)).toEqual(['guard-garden', 'learn-banquet', 'drink-banquet', 'stumble-tusita', 'eat-elixir']);
  });
});
