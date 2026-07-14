import type { BattleDiagnostic } from '../battle/types'
import type { CompileDiagnostic } from '../blockly/compiler'

type FeedbackDiagnostic = CompileDiagnostic | BattleDiagnostic

interface Props {
  diagnostic: FeedbackDiagnostic | null
  onFocusBlock: (blockId: string | null) => void
}

const COMPILE_COPY: Record<CompileDiagnostic['code'], string> = {
  'empty-workspace': '指令卷轴还是空的，先加入一块积木再试试。',
  'multiple-top-level': '程序现在有多个开头，请把积木连成一条完整的指令链。',
  'invalid-connection': '有一块积木没有正确连接，请检查积木之间的接口。',
  'unknown-block': '发现无法识别的积木。原来的草稿已保留，请从备份恢复后再试。',
}

const RUNTIME_COPY: Record<string, string> = {
  'dragon-palace.sequence-precondition.outside-palace.request_weapon': '悟空还在龙宫外，龙王还听不到请求。请观察悟空现在在哪里。',
  'dragon-palace.sequence-precondition.outside-palace.test_weapon': '悟空还没有进入龙宫，现在还不能试用兵器。',
  'dragon-palace.sequence-precondition.entered-palace.enter_palace': '悟空已经进入龙宫了，这条指令重复了。',
  'dragon-palace.sequence-precondition.entered-palace.test_weapon': '还没有向龙王提出请求，现在不能试用兵器。',
  'dragon-palace.sequence-precondition.weapon-requested.enter_palace': '悟空已经进入龙宫，不需要再进入一次。',
  'dragon-palace.sequence-precondition.weapon-requested.request_weapon': '龙王已经听到请求，这条指令重复了。',
  'dragon-palace.sequence-precondition.weapon-tested.enter_palace': '兵器已经试用完成，这条指令放得太晚了。',
  'dragon-palace.sequence-precondition.weapon-tested.request_weapon': '兵器已经试用完成，不需要再请求一次。',
  'dragon-palace.sequence-precondition.weapon-tested.test_weapon': '兵器已经试用完成，这条指令重复了。',
  'dragon-palace.program-ended-incomplete.outside-palace': '程序结束了，但悟空还在龙宫外。请回到工作台，从第一块积木开始检查。',
  'dragon-palace.program-ended-incomplete.entered-palace': '程序在进入龙宫后结束了，在最后一块积木之后还缺一步。',
  'dragon-palace.program-ended-incomplete.weapon-requested': '程序在请求兵器后结束了，在最后一块积木之后还缺一步。',
}

function isCompileDiagnostic(diagnostic: FeedbackDiagnostic): diagnostic is CompileDiagnostic {
  return 'code' in diagnostic
}

function feedbackCopy(diagnostic: FeedbackDiagnostic): string {
  if (isCompileDiagnostic(diagnostic)) return COMPILE_COPY[diagnostic.code]
  return RUNTIME_COPY[diagnostic.messageCode]
    ?? '这条指令和当前场景顺序对不上，请观察场景状态。'
}

export function BattleFeedback({ diagnostic, onFocusBlock }: Props) {
  if (diagnostic === null) return null
  const sourceBlockId = diagnostic.sourceBlockId
  const returnsToWorkspace = !isCompileDiagnostic(diagnostic)
    && diagnostic.type === 'program-ended-incomplete'

  return (
    <section className="battle-feedback" role="alert" tabIndex={-1}>
      <p>{feedbackCopy(diagnostic)}</p>
      {sourceBlockId !== null ? (
        <button type="button" onClick={() => onFocusBlock(sourceBlockId)}>
          回到问题积木
        </button>
      ) : returnsToWorkspace ? (
        <button type="button" onClick={() => onFocusBlock(null)}>
          回到编程工作台
        </button>
      ) : null}
    </section>
  )
}
