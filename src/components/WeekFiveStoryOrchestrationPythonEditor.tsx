import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { EditorView } from '@codemirror/view';
import { DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON } from '../engine/weekFiveStoryOrchestrationPythonGrammar';

export interface WeekFiveStoryOrchestrationPythonEditorHandle {
  focusDefinition(): void;
  focusCall(): void;
  focusAction(): void;
  focusLine(line: number): void;
}

export interface WeekFiveStoryOrchestrationPythonEditorProps {
  code: string;
  disabled: boolean;
  onCodeChange(code: string): void;
  onReady(): void;
  onError(message: string): void;
}

export const WeekFiveStoryOrchestrationPythonEditor = forwardRef<
  WeekFiveStoryOrchestrationPythonEditorHandle,
  WeekFiveStoryOrchestrationPythonEditorProps
>(function WeekFiveStoryOrchestrationPythonEditor({ code, disabled, onCodeChange, onReady, onError }, ref) {
  const host = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const current = useRef({ code, disabled, onCodeChange });
  const sync = useRef(false);
  const setEditable = useRef<(value: boolean) => void>(() => {});
  current.current = { code, disabled, onCodeChange };

  const focus = (needle: string, last = false) => {
    const view = viewRef.current;
    if (!view) return;
    const text = view.state.doc.toString();
    const start = Math.max(0, last ? text.lastIndexOf(needle) : text.indexOf(needle));
    view.dispatch({ selection: { anchor: start }, scrollIntoView: true });
    view.focus();
  };

  useImperativeHandle(ref, () => ({
    focusDefinition: () => focus('def rescue_monks'),
    focusCall: () => focus('def record_chechi_story'),
    focusAction: () => focus('register(monk)', true),
    focusLine: (line) => {
      const view = viewRef.current;
      if (!view) return;
      const bounded = Math.max(1, Math.min(line, view.state.doc.lines));
      const start = view.state.doc.line(bounded).from;
      view.dispatch({ selection: { anchor: start }, scrollIntoView: true });
      view.focus();
    },
  }), []);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        const [state, view, { python }] = await Promise.all([
          import('@codemirror/state'),
          import('@codemirror/view'),
          import('@codemirror/lang-python'),
        ]);
        if (disposed || !host.current) return;
        const editable = new state.Compartment();
        const editor = new view.EditorView({
          state: state.EditorState.create({
            doc: current.current.code,
            extensions: [
              python(),
              view.lineNumbers(),
              view.EditorView.lineWrapping,
              view.EditorView.contentAttributes.of({
                'aria-label': 'W5-M5 Python 故事总编排代码',
                'aria-describedby': 'week-five-story-orchestration-editor-rules',
                role: 'textbox',
                'aria-multiline': 'true',
              }),
              editable.of(view.EditorView.editable.of(!current.current.disabled)),
              view.EditorView.updateListener.of((update) => {
                if (update.docChanged && !sync.current && !current.current.disabled) {
                  current.current.onCodeChange(update.state.doc.toString());
                }
              }),
            ],
          }),
          parent: host.current,
        });
        viewRef.current = editor;
        setEditable.current = (value) => editor.dispatch({
          effects: editable.reconfigure(view.EditorView.editable.of(value)),
        });
        onReady();
      } catch (error) {
        if (!disposed) onError(error instanceof Error ? error.message : 'Python 编辑器加载失败');
      }
    })();
    return () => {
      disposed = true;
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === code) return;
    sync.current = true;
    try {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
    } finally {
      sync.current = false;
    }
  }, [code]);

  useEffect(() => {
    setEditable.current(!disabled);
  }, [disabled]);

  return (
    <section className="week-five-function-python-panel">
      <h3>Python 故事总编排工作台</h3>
      <p id="week-five-story-orchestration-editor-rules">
        保留解困循环、三清观函数、天气参数和后续小函数的职责；用一个总函数按故事顺序启动四个阶段。
      </p>
      <div ref={host} className="week-five-function-codemirror" />
      <div className="week-five-function-controls" aria-label="故事总编排代码快捷调整">
        <button
          type="button"
          className="button button-ghost"
          disabled={disabled}
          onClick={() => focus('register(monk)', true)}
        >
          定位解困循环
        </button>
        <button
          type="button"
          className="button button-ghost"
          disabled={disabled}
          onClick={() => onCodeChange(DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON)}
        >
          恢复默认代码
        </button>
        <button
          type="button"
          className="button button-ghost"
          disabled={disabled}
          onClick={() => focus('def record_chechi_story')}
        >
          定位总编排
        </button>
      </div>
    </section>
  );
});
