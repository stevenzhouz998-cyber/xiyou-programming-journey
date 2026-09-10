import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { getFormalMission } from '../course/formalCourse';
import { parseWeekFourBranchPython, SOLVED_WEEK_FOUR_BRANCH_PYTHON } from '../engine/weekFourBranchPythonGrammar';
import { createWeekFourBranchSession, recordWeekFourBranchRun, updateWeekFourBranchCode } from '../progress/weekFourBranchSession';

const missionRoute = vi.hoisted(() => ({ context: null as any }));
vi.mock('../context/ProgressContext', () => ({ useProgress: () => missionRoute.context }));
vi.mock('../progress/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../progress/progress')>();
  return {
    ...actual,
    getWeekFourBranchAccess: () => ({ kind: 'formal', upgradingLegacy: false }),
    isMissionUnlocked: () => true,
  };
});

import { MissionPageForId, WeekFourBranchRouteBoundary, weekFourBranchRouteBranch } from './MissionPageContent';

describe('W4-M3 pure route access decision', () => {
  it('keeps locked, historical, and formal access out of the generic unlock decision', () => {
    expect(weekFourBranchRouteBranch({ kind: 'locked' })).toBe('locked');
    expect(weekFourBranchRouteBranch({ kind: 'historical-read-only', completed: false })).toBe('historical-read-only');
    expect(weekFourBranchRouteBranch({ kind: 'historical-read-only', completed: true })).toBe('historical-read-only');
    expect(weekFourBranchRouteBranch({ kind: 'formal', upgradingLegacy: false })).toBe('formal');
    expect(weekFourBranchRouteBranch({ kind: 'formal', upgradingLegacy: true })).toBe('formal');
  });
});

it('loads the formal W4-M3 experience through its dedicated lazy boundary', async () => {
  const FormalExperience = () => <p>正式分支归位体验</p>;
  render(<WeekFourBranchRouteBoundary reducedMotion muted onComplete={async () => true} loader={async () => ({ default: FormalExperience })} />);
  expect(await screen.findByText('正式分支归位体验')).toBeInTheDocument();
});

it('shows a named lazy error and retries the W4-M3 chunk locally', async () => {
  let attempts = 0;
  const loader = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('chunk failed');
    return { default: () => <p>局部重试后的分支体验</p> };
  };
  const reloadPage = vi.fn();
  render(<WeekFourBranchRouteBoundary reducedMotion muted onComplete={async () => true} loader={loader} reloadPage={reloadPage} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('分支归位体验加载失败');
  fireEvent.click(screen.getByRole('button', { name: '重新加载页面' }));
  expect(await screen.findByText('局部重试后的分支体验')).toBeInTheDocument();
  expect(reloadPage).not.toHaveBeenCalled();
});

it('keeps the default W4-M3 retry in the same document through a second static import URL', async () => {
  let attempts = 0;
  const loader = async () => {
    attempts += 1;
    if (attempts === 1) throw new Error('default chunk failed');
    return { default: () => <p>默认局部重试成功</p> };
  };
  render(<WeekFourBranchRouteBoundary reducedMotion muted onComplete={async () => true} loader={loader} />);
  fireEvent.click(await screen.findByRole('button', { name: '重新加载页面' }));
  expect(await screen.findByText('默认局部重试成功')).toBeInTheDocument();
  const source = readFileSync('src/components/MissionPageContent.tsx', 'utf8');
  const boundary = source.slice(source.indexOf('export function WeekFourBranchRouteBoundary'), source.indexOf('function playAudio'));
  expect(source).toContain("import('./WeekFourBranchExperience?retry=1')");
  expect(boundary).toContain('loadWeekFourBranchExperienceRetry');
  expect(boundary).not.toContain('reloadSectionPage');
  expect(boundary).not.toContain('window.location');
});

it('reveals the W4-M3 success UI from persisted completion without calling generic complete again', async () => {
  const complete = vi.fn(async () => ({ status: 'saved', progress: missionRoute.context.progress }));
  missionRoute.context = {
    progress: {
      settings: { muted: true }, sessions: {}, works: {},
      missions: { 'w4-m3': { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: '2026-09-01T00:00:00.000Z' } },
      missionCompletionEvidence: { 'w4-m2': { kind: 'formal-v3' }, 'w4-m3': { kind: 'formal-v3' } },
    },
    complete,
    recordMissionHint: vi.fn(), retrySave: vi.fn(), saveError: null,
    createBackup: vi.fn(), reloadExternalProgress: vi.fn(),
  };
  const PersistedExperience = ({ onComplete }: { onComplete(value: { stars: 3; hintsUsed: 0 }): unknown }) => (
    <button type="button" onClick={() => onComplete({ stars: 3, hintsUsed: 0 })}>揭示已保存通关</button>
  );
  render(<MemoryRouter><MissionPageForId
    id="w4-m3"
    mission={getFormalMission('w4-m3')}
    reducedMotion
    onGlobalModalOpenChange={vi.fn()}
    onCompletionPersistenceActiveChange={vi.fn()}
    weekFourBranchLoader={async () => ({ default: PersistedExperience as any })}
  /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '揭示已保存通关' }));
  expect(await screen.findByRole('heading', { name: '闯关成功' })).toBeInTheDocument();
  expect(screen.getAllByRole('heading', { name: '闯关成功' })).toHaveLength(1);
  expect(complete).not.toHaveBeenCalled();
});

it('replays the real formal Experience and reveals one persisted success modal without any Context write', async () => {
  let session = createWeekFourBranchSession('2026-09-01T00:00:00.000Z');
  session = updateWeekFourBranchCode(session, SOLVED_WEEK_FOUR_BRANCH_PYTHON, '2026-09-01T00:00:00.100Z');
  const parsed = parseWeekFourBranchPython(session.pythonCode);
  if ('state' in parsed) throw new Error('formal replay fixture must be runnable');
  session = recordWeekFourBranchRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, '2026-09-01T00:00:00.200Z');
  const mission = { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: '2026-09-01T00:00:00.300Z' };
  const work = {
    kind: 'python-branch-structure-v1', workId: 'w4-m3-branch-structure-record', missionId: 'w4-m3', title: '分支归位证明记录',
    pythonCode: session.pythonCode, canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run,
    createdAt: mission.completedAt, verifiedAt: mission.completedAt,
  };
  const evidence = {
    kind: 'formal-v3', completedAt: mission.completedAt, verifiedAt: mission.completedAt,
    pythonCode: session.pythonCode, canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run,
    workId: work.workId,
  };
  const complete = vi.fn();
  const write = vi.fn();
  const runtime = {
    ready: vi.fn(async () => undefined),
    run: vi.fn(async () => ({ trace: parsed.trace, run: parsed.run })),
    cancel: vi.fn(), dispose: vi.fn(),
  };
  missionRoute.context = {
    progress: {
      settings: { muted: true }, sessions: { 'w4-m3': session }, works: { 'w4-m3-branch-structure-record': work },
      missions: { 'w4-m3': mission },
      missionCompletionEvidence: { 'w4-m2': { kind: 'formal-v3' }, 'w4-m3': evidence },
    },
    saveStatus: 'idle', complete, recordMissionHint: vi.fn(), retrySave: write,
    saveWeekFourBranchDraft: write, saveWeekFourBranchRun: write, saveWeekFourBranchObservation: write,
    saveWeekFourBranchInfrastructureFailure: write, saveWeekFourBranchValidationFailure: write,
    completeWeekFourBranch: write, saveError: null, createBackup: vi.fn(), reloadExternalProgress: vi.fn(),
  };
  render(<MemoryRouter><MissionPageForId
    id="w4-m3"
    mission={getFormalMission('w4-m3')}
    reducedMotion
    onGlobalModalOpenChange={vi.fn()}
    onCompletionPersistenceActiveChange={vi.fn()}
    weekFourBranchRuntimeFactory={() => runtime}
  /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '运行分支' }));
  expect(await screen.findByRole('heading', { name: '闯关成功' })).toBeInTheDocument();
  expect(screen.getByLabelText('2颗星')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '继续下一关' })).toBeInTheDocument();
  expect(runtime.run).toHaveBeenCalledTimes(1);
  expect(complete).not.toHaveBeenCalled();
  expect(write).not.toHaveBeenCalled();
});

it('routes only formal W4-M3 access to Experience and checks access before the generic unlock path', () => {
  const source = readFileSync('src/components/MissionPageContent.tsx', 'utf8');
  expect(source).toMatch(/mission\.id\s*===\s*['"]w4-m3['"][\s\S]{0,900}<WeekFourBranchRouteBoundary\b/);
  expect(source.indexOf('getWeekFourBranchAccess(progress)')).toBeLessThan(source.indexOf('if (!isMissionUnlocked(progress, mission.id))'));
  expect(source.indexOf('return <WeekFourBranchAccessNotice')).toBeLessThan(source.indexOf('if (!isMissionUnlocked(progress, mission.id))'));
  const branchStart = source.lastIndexOf("mission.id === 'w4-m3'");
  const genericFallback = source.indexOf('renderLegacyMissionTools()', branchStart);
  expect(branchStart).toBeGreaterThan(-1);
  expect(genericFallback).toBeGreaterThan(branchStart);
  expect(source.slice(branchStart, genericFallback)).toContain('<WeekFourBranchRouteBoundary');
  expect(source.slice(branchStart, genericFallback)).not.toContain('<MissionTools');
});

it('keeps the W4-M3 access notice link keyboard-visible with a touch-sized target', () => {
  const css = readFileSync('src/components/MissionPageContent.css', 'utf8');
  expect(css).toMatch(/\.week-four-branch-access-notice\s+a\s*\{[^}]*min-height:\s*44px/);
  expect(css).toMatch(/\.week-four-branch-access-notice\s+a:focus-visible\s*\{[^}]*outline:/);
});
