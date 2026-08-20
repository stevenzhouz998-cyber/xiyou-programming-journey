import { describe, expect, it } from 'vitest';
import {
  ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS,
  advancedWeekOneMissionIds,
  isAdvancedWeekOneBlockType,
  isAdvancedWeekOneOpcode,
} from './advancedWeekOneContract';

describe('advanced week one neutral contract', () => {
  it('defines two distinct formal missions with unique visible block and opcode domains', () => {
    expect(advancedWeekOneMissionIds).toEqual(['w1-m4', 'w1-m5']);
    const entries = Object.entries(ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS);
    expect(entries.every(([, value]) => value.missionId === 'w1-m4' || value.missionId === 'w1-m5')).toBe(true);
    expect(new Set(entries.map(([, value]) => value.opcode)).size).toBe(entries.length);
    expect(isAdvancedWeekOneBlockType('xiyou_underworld_open_register')).toBe(true);
    expect(isAdvancedWeekOneOpcode('boss_verify_causal_chain')).toBe(true);
  });

  it('keeps the two container scopes distinct so a boss program cannot reuse an underworld child', () => {
    expect(ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS.xiyou_underworld_read_index.scope).toBe('underworld-lookup');
    expect(ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS.xiyou_boss_compare_weights.scope).toBe('boss-dragon');
    expect(ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS.xiyou_boss_open_register.scope).toBe('boss-register');
  });
});
