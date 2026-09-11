import { describe, expect, it } from 'vitest';
import { getFormalMission } from './formalCourse';

describe('W5-M2 formal registration', () => {
  it('registers a real Python function mission without output equality', () => {
    const mission = getFormalMission('w5-m2');
    expect(mission?.mode).toBe('python');
    expect(mission).not.toHaveProperty('expectedOutput');
  });
});
