import { useEffect, useRef } from 'react'
import type { RuyiStaffBattleDiagnostic } from '../battle/types'
import type { RuyiCompileResult } from '../blockly/ruyiStaffCompiler'

type CompileDiagnostic = Extract<RuyiCompileResult, { ok: false }>['diagnostics'][number]
type Diagnostic = CompileDiagnostic | RuyiStaffBattleDiagnostic
interface Props { diagnostic: Diagnostic | null; occurrenceId: number; onFocusBlock: (id: string) => void; onFocusWorkspace: () => void }

const COMPILE_COPY: Record<CompileDiagnostic['code'], string> = {
  'empty-workspace': '指令卷轴还是空的，先加入一块积木吧。',
  'multiple-top-level': '程序现在有多个开头，请把积木连成唯一的一条顺序。',
  'invalid-connection': '有积木没有正确连好，请检查上下连接。',
  'unknown-block': '程序中有这一关无法识别的积木，请删除后重试。',
}
const RUNTIME_COPY: Record<string, string> = {
  'ruyi-staff.wrong-weapon-selected.choose_sabre': '3600斤比13500斤轻，大捍刀不是最重的兵器。',
  'ruyi-staff.wrong-weapon-selected.choose_halberd': '7200斤比13500斤轻，方天画戟不是最重的兵器。',
  'ruyi-staff.program-ended-incomplete.awaiting-inspection': '程序结束了：还要先查看三件兵器的重量。',
  'ruyi-staff.program-ended-incomplete.weights-inspected': '程序结束了：已经看到重量，还要选择最重的13500斤定海神针。',
  'ruyi-staff.program-ended-incomplete.ruyi-staff-selected': '程序结束了：已经选对定海神针，还要把它缩小到随身大小。',
}
function isCompile(diagnostic: Diagnostic): diagnostic is CompileDiagnostic { return 'code' in diagnostic }
function copy(diagnostic: Diagnostic): string {
  if (isCompile(diagnostic)) return COMPILE_COPY[diagnostic.code]
  const exact = RUNTIME_COPY[diagnostic.messageCode]
  if (exact) return exact
  if (diagnostic.state === 'awaiting-inspection') {
    return '还没查看三件兵器的重量，请先加入“查看三件兵器重量”。'
  }
  if (diagnostic.state === 'weights-inspected') {
    return diagnostic.opcode === 'inspect_weights'
      ? '已经看过三件兵器的重量，不用重复查看；下一步要选最重的定海神针。'
      : '还没有选中定海神针，现在不能缩小；请先选择13500斤的定海神针。'
  }
  if (diagnostic.state === 'ruyi-staff-selected') {
    return '已经选中定海神针，不用重复查看或选择；下一步要把它缩小。'
  }
  if (diagnostic.state === 'ruyi-staff-shrunk') {
    return '定海神针已经缩小，程序不需要再加指令。'
  }
  return '这一步和当前场景顺序对不上，请按“查重量→选最重→缩小”检查。'
}

export function RuyiStaffFeedback({ diagnostic, occurrenceId, onFocusBlock, onFocusWorkspace }: Props) {
  const ref = useRef<HTMLElement>(null); const visible = diagnostic !== null
  useEffect(() => { if (visible) ref.current?.focus() }, [visible, occurrenceId])
  if (!diagnostic) return null
  return <section ref={ref} className="battle-feedback" role="alert" tabIndex={-1}>
    <p>{copy(diagnostic)}</p>
    {diagnostic.sourceBlockId !== null ? <button type="button" onClick={() => onFocusBlock(diagnostic.sourceBlockId!)}>回到问题积木</button> : <button type="button" onClick={onFocusWorkspace}>回到编程工作台</button>}
  </section>
}
