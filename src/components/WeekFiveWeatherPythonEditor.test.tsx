import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_WEEK_FIVE_WEATHER_PYTHON } from '../engine/weekFiveWeatherPythonGrammar';
import { WeekFiveWeatherPythonEditor } from './WeekFiveWeatherPythonEditor';

describe('WeekFiveWeatherPythonEditor', () => {
  it('keeps focus helpers read-only', () => {
    const onCodeChange = vi.fn();
    render(
      <WeekFiveWeatherPythonEditor
        code={DEFAULT_WEEK_FIVE_WEATHER_PYTHON}
        disabled={false}
        onCodeChange={onCodeChange}
        onReady={vi.fn()}
        onError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '定位函数体' }));
    fireEvent.click(screen.getByRole('button', { name: '定位四次调用' }));
    expect(onCodeChange).not.toHaveBeenCalled();
  });

  it('restores the default code only after the explicit reset action', () => {
    const onCodeChange = vi.fn();
    const props = { disabled: false, onCodeChange, onReady: vi.fn(), onError: vi.fn() };
    render(<WeekFiveWeatherPythonEditor {...props} code="def weather(order):" />);

    fireEvent.click(screen.getByRole('button', { name: '恢复默认代码' }));
    expect(onCodeChange).toHaveBeenLastCalledWith(DEFAULT_WEEK_FIVE_WEATHER_PYTHON);
  });
});
