import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { FourSeasBattleDiagnostic } from '../battle/types'
import type { FourSeasCompileResult } from '../blockly/fourSeasRegaliaCompiler'
import { FourSeasRegaliaFeedback } from './FourSeasRegaliaFeedback'

type CompileDiagnostic = Extract<FourSeasCompileResult, { ok: false }>['diagnostics'][number]

afterEach(() => vi.restoreAllMocks())

function runtime(
  messageCode: string,
  sourceBlockId: string | null = 'problem-block',
): FourSeasBattleDiagnostic {
  if (messageCode.includes('incomplete')) {
    return {
      type: 'program-ended-incomplete',
      concept: 'completeness',
      state: 'all-gifts-received',
      instructionId: null,
      sourceBlockId,
      parentBlockId: 'collect-block',
      opcode: null,
      messageCode,
    }
  }
  return {
    type: 'instruction-rejected',
    concept: messageCode.includes('wrong-scope') ? 'container-scope' : 'sequence-precondition',
    state: 'collecting-gifts',
    instructionId: 'instruction:problem-block',
    sourceBlockId: sourceBlockId ?? 'problem-block',
    parentBlockId: 'collect-block',
    opcode: messageCode.includes('wear_crown') ? 'wear_crown' : 'receive_purple_crown',
    messageCode,
  }
}

it.each([
  ['four-seas.wrong-order.receive_purple_crown', '北海龙王还没有送来云履，现在不能先收金冠。'],
  ['four-seas.wrong-scope.wear_crown', '“戴上金冠”应放在“穿戴整副披挂”任务组中。'],
  ['four-seas.incomplete.all-gifts-received', '三件宝物已收齐，还要把穿戴步骤分解完整。'],
])('shows exact child-facing copy for %s and focuses the alert', (messageCode, copy) => {
  render(
    <FourSeasRegaliaFeedback
      diagnostic={runtime(messageCode)}
      occurrenceId={1}
      onFocusBlock={() => undefined}
      onFocusWorkspace={() => undefined}
    />,
  )
  expect(screen.getByRole('alert')).toHaveTextContent(copy)
  expect(screen.getByRole('alert')).toHaveFocus()
  expect(screen.getByRole('alert')).not.toHaveTextContent(messageCode)
})

it('routes the action to the exact source block or to the workspace', () => {
  const onFocusBlock = vi.fn()
  const onFocusWorkspace = vi.fn()
  const view = render(
    <FourSeasRegaliaFeedback
      diagnostic={runtime('four-seas.wrong-order.receive_purple_crown')}
      occurrenceId={1}
      onFocusBlock={onFocusBlock}
      onFocusWorkspace={onFocusWorkspace}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: '回到问题积木' }))
  expect(onFocusBlock).toHaveBeenCalledWith('problem-block')

  view.rerender(
    <FourSeasRegaliaFeedback
      diagnostic={runtime('four-seas.incomplete.all-gifts-received', null)}
      occurrenceId={2}
      onFocusBlock={onFocusBlock}
      onFocusWorkspace={onFocusWorkspace}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: '回到编程工作台' }))
  expect(onFocusWorkspace).toHaveBeenCalledOnce()
})

it('does not claim cloud boots are missing when a crown is repeated after all gifts were received', () => {
  const diagnostic: FourSeasBattleDiagnostic = {
    type: 'instruction-rejected',
    concept: 'sequence-precondition',
    state: 'all-gifts-received',
    instructionId: 'instruction:repeat-crown',
    sourceBlockId: 'repeat-crown',
    parentBlockId: 'collect-block',
    opcode: 'receive_purple_crown',
    messageCode: 'four-seas-regalia.sequence-precondition.all-gifts-received.receive_purple_crown',
  }
  render(<FourSeasRegaliaFeedback diagnostic={diagnostic} occurrenceId={1} onFocusBlock={() => undefined} onFocusWorkspace={() => undefined} />)
  expect(screen.getByRole('alert')).toHaveTextContent('金冠已经收下，三件宝物都齐了')
  expect(screen.getByRole('alert')).toHaveTextContent('下一步应开始穿戴整副披挂')
  expect(screen.getByRole('alert')).not.toHaveTextContent('北海龙王还没有送来云履')
})

it('explains structural compiler failures without exposing internal codes', () => {
  const diagnostic: CompileDiagnostic = {
    code: 'missing-child-chain',
    sourceBlockId: 'collect-block',
    concept: 'program-structure',
  }
  render(
    <FourSeasRegaliaFeedback
      diagnostic={diagnostic}
      occurrenceId={1}
      onFocusBlock={() => undefined}
      onFocusWorkspace={() => undefined}
    />,
  )
  expect(screen.getByRole('alert')).toHaveTextContent('任务组里还没有子任务')
  expect(screen.getByRole('alert')).not.toHaveTextContent('missing-child-chain')
})

it('focuses only for a new error occurrence, not an equivalent diagnostic object', () => {
  const focus = vi.spyOn(HTMLElement.prototype, 'focus')
  const props = {
    onFocusBlock: () => undefined,
    onFocusWorkspace: () => undefined,
  }
  const view = render(
    <FourSeasRegaliaFeedback
      diagnostic={runtime('four-seas.wrong-order.receive_purple_crown')}
      occurrenceId={7}
      {...props}
    />,
  )
  expect(focus).toHaveBeenCalledTimes(1)

  view.rerender(
    <FourSeasRegaliaFeedback
      diagnostic={runtime('four-seas.wrong-order.receive_purple_crown')}
      occurrenceId={7}
      {...props}
    />,
  )
  expect(focus).toHaveBeenCalledTimes(1)

  view.rerender(
    <FourSeasRegaliaFeedback diagnostic={null} occurrenceId={7} {...props} />,
  )
  view.rerender(
    <FourSeasRegaliaFeedback
      diagnostic={runtime('four-seas.wrong-scope.wear_crown')}
      occurrenceId={8}
      {...props}
    />,
  )
  expect(focus).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('alert')).toHaveFocus()
})
