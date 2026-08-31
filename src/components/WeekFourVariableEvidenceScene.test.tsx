import { StrictMode } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_WEEK_FOUR_VARIABLE_PYTHON, parseWeekFourVariablePython } from '../engine/weekFourVariablePythonGrammar';
import { WeekFourVariableEvidenceScene } from './WeekFourVariableEvidenceScene';

describe('W4-M2 variable evidence scene', () => {
  it('renders only saved state and events, including the fixed safe epilogue', () => {
    const { rerender } = render(
      <WeekFourVariableEvidenceScene
        state="ready"
        events={[]}
        muted
        reducedMotion
        showCanonEpilogue={false}
        onAssetsReady={vi.fn()}
        onAssetsError={vi.fn()}
      />,
    );
    expect(screen.getByText('等待取证')).toBeInTheDocument();
    expect(screen.getByText('普通观察')).toBeInTheDocument();
    expect(screen.getByText('火眼核验')).toBeInTheDocument();
    expect(screen.queryByText('山岭疑云仍未散去')).not.toBeInTheDocument();

    rerender(
      <WeekFourVariableEvidenceScene
        state="sealed"
        events={[
          { kind: 'assign', line: 1, target: 'appearance', source: 'ordinary-eyes', value: '送斋女子', previousValue: null, overwrote: false, span: { line: 1, from: 0, to: 10 } },
          { kind: 'assign', line: 2, target: 'identity', source: 'fiery-eye-check', value: '白骨精', previousValue: null, overwrote: false, span: { line: 2, from: 0, to: 8 } },
          { kind: 'seal', line: 3, executed: true, appearance: '送斋女子', identity: '白骨精', missingVariable: null, span: { line: 3, from: 0, to: 33 } },
        ]}
        muted
        reducedMotion
        showCanonEpilogue
        onAssetsReady={vi.fn()}
        onAssetsError={vi.fn()}
      />,
    );
    expect(screen.getByText('两只证据匣已封存')).toBeInTheDocument();
    expect(screen.getByText('悟空识破第一次变化，变化者借法脱身，山岭疑云仍未散去')).toBeInTheDocument();
  });

  it('shows the saved second-line overwrite rather than the first appearance write', () => {
    render(
      <WeekFourVariableEvidenceScene
        state="unsealed"
        events={parseWeekFourVariablePython(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON).trace}
        muted
        reducedMotion
        showCanonEpilogue={false}
        onAssetsReady={vi.fn()}
        onAssetsError={vi.fn()}
      />,
    );
    const cards = screen.getByLabelText('公开证据卡');
    expect(cards).toHaveTextContent('火眼核验：白骨精覆盖了原记录');
    expect(screen.getByText('封存未完成')).toBeInTheDocument();
  });

  it('exposes only the current saved state and its matching event details', () => {
    const { rerender } = render(
      <WeekFourVariableEvidenceScene state="ready" events={[]} muted reducedMotion showCanonEpilogue={false} onAssetsReady={vi.fn()} onAssetsError={vi.fn()} />,
    );
    expect(screen.getByTestId('variable-state-ready')).toHaveTextContent('等待记录');
    expect(screen.queryByTestId('variable-state-unsealed')).not.toBeInTheDocument();
    expect(screen.queryByTestId('variable-state-sealed')).not.toBeInTheDocument();
    expect(screen.queryByText('覆盖了原记录')).not.toBeInTheDocument();
    expect(screen.queryByText('已封存')).not.toBeInTheDocument();

    rerender(
      <WeekFourVariableEvidenceScene state="unsealed" events={parseWeekFourVariablePython(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON).trace} muted reducedMotion showCanonEpilogue={false} onAssetsReady={vi.fn()} onAssetsError={vi.fn()} />,
    );
    expect(screen.getByTestId('variable-state-unsealed')).toHaveTextContent('外形匣被覆盖，身份匣为空');
    expect(screen.queryByTestId('variable-state-ready')).not.toBeInTheDocument();
    expect(screen.queryByTestId('variable-state-sealed')).not.toBeInTheDocument();
    expect(screen.getByText('火眼核验：白骨精覆盖了原记录')).toBeInTheDocument();
    expect(screen.queryByText('两匣分别封存')).not.toBeInTheDocument();

    rerender(
      <WeekFourVariableEvidenceScene
        state="sealed"
        events={[
          { kind: 'assign', line: 1, target: 'appearance', source: 'ordinary-eyes', value: '送斋女子', previousValue: null, overwrote: false, span: { line: 1, from: 0, to: 10 } },
          { kind: 'assign', line: 2, target: 'identity', source: 'fiery-eye-check', value: '白骨精', previousValue: null, overwrote: false, span: { line: 2, from: 0, to: 8 } },
          { kind: 'seal', line: 3, executed: true, appearance: '送斋女子', identity: '白骨精', missingVariable: null, span: { line: 3, from: 0, to: 33 } },
        ]}
        muted
        reducedMotion
        showCanonEpilogue={false}
        onAssetsReady={vi.fn()}
        onAssetsError={vi.fn()}
      />,
    );
    expect(screen.getByTestId('variable-state-sealed')).toHaveTextContent('两匣分别封存');
    expect(screen.queryByTestId('variable-state-ready')).not.toBeInTheDocument();
    expect(screen.queryByTestId('variable-state-unsealed')).not.toBeInTheDocument();
    expect(screen.getByText('已封存')).toBeInTheDocument();
    expect(screen.queryByText('覆盖了原记录')).not.toBeInTheDocument();
  });

  it('waits for all three approved assets, reports errors, and retries with new URLs', () => {
    const ready = vi.fn();
    const error = vi.fn();
    render(
      <WeekFourVariableEvidenceScene state="unsealed" events={[]} muted={false} reducedMotion={false} showCanonEpilogue={false} onAssetsReady={ready} onAssetsError={error} />,
    );
    const background = screen.getByAltText('白虎岭背景');
    const woman = screen.getByAltText('送斋来客');
    const states = screen.getByAltText('变量取证状态');
    expect(background).toHaveAttribute('src', expect.stringContaining('/assets/week-four-mapping/white-tiger-ridge-background.webp'));
    expect(woman).toHaveAttribute('src', expect.stringContaining('/assets/week-four-variables/woman-with-offering.webp'));
    expect(states).toHaveAttribute('src', expect.stringContaining('/assets/week-four-variables/variable-record-states.webp'));
    fireEvent.load(background);
    fireEvent.load(woman);
    expect(ready).not.toHaveBeenCalled();
    fireEvent.error(states);
    expect(error).toHaveBeenCalledTimes(1);
    const before = background.getAttribute('src');
    fireEvent.click(screen.getByRole('button', { name: '重试场景资源' }));
    expect(screen.getByAltText('白虎岭背景').getAttribute('src')).not.toBe(before);
    fireEvent.load(screen.getByAltText('白虎岭背景'));
    fireEvent.load(screen.getByAltText('送斋来客'));
    fireEvent.load(screen.getByAltText('变量取证状态'));
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('publishes each generation at most once and ignores old-generation late events', () => {
    const ready = vi.fn();
    const error = vi.fn();
    render(
      <StrictMode>
        <WeekFourVariableEvidenceScene state="ready" events={[]} muted reducedMotion showCanonEpilogue={false} onAssetsReady={ready} onAssetsError={error} />
      </StrictMode>,
    );
    const oldBackground = screen.getByAltText('白虎岭背景');
    const oldStates = screen.getByAltText('变量取证状态');
    fireEvent.error(oldStates);
    fireEvent.error(oldStates);
    fireEvent.error(oldBackground);
    expect(error).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '重试场景资源' }));
    fireEvent.load(oldBackground);
    fireEvent.error(oldStates);
    expect(error).toHaveBeenCalledTimes(1);
    fireEvent.load(screen.getByAltText('白虎岭背景'));
    fireEvent.load(screen.getByAltText('送斋来客'));
    fireEvent.load(screen.getByAltText('变量取证状态'));
    fireEvent.load(screen.getByAltText('变量取证状态'));
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('clips the one three-cell state sprite to the saved state while retaining exactly three asset images', () => {
    const { rerender, container } = render(
      <WeekFourVariableEvidenceScene state="ready" events={[]} muted reducedMotion showCanonEpilogue={false} onAssetsReady={vi.fn()} onAssetsError={vi.fn()} />,
    );
    const sprite = screen.getByTestId('variable-state-sprite');
    expect(sprite).toHaveAttribute('data-state-cell', 'ready');
    expect(sprite).toHaveStyle({ overflow: 'hidden' });
    expect(screen.getByAltText('变量取证状态')).toHaveStyle({ transform: 'translateX(0%)' });
    expect(container.querySelectorAll('img')).toHaveLength(3);

    rerender(<WeekFourVariableEvidenceScene state="unsealed" events={[]} muted reducedMotion showCanonEpilogue={false} onAssetsReady={vi.fn()} onAssetsError={vi.fn()} />);
    expect(screen.getByTestId('variable-state-sprite')).toHaveAttribute('data-state-cell', 'unsealed');
    expect(screen.getByAltText('变量取证状态')).toHaveStyle({ transform: 'translateX(-33.333333%)' });

    rerender(<WeekFourVariableEvidenceScene state="sealed" events={[]} muted reducedMotion showCanonEpilogue={false} onAssetsReady={vi.fn()} onAssetsError={vi.fn()} />);
    expect(screen.getByTestId('variable-state-sprite')).toHaveAttribute('data-state-cell', 'sealed');
    expect(screen.getByAltText('变量取证状态')).toHaveStyle({ transform: 'translateX(-66.666667%)' });
  });

  it('keeps the full visitor image and square state cells inside one responsive scene-props wrapper', () => {
    const { container } = render(
      <WeekFourVariableEvidenceScene state="ready" events={[]} muted reducedMotion showCanonEpilogue={false} onAssetsReady={vi.fn()} onAssetsError={vi.fn()} />,
    );
    const props = container.querySelector('.week-four-variable-scene-props');
    expect(props).not.toBeNull();
    expect(props).toContainElement(screen.getByAltText('送斋来客'));
    expect(props).toContainElement(screen.getByTestId('variable-state-sprite'));

    const css = readFileSync(resolve(process.cwd(), 'src/components/WeekFourVariableEvidenceExperience.css'), 'utf8');
    expect(css).toMatch(/\.week-four-variable-scene-props\s*\{[^}]*display:\s*grid/s);
    expect(css).toMatch(/\.week-four-variable-scene-props\s*>\s*img\s*\{[^}]*object-fit:\s*contain/s);
    expect(css).toMatch(/\.week-four-variable-state-sprite\s*\{[^}]*aspect-ratio:\s*1\s*\/\s*1/s);
    expect(css).toMatch(/\.week-four-variable-layout\s*>\s*\.week-four-variable-evidence-scene\s*\{[^}]*grid-row:\s*1\s*\/\s*span\s*2/s);
    expect(css).toMatch(/@media\s*\(max-width:\s*900px\)[\s\S]*\.week-four-variable-layout\s*>\s*\.week-four-variable-evidence-scene\s*\{[^}]*grid-column:\s*1/s);
  });
});
