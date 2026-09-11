import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_WEEK_FIVE_FUNCTION_PYTHON } from '../engine/weekFiveFunctionPythonGrammar';
import { WeekFiveFunctionPythonEditor } from './WeekFiveFunctionPythonEditor';

describe('WeekFiveFunctionPythonEditor', () => {
  it('lets the visible step control move between ordered and reversed bodies in both directions', () => {
    const onCodeChange = vi.fn();
    const props = { disabled: false, onCodeChange, onReady: vi.fn(), onError: vi.fn() };
    const { rerender } = render(<WeekFiveFunctionPythonEditor {...props} code={DEFAULT_WEEK_FIVE_FUNCTION_PYTHON} />);

    fireEvent.click(screen.getByRole('button', { name: '交换函数内两步' }));
    const reversed = 'def record_sanqing():\n    record_names()\n    record_arrival()';
    expect(onCodeChange).toHaveBeenLastCalledWith(reversed);

    rerender(<WeekFiveFunctionPythonEditor {...props} code={reversed} />);
    fireEvent.click(screen.getByRole('button', { name: '交换函数内两步' }));
    expect(onCodeChange).toHaveBeenLastCalledWith(DEFAULT_WEEK_FIVE_FUNCTION_PYTHON);
  });

  it('keeps ordinary blank lines when adding and removing the one visible call', () => {
    const onCodeChange = vi.fn();
    const props = { disabled: false, onCodeChange, onReady: vi.fn(), onError: vi.fn() };
    const { rerender } = render(<WeekFiveFunctionPythonEditor {...props} code={`${DEFAULT_WEEK_FIVE_FUNCTION_PYTHON}\n\n`} />);
    fireEvent.click(screen.getByRole('button', { name: '在定义后调用一次' }));
    const called = `${DEFAULT_WEEK_FIVE_FUNCTION_PYTHON}\n\nrecord_sanqing()`;
    expect(onCodeChange).toHaveBeenLastCalledWith(called);

    rerender(<WeekFiveFunctionPythonEditor {...props} code={called} />);
    fireEvent.click(screen.getByRole('button', { name: '移除末尾调用' }));
    expect(onCodeChange).toHaveBeenLastCalledWith(DEFAULT_WEEK_FIVE_FUNCTION_PYTHON);
  });
});
