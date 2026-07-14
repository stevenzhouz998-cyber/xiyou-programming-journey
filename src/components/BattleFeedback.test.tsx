import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { BattleDiagnostic } from '../battle/types'
import type { CompileDiagnostic } from '../blockly/compiler'
import { BattleFeedback } from './BattleFeedback'

describe('BattleFeedback', () => {
  it.each([
    ['empty-workspace', '指令卷轴还是空的'],
    ['multiple-top-level', '程序现在有多个开头'],
    ['invalid-connection', '有一块积木没有正确连接'],
    ['unknown-block', '发现无法识别的积木'],
  ] as const)('maps compile code %s to fixed child-facing feedback', (code, copy) => {
    const diagnostic: CompileDiagnostic = {
      code,
      sourceBlockId: code === 'empty-workspace' ? null : 'real-block',
      concept: 'program-structure',
    }

    render(<BattleFeedback diagnostic={diagnostic} occurrenceId={1} onFocusBlock={() => undefined} onFocusWorkspace={() => undefined} />)

    expect(screen.getByRole('alert')).toHaveTextContent(copy)
  })

  it('uses the real source id for the only return-to-problem-block action', () => {
    const onFocusBlock = vi.fn()
    const diagnostic: BattleDiagnostic = {
      type: 'instruction-rejected',
      concept: 'sequence-precondition',
      state: 'outside-palace',
      instructionId: 'instruction:request',
      sourceBlockId: 'request-real-id',
      opcode: 'request_weapon',
      messageCode: 'dragon-palace.sequence-precondition.outside-palace.request_weapon',
    }

    render(<BattleFeedback diagnostic={diagnostic} occurrenceId={1} onFocusBlock={onFocusBlock} onFocusWorkspace={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: '回到问题积木' }))

    expect(screen.getByRole('alert')).toHaveTextContent('龙王还听不到请求')
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(onFocusBlock).toHaveBeenCalledWith('request-real-id')
  })

  it('locates the last valid real block for an incomplete program', () => {
    const onFocusBlock = vi.fn()
    const diagnostic: BattleDiagnostic = {
      type: 'program-ended-incomplete',
      concept: 'completeness',
      state: 'entered-palace',
      instructionId: null,
      sourceBlockId: 'last-valid-enter',
      opcode: null,
      messageCode: 'dragon-palace.program-ended-incomplete.entered-palace',
    }

    render(<BattleFeedback diagnostic={diagnostic} occurrenceId={1} onFocusBlock={onFocusBlock} onFocusWorkspace={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: '回到问题积木' }))

    expect(screen.getByRole('alert')).toHaveTextContent('在最后一块积木之后还缺一步')
    expect(onFocusBlock).toHaveBeenCalledWith('last-valid-enter')
  })

  it('provides an explicit workspace path without fabricating a source id', () => {
    const onFocusBlock = vi.fn()
    const onFocusWorkspace = vi.fn()
    const diagnostic: BattleDiagnostic = {
      type: 'program-ended-incomplete',
      concept: 'completeness',
      state: 'outside-palace',
      instructionId: null,
      sourceBlockId: null,
      opcode: null,
      messageCode: 'dragon-palace.program-ended-incomplete.outside-palace',
    }

    render(
      <>
        <div aria-label="Blockly 积木编辑区" tabIndex={0} />
        <BattleFeedback
          diagnostic={diagnostic}
          occurrenceId={1}
          onFocusBlock={onFocusBlock}
          onFocusWorkspace={() => {
            onFocusWorkspace()
            screen.getByLabelText('Blockly 积木编辑区').focus()
          }}
        />
      </>,
    )
    fireEvent.click(screen.getByRole('button', { name: '回到编程工作台' }))

    expect(screen.queryByRole('button', { name: '回到问题积木' })).not.toBeInTheDocument()
    expect(onFocusBlock).not.toHaveBeenCalled()
    expect(onFocusWorkspace).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(screen.getByLabelText('Blockly 积木编辑区'))
  })

  it('never renders an arbitrary external runtime message code', () => {
    const diagnostic: BattleDiagnostic = {
      type: 'instruction-rejected',
      concept: 'sequence-precondition',
      state: 'outside-palace',
      instructionId: 'instruction:one',
      sourceBlockId: 'block-one',
      opcode: 'request_weapon',
      messageCode: '<script>external-words</script>',
    }

    render(<BattleFeedback diagnostic={diagnostic} occurrenceId={1} onFocusBlock={() => undefined} onFocusWorkspace={() => undefined} />)

    expect(screen.getByRole('alert')).toHaveTextContent('这条指令和当前场景顺序对不上')
    expect(screen.getByRole('alert')).not.toHaveTextContent('external-words')
  })

  it('focuses once per explicit failure occurrence instead of diagnostic object identity', () => {
    const diagnostic: CompileDiagnostic = {
      code: 'empty-workspace', sourceBlockId: null, concept: 'program-structure',
    }
    const view = render(
      <>
        <button type="button">outside focus</button>
        <BattleFeedback diagnostic={diagnostic} occurrenceId={1} onFocusBlock={() => undefined} onFocusWorkspace={() => undefined} />
      </>,
    )
    expect(document.activeElement).toBe(screen.getByRole('alert'))

    screen.getByRole('button', { name: 'outside focus' }).focus()
    view.rerender(
      <>
        <button type="button">outside focus</button>
        <BattleFeedback diagnostic={{ ...diagnostic }} occurrenceId={1} onFocusBlock={() => undefined} onFocusWorkspace={() => undefined} />
      </>,
    )
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'outside focus' }))

    view.rerender(
      <>
        <button type="button">outside focus</button>
        <BattleFeedback diagnostic={{ ...diagnostic }} occurrenceId={2} onFocusBlock={() => undefined} onFocusWorkspace={() => undefined} />
      </>,
    )
    expect(document.activeElement).toBe(screen.getByRole('alert'))
    expect(screen.getByRole('alert')).toHaveTextContent('指令卷轴还是空的')
  })
})
