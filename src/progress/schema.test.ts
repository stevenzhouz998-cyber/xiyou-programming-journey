import { describe, expect, it } from 'vitest';
import { runDragonPalaceBattle } from '../battle/dragonPalace';
import { createInitialProgress } from './progress';
import { migrateProgress, parseProgress, PROGRESS_SCHEMA_LIMITS } from './schema';
import type { MissionSession, ProgressV3 } from './types';

const NOW = '2026-07-12T00:00:00.000Z';
const {
  maxRawJsonBytes: MAX_RAW_JSON_BYTES,
  maxWorkspaceBlocks: MAX_WORKSPACE_BLOCKS,
  maxTraceInstructions: MAX_TRACE_INSTRUCTIONS,
  maxBattleEvents: MAX_BATTLE_EVENTS,
  maxBlockOrSourceIdLength: MAX_BLOCK_OR_SOURCE_ID_LENGTH,
  maxInstructionIdLength: MAX_INSTRUCTION_ID_LENGTH,
} = PROGRESS_SCHEMA_LIMITS;

const validMission = {
  status: 'completed' as const,
  stars: 2 as const,
  attempts: 1,
  hintsUsed: 0,
  completedAt: NOW,
};

const validV1 = {
  version: 1 as const,
  learnerName: '小行者',
  missions: { 'w1-m1': validMission },
  settings: { muted: true, reducedMotion: true, parentPin: '2580' },
  savedAt: NOW,
};

const validV2 = {
  ...validV1,
  version: 2 as const,
  schemaRevision: 1 as const,
  settings: { ...validV1.settings, reducedMotionOverride: true },
  privacy: { localDataNoticeSeen: true },
  recovery: { lastRecoveredAt: NOW, source: 'snapshot' as const },
};

const trace = [
  { instructionId: 'instruction:block-a', sourceBlockId: 'block-a', opcode: 'enter_palace' as const },
  { instructionId: 'instruction:block-b', sourceBlockId: 'block-b', opcode: 'request_weapon' as const },
  { instructionId: 'instruction:block-c', sourceBlockId: 'block-c', opcode: 'test_weapon' as const },
];

const validSession = (): MissionSession => ({
  workspace: {
    version: 1 as const,
    blocks: [
      { id: 'draft-a', type: 'xiyou_enter_palace' as const, nextId: 'draft-b', x: 10.5, y: -20.25 },
      { id: 'draft-b', type: 'xiyou_request_weapon' as const, nextId: null, x: Number.MAX_SAFE_INTEGER, y: 0 },
    ],
  },
  lastTrace: structuredClone(trace),
  lastRun: runDragonPalaceBattle(trace),
  totalRuns: 3,
  runtimeFailures: 1,
  compileFailures: 2,
  usedHintTiers: ['observe', 'partial'] as Array<'observe' | 'think' | 'partial'>,
  conceptFailures: { programStructure: 2, sequencePrecondition: 1, completeness: 0 },
  lastRunAt: NOW,
  savedAt: NOW,
});

const validV3 = (): ProgressV3 => ({
  ...validV2,
  version: 3 as const,
  sessions: { 'w1-m1': validSession() },
});

describe('progress schema', () => {
  it('round-trips a fresh V3 document through JSON parsing', () => {
    const progress = createInitialProgress();
    expect(progress).toMatchObject({ version: 3, schemaRevision: 1, sessions: {} });
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
  });

  it('migrates V1 to V3 without losing legacy mission or settings data', () => {
    expect(migrateProgress(validV1)).toEqual({
      ...validV1,
      version: 3,
      schemaRevision: 1,
      settings: { ...validV1.settings, reducedMotionOverride: false },
      privacy: { localDataNoticeSeen: false },
      recovery: { lastRecoveredAt: null, source: null },
      sessions: {},
    });
  });

  it('migrates V2 to V3 without losing V2 fields', () => {
    expect(migrateProgress(validV2)).toEqual({ ...validV2, version: 3, sessions: {} });
  });

  it('strictly parses valid completed, incomplete, and rejected session runs', () => {
    const completed = validV3();
    const incompleteTrace = trace.slice(0, 1);
    const incomplete = validV3();
    incomplete.sessions['w1-m1'].lastTrace = incompleteTrace;
    incomplete.sessions['w1-m1'].lastRun = runDragonPalaceBattle(incompleteTrace);
    const rejectedTrace = [trace[1]];
    const rejected = validV3();
    rejected.sessions['w1-m1'].lastTrace = rejectedTrace;
    rejected.sessions['w1-m1'].lastRun = runDragonPalaceBattle(rejectedTrace);

    expect(migrateProgress(completed)).toEqual(completed);
    expect(migrateProgress(incomplete)).toEqual(incomplete);
    expect(migrateProgress(rejected)).toEqual(rejected);
  });

  it('allows an empty or disconnected draft and keeps historical trace independent of current blocks', () => {
    const value = validV3();
    value.sessions['w1-m1'].workspace.blocks = [
      { id: 'current-a', type: 'xiyou_enter_palace', nextId: null, x: 0, y: 0 },
      { id: 'current-b', type: 'xiyou_test_weapon', nextId: null, x: 1, y: 1 },
    ];
    expect(() => migrateProgress(value)).not.toThrow();

    value.sessions['w1-m1'].workspace.blocks = [];
    expect(() => migrateProgress(value)).not.toThrow();
  });

  it('returns a new deeply isolated V3 tree', () => {
    const input = validV3();
    const result = migrateProgress(input);

    expect(result).not.toBe(input);
    expect(result.sessions).not.toBe(input.sessions);
    expect(result.sessions['w1-m1']).not.toBe(input.sessions['w1-m1']);
    expect(result.sessions['w1-m1'].workspace.blocks).not.toBe(input.sessions['w1-m1'].workspace.blocks);
    expect(result.sessions['w1-m1'].lastTrace).not.toBe(input.sessions['w1-m1'].lastTrace);
    expect(result.sessions['w1-m1'].lastRun).not.toBe(input.sessions['w1-m1'].lastRun);

    input.sessions['w1-m1'].workspace.blocks[0].id = 'mutated';
    input.sessions['w1-m1'].lastTrace[0].opcode = 'test_weapon';
    input.sessions['w1-m1'].lastRun!.events[0].messageCode = 'mutated';
    expect(result.sessions['w1-m1'].workspace.blocks[0].id).toBe('draft-a');
    expect(result.sessions['w1-m1'].lastTrace[0].opcode).toBe('enter_palace');
    expect(result.sessions['w1-m1'].lastRun!.events[0].messageCode).toBe('dragon-palace.run-started');
  });

  it('rejects unsupported versions and malformed JSON with stable messages', () => {
    expect(() => parseProgress('{broken')).toThrow('进度文件无法读取');
    expect(() => migrateProgress({ version: 999 })).toThrow('进度版本不受支持');
  });

  it.each([
    ['unknown mission', { ...validV1, missions: { unknown: validMission } }],
    ['stars below range', { ...validV1, missions: { 'w1-m1': { ...validMission, stars: 0 } } }],
    ['stars above range', { ...validV1, missions: { 'w1-m1': { ...validMission, stars: 4 } } }],
    ['fractional attempts', { ...validV1, missions: { 'w1-m1': { ...validMission, attempts: 1.5 } } }],
    ['negative attempts', { ...validV1, missions: { 'w1-m1': { ...validMission, attempts: -1 } } }],
    ['infinite attempts', { ...validV1, missions: { 'w1-m1': { ...validMission, attempts: Infinity } } }],
    ['fractional hints', { ...validV1, missions: { 'w1-m1': { ...validMission, hintsUsed: 0.5 } } }],
    ['negative hints', { ...validV1, missions: { 'w1-m1': { ...validMission, hintsUsed: -1 } } }],
    ['infinite hints', { ...validV1, missions: { 'w1-m1': { ...validMission, hintsUsed: Infinity } } }],
    ['invalid completion date', { ...validV1, missions: { 'w1-m1': { ...validMission, completedAt: 'not-a-date' } } }],
    ['invalid saved date', { ...validV1, savedAt: 'not-a-date' }],
    ['short PIN', { ...validV1, settings: { ...validV1.settings, parentPin: '123' } }],
    ['non-numeric PIN', { ...validV1, settings: { ...validV1.settings, parentPin: '12ab' } }],
    ['missing field', { ...validV1, learnerName: undefined }],
    ['wrong field type', { ...validV1, settings: { ...validV1.settings, muted: 'no' } }],
  ])('keeps rejecting invalid legacy V1 data: %s', (_label, value) => {
    expect(() => migrateProgress(value)).toThrow(/进度文件/);
  });

  it.each([
    ['completedAt rollover', { ...validV1, missions: { 'w1-m1': { ...validMission, completedAt: '2026-02-30T00:00:00.000Z' } } }],
    ['completedAt numeric text', { ...validV1, missions: { 'w1-m1': { ...validMission, completedAt: '1' } } }],
    ['savedAt offset', { ...validV1, savedAt: '2026-07-12T08:00:00.000+08:00' }],
    ['savedAt without milliseconds', { ...validV1, savedAt: '2026-07-12T00:00:00Z' }],
    ['recovery date rollover', {
      ...validV2,
      recovery: { lastRecoveredAt: '2026-02-30T00:00:00.000Z', source: 'snapshot' },
    }],
    ['recovery date offset', {
      ...validV2,
      recovery: { lastRecoveredAt: '2026-07-12T08:00:00.000+08:00', source: 'snapshot' },
    }],
  ])('keeps rejecting non-canonical legacy ISO UTC dates: %s', (_label, value) => {
    expect(() => migrateProgress(value)).toThrow(/必须是有效ISO UTC日期/);
  });

  it.each([
    ['missing schemaRevision', { ...validV2, schemaRevision: undefined }],
    ['unsupported schemaRevision', { ...validV2, schemaRevision: 2 }],
    ['invalid privacy flag', { ...validV2, privacy: { localDataNoticeSeen: 'yes' } }],
    ['invalid recovery source', { ...validV2, recovery: { lastRecoveredAt: null, source: 'cloud' } }],
    ['invalid recovery date type', { ...validV2, recovery: { lastRecoveredAt: 123, source: 'snapshot' } }],
    ['invalid recovery date format', { ...validV2, recovery: { lastRecoveredAt: '2026-07-12', source: 'snapshot' } }],
    ['missing reduced motion override', {
      ...validV2,
      settings: { muted: false, reducedMotion: false, parentPin: '2580' },
    }],
    ['unknown privacy field', { ...validV2, privacy: { localDataNoticeSeen: false, tracking: false } }],
    ['unknown recovery field', { ...validV2, recovery: { lastRecoveredAt: null, source: null, backup: false } }],
    ['unknown settings field', { ...validV2, settings: { ...validV2.settings, theme: 'dark' } }],
    ['unknown top-level field', { ...validV2, unexpected: true }],
  ])('keeps rejecting invalid V2: %s', (_label, value) => {
    expect(() => migrateProgress(value)).toThrow(/进度文件格式无效/);
  });

  it('returns a fresh V3 tree isolated from mutable legacy V1 input', () => {
    const input = {
      version: 1,
      learnerName: '小行者',
      missions: { 'w1-m1': { ...validMission } },
      settings: { muted: true, reducedMotion: true, parentPin: '2580' },
      savedAt: NOW,
    };
    const result = migrateProgress(input);

    expect(result.missions).not.toBe(input.missions);
    expect(result.missions['w1-m1']).not.toBe(input.missions['w1-m1']);
    expect(result.settings).not.toBe(input.settings);
    input.learnerName = '已更改';
    input.settings.muted = false;
    Object.assign(input.missions['w1-m1'], { stars: 1 });
    expect(result.learnerName).toBe('小行者');
    expect(result.settings.muted).toBe(true);
    expect(result.missions['w1-m1'].stars).toBe(2);
  });

  it.each([
    ['top level', () => ({ ...validV3(), unexpected: true })],
    ['session', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'], { unexpected: true });
      return value;
    }],
    ['workspace', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].workspace, { unexpected: true });
      return value;
    }],
    ['workspace block', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].workspace.blocks[0], { unexpected: true });
      return value;
    }],
    ['trace instruction', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].lastTrace[0], { unexpected: true });
      return value;
    }],
    ['run result', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].lastRun!, { unexpected: true });
      return value;
    }],
    ['run event', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].lastRun!.events[0], { unexpected: true });
      return value;
    }],
    ['penalty', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].lastRun!.penalty, { unexpected: true });
      return value;
    }],
    ['concept failures', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].conceptFailures, { unexpected: true });
      return value;
    }],
  ])('rejects unknown fields at %s', (_label, makeValue) => {
    expect(() => migrateProgress(makeValue())).toThrow(/未知字段/);
  });

  it('rejects missing fields at every strict V3 layer', () => {
    const cases: unknown[] = [];
    const missingSession = validV3();
    delete (missingSession.sessions['w1-m1'] as Partial<typeof missingSession.sessions['w1-m1']>).savedAt;
    cases.push(missingSession);
    const missingBlock = validV3();
    delete (missingBlock.sessions['w1-m1'].workspace.blocks[0] as Partial<typeof missingBlock.sessions['w1-m1']['workspace']['blocks'][number]>).x;
    cases.push(missingBlock);
    const missingEvent = validV3();
    delete (missingEvent.sessions['w1-m1'].lastRun!.events[0] as { messageCode?: string }).messageCode;
    cases.push(missingEvent);
    for (const value of cases) expect(() => migrateProgress(value)).toThrow(/缺少字段/);
  });

  it('rejects unknown missions and non-plain session maps', () => {
    const unknown = validV3();
    unknown.sessions = { unknown: validSession() };
    expect(() => migrateProgress(unknown)).toThrow('未知任务 unknown');

    const polluted = validV3();
    polluted.sessions = Object.assign(Object.create(null), polluted.sessions);
    expect(() => migrateProgress(polluted)).toThrow(/sessions必须是对象/);
  });

  it.each(['totalRuns', 'runtimeFailures', 'compileFailures'] as const)(
    'rejects every invalid %s counter',
    (field) => {
      for (const invalid of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, Number.NaN, '1']) {
        const value = validV3();
        (value.sessions['w1-m1'][field] as unknown) = invalid;
        expect(() => migrateProgress(value)).toThrow(/非负整数/);
      }
    },
  );

  it.each(['programStructure', 'sequencePrecondition', 'completeness'] as const)(
    'rejects every invalid concept counter %s',
    (field) => {
      for (const invalid of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, Number.NaN, '1']) {
        const value = validV3();
        (value.sessions['w1-m1'].conceptFailures[field] as unknown) = invalid;
        expect(() => migrateProgress(value)).toThrow(/非负整数/);
      }
    },
  );

  it('rejects unknown or duplicate hint tiers', () => {
    const duplicate = validV3();
    duplicate.sessions['w1-m1'].usedHintTiers = ['observe', 'observe'];
    expect(() => migrateProgress(duplicate)).toThrow(/提示层级/);

    const unknown = validV3();
    unknown.sessions['w1-m1'].usedHintTiers = ['answer' as never];
    expect(() => migrateProgress(unknown)).toThrow(/提示层级/);
  });

  it.each([
    ['lastRunAt', 'not-a-date'],
    ['lastRunAt', '2026-07-12T08:00:00.000+08:00'],
    ['savedAt', '2026-02-30T00:00:00.000Z'],
    ['savedAt', '2026-07-12T00:00:00Z'],
  ] as const)('rejects bad session date %s=%s', (field, invalid) => {
    const value = validV3();
    value.sessions['w1-m1'][field] = invalid;
    expect(() => migrateProgress(value)).toThrow(/有效ISO UTC日期/);
  });

  it.each([
    ['duplicate id', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => blocks.push({ ...blocks[0] })],
    ['unknown next', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[0].nextId = 'missing'; }],
    ['self link', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[0].nextId = blocks[0].id; }],
    ['cycle', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[1].nextId = blocks[0].id; }],
    ['multiple predecessor', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => {
      blocks.push({ id: 'draft-c', type: 'xiyou_test_weapon', nextId: 'draft-b', x: 0, y: 0 });
    }],
    ['unknown type', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[0].type = 'unknown' as never; }],
    ['empty id', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[0].id = ''; }],
    ['infinite coordinate', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[0].x = Infinity; }],
    ['unsafe coordinate', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[0].y = Number.MAX_SAFE_INTEGER + 1; }],
  ])('rejects bad workspace: %s', (_label, mutate) => {
    const value = validV3();
    mutate(value.sessions['w1-m1'].workspace.blocks);
    expect(() => migrateProgress(value)).toThrow(/workspace/);
  });

  it.each([
    ['unknown opcode', (value: ReturnType<typeof validV3>) => { value.sessions['w1-m1'].lastTrace[0].opcode = 'unknown' as never; }],
    ['bad instruction relation', (value: ReturnType<typeof validV3>) => { value.sessions['w1-m1'].lastTrace[0].instructionId = 'wrong'; }],
    ['empty source id', (value: ReturnType<typeof validV3>) => { value.sessions['w1-m1'].lastTrace[0].sourceBlockId = ''; }],
  ])('rejects bad trace: %s', (_label, mutate) => {
    const value = validV3();
    mutate(value);
    expect(() => migrateProgress(value)).toThrow(/lastTrace/);
  });

  it.each([
    ['nonzero penalty', (value: ReturnType<typeof validV3>) => { value.sessions['w1-m1'].lastRun!.penalty.livesLost = 1 as never; }],
    ['lifecycle provenance', (value: ReturnType<typeof validV3>) => {
      Object.assign(value.sessions['w1-m1'].lastRun!.events[0], trace[0]);
    }],
    ['instruction provenance missing', (value: ReturnType<typeof validV3>) => {
      const event = value.sessions['w1-m1'].lastRun!.events.find((item) => item.type === 'instruction-accepted')!;
      Object.assign(event, { instructionId: null, sourceBlockId: null, opcode: null });
    }],
    ['event not in trace', (value: ReturnType<typeof validV3>) => {
      const event = value.sessions['w1-m1'].lastRun!.events.find((item) => item.type === 'instruction-accepted')!;
      Object.assign(event, { instructionId: 'instruction:other', sourceBlockId: 'other' });
    }],
    ['empty event message', (value: ReturnType<typeof validV3>) => { value.sessions['w1-m1'].lastRun!.events[0].messageCode = ''; }],
    ['completed wrong final state', (value: ReturnType<typeof validV3>) => { value.sessions['w1-m1'].lastRun!.finalState = 'outside-palace' as never; }],
    ['completed with diagnostic', (value: ReturnType<typeof validV3>) => {
      value.sessions['w1-m1'].lastRun!.diagnostic = runDragonPalaceBattle(trace.slice(0, 1)).diagnostic;
    }],
  ])('rejects impossible run: %s', (_label, mutate) => {
    const value = validV3();
    mutate(value);
    expect(() => migrateProgress(value)).toThrow(/lastRun/);
  });

  it('rejects incomplete and rejected diagnostics with impossible provenance', () => {
    const incompleteTrace = trace.slice(0, 1);
    const incomplete = validV3();
    incomplete.sessions['w1-m1'].lastTrace = incompleteTrace;
    incomplete.sessions['w1-m1'].lastRun = runDragonPalaceBattle(incompleteTrace);
    incomplete.sessions['w1-m1'].lastRun!.diagnostic!.sourceBlockId = 'not-last';
    expect(() => migrateProgress(incomplete)).toThrow(/lastRun/);

    const rejectedTrace = [trace[1]];
    const rejected = validV3();
    rejected.sessions['w1-m1'].lastTrace = rejectedTrace;
    rejected.sessions['w1-m1'].lastRun = runDragonPalaceBattle(rejectedTrace);
    rejected.sessions['w1-m1'].lastRun!.diagnostic!.instructionId = 'instruction:other';
    expect(() => migrateProgress(rejected)).toThrow(/lastRun/);
  });

  it('rejects forged accepted and state-changed events that the trace cannot execute', () => {
    const value = validV3();
    const impossibleTrace = [trace[2]];
    value.sessions['w1-m1'].lastTrace = impossibleTrace;
    value.sessions['w1-m1'].lastRun = {
      completed: true,
      finalState: 'weapon-tested',
      events: [
        {
          type: 'run-started', state: 'outside-palace', instructionId: null, sourceBlockId: null,
          opcode: null, messageCode: 'forged.start',
        },
        {
          type: 'instruction-accepted', state: 'outside-palace', ...impossibleTrace[0],
          messageCode: 'forged.accepted',
        },
        {
          type: 'state-changed', state: 'weapon-tested', ...impossibleTrace[0],
          messageCode: 'forged.state-changed',
        },
        {
          type: 'run-finished', state: 'weapon-tested', instructionId: null, sourceBlockId: null,
          opcode: null, messageCode: 'forged.finished',
        },
      ],
      diagnostic: null,
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    };

    expect(() => migrateProgress(value)).toThrow(/lastTrace.*不一致|确定性/);
  });

  it.each([
    ['missing event', (events: NonNullable<MissionSession['lastRun']>['events']) => { events.splice(1, 1); }],
    ['reordered events', (events: NonNullable<MissionSession['lastRun']>['events']) => {
      [events[1], events[2]] = [events[2], events[1]];
    }],
    ['duplicate event', (events: NonNullable<MissionSession['lastRun']>['events']) => {
      events.splice(1, 0, structuredClone(events[1]));
    }],
  ])('rejects a canonical run with %s', (_label, mutate) => {
    const value = validV3();
    mutate(value.sessions['w1-m1'].lastRun!.events);
    expect(() => migrateProgress(value)).toThrow(/lastTrace.*不一致|确定性/);
  });

  it('rejects noncanonical message codes even when every event field is otherwise valid', () => {
    const value = validV3();
    value.sessions['w1-m1'].lastRun!.events[1].messageCode = 'forged.noncanonical-message';
    expect(() => migrateProgress(value)).toThrow(/lastTrace.*不一致|确定性/);
  });

  it('rejects a valid run result generated from a different trace', () => {
    const value = validV3();
    value.sessions['w1-m1'].lastRun = runDragonPalaceBattle(trace.slice(0, 1));
    expect(() => migrateProgress(value)).toThrow(/lastTrace.*不一致|确定性/);
  });

  it('rejects duplicate trace provenance even when the run is canonical for that duplicate trace', () => {
    const value = validV3();
    const duplicateTrace = [
      { instructionId: 'instruction:reused', sourceBlockId: 'reused', opcode: 'enter_palace' as const },
      { instructionId: 'instruction:reused', sourceBlockId: 'reused', opcode: 'request_weapon' as const },
    ];
    value.sessions['w1-m1'].lastTrace = duplicateTrace;
    value.sessions['w1-m1'].lastRun = runDragonPalaceBattle(duplicateTrace);
    expect(() => migrateProgress(value)).toThrow(/lastTrace.*重复.*(?:sourceBlockId|instructionId)/);
  });

  it('allows repeated opcodes when each trace instruction has distinct provenance', () => {
    const value = validV3();
    const repeatedOpcodeTrace = [
      { instructionId: 'instruction:first', sourceBlockId: 'first', opcode: 'enter_palace' as const },
      { instructionId: 'instruction:second', sourceBlockId: 'second', opcode: 'enter_palace' as const },
    ];
    value.sessions['w1-m1'].lastTrace = repeatedOpcodeTrace;
    value.sessions['w1-m1'].lastRun = runDragonPalaceBattle(repeatedOpcodeTrace);
    expect(() => migrateProgress(value)).not.toThrow();
  });

  it('enforces the raw UTF-8 byte budget at the exact boundary before parsing JSON', () => {
    const base = JSON.stringify(createInitialProgress());
    const baseBytes = new TextEncoder().encode(base).byteLength;
    const atLimit = `${base}${' '.repeat(MAX_RAW_JSON_BYTES - baseBytes)}`;
    expect(new TextEncoder().encode(atLimit).byteLength).toBe(MAX_RAW_JSON_BYTES);
    expect(parseProgress(atLimit)).toEqual(createInitialProgress());
    expect(() => parseProgress(`${atLimit} `)).toThrow(/UTF-8字节.*1048576/);

    const multibyteOverLimit = JSON.stringify({ version: 3, padding: '你'.repeat(350_000) });
    expect(multibyteOverLimit.length).toBeLessThan(MAX_RAW_JSON_BYTES);
    expect(new TextEncoder().encode(multibyteOverLimit).byteLength).toBeGreaterThan(MAX_RAW_JSON_BYTES);
    expect(() => parseProgress(multibyteOverLimit)).toThrow(/UTF-8字节.*1048576/);
  });

  it('migrates long legacy learner names without loss and round-trips them as V3', () => {
    const learnerName = '旧名字'.repeat(100);
    for (const legacy of [
      { ...validV1, learnerName },
      { ...validV2, learnerName },
    ]) {
      const migrated = migrateProgress(legacy);
      expect(migrated.learnerName).toBe(learnerName);
      expect(parseProgress(JSON.stringify(migrated))).toEqual(migrated);
    }
  });

  it('round-trips a maximum-length block id through derived trace provenance and engine result', () => {
    const blockId = 'b'.repeat(MAX_BLOCK_OR_SOURCE_ID_LENGTH);
    const value = validV3();
    value.sessions['w1-m1'].workspace.blocks = [
      { id: blockId, type: 'xiyou_enter_palace', nextId: null, x: 0, y: 0 },
    ];
    value.sessions['w1-m1'].lastTrace = [{
      instructionId: `instruction:${blockId}`,
      sourceBlockId: blockId,
      opcode: 'enter_palace',
    }];
    value.sessions['w1-m1'].lastRun = runDragonPalaceBattle(value.sessions['w1-m1'].lastTrace);

    const parsed = parseProgress(JSON.stringify(value));
    expect(parsed).toEqual(value);
    expect(parsed.sessions['w1-m1'].lastTrace[0].instructionId).toHaveLength(
      MAX_INSTRUCTION_ID_LENGTH,
    );
  });

  it('rejects block, source, and derived-instruction ids above their field limits', () => {
    const blockOverLimit = validV3();
    blockOverLimit.sessions['w1-m1'].workspace.blocks[0].id = 'b'.repeat(MAX_BLOCK_OR_SOURCE_ID_LENGTH + 1);
    expect(() => migrateProgress(blockOverLimit)).toThrow(/workspace.*id.*256个字符/);

    const sourceOverLimit = validV3();
    const sourceId = 's'.repeat(MAX_BLOCK_OR_SOURCE_ID_LENGTH + 1);
    sourceOverLimit.sessions['w1-m1'].lastTrace = [{
      instructionId: `instruction:${sourceId}`,
      sourceBlockId: sourceId,
      opcode: 'enter_palace',
    }];
    sourceOverLimit.sessions['w1-m1'].lastRun = null;
    expect(() => migrateProgress(sourceOverLimit)).toThrow(/sourceBlockId.*256个字符/);

    const instructionOverLimit = validV3();
    instructionOverLimit.sessions['w1-m1'].lastTrace[0].instructionId = 'i'.repeat(
      MAX_INSTRUCTION_ID_LENGTH + 1,
    );
    instructionOverLimit.sessions['w1-m1'].lastRun = null;
    expect(() => migrateProgress(instructionOverLimit)).toThrow(/instructionId.*268个字符/);
  });

  it('enforces workspace block count before deep block validation and keeps the 500-block boundary', () => {
    const boundary = validV3();
    boundary.sessions['w1-m1'].workspace.blocks = Array.from(
      { length: MAX_WORKSPACE_BLOCKS },
      (_, index) => ({ id: `block-${index}`, type: 'xiyou_enter_palace', nextId: null, x: index, y: 0 }),
    );
    boundary.sessions['w1-m1'].lastTrace = [];
    boundary.sessions['w1-m1'].lastRun = null;
    expect(migrateProgress(boundary).sessions['w1-m1'].workspace.blocks).toHaveLength(MAX_WORKSPACE_BLOCKS);

    const overLimit = validV3();
    const poison = { id: 'poison', type: 'xiyou_enter_palace' as const, nextId: null, x: 0, y: 0 };
    Object.defineProperty(poison, 'id', { get: () => { throw new Error('deep block traversal happened'); } });
    overLimit.sessions['w1-m1'].workspace.blocks = [
      poison,
      ...Array.from(
        { length: MAX_WORKSPACE_BLOCKS },
        (_, index) => ({ id: `over-${index}`, type: 'xiyou_enter_palace' as const, nextId: null, x: index, y: 0 }),
      ),
    ];
    expect(() => migrateProgress(overLimit)).toThrow(/workspace\.blocks.*最多500项/);
  });

  it('enforces trace count before instruction parsing and keeps the 500-instruction boundary', () => {
    const makeTrace = (length: number) => Array.from({ length }, (_, index) => ({
      instructionId: `instruction:trace-${index}`,
      sourceBlockId: `trace-${index}`,
      opcode: 'enter_palace' as const,
    }));
    const boundary = validV3();
    boundary.sessions['w1-m1'].lastTrace = makeTrace(MAX_TRACE_INSTRUCTIONS);
    boundary.sessions['w1-m1'].lastRun = null;
    expect(migrateProgress(boundary).sessions['w1-m1'].lastTrace).toHaveLength(MAX_TRACE_INSTRUCTIONS);

    const overLimit = validV3();
    overLimit.sessions['w1-m1'].lastTrace = makeTrace(MAX_TRACE_INSTRUCTIONS + 1);
    expect(() => migrateProgress(overLimit)).toThrow(/lastTrace.*最多500项/);
  });

  it('applies the event boundary before canonical comparison', () => {
    const boundary = validV3();
    const canonical = boundary.sessions['w1-m1'].lastRun!;
    canonical.events = [
      structuredClone(canonical.events[0]),
      ...Array.from(
        { length: MAX_BATTLE_EVENTS - 2 },
        () => structuredClone(canonical.events[1]),
      ),
      structuredClone(canonical.events.at(-1)!),
    ];
    expect(() => migrateProgress(boundary)).toThrow(/确定性运行结果不一致/);
    expect(() => migrateProgress(boundary)).not.toThrow(/events.*最多1002项/);

    const overLimit = validV3();
    overLimit.sessions['w1-m1'].lastRun!.events = Array.from(
      { length: MAX_BATTLE_EVENTS + 1 },
      () => structuredClone(overLimit.sessions['w1-m1'].lastRun!.events[0]),
    );
    expect(() => migrateProgress(overLimit)).toThrow(/lastRun\.events.*最多1002项/);
  });

  it('detects a maximum-sized workspace cycle without changing draft semantics', () => {
    const value = validV3();
    value.sessions['w1-m1'].workspace.blocks = Array.from(
      { length: MAX_WORKSPACE_BLOCKS },
      (_, index) => ({
        id: `cycle-${index}`,
        type: 'xiyou_enter_palace',
        nextId: `cycle-${(index + 1) % MAX_WORKSPACE_BLOCKS}`,
        x: index,
        y: 0,
      }),
    );
    value.sessions['w1-m1'].lastTrace = [];
    value.sessions['w1-m1'].lastRun = null;
    expect(() => migrateProgress(value)).toThrow(/workspace.*cycle/);
  });

  it('allows a null lastRun and still returns an isolated session tree', () => {
    const value = validV3();
    value.sessions['w1-m1'].lastRun = null;
    const parsed = migrateProgress(value);
    expect(parsed.sessions['w1-m1'].lastRun).toBeNull();
    expect(parsed.sessions['w1-m1']).not.toBe(value.sessions['w1-m1']);
  });

  it.each([null, [], new Date(), Object.create(null)])('rejects non-plain document objects', (value) => {
    expect(() => migrateProgress(value)).toThrow('进度文件格式无效');
  });

  it('keeps strict V2 validation as a legacy document contract', () => {
    expect(() => migrateProgress({ ...validV2, unexpected: true })).toThrow(/未知字段/);
    expect(() => migrateProgress({ ...validV2, settings: { ...validV2.settings, theme: 'dark' } })).toThrow(/未知字段/);
    expect(() => migrateProgress({ ...validV2, schemaRevision: 2 })).toThrow(/schemaRevision/);
  });
});
