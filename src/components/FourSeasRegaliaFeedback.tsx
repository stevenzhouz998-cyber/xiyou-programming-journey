import { useEffect, useRef } from 'react'
import type { FourSeasBattleDiagnostic } from '../battle/types'
import type { FourSeasCompileResult } from '../blockly/fourSeasRegaliaCompiler'

type CompileDiagnostic = Extract<FourSeasCompileResult, { ok: false }>['diagnostics'][number]
type Diagnostic = CompileDiagnostic | FourSeasBattleDiagnostic

interface Props {
  diagnostic: Diagnostic | null
  occurrenceId: number
  onFocusBlock: (id: string) => void
  onFocusWorkspace: () => void
}

const COMPILE_COPY: Record<CompileDiagnostic['code'], string> = {
  'empty-workspace': '指令卷轴还是空的，先加入主任务吧。',
  'multiple-main-chain': '程序现在有多个主任务开头，请连成唯一一条主链。',
  'invalid-connection': '有积木没有正确连好，请检查主任务和子任务的连接。',
  'unknown-block': '程序中有这一关无法识别的积木，请删除后重试。',
  'missing-child-chain': '任务组里还没有子任务，请把小步骤放进去。',
  'orphan-child': '有一个子任务没有放在任务组里，请把它移回收集或穿戴组。',
  'invalid-nesting': '主任务和子任务的层级不对，请按任务树重新连接。',
  'workspace-boundary': '积木卷轴超出了安全范围，请删除多余积木后再试。',
}

const RUNTIME_COPY: Record<string, string> = {
  'four-seas.wrong-order.receive_purple_crown': '北海龙王还没有送来云履，现在不能先收金冠。',
  'four-seas.wrong-scope.wear_crown': '“戴上金冠”应放在“穿戴整副披挂”任务组中。',
  'four-seas.incomplete.all-gifts-received': '三件宝物已收齐，还要把穿戴步骤分解完整。',
  'four-seas-regalia.sequence-precondition.collecting-gifts.receive_purple_crown': '北海龙王还没有送来云履，现在不能先收金冠。',
  'four-seas-regalia.container-scope.collecting-gifts.wear_crown': '“戴上金冠”应放在“穿戴整副披挂”任务组中。',
  'four-seas-regalia.program-ended-incomplete.all-gifts-received': '三件宝物已收齐，还要把穿戴步骤分解完整。',
}

function isCompile(diagnostic: Diagnostic): diagnostic is CompileDiagnostic {
  return 'code' in diagnostic
}

function runtimeFallback(diagnostic: FourSeasBattleDiagnostic): string {
  if (diagnostic.type === 'program-ended-incomplete') {
    if (diagnostic.state === 'awaiting-request') return '程序还没有开始，先向东海龙王请求披挂。'
    if (diagnostic.state === 'all-gifts-received') return RUNTIME_COPY['four-seas.incomplete.all-gifts-received']
    if (diagnostic.state === 'regalia-equipped') return '整副披挂已穿好，还要加上“检查披挂是否齐全”。'
    return '程序提前结束了，请对照任务树补齐剩下步骤。'
  }
  if (diagnostic.concept === 'container-scope') {
    if (diagnostic.opcode === 'wear_crown') return RUNTIME_COPY['four-seas.wrong-scope.wear_crown']
    return '这一步放错任务组了，收宝物和穿戴披挂要分别放在对应组中。'
  }
  if (diagnostic.opcode === 'receive_purple_crown') return RUNTIME_COPY['four-seas.wrong-order.receive_purple_crown']
  return '这一步和当前故事顺序对不上，请检查同一任务组里的先后次序。'
}

function copy(diagnostic: Diagnostic): string {
  if (isCompile(diagnostic)) return COMPILE_COPY[diagnostic.code]
  return RUNTIME_COPY[diagnostic.messageCode] ?? runtimeFallback(diagnostic)
}

export function FourSeasRegaliaFeedback({
  diagnostic,
  occurrenceId,
  onFocusBlock,
  onFocusWorkspace,
}: Props) {
  const alertRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (diagnostic !== null) alertRef.current?.focus()
  }, [diagnostic, occurrenceId])
  if (diagnostic === null) return null
  return (
    <section ref={alertRef} className="battle-feedback" role="alert" tabIndex={-1}>
      <p>{copy(diagnostic)}</p>
      {diagnostic.sourceBlockId !== null ? (
        <button type="button" onClick={() => onFocusBlock(diagnostic.sourceBlockId!)}>回到问题积木</button>
      ) : (
        <button type="button" onClick={onFocusWorkspace}>回到编程工作台</button>
      )}
    </section>
  )
}
