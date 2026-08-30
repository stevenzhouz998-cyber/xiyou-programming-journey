import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { traceForField } from '../blockly/weekFourMappingContract';
import { WeekFourMappingScene } from './WeekFourMappingScene';

describe('W4-M1 mapping scene', () => {
  it('labels public cards and represents waiting, mismatch, and matched without deciding completion', () => {
    const ready = vi.fn();
    const { rerender } = render(<WeekFourMappingScene state="waiting" activeCardId={null} events={[]} muted reducedMotion onAssetsReady={ready} onAssetsError={vi.fn()} />);
    expect(screen.getByText('原著引子')).toBeInTheDocument();
    expect(screen.getByText('逻辑练习，非原著事件')).toBeInTheDocument();
    expect(screen.getByText('等待对照')).toBeInTheDocument();
    rerender(<WeekFourMappingScene state="mismatch" activeCardId="canon-mysterious-visitor" events={traceForField('appearance', { kind: 'python', line: 1, from: 3, to: 13 })} muted reducedMotion onAssetsReady={ready} onAssetsError={vi.fn()} />);
    expect(screen.getByText('发现差异')).toBeInTheDocument();
    rerender(<WeekFourMappingScene state="matched" activeCardId={null} events={traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' })} muted reducedMotion onAssetsReady={ready} onAssetsError={vi.fn()} />);
    expect(screen.getByText('映射一致')).toBeInTheDocument();
  });

  it('renders saved branch actions on public evidence cards as child-facing Chinese labels', () => {
    const events = traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' });
    render(<WeekFourMappingScene state="matched" activeCardId={null} events={events} muted reducedMotion onAssetsReady={vi.fn()} onAssetsError={vi.fn()} />);
    const cards = screen.getByLabelText('公开证据卡');
    expect(cards).toHaveTextContent('继续核验');
    expect(cards).toHaveTextContent('礼貌放行');
    expect(cards).not.toHaveTextContent('continue-verification');
    expect(cards).not.toHaveTextContent('polite-pass');
  });

  it('keeps a public evidence card as not run when it has no saved event', () => {
    render(<WeekFourMappingScene state="waiting" activeCardId={null} events={[]} muted reducedMotion onAssetsReady={vi.fn()} onAssetsError={vi.fn()} />);
    expect(screen.getByLabelText('公开证据卡')).toHaveTextContent('尚未运行');
  });

  it('waits for both resources, blocks readiness after an error, and retries with a new URL generation', () => {
    const error = vi.fn();
    const ready = vi.fn();
    render(<WeekFourMappingScene state="waiting" activeCardId={null} events={[]} muted={false} reducedMotion={false} onAssetsReady={ready} onAssetsError={error} />);
    const background = screen.getByAltText('白虎岭入口背景'); const states = screen.getByAltText('积木与 Python 映射状态');
    fireEvent.load(background); expect(ready).not.toHaveBeenCalled();
    fireEvent.error(states); expect(ready).not.toHaveBeenCalled();
    const before = background.getAttribute('src');
    fireEvent.click(screen.getByRole('button', { name: '重试场景资源' }));
    expect(screen.getByAltText('白虎岭入口背景').getAttribute('src')).not.toBe(before);
    fireEvent.load(screen.getByAltText('白虎岭入口背景')); fireEvent.load(screen.getByAltText('积木与 Python 映射状态'));
    expect(ready).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });
});
