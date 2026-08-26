import * as Blockly from 'blockly';
import { describe, expect, it } from 'vitest';
import { registerHorseCareBlocks } from './weekTwoHorseBlocks';
import { compileHorseCareWorkspace } from './weekTwoHorseCompiler';

describe('w2-m1 real Blockly compiler', () => {
  it('reads the connected repeat field and nested body from the visible workspace', () => {
    const workspace = new Blockly.Workspace();
    let compiled: unknown = null;

    try {
      registerHorseCareBlocks();
      const accept = workspace.newBlock('xiyou_accept_stable_post', 'accept');
      const repeat = workspace.newBlock('xiyou_repeat_horse_care', 'repeat');
      const care = workspace.newBlock('xiyou_care_next_horse', 'care');
      const rank = workspace.newBlock('xiyou_learn_stable_rank', 'rank');
      const leave = workspace.newBlock('xiyou_leave_heaven', 'leave');
      repeat.setFieldValue('3', 'TIMES');
      accept.nextConnection!.connect(repeat.previousConnection!);
      repeat.getInput('CHILDREN')!.connection!.connect(care.previousConnection!);
      repeat.nextConnection!.connect(rank.previousConnection!);
      rank.nextConnection!.connect(leave.previousConnection!);
      compiled = (compileHorseCareWorkspace as unknown as (value: Blockly.Workspace) => unknown)(workspace);
    } catch {
      // The RED state is represented as a value assertion, not an uncaught test error.
    } finally {
      workspace.dispose();
    }

    expect(compiled).toMatchObject({
      ok: true,
      draft: { missionId: 'w2-m1' },
      trace: [
        { opcode: 'accept_stable_post' },
        { opcode: 'repeat_horse_care_started', repeatCount: 3 },
        { opcode: 'care_next_horse', iteration: 1 },
        { opcode: 'care_next_horse', iteration: 2 },
        { opcode: 'care_next_horse', iteration: 3 },
        { opcode: 'repeat_horse_care_finished', repeatCount: 3 },
        { opcode: 'learn_stable_rank' },
        { opcode: 'leave_heaven' },
      ],
    });
    expect((compiled as { draft: { blocks: Array<{ id: string; repeatCount: number | null }> } }).draft.blocks
      .find((block) => block.id === 'repeat')).toMatchObject({ repeatCount: 3 });
  });
});
