import { describe, expect, it } from 'vitest';
import { getFormalMission } from './formalCourse';

describe('W5-M2 formal registration', () => {
  it('registers a real Python function mission without output equality', () => {
    const mission = getFormalMission('w5-m2');
    expect(mission?.mode).toBe('python');
    expect(mission).not.toHaveProperty('expectedOutput');
  });
});

describe('W5-M3 formal registration', () => {
  it('registers a real Python parameter mission without output equality', () => {
    const mission = getFormalMission('w5-m3');
    expect(mission?.mode).toBe('python');
    expect(mission).not.toHaveProperty('expectedOutput');
  });
});

describe('W5-M4 formal registration', () => {
  it('registers a real Python decomposition mission without output equality', () => {
    const mission = getFormalMission('w5-m4');
    expect(mission?.mode).toBe('python');
    expect(mission).not.toHaveProperty('expectedOutput');
  });
});

describe('W5-M5 formal registration', () => {
  it('registers a real Python orchestration mission without output equality', () => {
    const mission = getFormalMission('w5-m5');
    expect(mission?.mode).toBe('python');
    expect(mission?.objective).toContain('一次真实 Python 运行');
    expect(mission).not.toHaveProperty('expectedSequence');
    expect(mission).not.toHaveProperty('expectedOutput');
    expect(mission).not.toHaveProperty('starterCode');
  });
});
