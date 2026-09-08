import { createRef, useState } from 'react';
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_WEEK_FOUR_BRANCH_PYTHON,
  SOLVED_WEEK_FOUR_BRANCH_PYTHON,
} from '../engine/weekFourBranchPythonGrammar';
import {
  WeekFourBranchPythonEditor,
  type WeekFourBranchPythonEditorHandle,
} from './WeekFourBranchPythonEditor';

afterEach(cleanup);

const editorView = async () => {
  const textbox = await screen.findByRole('textbox', { name: 'W4-M3 Python 代码' });
  const view = EditorView.findFromDOM(textbox);
  if (!view) throw new Error('真实 CodeMirror 未挂载');
  return view;
};

function ControlledEditor({ onCodeChange }: { onCodeChange: (code: string) => void }) {
  const [code, setCode] = useState(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
  return <WeekFourBranchPythonEditor code={code} onCodeChange={(next) => {
    onCodeChange(next);
    setCode(next);
  }} />;
}

const tapWithMouse = (element: HTMLElement) => {
  fireEvent.pointerDown(element, { pointerType: 'mouse', button: 0 });
  fireEvent.pointerUp(element, { pointerType: 'mouse', button: 0 });
  fireEvent.click(element);
};

const tapWithTouch = (element: HTMLElement) => {
  fireEvent.touchStart(element, { touches: [{ identifier: 1 }] });
  fireEvent.touchEnd(element, { changedTouches: [{ identifier: 1 }] });
  fireEvent.click(element);
};

describe('W4-M3 restricted branch Python editor', () => {
  it('contains no environment-detected test fallback in production', () => {
    const source = readFileSync('src/components/WeekFourBranchPythonEditor.tsx', 'utf8');
    expect(source).not.toMatch(/navigator\.userAgent|includes\(['"]jsdom['"]\)/);
    expect(source).not.toMatch(/<pre>|React\.createElement\(['"]pre['"]/);
  });

  it('uses official CodeMirror types without any transaction, update, command, or view casts', () => {
    const source = readFileSync('src/components/WeekFourBranchPythonEditor.tsx', 'utf8');
    expect(source).toMatch(/import type \{ Transaction \} from '@codemirror\/state';/);
    expect(source).toMatch(/import type \{ Command, EditorView, ViewUpdate \} from '@codemirror\/view';/);
    expect(source).not.toMatch(/transaction: any|update: any|editor: any|as unknown as/);
  });

  it('uses the same CodeMirror document transaction for connector and indentation controls', async () => {
    const onCodeChange = vi.fn();
    const { rerender } = render(<WeekFourBranchPythonEditor code={DEFAULT_WEEK_FOUR_BRANCH_PYTHON} onCodeChange={onCodeChange} />);
    await editorView();

    fireEvent.change(screen.getByRole('combobox', { name: '分支连接词' }), { target: { value: 'else:' } });
    expect(onCodeChange).toHaveBeenLastCalledWith('if identity == "白骨精":\n    keep_observing()\nelse:\npolite_help()');

    const connectorCode = onCodeChange.mock.calls.at(-1)?.[0] as string;
    rerender(<WeekFourBranchPythonEditor code={connectorCode} onCodeChange={onCodeChange} />);
    await editorView();
    fireEvent.change(screen.getByRole('combobox', { name: '礼貌帮助缩进' }), { target: { value: '4' } });
    expect(onCodeChange).toHaveBeenLastCalledWith(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
  });

  it('accepts direct safe-envelope typing e to el to else colon and Backspace', async () => {
    const onCodeChange = vi.fn();
    render(<WeekFourBranchPythonEditor code={DEFAULT_WEEK_FOUR_BRANCH_PYTHON} onCodeChange={onCodeChange} />);
    const view = await editorView();
    const actionStart = DEFAULT_WEEK_FOUR_BRANCH_PYTHON.lastIndexOf('polite_help');
    view.dispatch({ selection: { anchor: actionStart }, changes: { from: actionStart, insert: 'e\n' } });
    expect(onCodeChange).toHaveBeenLastCalledWith(DEFAULT_WEEK_FOUR_BRANCH_PYTHON.replace('polite_help()', 'e\npolite_help()'));

    const eCode = onCodeChange.mock.calls.at(-1)?.[0] as string;
    view.dispatch({ changes: { from: eCode.indexOf('\ne') + 2, insert: 'l' } });
    expect(onCodeChange).toHaveBeenLastCalledWith(eCode.replace('\ne\n', '\nel\n'));
    const elCode = onCodeChange.mock.calls.at(-1)?.[0] as string;
    view.dispatch({ changes: { from: elCode.indexOf('\nel') + 3, insert: 'se:' } });
    expect(onCodeChange).toHaveBeenLastCalledWith(elCode.replace('\nel\n', '\nelse:\n'));
    const elseCode = onCodeChange.mock.calls.at(-1)?.[0] as string;
    view.dispatch({ changes: { from: elseCode.indexOf('else:') + 4, to: elseCode.indexOf('else:') + 5, insert: '' } });
    expect(onCodeChange).toHaveBeenLastCalledWith(elseCode.replace('else:', 'else'));
  });

  it('lets Enter create the connector row and Space form partial action indentation', async () => {
    const onCodeChange = vi.fn();
    render(<WeekFourBranchPythonEditor code={DEFAULT_WEEK_FOUR_BRANCH_PYTHON} onCodeChange={onCodeChange} />);
    const view = await editorView();
    const actionStart = DEFAULT_WEEK_FOUR_BRANCH_PYTHON.lastIndexOf('polite_help');
    view.dispatch({ selection: { anchor: actionStart }, changes: { from: actionStart, insert: '\n' } });
    expect(onCodeChange).toHaveBeenLastCalledWith(DEFAULT_WEEK_FOUR_BRANCH_PYTHON.replace('polite_help()', '\npolite_help()'));
    const blankConnector = onCodeChange.mock.calls.at(-1)?.[0] as string;
    view.dispatch({ changes: { from: blankConnector.lastIndexOf('polite_help'), insert: ' ' } });
    expect(onCodeChange).toHaveBeenLastCalledWith(blankConnector.replace('polite_help()', ' polite_help()'));
  });

  it('maps Tab and Shift+Tab on the action line to the same four-space text change', async () => {
    const onCodeChange = vi.fn();
    render(<WeekFourBranchPythonEditor code={DEFAULT_WEEK_FOUR_BRANCH_PYTHON} onCodeChange={onCodeChange} />);
    const view = await editorView();
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'W4-M3 Python 代码' }), { key: 'Tab' });
    await waitFor(() => expect(onCodeChange).toHaveBeenLastCalledWith(DEFAULT_WEEK_FOUR_BRANCH_PYTHON.replace('\npolite_help()', '\n    polite_help()')));

    const nested = onCodeChange.mock.calls.at(-1)?.[0] as string;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: nested }, selection: { anchor: nested.length } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'W4-M3 Python 代码' }), { key: 'Tab', shiftKey: true });
    await waitFor(() => expect(onCodeChange).toHaveBeenLastCalledWith(DEFAULT_WEEK_FOUR_BRANCH_PYTHON));
  });

  it('rejects edits to fixed condition and action names without publishing parallel state', async () => {
    const onCodeChange = vi.fn();
    render(<WeekFourBranchPythonEditor code={DEFAULT_WEEK_FOUR_BRANCH_PYTHON} onCodeChange={onCodeChange} />);
    const view = await editorView();
    view.dispatch({ changes: { from: 3, to: 11, insert: 'appearance' } });
    view.dispatch({ changes: { from: DEFAULT_WEEK_FOUR_BRANCH_PYTHON.indexOf('keep_observing'), to: DEFAULT_WEEK_FOUR_BRANCH_PYTHON.indexOf('keep_observing') + 14, insert: 'polite_help' } });
    expect(view.state.doc.toString()).toBe(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    expect(onCodeChange).not.toHaveBeenCalled();
  });

  it('synchronizes a new code prop into the existing editor without callback loops before the next real edit', async () => {
    const onCodeChange = vi.fn();
    const { rerender } = render(<WeekFourBranchPythonEditor code={DEFAULT_WEEK_FOUR_BRANCH_PYTHON} onCodeChange={onCodeChange} />);
    const view = await editorView();
    rerender(<WeekFourBranchPythonEditor code={SOLVED_WEEK_FOUR_BRANCH_PYTHON} onCodeChange={onCodeChange} />);
    await waitFor(() => expect(view.state.doc.toString()).toBe(SOLVED_WEEK_FOUR_BRANCH_PYTHON));
    expect(onCodeChange).not.toHaveBeenCalled();

    const actionStart = SOLVED_WEEK_FOUR_BRANCH_PYTHON.lastIndexOf('    polite_help');
    view.dispatch({ changes: { from: actionStart, to: actionStart + 1, insert: '' } });
    expect(view.state.doc.toString()).toBe(SOLVED_WEEK_FOUR_BRANCH_PYTHON.replace('\n    polite_help()', '\n   polite_help()'));
    expect(onCodeChange).toHaveBeenLastCalledWith(view.state.doc.toString());
  });

  it('rejects direct document changes immediately after disabled rerender while still accepting external prop sync', async () => {
    const onCodeChange = vi.fn();
    const { rerender } = render(<WeekFourBranchPythonEditor code={DEFAULT_WEEK_FOUR_BRANCH_PYTHON} onCodeChange={onCodeChange} />);
    const view = await editorView();
    rerender(<WeekFourBranchPythonEditor code={DEFAULT_WEEK_FOUR_BRANCH_PYTHON} disabled onCodeChange={onCodeChange} />);

    const actionStart = DEFAULT_WEEK_FOUR_BRANCH_PYTHON.lastIndexOf('polite_help');
    view.dispatch({ changes: { from: actionStart, insert: ' ' } });
    expect(view.state.doc.toString()).toBe(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    expect(onCodeChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '使用 else:' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '缩进 4 空格' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '使用 else:' }));
    expect(view.state.doc.toString()).toBe(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);

    rerender(<WeekFourBranchPythonEditor code={SOLVED_WEEK_FOUR_BRANCH_PYTHON} disabled onCodeChange={onCodeChange} />);
    await waitFor(() => expect(view.state.doc.toString()).toBe(SOLVED_WEEK_FOUR_BRANCH_PYTHON));
    expect(onCodeChange).not.toHaveBeenCalled();
    const solvedActionStart = SOLVED_WEEK_FOUR_BRANCH_PYTHON.lastIndexOf('    polite_help');
    view.dispatch({ changes: { from: solvedActionStart, to: solvedActionStart + 1, insert: '' } });
    expect(view.state.doc.toString()).toBe(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    expect(onCodeChange).not.toHaveBeenCalled();
  });

  it('keeps parent onReady exceptions outside editor load failures', async () => {
    const onError = vi.fn();
    const onReady = vi.fn(() => { throw new Error('parent ready failed'); });
    render(<WeekFourBranchPythonEditor code={DEFAULT_WEEK_FOUR_BRANCH_PYTHON} onCodeChange={vi.fn()} onReady={onReady} onError={onError} />);
    const view = await editorView();
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(view.state.doc.toString()).toBe(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    expect(onError).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uses mouse pointer taps on connector and indentation controls to update the real editor document', async () => {
    const onCodeChange = vi.fn();
    render(<ControlledEditor onCodeChange={onCodeChange} />);
    const view = await editorView();
    tapWithMouse(screen.getByRole('button', { name: '使用 else:' }));
    await waitFor(() => expect(view.state.doc.toString()).toContain('\nelse:\n'));
    tapWithMouse(screen.getByRole('button', { name: '缩进 4 空格' }));
    await waitFor(() => expect(view.state.doc.toString()).toBe(SOLVED_WEEK_FOUR_BRANCH_PYTHON));
    expect(onCodeChange).toHaveBeenCalledTimes(2);
  });

  it('uses touch taps on connector and indentation controls to update the same real editor document', async () => {
    const onCodeChange = vi.fn();
    render(<ControlledEditor onCodeChange={onCodeChange} />);
    const view = await editorView();
    tapWithTouch(screen.getByRole('button', { name: '使用 else:' }));
    await waitFor(() => expect(view.state.doc.toString()).toContain('\nelse:\n'));
    tapWithTouch(screen.getByRole('button', { name: '缩进 4 空格' }));
    await waitFor(() => expect(view.state.doc.toString()).toBe(SOLVED_WEEK_FOUR_BRANCH_PYTHON));
    expect(onCodeChange).toHaveBeenCalledTimes(2);
  });

  it('supports Enter and Space on accessible controls and keeps disabled mode inert', async () => {
    const onCodeChange = vi.fn();
    const { rerender } = render(<WeekFourBranchPythonEditor code={DEFAULT_WEEK_FOUR_BRANCH_PYTHON} onCodeChange={onCodeChange} />);
    await editorView();
    fireEvent.keyDown(screen.getByRole('button', { name: '使用 else:' }), { key: 'Enter' });
    expect(onCodeChange).toHaveBeenCalledWith(expect.stringContaining('\nelse:\n'));
    fireEvent.keyDown(screen.getByRole('button', { name: '缩进 4 空格' }), { key: ' ' });
    expect(onCodeChange).toHaveBeenCalledWith(expect.stringContaining('\n    polite_help()'));

    onCodeChange.mockClear();
    rerender(<WeekFourBranchPythonEditor code={DEFAULT_WEEK_FOUR_BRANCH_PYTHON} disabled onCodeChange={onCodeChange} />);
    expect(screen.getByRole('combobox', { name: '分支连接词' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '使用 else:' }));
    expect(onCodeChange).not.toHaveBeenCalled();
  });

  it('reports unsafe restored code and exposes connector/action focus handles', async () => {
    const onError = vi.fn();
    const ref = createRef<WeekFourBranchPythonEditorHandle>();
    const { rerender } = render(<WeekFourBranchPythonEditor ref={ref} code={DEFAULT_WEEK_FOUR_BRANCH_PYTHON} onCodeChange={vi.fn()} />);
    await editorView();
    ref.current?.focusConnector();
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: '分支连接词' }));
    ref.current?.focusAction();
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: '礼貌帮助缩进' }));

    rerender(<WeekFourBranchPythonEditor code={'if identity:\n    attack()'} onCodeChange={vi.fn()} onError={onError} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('无法恢复');
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
