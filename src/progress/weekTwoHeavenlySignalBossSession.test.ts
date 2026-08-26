import { describe, expect, it } from 'vitest';
import { compileHeavenlySignalBossDraft, createDefaultHeavenlySignalBossDraft, runHeavenlySignalBoss } from '../blockly/weekTwoHeavenlySignalBossContract';
import { completeMission, createInitialProgress, getWeeklyReport, importProgress, isMissionUnlocked, serializeProgress } from './progress';
import { parseHeavenlySignalBossSession } from './heavenlySignalBossSessionSchema';
import { createMissionSession, recordRun, updateWorkspaceDraft } from './session';

const now = '2026-08-24T00:00:00.000Z';
const later = '2026-08-24T00:00:01.000Z';
function correctedDraft() {
  const draft = structuredClone(createDefaultHeavenlySignalBossDraft());
  const find = (id: string) => draft.blocks.find((block) => block.id === id)!;
  find('stable-repeat').repeatCount = 3;
  const accept = find('accept-title'); const flag = find('raise-flag');
  accept.handlerBlockId = 'title-handler'; accept.parentBlockId = 'title-handler'; accept.previousId = null; accept.nextId = 'build-residence';
  flag.handlerBlockId = 'return-handler'; flag.parentBlockId = 'return-handler'; flag.previousId = null; flag.nextId = null;
  find('build-residence').previousId = 'accept-title';
  find('drink-banquet').nextId = 'stumble-tusita'; find('stumble-tusita').previousId = 'drink-banquet'; find('stumble-tusita').nextId = 'eat-elixir'; find('eat-elixir').previousId = 'stumble-tusita'; find('eat-elixir').nextId = null;
  const sensor = find('red-eyes'); sensor.id = 'furnace-open-signal'; sensor.type = 'xiyou_boss_condition_furnace_open'; find('furnace-loop').conditionBlockId = sensor.id;
  return draft;
}

describe('W2-M5 heavenly signal boss Progress V3 session', () => {
  it('starts from the four-bug workspace and clears stale trace/run evidence after a real correction', () => {
    const session = createMissionSession('w2-m5', now);
    expect(session.workspace).toEqual(createDefaultHeavenlySignalBossDraft());
    const trace = compileHeavenlySignalBossDraft(session.workspace);
    const failed = recordRun(session, runHeavenlySignalBoss(trace), trace, now);
    expect(updateWorkspaceDraft(failed, correctedDraft(), later)).toMatchObject({ lastTrace: [], lastRun: null, totalRuns: 1 });
  });

  it('accepts an edited post-run workspace with intentionally cleared current evidence but rejects every partial evidence shape', () => {
    const draft = createDefaultHeavenlySignalBossDraft(); const trace = compileHeavenlySignalBossDraft(draft);
    const edited = updateWorkspaceDraft(recordRun(createMissionSession('w2-m5', now), runHeavenlySignalBoss(trace), trace, now), correctedDraft(), later);
    expect(parseHeavenlySignalBossSession(edited)).toMatchObject({ totalRuns: 1, lastTrace: [], lastRun: null, lastRunAt: null });
    const correctedTrace = compileHeavenlySignalBossDraft(correctedDraft());
    for (const partial of [
      { ...edited, lastTrace: correctedTrace },
      { ...edited, lastRun: runHeavenlySignalBoss(correctedTrace) },
      { ...edited, lastRunAt: now },
    ]) expect(() => parseHeavenlySignalBossSession(partial)).toThrow(/运行证据不完整/);
  });

  it('keeps current evidence only when a W2-M5 layout-only draft recompiles to the identical trace', () => {
    const draft = correctedDraft(); const trace = compileHeavenlySignalBossDraft(draft);
    const current = recordRun(createMissionSession('w2-m5', now), runHeavenlySignalBoss(trace), trace, now);
    const layoutOnly = structuredClone(draft); layoutOnly.blocks.reverse(); layoutOnly.blocks.forEach((block, index) => { block.x += index * 31; block.y += index * 17; });
    const preserved = updateWorkspaceDraft(current, layoutOnly, later);
    expect(preserved).toMatchObject({ workspace: layoutOnly, totalRuns: 1, lastTrace: trace, lastRun: runHeavenlySignalBoss(trace), lastRunAt: now, savedAt: later });
    expect(parseHeavenlySignalBossSession(preserved)).toEqual(preserved);

    const semanticChange = structuredClone(layoutOnly); semanticChange.blocks.find((block) => block.id === 'stable-repeat')!.repeatCount = 2;
    expect(updateWorkspaceDraft(current, semanticChange, later)).toMatchObject({ totalRuns: 1, lastTrace: [], lastRun: null, lastRunAt: null });
  });

  it('strictly recompiles and replays saved provenance, including the non-instruction canon epilogue', () => {
    const draft = correctedDraft(); const trace = compileHeavenlySignalBossDraft(draft);
    const saved = recordRun(updateWorkspaceDraft(createMissionSession('w2-m5', now), draft, now), runHeavenlySignalBoss(trace), trace, later);
    expect(parseHeavenlySignalBossSession(saved)).toEqual(saved);
    const forgedEvent = structuredClone(saved); forgedEvent.lastTrace[0].eventType = 'furnace-refining';
    expect(() => parseHeavenlySignalBossSession(forgedEvent)).toThrow(/lastTrace|重新编译/);
    const forgedCondition = structuredClone(saved); forgedCondition.lastTrace.find((item) => item.kind === 'condition-checked')!.conditionKind = 'smoke-clears';
    expect(() => parseHeavenlySignalBossSession(forgedCondition)).toThrow(/lastTrace|重新编译/);
    const forgedEpilogue = structuredClone(saved); if (forgedEpilogue.lastRun === null) throw new Error('expected saved run'); forgedEpilogue.lastRun.events.at(-1)!.sourceBlockId = 'forged';
    expect(() => parseHeavenlySignalBossSession(forgedEpilogue)).toThrow(/lastRun|重放/);
  });

  it('records each W2-M5 runtime diagnostic in one exact concept bucket without double-counting failures', () => {
    const withRoutingFixed = () => {
      const draft = correctedDraft();
      const redEyes = draft.blocks.find((block) => block.id === 'furnace-open-signal')!;
      redEyes.id = 'red-eyes'; redEyes.type = 'xiyou_boss_condition_red_eyes'; draft.blocks.find((block) => block.id === 'furnace-loop')!.conditionBlockId = 'red-eyes';
      return draft;
    };
    const routing = withRoutingFixed();
    const eventRouting = structuredClone(routing); const wrongTitle = eventRouting.blocks.find((block) => block.id === 'accept-title')!; const wrongFlag = eventRouting.blocks.find((block) => block.id === 'raise-flag')!; const residence = eventRouting.blocks.find((block) => block.id === 'build-residence')!; wrongTitle.handlerBlockId = 'return-handler'; wrongTitle.parentBlockId = 'return-handler'; wrongTitle.previousId = null; wrongTitle.nextId = null; wrongFlag.handlerBlockId = 'title-handler'; wrongFlag.parentBlockId = 'title-handler'; wrongFlag.previousId = null; wrongFlag.nextId = residence.id; residence.previousId = wrongFlag.id;
    const sequence = structuredClone(routing); sequence.blocks.find((block) => block.id === 'drink-banquet')!.nextId = 'eat-elixir'; sequence.blocks.find((block) => block.id === 'eat-elixir')!.previousId = 'drink-banquet'; sequence.blocks.find((block) => block.id === 'eat-elixir')!.nextId = 'stumble-tusita'; sequence.blocks.find((block) => block.id === 'stumble-tusita')!.previousId = 'eat-elixir'; sequence.blocks.find((block) => block.id === 'stumble-tusita')!.nextId = null;
    const never = correctedDraft(); const smoke = never.blocks.find((block) => block.id === 'furnace-open-signal')!; smoke.id = 'smoke-clears'; smoke.type = 'xiyou_boss_condition_smoke_clears'; never.blocks.find((block) => block.id === 'furnace-loop')!.conditionBlockId = 'smoke-clears';
    const handlerSequence = correctedDraft(); const loop = handlerSequence.blocks.find((block) => block.id === 'furnace-loop')!; const escape = handlerSequence.blocks.find((block) => block.id === 'escape-furnace')!; const topple = handlerSequence.blocks.find((block) => block.id === 'topple-furnace')!; loop.nextId = topple.id; topple.previousId = loop.id; topple.nextId = escape.id; escape.previousId = topple.id; escape.nextId = null;
    const cases = [
      runHeavenlySignalBoss(compileHeavenlySignalBossDraft(createDefaultHeavenlySignalBossDraft())),
      runHeavenlySignalBoss(compileHeavenlySignalBossDraft(eventRouting)),
      runHeavenlySignalBoss(compileHeavenlySignalBossDraft(sequence)),
      runHeavenlySignalBoss(compileHeavenlySignalBossDraft(routing)),
      runHeavenlySignalBoss(compileHeavenlySignalBossDraft(never)),
      runHeavenlySignalBoss(compileHeavenlySignalBossDraft(handlerSequence)),
      runHeavenlySignalBoss(compileHeavenlySignalBossDraft(correctedDraft()).slice(0, compileHeavenlySignalBossDraft(correctedDraft()).findIndex((item) => item.opcode === 'escape_furnace'))),
    ];
    expect(cases.map((result) => result.diagnostic?.concept)).toEqual(['loop-count', 'event-routing', 'sequence-precondition', 'loop-condition', 'condition-never-met', 'handler-sequence', 'completeness']);
    let session = createMissionSession('w2-m5', now);
    for (const [index, result] of cases.entries()) session = recordRun(session, result, index === 6 ? compileHeavenlySignalBossDraft(correctedDraft()).slice(0, compileHeavenlySignalBossDraft(correctedDraft()).findIndex((item) => item.opcode === 'escape_furnace')) : compileHeavenlySignalBossDraft(index === 0 ? createDefaultHeavenlySignalBossDraft() : index === 1 ? eventRouting : index === 2 ? sequence : index === 3 ? routing : index === 4 ? never : handlerSequence), new Date(Date.parse(now) + index * 1000).toISOString());
    session = updateWorkspaceDraft(session, correctedDraft(), '2026-08-24T00:00:08.000Z');
    session = recordRun(session, runHeavenlySignalBoss(compileHeavenlySignalBossDraft(correctedDraft())), compileHeavenlySignalBossDraft(correctedDraft()), later);
    expect(session).toMatchObject({ totalRuns: 8, runtimeFailures: 7, conceptFailures: { loopCount: 1, eventRouting: 1, handlerSequence: 1, sequencePrecondition: 1, loopCondition: 1, conditionNeverMet: 1, completeness: 1 } });
    expect(parseHeavenlySignalBossSession(session)).toEqual(session);
    const forged = structuredClone(session); forged.conceptFailures.loopCount += 1;
    expect(() => parseHeavenlySignalBossSession(forged)).toThrow(/累计失败证据不一致|字段无效/);
  });

  it('preserves strict export/import and adds composite debugging evidence to the second-week parent report', () => {
    const defaultDraft = createDefaultHeavenlySignalBossDraft(); const trace = compileHeavenlySignalBossDraft(defaultDraft);
    let session = recordRun(createMissionSession('w2-m5', now), runHeavenlySignalBoss(trace), trace, now);
    session = recordRun(session, runHeavenlySignalBoss(trace), trace, later);
    const progress = createInitialProgress(); (progress.sessions as Record<string, unknown>)['w2-m5'] = session;
    expect(importProgress(serializeProgress(progress)).sessions['w2-m5']).toEqual(session);
    expect(getWeeklyReport(progress, 2)).toMatchObject({ sessionRuns: 2, sessionAdjustments: 2, needsSupport: ['循环与调试综合'] });
  });

  it('unlocks W3-M1 only after the persisted W2-M5 completion record exists in course progress', () => {
    let progress = createInitialProgress();
    for (const missionId of ['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5', 'w2-m1', 'w2-m2', 'w2-m3', 'w2-m4']) progress = completeMission(progress, missionId, { stars: 3, hintsUsed: 0 });
    expect(isMissionUnlocked(progress, 'w3-m1')).toBe(false);
    progress = completeMission(progress, 'w2-m5', { stars: 3, hintsUsed: 0 });
    expect(isMissionUnlocked(progress, 'w3-m1')).toBe(true);
  });
});
