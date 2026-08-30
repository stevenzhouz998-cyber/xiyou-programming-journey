import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_WEEK_FOUR_MAPPING_PYTHON } from '../engine/weekFourPythonMappingGrammar';
import { createRef } from 'react';
import { WeekFourMappingPythonEditor, type WeekFourMappingPythonEditorHandle } from './WeekFourMappingPythonEditor';

afterEach(cleanup);

describe('W4-M1 restricted Python editor', () => {
  it('shows the exact saved document and changes the one source span through the accessible selector', async () => {
    const onCodeChange = vi.fn();
    render(<WeekFourMappingPythonEditor code={DEFAULT_WEEK_FOUR_MAPPING_PYTHON} sourceSpan={{ line: 1, from: 3, to: 13 }} onCodeChange={onCodeChange} />);
    expect((await screen.findByLabelText('只读 Python 文本')).textContent).toBe(DEFAULT_WEEK_FOUR_MAPPING_PYTHON);
    const selector = screen.getByRole('combobox', { name: '选择 Python 判断字段' });
    fireEvent.keyDown(selector, { key: 'End' });
    fireEvent.keyDown(selector, { key: 'Enter' });
    expect(onCodeChange).toHaveBeenCalledWith(DEFAULT_WEEK_FOUR_MAPPING_PYTHON.replace('appearance', 'identity'));
    expect(screen.getByRole('option', { name: 'appearance' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'identity' })).toBeInTheDocument();
  });

  it('rejects a source span that does not name the saved field', async () => {
    render(<WeekFourMappingPythonEditor code={DEFAULT_WEEK_FOUR_MAPPING_PYTHON} sourceSpan={{ line: 1, from: 0, to: 2 }} onCodeChange={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('无法恢复');
  });

  it('exposes a focus handle for the real field selector', async () => {
    const ref = createRef<WeekFourMappingPythonEditorHandle>();
    render(<WeekFourMappingPythonEditor ref={ref} code={DEFAULT_WEEK_FOUR_MAPPING_PYTHON} sourceSpan={{ line: 1, from: 3, to: 13 }} onCodeChange={vi.fn()} />);
    ref.current!.focusField();
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: '选择 Python 判断字段' }));
  });
});
