import * as Blockly from 'blockly';
import { afterEach, describe, expect, it } from 'vitest';
import { compileAdvancedWeekOneWorkspace } from './advancedWeekOneCompiler';
import { registerAdvancedWeekOneBlocks } from './advancedWeekOneBlocks';

const workspaces: Blockly.Workspace[] = [];
afterEach(() => { while (workspaces.length) workspaces.pop()?.dispose(); });

function workspace() { registerAdvancedWeekOneBlocks(); const value = new Blockly.Workspace(); workspaces.push(value); return value; }
function connect(parent: Blockly.Block, child: Blockly.Block) { parent.nextConnection?.connect(child.previousConnection!); return child; }
function child(container: Blockly.Block, first: Blockly.Block) { container.getInput('CHILDREN')?.connection?.connect(first.previousConnection!); return first; }

describe('advanced week one compiler', () => {
  it('compiles a real connected underworld graph depth-first with stable parent provenance', () => {
    const ws = workspace();
    const open = ws.newBlock('xiyou_underworld_open_register', 'open');
    const find = connect(open, ws.newBlock('xiyou_underworld_find_monkey_records', 'find'));
    const read = child(find, ws.newBlock('xiyou_underworld_read_index', 'read'));
    connect(read, ws.newBlock('xiyou_underworld_match_monkey_kind', 'match'));
    connect(ws.getBlockById('match')!, ws.newBlock('xiyou_underworld_collect_named_records', 'collect'));
    connect(find, ws.newBlock('xiyou_underworld_handle_names', 'handle'));
    connect(ws.getBlockById('handle')!, ws.newBlock('xiyou_underworld_verify_register', 'verify'));

    expect(compileAdvancedWeekOneWorkspace('w1-m4', ws)).toEqual({ ok: true, trace: [
      { instructionId: 'instruction:open', sourceBlockId: 'open', parentBlockId: null, opcode: 'underworld_open_register' },
      { instructionId: 'instruction:find', sourceBlockId: 'find', parentBlockId: null, opcode: 'underworld_find_monkey_records' },
      { instructionId: 'instruction:read', sourceBlockId: 'read', parentBlockId: 'find', opcode: 'underworld_read_index' },
      { instructionId: 'instruction:match', sourceBlockId: 'match', parentBlockId: 'find', opcode: 'underworld_match_monkey_kind' },
      { instructionId: 'instruction:collect', sourceBlockId: 'collect', parentBlockId: 'find', opcode: 'underworld_collect_named_records' },
      { instructionId: 'instruction:handle', sourceBlockId: 'handle', parentBlockId: null, opcode: 'underworld_handle_names' },
      { instructionId: 'instruction:verify', sourceBlockId: 'verify', parentBlockId: null, opcode: 'underworld_verify_register' },
    ] });
  });

  it('rejects a boss child placed in an underworld container instead of silently flattening it', () => {
    const ws = workspace();
    const open = ws.newBlock('xiyou_underworld_open_register', 'open');
    const find = connect(open, ws.newBlock('xiyou_underworld_find_monkey_records', 'find'));
    child(find, ws.newBlock('xiyou_boss_compare_weights', 'foreign'));
    expect(compileAdvancedWeekOneWorkspace('w1-m4', ws)).toMatchObject({ ok: false, diagnostics: [{ code: 'invalid-nesting', sourceBlockId: 'foreign' }] });
  });
});
