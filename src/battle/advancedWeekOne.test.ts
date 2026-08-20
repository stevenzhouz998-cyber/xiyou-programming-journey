import { describe, expect, it } from 'vitest';
import { runAdvancedWeekOne } from './advancedWeekOne';
import type { AdvancedWeekOneInstruction } from '../blockly/advancedWeekOneContract';

const underworldTrace = [
  ['open', null, 'underworld_open_register'],
  ['find', null, 'underworld_find_monkey_records'],
  ['index', 'find', 'underworld_read_index'],
  ['match', 'find', 'underworld_match_monkey_kind'],
  ['collect', 'find', 'underworld_collect_named_records'],
  ['handle', null, 'underworld_handle_names'],
  ['verify', null, 'underworld_verify_register'],
] as const;

function trace(items: readonly (readonly [string, string | null, string])[]): AdvancedWeekOneInstruction[] {
  return items.map(([sourceBlockId, parentBlockId, opcode]) => ({ instructionId: `instruction:${sourceBlockId}`, sourceBlockId, parentBlockId, opcode: opcode as AdvancedWeekOneInstruction['opcode'] }));
}

describe('advanced week one deterministic reducers', () => {
  it('runs the visible underworld trace through register states with zero penalty', () => {
    const result = runAdvancedWeekOne('w1-m4', trace(underworldTrace));
    expect(result).toMatchObject({ completed: true, finalState: 'underworld-verified', diagnostic: null, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
  });

  it('stops a premature name handling instruction at a child-readable state without penalty', () => {
    const result = runAdvancedWeekOne('w1-m4', trace([
      ['open', null, 'underworld_open_register'],
      ['handle', null, 'underworld_handle_names'],
    ]));
    expect(result.completed).toBe(false);
    expect(result.diagnostic).toMatchObject({ type: 'instruction-rejected', state: 'underworld-opened' });
    expect(result.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 });
  });

  it('requires each independent boss checkpoint before causal verification', () => {
    const result = runAdvancedWeekOne('w1-m5', trace([
      ['plan', null, 'boss_plan_third_chapter'],
      ['verify', null, 'boss_verify_causal_chain'],
    ]));
    expect(result.completed).toBe(false);
    expect(result.diagnostic).toMatchObject({ type: 'instruction-rejected', state: 'boss-planned' });
    expect(result.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 });
  });
});
