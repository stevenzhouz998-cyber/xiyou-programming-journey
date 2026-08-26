import * as Blockly from 'blockly';
import { describe, expect, it } from 'vitest';

async function loadModules() {
  const blocksPath = './weekTwoMonkeyKingBlocks';
  const compilerPath = './weekTwoMonkeyKingCompiler';
  const [blocks, compiler] = await Promise.all([
    import(/* @vite-ignore */ blocksPath).catch(() => null),
    import(/* @vite-ignore */ compilerPath).catch(() => null),
  ]);
  return { blocks, compiler };
}

describe('w2-m2 real Blockly event compiler', () => {
  it('reads two nested visible handler graphs with event provenance', async () => {
    const { blocks, compiler } = await loadModules();
    expect(blocks).not.toBeNull();
    expect(compiler).not.toBeNull();
    const workspace = new Blockly.Workspace();
    try {
      blocks!.registerMonkeyKingBlocks();
      const returnHat = workspace.newBlock('xiyou_on_return_flower_fruit', 'return-hat');
      const flag = workspace.newBlock('xiyou_raise_great_sage_flag', 'flag');
      const titleHat = workspace.newBlock('xiyou_on_heavenly_title', 'title-hat');
      const accept = workspace.newBlock('xiyou_accept_great_sage_title', 'accept');
      const build = workspace.newBlock('xiyou_build_great_sage_residence', 'build');
      returnHat.getInput('HANDLER')!.connection!.connect(flag.previousConnection!);
      titleHat.getInput('HANDLER')!.connection!.connect(accept.previousConnection!);
      accept.nextConnection!.connect(build.previousConnection!);

      expect(compiler!.compileMonkeyKingWorkspace(workspace)).toMatchObject({
        ok: true,
        draft: { missionId: 'w2-m2' },
        trace: [
          { kind: 'handler', eventType: 'return-to-flower-fruit', sourceBlockId: 'return-hat' },
          { kind: 'action', eventType: 'return-to-flower-fruit', sourceBlockId: 'flag', parentBlockId: 'return-hat' },
          { kind: 'handler', eventType: 'heavenly-title-conferred', sourceBlockId: 'title-hat' },
          { kind: 'action', eventType: 'heavenly-title-conferred', sourceBlockId: 'accept', parentBlockId: 'title-hat' },
          { kind: 'action', eventType: 'heavenly-title-conferred', sourceBlockId: 'build', parentBlockId: 'title-hat' },
        ],
      });
    } finally {
      workspace.dispose();
    }
  });

  it('compiles an action connected to the wrong event so the runner can diagnose routing', async () => {
    const { blocks, compiler } = await loadModules();
    expect(blocks).not.toBeNull();
    expect(compiler).not.toBeNull();
    const workspace = new Blockly.Workspace();
    try {
      blocks!.registerMonkeyKingBlocks();
      const returnHat = workspace.newBlock('xiyou_on_return_flower_fruit', 'return-hat');
      const wrong = workspace.newBlock('xiyou_accept_great_sage_title', 'wrong-action');
      const titleHat = workspace.newBlock('xiyou_on_heavenly_title', 'title-hat');
      const accept = workspace.newBlock('xiyou_accept_great_sage_title', 'accept');
      const build = workspace.newBlock('xiyou_build_great_sage_residence', 'build');
      returnHat.getInput('HANDLER')!.connection!.connect(wrong.previousConnection!);
      titleHat.getInput('HANDLER')!.connection!.connect(accept.previousConnection!);
      accept.nextConnection!.connect(build.previousConnection!);

      const result = compiler!.compileMonkeyKingWorkspace(workspace);
      expect(result).toMatchObject({ ok: true });
      expect(result.ok && result.trace[1]).toMatchObject({ sourceBlockId: 'wrong-action', parentBlockId: 'return-hat', opcode: 'accept_great_sage_title' });
    } finally {
      workspace.dispose();
    }
  });

  it('returns a problem block for a missing event handler without running a partial program', async () => {
    const { blocks, compiler } = await loadModules();
    expect(blocks).not.toBeNull();
    expect(compiler).not.toBeNull();
    const workspace = new Blockly.Workspace();
    try {
      blocks!.registerMonkeyKingBlocks();
      const returnHat = workspace.newBlock('xiyou_on_return_flower_fruit', 'return-hat');
      const flag = workspace.newBlock('xiyou_raise_great_sage_flag', 'flag');
      returnHat.getInput('HANDLER')!.connection!.connect(flag.previousConnection!);

      expect(compiler!.compileMonkeyKingWorkspace(workspace)).toMatchObject({
        ok: false,
        trace: [],
        diagnostics: [{ code: 'missing-handler', sourceBlockId: 'return-hat', concept: 'program-structure' }],
      });
    } finally {
      workspace.dispose();
    }
  });
});
