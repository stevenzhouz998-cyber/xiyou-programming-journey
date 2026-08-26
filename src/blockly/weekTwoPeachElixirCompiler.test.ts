import * as Blockly from 'blockly';
import { describe, expect, it } from 'vitest';

async function modules() {
  const blocksPath = './weekTwoPeachElixirBlocks';
  const compilerPath = './weekTwoPeachElixirCompiler';
  const [blocks, compiler] = await Promise.all([
    import(/* @vite-ignore */ blocksPath).catch(() => null),
    import(/* @vite-ignore */ compilerPath).catch(() => null),
  ]);
  return { blocks, compiler };
}

const TYPES = [
  'xiyou_guard_peach_garden',
  'xiyou_learn_peach_banquet',
  'xiyou_drink_at_banquet',
  'xiyou_stumble_into_tusita',
  'xiyou_eat_golden_elixir',
] as const;

function connect(workspace: Blockly.Workspace, order: readonly number[]) {
  const blocks = TYPES.map((type, index) => workspace.newBlock(type, `visible-${index}`));
  for (let index = 0; index < order.length - 1; index += 1) {
    blocks[order[index]].nextConnection!.connect(blocks[order[index + 1]].previousConnection!);
  }
  return blocks;
}

describe('w2-m3 real Blockly sequence compiler', () => {
  it('compiles the real visible wrong-order main chain with reciprocal provenance', async () => {
    const { blocks, compiler } = await modules();
    expect(blocks).not.toBeNull();
    expect(compiler).not.toBeNull();
    const workspace = new Blockly.Workspace();
    try {
      blocks!.registerPeachElixirBlocks();
      connect(workspace, [0, 1, 2, 4, 3]);
      expect(compiler!.compilePeachElixirWorkspace(workspace)).toMatchObject({
        ok: true,
        draft: { missionId: 'w2-m3' },
        trace: [
          { sourceBlockId: 'visible-0', previousBlockId: null, nextBlockId: 'visible-1', opcode: 'guard_peach_garden' },
          { sourceBlockId: 'visible-1', previousBlockId: 'visible-0', nextBlockId: 'visible-2', opcode: 'learn_peach_banquet' },
          { sourceBlockId: 'visible-2', previousBlockId: 'visible-1', nextBlockId: 'visible-4', opcode: 'drink_at_banquet' },
          { sourceBlockId: 'visible-4', previousBlockId: 'visible-2', nextBlockId: 'visible-3', opcode: 'eat_golden_elixir' },
          { sourceBlockId: 'visible-3', previousBlockId: 'visible-4', nextBlockId: null, opcode: 'stumble_into_tusita' },
        ],
      });
    } finally {
      workspace.dispose();
    }
  });

  it('changes canonical trace when the child reconnects the two visible problem blocks', async () => {
    const { blocks, compiler } = await modules();
    const workspace = new Blockly.Workspace();
    try {
      blocks!.registerPeachElixirBlocks();
      connect(workspace, [0, 1, 2, 3, 4]);
      const result = compiler!.compilePeachElixirWorkspace(workspace);
      expect(result.ok && result.trace.map((item: { opcode: string }) => item.opcode)).toEqual([
        'guard_peach_garden', 'learn_peach_banquet', 'drink_at_banquet', 'stumble_into_tusita', 'eat_golden_elixir',
      ]);
    } finally {
      workspace.dispose();
    }
  });

  it('returns the disconnected real block instead of compiling multiple roots', async () => {
    const { blocks, compiler } = await modules();
    const workspace = new Blockly.Workspace();
    try {
      blocks!.registerPeachElixirBlocks();
      const visible = connect(workspace, [0, 1, 2]);
      visible[3].nextConnection!.connect(visible[4].previousConnection!);
      expect(compiler!.compilePeachElixirWorkspace(workspace)).toMatchObject({
        ok: false,
        trace: [],
        diagnostics: [{ code: 'multiple-main-chain', sourceBlockId: expect.any(String), concept: 'program-structure' }],
      });
    } finally {
      workspace.dispose();
    }
  });

  it('rejects a missing and duplicate action with the actual visible source block', async () => {
    const { blocks, compiler } = await modules();
    const missingWorkspace = new Blockly.Workspace();
    const duplicateWorkspace = new Blockly.Workspace();
    try {
      blocks!.registerPeachElixirBlocks();
      const missing = connect(missingWorkspace, [0, 1, 2, 3]);
      missing[4].dispose(false);
      expect(compiler!.compilePeachElixirWorkspace(missingWorkspace)).toMatchObject({ ok: false, diagnostics: [{ code: 'missing-action', sourceBlockId: expect.any(String) }] });

      const chain = connect(duplicateWorkspace, [0, 1, 2, 3, 4]);
      const duplicate = duplicateWorkspace.newBlock('xiyou_eat_golden_elixir', 'duplicate-elixir');
      chain[4].nextConnection!.connect(duplicate.previousConnection!);
      expect(compiler!.compilePeachElixirWorkspace(duplicateWorkspace)).toMatchObject({ ok: false, diagnostics: [{ code: 'duplicate-action', sourceBlockId: 'duplicate-elixir' }] });
    } finally {
      missingWorkspace.dispose();
      duplicateWorkspace.dispose();
    }
  });

  it('fails closed for unknown blocks without attempting a partial run', async () => {
    const { compiler } = await modules();
    const workspace = new Blockly.Workspace();
    Blockly.Blocks.xiyou_unknown_peach = { init(this: Blockly.Block) { this.appendDummyInput().appendField('unknown'); this.setPreviousStatement(true); this.setNextStatement(true); } };
    try {
      const unknown = workspace.newBlock('xiyou_unknown_peach', 'unknown-visible');
      expect(unknown.type).toBe('xiyou_unknown_peach');
      expect(compiler!.compilePeachElixirWorkspace(workspace)).toMatchObject({ ok: false, trace: [], diagnostics: [{ code: 'unknown-block', sourceBlockId: 'unknown-visible' }] });
    } finally {
      workspace.dispose();
      delete Blockly.Blocks.xiyou_unknown_peach;
    }
  });
});
