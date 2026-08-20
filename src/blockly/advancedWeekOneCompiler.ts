import type { Block, Workspace } from 'blockly/core';
import {
  ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS,
  ADVANCED_WEEK_ONE_WORKSPACE_LIMITS,
  isAdvancedWeekOneBlockType,
  type AdvancedWeekOneInstruction,
  type AdvancedWeekOneMissionId,
  type AdvancedWeekOneScope,
} from './advancedWeekOneContract';

export type AdvancedWeekOneCompileDiagnosticCode = 'unknown-block' | 'wrong-mission-block' | 'multiple-main-chain' | 'empty-workspace' | 'invalid-connection' | 'invalid-nesting' | 'orphan-child' | 'workspace-boundary';
export type AdvancedWeekOneCompileResult = { ok: true; trace: AdvancedWeekOneInstruction[] } | { ok: false; trace: []; diagnostics: Array<{ code: AdvancedWeekOneCompileDiagnosticCode; sourceBlockId: string | null; concept: 'program-structure' }> };

const failure = (code: AdvancedWeekOneCompileDiagnosticCode, sourceBlockId: string | null): AdvancedWeekOneCompileResult => ({ ok: false, trace: [], diagnostics: [{ code, sourceBlockId, concept: 'program-structure' }] });
const byId = (left: Block, right: Block) => left.id.localeCompare(right.id);

function boundaryFailure(blocks: Block[]): AdvancedWeekOneCompileResult | null {
  if (blocks.length > ADVANCED_WEEK_ONE_WORKSPACE_LIMITS.maxWorkspaceBlocks) return failure('workspace-boundary', blocks[ADVANCED_WEEK_ONE_WORKSPACE_LIMITS.maxWorkspaceBlocks]?.id ?? null);
  const invalid = blocks.find((block) => block.id.length > ADVANCED_WEEK_ONE_WORKSPACE_LIMITS.maxBlockOrSourceIdLength);
  return invalid ? failure('workspace-boundary', invalid.id) : null;
}

function expectedScope(parent: Block | null): AdvancedWeekOneScope {
  if (parent === null) return 'top';
  const definition = isAdvancedWeekOneBlockType(parent.type) ? ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS[parent.type] : null;
  return definition && 'childScope' in definition ? definition.childScope : 'top';
}

export function compileAdvancedWeekOneWorkspace(missionId: AdvancedWeekOneMissionId, workspace: Workspace): AdvancedWeekOneCompileResult {
  const blocks = workspace.getAllBlocks(false).sort(byId);
  if (blocks.length === 0) return failure('empty-workspace', null);
  const bounded = boundaryFailure(blocks);
  if (bounded) return bounded;
  const unknown = blocks.find((block) => !isAdvancedWeekOneBlockType(block.type));
  if (unknown) return failure('unknown-block', unknown.id);
  const foreign = blocks.find((block) => ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS[block.type as keyof typeof ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS].missionId !== missionId);
  if (foreign) return failure('invalid-nesting', foreign.id);
  const topBlocks = workspace.getTopBlocks(false).sort(byId);
  if (topBlocks.length !== 1) return failure(topBlocks.length > 1 ? 'multiple-main-chain' : 'invalid-connection', topBlocks[0]?.id ?? blocks[0]?.id ?? null);

  const trace: AdvancedWeekOneInstruction[] = [];
  const visited = new Set<string>();
  const visitChain = (first: Block | null, parent: Block | null): AdvancedWeekOneCompileResult | null => {
    let current = first;
    while (current !== null) {
      if (visited.has(current.id)) return failure('invalid-connection', current.id);
      if (!isAdvancedWeekOneBlockType(current.type)) return failure('unknown-block', current.id);
      const definition = ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS[current.type];
      if (definition.missionId !== missionId) return failure('wrong-mission-block', current.id);
      const scope = expectedScope(parent);
      if (definition.scope !== scope) return failure(parent === null ? 'orphan-child' : 'invalid-nesting', current.id);
      visited.add(current.id);
      trace.push({ instructionId: `instruction:${current.id}`, sourceBlockId: current.id, parentBlockId: parent?.id ?? null, opcode: definition.opcode });
      if ('childScope' in definition) {
        const child = current.getInputTargetBlock('CHILDREN');
        if (child === null) return failure('invalid-nesting', current.id);
        const nested = visitChain(child, current);
        if (nested) return nested;
      }
      current = current.getNextBlock();
    }
    return null;
  };
  const issue = visitChain(topBlocks[0], null);
  if (issue) return issue;
  const unreachable = blocks.find((block) => !visited.has(block.id));
  return unreachable ? failure('orphan-child', unreachable.id) : { ok: true, trace };
}
