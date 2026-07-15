import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import type { RuyiStaffBattleDiagnostic } from '../battle/types'
import { RuyiStaffFeedback } from './RuyiStaffFeedback'

function diagnostic(messageCode: string, sourceBlockId: string | null = 'problem'): RuyiStaffBattleDiagnostic {
  return messageCode.includes('program-ended') ? {
    type: 'program-ended-incomplete', concept: 'completeness', state: messageCode.endsWith('weights-inspected') ? 'weights-inspected' : 'ruyi-staff-selected',
    instructionId: null, sourceBlockId, opcode: null, messageCode,
  } : {
    type: 'instruction-rejected', concept: 'wrong-weapon-selection', state: 'wrong-weapon-selected',
    instructionId: 'instruction:problem', sourceBlockId: sourceBlockId!, opcode: messageCode.endsWith('choose_sabre') ? 'choose_sabre' : 'choose_halberd', messageCode,
  }
}

it.each([
  ['ruyi-staff.wrong-weapon-selected.choose_sabre', '3600\u65a4\u6bd413500\u65a4\u8f7b\uff0c\u5927\u634d\u5200\u4e0d\u662f\u6700\u91cd\u7684\u5175\u5668\u3002'],
  ['ruyi-staff.wrong-weapon-selected.choose_halberd', '7200\u65a4\u6bd413500\u65a4\u8f7b\uff0c\u65b9\u5929\u753b\u621f\u4e0d\u662f\u6700\u91cd\u7684\u5175\u5668\u3002'],
  ['ruyi-staff.program-ended-incomplete.weights-inspected', '\u7a0b\u5e8f\u7ed3\u675f\u4e86\uff1a\u5df2\u7ecf\u770b\u5230\u91cd\u91cf\uff0c\u8fd8\u8981\u9009\u62e9\u6700\u91cd\u768413500\u65a4\u5b9a\u6d77\u795e\u9488\u3002'],
  ['ruyi-staff.program-ended-incomplete.ruyi-staff-selected', '\u7a0b\u5e8f\u7ed3\u675f\u4e86\uff1a\u5df2\u7ecf\u9009\u5bf9\u5b9a\u6d77\u795e\u9488\uff0c\u8fd8\u8981\u628a\u5b83\u7f29\u5c0f\u5230\u968f\u8eab\u5927\u5c0f\u3002'],
])('shows exact deterministic copy for %s', (messageCode, copy) => {
  render(<RuyiStaffFeedback diagnostic={diagnostic(messageCode)} occurrenceId={1} onFocusBlock={() => undefined} onFocusWorkspace={() => undefined} />)
  expect(screen.getByRole('alert')).toHaveTextContent(copy)
  expect(screen.getByRole('alert')).toHaveFocus()
})

it('returns to the real source block or workspace', () => {
  const onFocusBlock = vi.fn()
  const onFocusWorkspace = vi.fn()
  const view = render(<RuyiStaffFeedback diagnostic={diagnostic('ruyi-staff.wrong-weapon-selected.choose_sabre')} occurrenceId={1} onFocusBlock={onFocusBlock} onFocusWorkspace={onFocusWorkspace} />)
  fireEvent.click(screen.getByRole('button', { name: '\u56de\u5230\u95ee\u9898\u79ef\u6728' }))
  expect(onFocusBlock).toHaveBeenCalledWith('problem')
  view.rerender(<RuyiStaffFeedback diagnostic={diagnostic('ruyi-staff.program-ended-incomplete.weights-inspected', null)} occurrenceId={2} onFocusBlock={onFocusBlock} onFocusWorkspace={onFocusWorkspace} />)
  fireEvent.click(screen.getByRole('button', { name: '\u56de\u5230\u7f16\u7a0b\u5de5\u4f5c\u53f0' }))
  expect(onFocusWorkspace).toHaveBeenCalledOnce()
})

it('explains illegal orders in deterministic child-facing Chinese without internal codes', () => {
  const illegal: RuyiStaffBattleDiagnostic = {
    type: 'instruction-rejected', concept: 'sequence-precondition', state: 'awaiting-inspection',
    instructionId: 'instruction:early', sourceBlockId: 'early', opcode: 'choose_ruyi_staff',
    messageCode: 'ruyi-staff.sequence-precondition.awaiting-inspection.choose_ruyi_staff',
  }
  render(<RuyiStaffFeedback diagnostic={illegal} occurrenceId={1} onFocusBlock={() => undefined} onFocusWorkspace={() => undefined} />)
  expect(screen.getByRole('alert')).toHaveTextContent('还没查看三件兵器的重量，请先加入“查看三件兵器重量”。')
  expect(screen.getByRole('alert')).not.toHaveTextContent('ruyi-staff')
})
