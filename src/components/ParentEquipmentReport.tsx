import type { ProgressV3 } from '../progress/types'
import { EQUIPMENT_CATALOGUE, type EquipmentEffect, type EquipmentItemId, type EquipmentSlot } from '../progress/equipment'
import { EQUIPMENT_PRESENTATION } from '../progress/equipmentPresentation'
import { getWeeklyReport } from '../progress/weeklyReport'
import './ParentEquipmentReport.css'

const itemOrder: EquipmentItemId[] = ['ruyi-staff', 'phoenix-crown', 'golden-chain-armor', 'cloud-walking-boots']
const slotOrder: EquipmentSlot[] = ['weapon', 'head', 'body', 'feet']
const slotLabels: Record<EquipmentSlot, string> = { weapon: '兵器', head: '头饰', body: '护甲', feet: '靴子' }
const grantLabels = {
  'w1-m2': '第二关「定海神针」通关获得',
  'w1-m3': '第三关「四海披挂」通关获得',
} as const
const missionLabels = { 'w1-m4': '第四关「幽冥勾名」', 'w1-m5': '第五关「第三回总试炼」' } as const
const effectLabels: Record<EquipmentEffect, string> = {
  'weight-reference': '查看过兵器重量资料',
  'decomposition-view': '查看过任务拆分图',
  'accepted-prefix-playback': '回看过已走通步骤',
  'repeat-problem-navigation': '再次定位过问题积木',
}

export function ParentEquipmentReport({ progress }: { progress: ProgressV3 }) {
  const owned = itemOrder.filter((itemId) => progress.equipment.inventory[itemId] !== undefined)
  const uses = (['w1-m4', 'w1-m5'] as const).flatMap((missionId) => (
    (progress.sessions[missionId]?.equipmentEffectsUsed ?? []).map((effect) => ({ missionId, effect }))
  ))
  const conditionObservation = progress.abilities.conditionObservation
  const manorSession = progress.sessions['w3-m1']
  const cuilanSession = progress.sessions['w3-m2']
  const yunzhanSession = progress.sessions['w3-m3']
  const bajieSession = progress.sessions['w3-m4']
  const weekThreeBossSession = progress.sessions['w3-m5']
  const allObservationUses = [...(manorSession?.conditionObservationUses ?? []), ...(cuilanSession?.conditionObservationUses ?? []), ...(yunzhanSession?.conditionObservationUses ?? []), ...(bajieSession?.conditionObservationUses ?? []), ...(weekThreeBossSession?.conditionObservationUses ?? [])]
  const observationUses = new Map(allObservationUses.map((use) => [use.snapshotId, use])).size
  const latestObservationUse = [...allObservationUses]
    .sort((left, right) => right.usedAt.localeCompare(left.usedAt))[0]
  const latestObservationTime = latestObservationUse
    ? new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(latestObservationUse.usedAt))
    : null
  const abilityStatus = conditionObservation.acquiredAt === null
    ? '未获得'
    : conditionObservation.stableUnlockedAt === null
      ? '已获得待稳定'
      : '已稳定'
  const completionEvidence = progress.missionCompletionEvidence['w3-m1']
  const cuilanEvidence = progress.missionCompletionEvidence['w3-m2']
  const yunzhanEvidence = progress.missionCompletionEvidence['w3-m3']
  const bajieEvidence = progress.missionCompletionEvidence['w3-m4']
  const weekThree = getWeeklyReport(progress, 3)
  const boss = weekThree.weekThreeBoss ?? { runs: 0, successfulFullRuns: 0, conceptFailures: { manorHelpSpecificity: 0, disguiseIdentity: 0, yunzhanBranch: 0, joiningOperator: 0, programStructure: 0 }, firstBlocker: null, observations: 0, proof: 'none' as const }
  const bossEvidence = progress.missionCompletionEvidence['w3-m5']
  const weekFour = getWeeklyReport(progress, 4).weekFourMapping ?? {
    runs: 0, mappingDifferences: 0, validationFailures: 0, infrastructureFailures: 0,
    observations: 0, workSaved: false, proof: 'none' as const, completedAt: null,
  }
  const weekFourVariables = getWeeklyReport(progress, 4).weekFourVariables ?? {
    runs: 0, overwriteFailures: 0, validationFailures: 0, infrastructureFailures: 0,
    observations: 0, workSaved: false, proof: 'none' as const, completedAt: null,
  }
  const weekFourBranches = getWeeklyReport(progress, 4).weekFourBranches ?? {
    runs: 0, conflicts: 0, missing: 0, validation: 0, infrastructure: 0,
    observations: 0, workSaved: false, proof: 'none' as const, completedAt: null,
  }
  const bossSession = progress.sessions['w4-m5'];
  const bossProof = progress.missionCompletionEvidence['w4-m5'];
  const monksSession = progress.sessions['w5-m1'];
  const monksProof = progress.missionCompletionEvidence['w5-m1'];
  const functionSession = progress.sessions['w5-m2'];
  const functionProof = progress.missionCompletionEvidence['w5-m2'];
  const weatherSession = progress.sessions['w5-m3'];
  const weatherProof = progress.missionCompletionEvidence['w5-m3'];
  const decompositionSession = progress.sessions['w5-m4'];
  const decompositionProof = progress.missionCompletionEvidence['w5-m4'];
  const storySession = progress.sessions['w5-m5'];
  const storyProof = progress.missionCompletionEvidence['w5-m5'];
  const listSession = progress.sessions['w4-m4'];
  const listProof = progress.missionCompletionEvidence['w4-m4'];
  const blockerLabels = {
    'manor-help-specificity': '庄口求助判断过宽',
    'disguise-identity': '外形与身份判断',
    'yunzhan-branch': '云栈洞分支',
    'joining-operator': '两个条件组合',
  } as const
  return <><section className="parent-equipment-report" role="region" aria-label="装备与跨关学习工具">
    <div className="parent-equipment-heading"><span className="eyebrow">真实通关奖励</span><h2>装备与跨关学习工具</h2><p>这里只记录已安全保存的获得、装备和主动使用证据。</p></div>
    <div className="parent-equipment-columns">
      <article><h3>已获得奖励</h3>{owned.length ? <ul>{owned.map((itemId) => {
        const item = EQUIPMENT_CATALOGUE[itemId]
        return <li key={itemId}>{`${EQUIPMENT_PRESENTATION[itemId].label}${grantLabels[item.grantedBy]}`}</li>
      })}</ul> : <p>尚未获得第一周装备奖励</p>}</article>
      <article><h3>当前装备栏</h3><dl>{slotOrder.map((slot) => {
        const itemId = progress.equipment.equipped[slot]
        return <div key={slot}><dt>{slotLabels[slot]}</dt><dd>{itemId ? EQUIPMENT_PRESENTATION[itemId].label : '未装备'}</dd></div>
      })}</dl></article>
      <article><h3>后续关卡主动使用</h3>{uses.length ? <ul>{uses.map(({ missionId, effect }) => <li key={`${missionId}-${effect}`}>{`${missionLabels[missionId]}${effectLabels[effect]}`}</li>)}</ul> : <p>第四、五关尚未使用装备学习工具</p>}</article>
    </div>
  </section>
  <section className="parent-equipment-report" role="region" aria-label="火眼金睛学习能力">
    <div className="parent-equipment-heading"><span className="eyebrow">条件学习能力</span><h2>火眼金睛学习能力</h2></div>
    <p>{abilityStatus}</p>
    <p>{`主动观察 ${observationUses} 次`}</p>
    {latestObservationTime ? <p>{`最近使用：${latestObservationTime}`}</p> : null}
    {completionEvidence?.kind === 'formal-v3' ? <p>庄上求助正式 Blockly 证明已保存</p> : null}
    {completionEvidence?.kind === 'legacy-preformal' ? <p>历史兼容完成记录，尚非正式 Blockly 证明</p> : null}
    {cuilanEvidence?.kind === 'formal-v3' ? <p>变化高翠兰正式 Blockly 证明已保存</p> : null}
    {cuilanEvidence?.kind === 'legacy-preformal' ? <p>变化高翠兰历史兼容完成记录，尚非正式 Blockly 证明</p> : null}
    {yunzhanEvidence?.kind === 'formal-v3' ? <p>云栈洞交锋正式 Blockly 证明已保存</p> : null}
    {yunzhanEvidence?.kind === 'legacy-preformal' ? <p>云栈洞交锋历史兼容完成记录，尚非正式 Blockly 证明</p> : null}
    {bajieSession ? <p>八戒归队：已运行 {bajieSession.totalRuns} 次，组合错误 {bajieSession.conceptFailures.booleanComposition} 次，观察 {bajieSession.conditionObservationUses.length} 次。</p> : null}
    {bajieEvidence?.kind === 'formal-v3' ? <p>八戒归队正式 Blockly 证明已保存</p> : null}
    {bajieEvidence?.kind === 'legacy-preformal' ? <p>八戒归队历史兼容完成记录，尚非正式 Blockly 证明</p> : null}
  </section>
  <section className="parent-equipment-report" role="region" aria-label="第三周总试炼学习摘要">
    <div className="parent-equipment-heading"><span className="eyebrow">第三周综合练习</span><h2>第三周总试炼学习摘要</h2><p>只汇总已保存的运行次数、概念类别和证明状态，不展示积木连接或答案。</p></div>
    <p>{`已运行 ${boss.runs} 次，其中完整走通 ${boss.successfulFullRuns} 次。`}</p>
    <p>{boss.firstBlocker ? `第一次运行的首个阻塞：${blockerLabels[boss.firstBlocker as keyof typeof blockerLabels]}。` : '尚未出现运行阻塞。'}</p>
    <ul><li>{`庄口求助判断过宽 ${boss.conceptFailures.manorHelpSpecificity} 次`}</li><li>{`外形与身份判断 ${boss.conceptFailures.disguiseIdentity} 次`}</li><li>{`云栈洞分支 ${boss.conceptFailures.yunzhanBranch} 次`}</li><li>{`两个条件组合 ${boss.conceptFailures.joiningOperator} 次`}</li></ul>
    <p>{`主动观察 ${boss.observations} 次`}</p>
    {boss.proof === 'formal-v3' ? <p>第三周总试炼正式 Blockly 证明已保存</p> : null}
    {boss.proof === 'legacy-replay-only' ? <p>第三周总试炼历史兼容完成记录，尚非正式 Blockly 证明</p> : null}
  </section>
  <section className="parent-equipment-report" role="region" aria-label="第四周积木与 Python 对照摘要">
    <div className="parent-equipment-heading"><span className="eyebrow">第四周双轨练习</span><h2>第四周积木与 Python 对照摘要</h2><p>只汇总已保存的学习次数与证明状态，不展示代码、字段答案、积木编号或运行细节。</p></div>
    <p>{`已运行 ${weekFour.runs} 次，映射差异 ${weekFour.mappingDifferences} 次。`}</p>
    <p>{`安全验证拒绝 ${weekFour.validationFailures} 次；基础设施故障 ${weekFour.infrastructureFailures} 次（不计入学习困难）。`}</p>
    <p>{`主动观察 ${weekFour.observations} 次。`}</p>
    {weekFour.proof === 'formal-v3' && weekFour.workSaved ? <p>正式双轨证明与对照作品已保存</p> : null}
    {weekFour.proof === 'legacy-replay-only' ? <p>第四周历史兼容完成记录，尚非正式双轨证明</p> : null}
    {weekFour.proof === 'formal-v3' && !weekFour.workSaved ? <p>正式证明记录异常：尚未发现已保存作品</p> : null}
  </section>

  <section className="parent-equipment-report" role="region" aria-label="第四周变量学习摘要">
    <div className="parent-equipment-heading"><span className="eyebrow">第四周变量练习</span><h2>第四周变量学习摘要</h2><p>只汇总已保存的学习次数与证明状态，不展示代码、故事答案或内部记录。</p></div>
    <p>{`已运行 ${weekFourVariables.runs} 次，变量覆盖 ${weekFourVariables.overwriteFailures} 次。`}</p>
    <p>{`安全验证拒绝 ${weekFourVariables.validationFailures} 次；基础设施故障 ${weekFourVariables.infrastructureFailures} 次（不计入学习困难）。`}</p>
    <p>{`主动观察 ${weekFourVariables.observations} 次。`}</p>
    {weekFourVariables.proof === 'formal-v3' && weekFourVariables.workSaved ? <p>正式变量证明与取证作品已保存</p> : null}
    {weekFourVariables.proof === 'legacy-replay-only' ? <p>第四周历史兼容完成记录，尚非正式变量证明</p> : null}
    {weekFourVariables.proof === 'formal-v3' && !weekFourVariables.workSaved ? <p>正式证明记录异常：尚未发现已保存作品</p> : null}
  </section>

  <section className="parent-equipment-report" role="region" aria-label="第四周分支结构学习摘要">
    <div className="parent-equipment-heading"><span className="eyebrow">第四周分支练习</span><h2>第四周分支结构学习摘要</h2><p>只汇总已保存的学习结果与证明状态，不展示代码、答案或内部记录。</p></div>
    <p>{`已运行 ${weekFourBranches.runs} 次；分支同时执行 ${weekFourBranches.conflicts} 次，分支没有执行 ${weekFourBranches.missing} 次。`}</p>
    <p>{`结构验证未通过 ${weekFourBranches.validation} 次；运行环境故障 ${weekFourBranches.infrastructure} 次（不计入学习困难）。`}</p>
    <p>{`主动观察 ${weekFourBranches.observations} 次。`}</p>
    {weekFourBranches.proof === 'formal-v3' && weekFourBranches.workSaved ? <p>正式分支结构证明与作品已保存</p> : null}
    {weekFourBranches.proof === 'legacy-replay-only' ? <p>第四周历史兼容完成记录，尚非正式分支结构证明</p> : null}
    {weekFourBranches.proof === 'formal-v3' && !weekFourBranches.workSaved ? <p>正式证明记录异常：尚未发现已保存作品</p> : null}
  </section>
  <section className="parent-equipment-report" role="region" aria-label="第四周列表与循环学习摘要">
    <h2>第四周列表与循环学习摘要</h2>
    <p>已运行 {listSession?.totalRuns ?? 0} 次；列表顺序或数量调整 {listSession?.listOrderFailures ?? 0} 次，逐项记录调整 {listSession?.loopValueFailures ?? 0} 次。</p>
    <p>结构验证未通过 {listSession?.validationFailures ?? 0} 次；运行环境故障 {listSession?.runnerInfrastructureFailures ?? 0} 次（不计入学习困难）。</p>
    {listProof?.kind === 'formal-v3' && progress.works['w4-m4-list-loop-record'] ? <p>正式列表循环证明与观察册作品已保存</p> : null}
    {listProof?.kind === 'legacy-replay-only' ? <p>历史兼容记录，尚非正式列表循环证明</p> : null}
  </section><section aria-label="第四周总试炼学习摘要">
    <h2>第四周总试炼学习摘要</h2>
    <p>已运行 {bossSession?.totalRuns ?? 0} 次；身份来源调整 {bossSession?.identityFailures ?? 0} 次，分支动作调整 {bossSession?.branchFailures ?? 0} 次。</p>
    <p>结构验证未通过 {bossSession?.validationFailures ?? 0} 次；运行环境故障 {bossSession?.runnerInfrastructureFailures ?? 0} 次（不计入学习困难）。</p>
    {bossProof?.kind === 'formal-v3' && progress.works['w4-m5-verification-report'] ? <p>两轮核验正式证明与白虎岭核验报告已保存</p> : null}
    {bossProof?.kind === 'legacy-replay-only' ? <p>历史兼容记录，尚非正式核验站证明</p> : null}
  </section><section aria-label="第五周循环学习摘要">
    <h2>第五周循环学习摘要</h2>
    <p>已运行 {monksSession?.totalRuns ?? 0} 次；名单覆盖调整 {monksSession?.coverageFailures ?? 0} 次，逐人动作调整 {monksSession?.actionFailures ?? 0} 次。</p>
    <p>结构验证未通过 {monksSession?.validationFailures ?? 0} 次；运行环境故障 {monksSession?.runnerInfrastructureFailures ?? 0} 次（不计入学习困难）。</p>
    {monksProof?.kind === 'formal-v3' && progress.works['w5-m1-monks-rescue-record'] ? <p>逐人解困正式证明与僧众解困记录已保存</p> : null}
    {monksProof?.kind === 'legacy-replay-only' ? <p>历史兼容记录，尚非正式解困循环证明</p> : null}
  </section><section aria-label="第五周函数学习摘要">
    <h2>第五周函数学习摘要</h2>
    <p>已运行 {functionSession?.totalRuns ?? 0} 次；函数调用调整 {functionSession?.callFailures ?? 0} 次，函数体边界或顺序调整 {functionSession?.bodyFailures ?? 0} 次。</p>
    <p>结构验证未通过 {functionSession?.validationFailures ?? 0} 次；运行环境故障 {functionSession?.runnerInfrastructureFailures ?? 0} 次（不计入学习困难）。</p>
    <p>主动观察 {functionSession?.conditionObservationUses.length ?? 0} 次。</p>
    {functionProof?.kind === 'formal-v3' && progress.works['w5-m2-sanqing-function-record'] ? <p>函数定义与调用正式证明及三清观记录作品已保存</p> : null}
    {functionProof?.kind === 'legacy-replay-only' ? <p>历史兼容记录，尚非正式函数调用证明</p> : null}
  </section><section aria-label="第五周参数学习摘要">
    <h2>第五周参数学习摘要</h2>
    <p>已运行 {weatherSession?.totalRuns ?? 0} 次；调用顺序调整 {weatherSession?.callFailures ?? 0} 次，参数使用调整 {weatherSession?.parameterFailures ?? 0} 次。</p>
    <p>结构验证未通过 {weatherSession?.validationFailures ?? 0} 次；运行环境故障 {weatherSession?.runnerInfrastructureFailures ?? 0} 次（不计入学习困难）。</p>
    <p>主动观察 {weatherSession?.conditionObservationUses.length ?? 0} 次。</p>
    {weatherProof?.kind === 'formal-v3' && progress.works['w5-m3-weather-parameter-record'] ? <p>函数参数正式证明及祈雨记录作品已保存</p> : null}
    {weatherProof?.kind === 'legacy-replay-only' ? <p>历史兼容记录，尚非正式函数参数证明</p> : null}
  </section><section aria-label="第五周问题分解学习摘要">
    <h2>第五周问题分解学习摘要</h2>
    <p>已运行 {decompositionSession?.totalRuns ?? 0} 次；记录归属调整 {decompositionSession?.ownershipFailures ?? 0} 次，总记录调用调整 {decompositionSession?.coordinatorFailures ?? 0} 次。</p>
    <p>结构验证未通过 {decompositionSession?.validationFailures ?? 0} 次；运行环境故障 {decompositionSession?.runnerInfrastructureFailures ?? 0} 次（不计入学习困难）。</p>
    <p>主动观察 {decompositionSession?.conditionObservationUses.length ?? 0} 次。</p>
    {decompositionProof?.kind === 'formal-v3' && progress.works['w5-m4-problem-decomposition-record'] ? <p>问题分解正式证明及故事记录作品已保存</p> : null}
    {decompositionProof?.kind === 'legacy-replay-only' ? <p>历史兼容记录，尚非正式问题分解证明</p> : null}
  </section><section aria-label="第五周故事总编排学习摘要">
    <h2>第五周故事总编排学习摘要</h2>
    <p>已运行 {storySession?.totalRuns ?? 0} 次；解困循环调整 {storySession?.monkLoopFailures ?? 0} 次，三清观调用调整 {storySession?.templeCallFailures ?? 0} 次，天气参数调整 {storySession?.weatherBindingFailures ?? 0} 次，后续顺序调整 {storySession?.laterCallOrderFailures ?? 0} 次。</p>
    <p>结构验证未通过 {storySession?.validationFailures ?? 0} 次；运行环境故障 {storySession?.runnerInfrastructureFailures ?? 0} 次（不计入学习困难）。</p>
    <p>主动观察 {storySession?.conditionObservationUses.length ?? 0} 次。</p>
    {storyProof?.kind === 'formal-v3' && progress.works['w5-m5-story-orchestration-record'] ? <p>车迟国故事总编排正式证明及作品已保存</p> : null}
    {storyProof?.kind === 'legacy-replay-only' ? <p>历史兼容记录，尚非正式故事总编排证明</p> : null}
  </section></>
}

export default ParentEquipmentReport
