import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Transaction } from '@codemirror/state';
import type { Command, EditorView, ViewUpdate } from '@codemirror/view';
import { parseWeekFourBranchDraftEnvelope } from '../engine/weekFourBranchPythonGrammar';

export interface WeekFourBranchPythonEditorHandle {
  focusConnector(): void;
  focusAction(): void;
}

export interface WeekFourBranchPythonEditorProps {
  code: string;
  disabled?: boolean;
  onCodeChange(code: string): void;
  onReady?(): void;
  onError?(message: string): void;
}

type EditorController = {
  view: EditorView;
  setDisabled(disabled: boolean): void;
};

const parseEnvelope = (code: string) => {
  try { return parseWeekFourBranchDraftEnvelope(code); }
  catch { return null; }
};

const lineSeparator = (code: string) => code.includes('\r\n') && !code.replaceAll('\r\n', '').includes('\n') ? '\r\n' : '\n';

function withConnector(code: string, connector: '' | 'else:'): string | null {
  const draft = parseEnvelope(code);
  if (!draft) return null;
  const lines = draft.normalizedCode.split('\n');
  if (draft.connector === null) {
    if (connector === '') return code;
    lines.splice(2, 0, connector);
  } else if (connector === '') {
    lines.splice(2, 1);
  } else {
    lines[2] = connector;
  }
  return lines.join(lineSeparator(code));
}

function withActionIndent(code: string, indent: 0 | 4): string | null {
  const draft = parseEnvelope(code);
  if (!draft) return null;
  const lines = draft.normalizedCode.split('\n');
  const actionIndex = lines.length - 1;
  lines[actionIndex] = `${' '.repeat(indent)}polite_help()`;
  return lines.join(lineSeparator(code));
}

export const WeekFourBranchPythonEditor = forwardRef<WeekFourBranchPythonEditorHandle, WeekFourBranchPythonEditorProps>(function WeekFourBranchPythonEditor(
  { code, disabled = false, onCodeChange, onReady, onError },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const connectorRef = useRef<HTMLSelectElement>(null);
  const actionRef = useRef<HTMLSelectElement>(null);
  const controllerRef = useRef<EditorController | null>(null);
  const callbacksRef = useRef({ onCodeChange, onReady, onError });
  const codeRef = useRef(code);
  const disabledRef = useRef(disabled);
  const syncingExternalCodeRef = useRef(false);
  const reportedValidationErrorRef = useRef<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const draft = parseEnvelope(code);
  const validationError = draft ? null : '保存的 Python 不在 W4-M3 安全编辑范围内。';
  const error = validationError ?? runtimeError;

  callbacksRef.current = { onCodeChange, onReady, onError };
  codeRef.current = code;
  disabledRef.current = disabled;

  useImperativeHandle(ref, () => ({
    focusConnector: () => connectorRef.current?.focus(),
    focusAction: () => actionRef.current?.focus(),
  }), []);

  useEffect(() => {
    if (!validationError) {
      reportedValidationErrorRef.current = null;
      return;
    }
    if (reportedValidationErrorRef.current === validationError) return;
    reportedValidationErrorRef.current = validationError;
    callbacksRef.current.onError?.(validationError);
  }, [validationError]);

  useEffect(() => {
    let disposed = false;
    if (!draft || !hostRef.current || controllerRef.current) return;
    const reportLoadFailure = (reason: unknown) => {
      if (disposed) return;
      const message = reason instanceof Error ? reason.message : 'Python 编辑器无法加载。';
      setRuntimeError(message);
      callbacksRef.current.onError?.(message);
    };
    void Promise.all([
      import('@codemirror/state'),
      import('@codemirror/view'),
      import('@codemirror/lang-python'),
    ]).then(([state, view, python]) => {
      if (disposed || !hostRef.current || !parseEnvelope(codeRef.current)) return;
      const editable = new state.Compartment();
      let editor: EditorView;
      try {
        const transactionFilter = state.EditorState.transactionFilter.of((transaction: Transaction) => {
          if (!transaction.docChanged) return transaction;
          if (disabledRef.current && !syncingExternalCodeRef.current) return [];
          return parseEnvelope(transaction.newDoc.toString()) ? transaction : [];
        });
        const updateListener = view.EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged && !syncingExternalCodeRef.current && !disabledRef.current) {
            callbacksRef.current.onCodeChange(update.state.doc.toString());
          }
        });
        const actionIndent = (target: 0 | 4): Command => (activeView: EditorView) => {
          if (disabledRef.current) return true;
          const next = withActionIndent(activeView.state.doc.toString(), target);
          if (!next || next === activeView.state.doc.toString()) return true;
          activeView.dispatch({ changes: { from: 0, to: activeView.state.doc.length, insert: next } });
          return true;
        };
        editor = new view.EditorView({
          state: state.EditorState.create({
            doc: codeRef.current,
            extensions: [
              python.python(),
              transactionFilter,
              updateListener,
              view.keymap.of([
                { key: 'Tab', run: actionIndent(4) },
                { key: 'Shift-Tab', run: actionIndent(0) },
              ]),
              view.EditorView.contentAttributes.of({
                'aria-label': 'W4-M3 Python 代码',
                'aria-describedby': 'week-four-branch-editor-rules',
              }),
              editable.of(view.EditorView.editable.of(!disabledRef.current)),
            ],
          }),
          parent: hostRef.current,
        });
      } catch (reason: unknown) {
        reportLoadFailure(reason);
        return;
      }
      controllerRef.current = {
        view: editor,
        setDisabled(nextDisabled) {
          editor.dispatch({ effects: editable.reconfigure(view.EditorView.editable.of(!nextDisabled)) });
        },
      };
      try {
        callbacksRef.current.onReady?.();
      } catch {
        // Parent callback failures are not editor load failures.
      }
    }, reportLoadFailure);
    return () => {
      disposed = true;
      controllerRef.current?.view.destroy();
      controllerRef.current = null;
    };
  }, [Boolean(draft)]);

  useEffect(() => { controllerRef.current?.setDisabled(disabled); }, [disabled]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (!draft || !controller || controller.view.state.doc.toString() === code) return;
    syncingExternalCodeRef.current = true;
    try {
      controller.view.dispatch({ changes: { from: 0, to: controller.view.state.doc.length, insert: code } });
    } finally {
      syncingExternalCodeRef.current = false;
    }
  }, [code, Boolean(draft)]);

  const publish = (next: string | null) => {
    if (disabled || error || !next || next === code || !parseEnvelope(next)) return;
    const controller = controllerRef.current;
    if (controller) {
      controller.view.dispatch({ changes: { from: 0, to: controller.view.state.doc.length, insert: next } });
      return;
    }
    callbacksRef.current.onCodeChange(next);
  };
  const onControlKey = (event: React.KeyboardEvent<HTMLButtonElement>, action: () => void) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    action();
  };
  const connectorValue = draft?.connector === null || draft?.connector === ''
    ? 'none'
    : draft?.connector === 'else:' ? 'else:' : 'partial';
  const indentValue = draft?.actionIndent === 0 || draft?.actionIndent === 4
    ? String(draft.actionIndent)
    : 'partial';

  return (
    <section className="week-four-branch-python-panel">
      <header>
        <h3>Python 分支归位</h3>
        <p id="week-four-branch-editor-rules">条件和动作名称已固定；只能编辑分支连接词和礼貌帮助前的空格。</p>
      </header>
      <div ref={hostRef} className="week-four-branch-codemirror" />
      <label>分支连接词
        <select
          ref={connectorRef}
          aria-label="分支连接词"
          value={connectorValue}
          disabled={disabled || Boolean(error)}
          onChange={(event) => publish(withConnector(code, event.target.value === 'else:' ? 'else:' : ''))}
        >
          <option value="none">无连接词</option>
          <option value="else:">else:</option>
          {connectorValue === 'partial' ? <option value="partial" disabled>正在输入 {draft?.connector}</option> : null}
        </select>
      </label>
      <div role="group" aria-label="分支连接词快捷选择">
        <button type="button" disabled={disabled || Boolean(error)} onClick={() => publish(withConnector(code, ''))} onKeyDown={(event) => onControlKey(event, () => publish(withConnector(code, '')))}>使用无连接词</button>
        <button type="button" disabled={disabled || Boolean(error)} onClick={() => publish(withConnector(code, 'else:'))} onKeyDown={(event) => onControlKey(event, () => publish(withConnector(code, 'else:')))}>使用 else:</button>
      </div>
      <label>礼貌帮助缩进
        <select
          ref={actionRef}
          aria-label="礼貌帮助缩进"
          value={indentValue}
          disabled={disabled || Boolean(error)}
          onChange={(event) => publish(withActionIndent(code, event.target.value === '4' ? 4 : 0))}
        >
          <option value="0">条件外（0 空格）</option>
          <option value="4">缩进 4 空格</option>
          {indentValue === 'partial' ? <option value="partial" disabled>正在输入 {draft?.actionIndent} 空格</option> : null}
        </select>
      </label>
      <div role="group" aria-label="礼貌帮助缩进快捷选择">
        <button type="button" disabled={disabled || Boolean(error)} onClick={() => publish(withActionIndent(code, 0))} onKeyDown={(event) => onControlKey(event, () => publish(withActionIndent(code, 0)))}>置于条件外</button>
        <button type="button" disabled={disabled || Boolean(error)} onClick={() => publish(withActionIndent(code, 4))} onKeyDown={(event) => onControlKey(event, () => publish(withActionIndent(code, 4)))}>缩进 4 空格</button>
      </div>
      {error ? <p role="alert">无法恢复分支 Python：{error}</p> : null}
    </section>
  );
});
