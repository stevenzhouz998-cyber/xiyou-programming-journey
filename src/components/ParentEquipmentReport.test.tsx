import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { completeMission, createInitialProgress } from '../progress/progress'
import { createMissionSession, recordConditionObservationUse, recordCuilanConditionObservationUse, recordRun, updateWorkspaceDraft } from '../progress/session'
import { recordEquipmentEffectUse } from '../progress/equipmentEffectSession'
import { equipItem } from '../progress/equipmentOperations'
import { compileManorHelpDraft, createDefaultManorHelpDraft, runManorHelp } from '../blockly/weekThreeManorHelpContract'
import { compileCuilanBooleanDraft, runCuilanBooleanForDraft } from '../blockly/weekThreeCuilanBooleanContract'
import { compileWeekThreeBossDraft } from '../blockly/weekThreeBossCompiler'
import { runWeekThreeBossDraft } from '../blockly/weekThreeBossContract'
import { createSolvedWeekThreeBossDraftForTest } from '../blockly/weekThreeBossTestHelpers'
import { compileWeekFourMappingDraft } from '../blockly/weekFourMappingCompiler'
import { compareWeekFourMappingTraces } from '../blockly/weekFourMappingContract'
import { SOLVED_WEEK_FOUR_MAPPING_PYTHON, parseWeekFourMappingPython } from '../engine/weekFourPythonMappingGrammar'
import { createWeekFourMappingSession, recordWeekFourMappingRun, updateWeekFourMappingCode } from '../progress/weekFourMappingSession'
import { ParentEquipmentReport } from './ParentEquipmentReport'

describe('ParentEquipmentReport', () => {
  it('reports durable rewards, current slots, and child-invoked effects without raw identifiers', () => {
    let progress = createInitialProgress()
    progress = completeMission(progress, 'w1-m1', { stars: 3, hintsUsed: 0 })
    progress = completeMission(progress, 'w1-m2', { stars: 3, hintsUsed: 0 })
    progress = completeMission(progress, 'w1-m3', { stars: 3, hintsUsed: 0 })
    progress.equipment = equipItem(progress.equipment, 'weapon', 'ruyi-staff')
    progress.equipment = equipItem(progress.equipment, 'head', 'phoenix-crown')
    progress.sessions['w1-m4'] = recordEquipmentEffectUse(createMissionSession('w1-m4'), 'decomposition-view', '2026-08-19T01:00:00.000Z')
    progress.sessions['w1-m5'] = recordEquipmentEffectUse(createMissionSession('w1-m5'), 'weight-reference', '2026-08-19T01:05:00.000Z')

    render(<ParentEquipmentReport progress={progress} />)
    const report = screen.getByRole('region', { name: '装备与跨关学习工具' })
    expect(report).toHaveTextContent('如意金箍棒第二关「定海神针」通关获得')
    expect(report).toHaveTextContent('兵器如意金箍棒')
    expect(report).toHaveTextContent('头饰凤翅紫金冠')
    expect(report).toHaveTextContent('第四关「幽冥勾名」查看过任务拆分图')
    expect(report).toHaveTextContent('第五关「第三回总试炼」查看过兵器重量资料')
    expect(report).not.toHaveTextContent(/ruyi-staff|decomposition-view|sourceBlockId|instructionId|parent=/)
    expect(report).not.toHaveTextContent(/金币|余额/)
  })

  it('shows honest empty and unequipped states', () => {
    render(<ParentEquipmentReport progress={createInitialProgress()} />)
    expect(screen.getByText('尚未获得第一周装备奖励')).toBeVisible()
    expect(screen.getAllByText('未装备')).toHaveLength(4)
    expect(screen.getByText('第四、五关尚未使用装备学习工具')).toBeVisible()
  })

  it('summarizes the fire-eye ability without exposing W3 internal evidence', () => {
    const now = '2026-08-26T00:00:00.000Z'
    const failedDraft = createDefaultManorHelpDraft()
    const failedTrace = compileManorHelpDraft(failedDraft)
    const failedSession = recordRun(
      updateWorkspaceDraft(createMissionSession('w3-m1', now), failedDraft, now),
      runManorHelp(failedTrace),
      failedTrace,
      now,
    )
    const observed = recordConditionObservationUse(failedSession, failedSession.failureSnapshot!.snapshotId, '2026-08-26T00:01:00.000Z')

    let progress = createInitialProgress()
    progress.sessions['w3-m1'] = observed
    render(<ParentEquipmentReport progress={progress} />)
    const ability = screen.getByRole('region', { name: '火眼金睛学习能力' })
    expect(ability).toHaveTextContent('未获得')
    expect(ability).toHaveTextContent('主动观察 1 次')
    expect(ability).toHaveTextContent(/最近使用：.*\d.*\d.*\d.*\d.*\d{1,2}:\d{2}/)
    expect(ability).not.toHaveTextContent(/failureSnapshot|口信|evidence|trace|block|source|conditionKind|canon-gaocai-help/)

    progress = completeMission(progress, 'w2-m4', { stars: 3, hintsUsed: 0 })
    render(<ParentEquipmentReport progress={progress} />)
    expect(screen.getAllByRole('region', { name: '火眼金睛学习能力' }).at(-1)).toHaveTextContent('已获得待稳定')

    progress = completeMission(progress, 'w2-m5', { stars: 3, hintsUsed: 0 })
    render(<ParentEquipmentReport progress={progress} />)
    expect(screen.getAllByRole('region', { name: '火眼金睛学习能力' }).at(-1)).toHaveTextContent('已稳定')
  })

  it('labels formal and legacy W3 completion evidence honestly', () => {
    const now = '2026-08-26T00:00:00.000Z'
    const draft = createDefaultManorHelpDraft()
    draft.blocks.find((block) => block.id === 'manor-condition')!.type = 'w3_manor_condition_explicit_demon_help'
    const trace = compileManorHelpDraft(draft)
    let formal = createInitialProgress()
    formal.sessions['w3-m1'] = recordRun(updateWorkspaceDraft(createMissionSession('w3-m1', now), draft, now), runManorHelp(trace), trace, now)
    formal = completeMission(formal, 'w3-m1', { stars: 3, hintsUsed: 0 })

    render(<ParentEquipmentReport progress={formal} />)
    expect(screen.getByRole('region', { name: '火眼金睛学习能力' })).toHaveTextContent('庄上求助正式 Blockly 证明已保存')

    const legacy = structuredClone(formal)
    legacy.missionCompletionEvidence['w3-m1'] = {
      kind: 'legacy-preformal', completedAt: now, sourceVersion: 3, sourceSchemaRevision: 2,
    }
    render(<ParentEquipmentReport progress={legacy} />)
    const ability = screen.getAllByRole('region', { name: '火眼金睛学习能力' }).at(-1)
    expect(ability).toHaveTextContent('历史兼容完成记录，尚非正式 Blockly 证明')
    expect(ability).not.toHaveTextContent('庄上求助正式 Blockly 证明已保存')
  })

  it('summarizes W3-M2 observation use without exposing the child answer or trace', () => {
    const now = '2026-08-26T00:00:00.000Z'
    const session = createMissionSession('w3-m2', now)
    const trace = compileCuilanBooleanDraft(session.workspace)
    const failed = recordRun(session, runCuilanBooleanForDraft(session.workspace, trace), trace, now)
    let progress = createInitialProgress()
    progress.sessions['w3-m2'] = recordCuilanConditionObservationUse(failed, failed.failureSnapshot!.snapshotId, '2026-08-26T00:01:00.000Z')
    render(<ParentEquipmentReport progress={progress} />)
    const ability = screen.getAllByRole('region', { name: '火眼金睛学习能力' }).at(-1)!
    expect(ability).toHaveTextContent('主动观察 1 次')
    expect(ability).not.toHaveTextContent(/cuilan-|appearance-matches|identity-is|sourceBlockId|instructionId|trace/)
  })

  it('summarizes W3-M5 runs, first blockers, concept failures, observations, and proof without internal identifiers', () => {
    const now = '2026-08-30T00:00:00.000Z'
    const failed = createMissionSession('w3-m5', now)
    const failedTrace = compileWeekThreeBossDraft(failed.workspace)
    const failedRun = recordRun(failed, runWeekThreeBossDraft(failed.workspace), failedTrace.ok ? failedTrace.trace : [], now)
    const observed = recordConditionObservationUse(failedRun, failedRun.failureSnapshot!.snapshotId, '2026-08-30T00:01:00.000Z')
    const solved = createSolvedWeekThreeBossDraftForTest()
    const solvedTrace = compileWeekThreeBossDraft(solved)
    const success = recordRun(updateWorkspaceDraft(observed, solved, '2026-08-30T00:02:00.000Z'), runWeekThreeBossDraft(solved), solvedTrace.ok ? solvedTrace.trace : [], '2026-08-30T00:02:00.000Z')
    success.conceptFailures.disguiseIdentity = 2
    success.conceptFailures.yunzhanBranch = 3
    success.conceptFailures.joiningOperator = 4
    let progress = createInitialProgress()
    progress.sessions['w3-m5'] = success
    progress.missionCompletionEvidence['w3-m5'] = { kind: 'formal-v3', completedAt: now, verifiedAt: now, workspace: structuredClone(success.workspace), trace: structuredClone(success.lastTrace), run: structuredClone(success.lastRun!) }
    render(<ParentEquipmentReport progress={progress} />)
    const report = screen.getByRole('region', { name: '第三周总试炼学习摘要' })
    expect(report).toHaveTextContent('已运行 2 次')
    expect(report).toHaveTextContent('庄口求助判断过宽 1 次')
    expect(report).toHaveTextContent('外形与身份判断 2 次')
    expect(report).toHaveTextContent('云栈洞分支 3 次')
    expect(report).toHaveTextContent('两个条件组合 4 次')
    expect(report).toHaveTextContent('主动观察 1 次')
    expect(report).toHaveTextContent('正式 Blockly 证明已保存')
    expect(report).not.toHaveTextContent(/boss-manor|instructionId|sourceBlockId|canon-bajie-ready|pilgrimage-explicit|full trace/)
    expect(screen.getByRole('region', { name: '火眼金睛学习能力' })).toHaveTextContent('主动观察 1 次')
  })

  it('summarizes W4 mapping safely and keeps code, answer tokens, and raw IDs out of the parent view', () => {
    let progress = createInitialProgress()
    const draft = updateWeekFourMappingCode(createWeekFourMappingSession('2026-08-30T00:00:00.000Z'), SOLVED_WEEK_FOUR_MAPPING_PYTHON, '2026-08-30T00:00:01.000Z')
    const blocklyTrace = compileWeekFourMappingDraft(draft.workspace).trace
    const pythonTrace = parseWeekFourMappingPython(draft.pythonCode).trace
    progress.sessions['w4-m1'] = recordWeekFourMappingRun(draft, { blocklyTrace, pythonTrace, run: compareWeekFourMappingTraces(blocklyTrace, pythonTrace) }, '2026-08-30T00:00:02.000Z')
    progress.missionCompletionEvidence['w3-m5'] = { kind: 'formal-v3' } as never
    progress = completeMission(progress, 'w4-m1', { stars: 3, hintsUsed: 0 })
    render(<ParentEquipmentReport progress={progress} />)
    const report = screen.getByRole('region', { name: '第四周积木与 Python 对照摘要' })
    expect(report).toHaveTextContent('已运行 1 次')
    expect(report).toHaveTextContent('映射差异 0 次')
    expect(report).toHaveTextContent('基础设施故障 0 次')
    expect(report).toHaveTextContent('正式双轨证明与对照作品已保存')
    expect(report).not.toHaveTextContent(/if identity|appearance|mapping-condition|w4-m1-first-python-mapping|白骨精/)
  })
})
