import { createDefaultWeekThreeBossDraft } from './weekThreeBossContract';

/** Test-only fixture: every repair follows the same visible connection/field operation as Blockly. */
export function createSolvedWeekThreeBossDraftForTest() {
  const draft = createDefaultWeekThreeBossDraft();
  const block = (id: string) => draft.blocks.find((item) => item.id === id)!;
  const replaceCondition = (parentId: string, childId: string, type: 'w3_boss_condition_explicit_demon_help' | 'w3_boss_condition_identity_is_cuilan') => {
    const parent = block(parentId); const previous = parent.inputs.CONDITION!;
    const index = draft.blocks.findIndex((item) => item.id === previous);
    const old = draft.blocks[index]!;
    draft.blocks.splice(index, 1, { ...old, id: childId, type, fields: {}, parentBlockId: parentId, parentInputName: 'CONDITION' });
    parent.inputs.CONDITION = childId;
  };
  replaceCondition('manor-if', 'candidate-manor-explicit', 'w3_boss_condition_explicit_demon_help');
  replaceCondition('cuilan-identity-if', 'candidate-cuilan-identity', 'w3_boss_condition_identity_is_cuilan');
  const yunzhan = block('yunzhan-if');
  yunzhan.inputs.THEN = 'yunzhan-else-action';
  yunzhan.inputs.ELSE = 'yunzhan-then-action';
  block('yunzhan-else-action').parentBlockId = 'yunzhan-if';
  block('yunzhan-else-action').parentInputName = 'THEN';
  block('yunzhan-then-action').parentBlockId = 'yunzhan-if';
  block('yunzhan-then-action').parentInputName = 'ELSE';
  draft.blocks.find((block) => block.id === 'joining-combine')!.fields.OPERATOR = 'and';
  return draft;
}
