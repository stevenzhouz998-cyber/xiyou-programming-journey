import * as Blockly from 'blockly';
import { describe, expect, it } from 'vitest';
import { compileWeekFourMappingDraft, compileWeekFourMappingWorkspace, createDefaultWeekFourMappingDraft, restoreWeekFourMappingWorkspace } from './weekFourMappingCompiler';

describe('W4-M1 Blockly reference compiler', () => {
  it('serializes and compiles the visible identity condition with stable sources', () => {
    const workspace = new Blockly.Workspace();
    restoreWeekFourMappingWorkspace(workspace, createDefaultWeekFourMappingDraft());
    expect(compileWeekFourMappingWorkspace(workspace)).toEqual(compileWeekFourMappingDraft(createDefaultWeekFourMappingDraft()));
    expect(compileWeekFourMappingWorkspace(workspace).trace.every((item) => item.source.kind === 'blockly')).toBe(true);
  });

  it.each(['empty', 'multiple-roots', 'missing-condition', 'missing-then', 'missing-else', 'unknown-block', 'non-reciprocal', 'wrong-parent', 'cycle'])('%s cannot compile', (fixture) => {
    const draft = createDefaultWeekFourMappingDraft();
    if (fixture === 'empty') draft.blocks = [];
    if (fixture === 'multiple-roots') draft.blocks.push(structuredClone(draft.blocks[0]!));
    if (fixture === 'missing-condition') draft.blocks.find((block) => block.id === 'mapping-if')!.conditionId = null;
    if (fixture === 'missing-then') draft.blocks.find((block) => block.id === 'mapping-if')!.thenFirstId = null;
    if (fixture === 'missing-else') draft.blocks.find((block) => block.id === 'mapping-if')!.elseFirstId = null;
    if (fixture === 'unknown-block') draft.blocks[0]!.type = 'forged';
    if (fixture === 'non-reciprocal') draft.blocks.find((block) => block.id === 'mapping-if')!.previousId = null;
    if (fixture === 'wrong-parent') draft.blocks.find((block) => block.id === 'mapping-condition')!.parentBlockId = 'mapping-root';
    if (fixture === 'cycle') draft.blocks.find((block) => block.id === 'mapping-else')!.nextId = 'mapping-if';
    expect(() => compileWeekFourMappingDraft(draft)).toThrow();
  });

  it('rejects unknown fields in a serialized Blockly block', () => {
    const draft = createDefaultWeekFourMappingDraft();
    Object.assign(draft.blocks[0]!, { forged: true });
    expect(() => compileWeekFourMappingDraft(draft)).toThrow(/字段|积木/);
  });
});
