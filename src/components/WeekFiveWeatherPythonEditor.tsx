import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { EditorView } from '@codemirror/view';
import { DEFAULT_WEEK_FIVE_WEATHER_PYTHON } from '../engine/weekFiveWeatherPythonGrammar';

export interface WeekFiveWeatherPythonEditorHandle {
  focusDefinition(): void;
  focusCall(): void;
  focusAction(): void;
}

export interface WeekFiveWeatherPythonEditorProps {
  code: string;
  disabled: boolean;
  onCodeChange(code: string): void;
  onReady(): void;
  onError(message: string): void;
}

export const WeekFiveWeatherPythonEditor = forwardRef<
  WeekFiveWeatherPythonEditorHandle,
  WeekFiveWeatherPythonEditorProps
>(function WeekFiveWeatherPythonEditor({ code, disabled, onCodeChange, onReady, onError }, ref) {
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
    focusDefinition: () => focus('def weather'),
    focusCall: () => focus('weather(', true),
    focusAction: () => focus('record_weather'),
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
                'aria-label': 'W5-M3 Python 参数代码',
                'aria-describedby': 'week-five-weather-editor-rules',
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
      <h3>Python 参数工作台</h3>
      <p id="week-five-weather-editor-rules">
        四次调用分别把风、云、雷、雨传给参数 <code>order</code>。函数体要使用这个参数，才能让每次实际记录跟着传入值变化。
      </p>
      <div ref={host} className="week-five-function-codemirror" />
      <div className="week-five-function-controls" aria-label="参数代码快捷调整">
        <button
          type="button"
          className="button button-ghost"
          disabled={disabled}
          onClick={() => focus('record_weather')}
        >
          定位函数体
        </button>
        <button
          type="button"
          className="button button-ghost"
          disabled={disabled}
          onClick={() => onCodeChange(DEFAULT_WEEK_FIVE_WEATHER_PYTHON)}
        >
          恢复默认代码
        </button>
        <button
          type="button"
          className="button button-ghost"
          disabled={disabled}
          onClick={() => focus('weather(', true)}
        >
          定位四次调用
        </button>
      </div>
    </section>
  );
});
