import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { DEFAULT_WEEK_FOUR_VARIABLE_PYTHON } from '../engine/weekFourVariablePythonGrammar';
import {
  WeekFourVariableEvidencePythonEditor,
  type WeekFourVariableEvidencePythonEditorHandle,
} from './WeekFourVariableEvidencePythonEditor';

afterEach(cleanup);

describe('W4-M2 restricted Python editor', () => {
  it('commits the selected second-line target from the accessible combobox', async () => {
    const onCodeChange = vi.fn();
    render(
      <WeekFourVariableEvidencePythonEditor
        code={DEFAULT_WEEK_FOUR_VARIABLE_PYTHON}
        sourceSpan={{ line: 2, from: 0, to: 10 }}
        onCodeChange={onCodeChange}
      />,
    );

    expect(await screen.findByRole('textbox', { name: 'W4-M2 Python 代码' })).toHaveTextContent('appearance = fiery_eye_check()');
    const selector = screen.getByRole('combobox', { name: '第二次核验写入哪个变量' });
    fireEvent.change(selector, { target: { value: 'identity' } });
    expect(onCodeChange).toHaveBeenCalledWith(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON.replace('\nappearance = fiery_eye_check()', '\nidentity = fiery_eye_check()'));
  });

  it('commits identity with Enter through the same document transaction', async () => {
    const onCodeChange = vi.fn();
    render(
      <WeekFourVariableEvidencePythonEditor
        code={DEFAULT_WEEK_FOUR_VARIABLE_PYTHON}
        sourceSpan={{ line: 2, from: 0, to: 10 }}
        onCodeChange={onCodeChange}
      />,
    );
    fireEvent.keyDown(await screen.findByRole('button', { name: '写入 identity' }), { key: 'Enter' });
    expect(onCodeChange).toHaveBeenCalledWith(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON.replace('\nappearance = fiery_eye_check()', '\nidentity = fiery_eye_check()'));
  });

  it('commits identity with Space through the same document transaction', async () => {
    const onCodeChange = vi.fn();
    render(
      <WeekFourVariableEvidencePythonEditor
        code={DEFAULT_WEEK_FOUR_VARIABLE_PYTHON}
        sourceSpan={{ line: 2, from: 0, to: 10 }}
        onCodeChange={onCodeChange}
      />,
    );
    fireEvent.keyDown(await screen.findByRole('button', { name: '写入 identity' }), { key: ' ' });
    expect(onCodeChange).toHaveBeenCalledWith(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON.replace('\nappearance = fiery_eye_check()', '\nidentity = fiery_eye_check()'));
  });

  it('rejects a span outside the second-line target and disables every input surface', async () => {
    render(
      <WeekFourVariableEvidencePythonEditor
        code={DEFAULT_WEEK_FOUR_VARIABLE_PYTHON}
        sourceSpan={{ line: 2, from: 1, to: 10 }}
        onCodeChange={vi.fn()}
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('无法恢复');
    expect(screen.getByRole('combobox', { name: '第二次核验写入哪个变量' })).toBeDisabled();
  });

  it('keeps the selector and CodeMirror document disabled without reporting progress', async () => {
    const onCodeChange = vi.fn();
    render(
      <WeekFourVariableEvidencePythonEditor
        code={DEFAULT_WEEK_FOUR_VARIABLE_PYTHON}
        sourceSpan={{ line: 2, from: 0, to: 10 }}
        disabled
        onCodeChange={onCodeChange}
      />,
    );
    const selector = await screen.findByRole('combobox', { name: '第二次核验写入哪个变量' });
    fireEvent.change(selector, { target: { value: 'identity' } });
    expect(selector).toBeDisabled();
    expect(onCodeChange).not.toHaveBeenCalled();
  });

  it('exposes a focus handle for the same accessible control', async () => {
    const ref = createRef<WeekFourVariableEvidencePythonEditorHandle>();
    render(
      <WeekFourVariableEvidencePythonEditor
        ref={ref}
        code={DEFAULT_WEEK_FOUR_VARIABLE_PYTHON}
        sourceSpan={{ line: 2, from: 0, to: 10 }}
        onCodeChange={vi.fn()}
      />,
    );
    await screen.findByRole('combobox', { name: '第二次核验写入哪个变量' });
    ref.current!.focusField();
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: '第二次核验写入哪个变量' }));
  });

  it('creates one editor for parent rerenders with inline callbacks and syncs external code without losing focus', async () => {
    const firstReady = vi.fn();
    const secondReady = vi.fn();
    const { rerender } = render(
      <WeekFourVariableEvidencePythonEditor
        code={DEFAULT_WEEK_FOUR_VARIABLE_PYTHON}
        sourceSpan={{ line: 2, from: 0, to: 10 }}
        onCodeChange={() => undefined}
        onReady={firstReady}
        onError={() => undefined}
      />,
    );
    await waitFor(() => expect(firstReady).toHaveBeenCalledTimes(1));
    const selector = screen.getByRole('combobox', { name: '第二次核验写入哪个变量' });
    selector.focus();
    const solved = DEFAULT_WEEK_FOUR_VARIABLE_PYTHON.replace('\nappearance = fiery_eye_check()', '\nidentity = fiery_eye_check()');
    rerender(
      <WeekFourVariableEvidencePythonEditor
        code={solved}
        sourceSpan={{ line: 2, from: 0, to: 8 }}
        onCodeChange={() => undefined}
        onReady={secondReady}
        onError={() => undefined}
      />,
    );
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveTextContent('identity = fiery_eye_check()'));
    expect(firstReady).toHaveBeenCalledTimes(1);
    expect(secondReady).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(selector);
  });

  it('reports invalid code without creating or readying an editor', async () => {
    const onReady = vi.fn();
    const onError = vi.fn();
    render(
      <WeekFourVariableEvidencePythonEditor
        code="identity = ordinary_eyes()"
        sourceSpan={{ line: 2, from: 0, to: 8 }}
        onCodeChange={vi.fn()}
        onReady={onReady}
        onError={onError}
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('无法恢复');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onReady).not.toHaveBeenCalled();
  });
});
