import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WEEK_FOUR_BRANCH_CARDS } from '../engine/weekFourBranchContract';
import { parseWeekFourBranchPython, SOLVED_WEEK_FOUR_BRANCH_PYTHON } from '../engine/weekFourBranchPythonGrammar';
import { WeekFourBranchScene } from './WeekFourBranchScene';

const renderScene = (overrides: Partial<Parameters<typeof WeekFourBranchScene>[0]> = {}) => render(
  <WeekFourBranchScene
    state="ready"
    cards={WEEK_FOUR_BRANCH_CARDS}
    events={[]}
    muted
    reducedMotion
    showCanonEpilogue={false}
    onAssetsReady={vi.fn()}
    onAssetsError={vi.fn()}
    {...overrides}
  />,
);

describe('W4-M3 branch scene', () => {
  it('shows two same-appearance cards with public identities and marks practice as non-canon', () => {
    renderScene();
    expect(screen.getAllByText('外形：老妇')).toHaveLength(2);
    expect(screen.getByText('公开身份核验：白骨精')).toBeInTheDocument();
    expect(screen.getByText('公开练习身份：山中采药人')).toBeInTheDocument();
    expect(screen.getByText('练习卡，非原著情节')).toBeInTheDocument();
  });

  it('renders route results only from saved events and keeps safe canon wording', () => {
    const parsed = parseWeekFourBranchPython(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    if (!('trace' in parsed)) throw new Error('测试代码必须可运行');
    const { rerender } = renderScene({ state: 'proven', events: [], showCanonEpilogue: true });
    expect(screen.queryByText('只走观察路线')).not.toBeInTheDocument();
    rerender(<WeekFourBranchScene state="proven" cards={WEEK_FOUR_BRANCH_CARDS} events={parsed.trace} muted reducedMotion showCanonEpilogue onAssetsReady={vi.fn()} onAssetsError={vi.fn()} />);
    expect(screen.getByText('只走观察路线')).toBeInTheDocument();
    expect(screen.getByText('只走礼貌帮助路线')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('孙悟空安全地再次核验');
    expect(screen.getByRole('note')).not.toHaveTextContent(/攻击|尸体|骷髅|恐怖/);
  });

  it('uses the exact three approved asset URLs and reports all three loaded once', () => {
    const ready = vi.fn();
    const error = vi.fn();
    renderScene({ onAssetsReady: ready, onAssetsError: error });
    const background = screen.getByAltText('白虎岭背景');
    const visitor = screen.getByAltText('老妇来客');
    const states = screen.getByTestId('branch-route-states-loader');
    expect(background).toHaveAttribute('src', expect.stringContaining('/assets/week-four-mapping/white-tiger-ridge-background.webp'));
    expect(visitor).toHaveAttribute('src', expect.stringContaining('/assets/week-four-branches/old-woman-visitor.webp'));
    expect(states).toHaveAttribute('src', expect.stringContaining('/assets/week-four-branches/branch-route-states.webp'));
    fireEvent.load(background);
    fireEvent.load(visitor);
    expect(ready).not.toHaveBeenCalled();
    fireEvent.load(states);
    fireEvent.load(states);
    expect(ready).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });

  it('reports one local asset error per generation and retries with fresh URLs', () => {
    const ready = vi.fn();
    const error = vi.fn();
    renderScene({ onAssetsReady: ready, onAssetsError: error });
    const oldBackground = screen.getByAltText('白虎岭背景');
    fireEvent.error(oldBackground);
    fireEvent.error(screen.getByAltText('老妇来客'));
    expect(error).toHaveBeenCalledTimes(1);
    const before = oldBackground.getAttribute('src');
    fireEvent.click(screen.getByRole('button', { name: '重试场景资源' }));
    expect(screen.getByAltText('白虎岭背景').getAttribute('src')).not.toBe(before);
    fireEvent.load(screen.getByAltText('白虎岭背景'));
    fireEvent.load(screen.getByAltText('老妇来客'));
    fireEvent.load(screen.getByTestId('branch-route-states-loader'));
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('ignores old-generation load and error events after retry until all new assets load', () => {
    const ready = vi.fn();
    const error = vi.fn();
    renderScene({ onAssetsReady: ready, onAssetsError: error });
    const oldBackground = screen.getByAltText('白虎岭背景');
    const oldVisitor = screen.getByAltText('老妇来客');
    const oldStates = screen.getByTestId('branch-route-states-loader');
    fireEvent.error(oldStates);
    expect(error).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '重试场景资源' }));

    fireEvent.load(oldBackground);
    fireEvent.error(oldVisitor);
    fireEvent.load(oldStates);
    expect(error).toHaveBeenCalledTimes(1);
    expect(ready).not.toHaveBeenCalled();

    fireEvent.load(screen.getByAltText('白虎岭背景'));
    fireEvent.load(screen.getByAltText('老妇来客'));
    expect(ready).not.toHaveBeenCalled();
    fireEvent.load(screen.getByTestId('branch-route-states-loader'));
    fireEvent.load(screen.getByTestId('branch-route-states-loader'));
    expect(ready).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('crops the exact sprite cell with background positioning and a textual state label', () => {
    const { rerender } = renderScene({ state: 'ready' });
    const sprite = screen.getByRole('img', { name: '分支路线状态' });
    expect(sprite).toHaveStyle({ backgroundSize: '300% 100%', backgroundPosition: '0% 0%', overflow: 'hidden' });
    expect(screen.getByText('等待分支归位')).toBeInTheDocument();
    rerender(<WeekFourBranchScene state="conflict" cards={WEEK_FOUR_BRANCH_CARDS} events={[]} muted reducedMotion showCanonEpilogue={false} onAssetsReady={vi.fn()} onAssetsError={vi.fn()} />);
    expect(sprite).toHaveStyle({ backgroundPosition: '50% 0%' });
    expect(screen.getByText('两条路线同时发生')).toBeInTheDocument();
    rerender(<WeekFourBranchScene state="proven" cards={WEEK_FOUR_BRANCH_CARDS} events={[]} muted reducedMotion showCanonEpilogue={false} onAssetsReady={vi.fn()} onAssetsError={vi.fn()} />);
    expect(sprite).toHaveStyle({ backgroundPosition: '100% 0%' });
    expect(screen.getByText('每张卡只走一条路线')).toBeInTheDocument();
  });

  it('labels a missing branch as no route and no executed action, not as a conflict', () => {
    renderScene({ state: 'branch-missing' });
    const scene = screen.getByLabelText('白虎岭分支核验舞台');
    expect(scene).toHaveClass('state-missing');
    expect(screen.getByRole('status')).toHaveTextContent('没有路线，没有执行动作');
    expect(screen.getByRole('img', { name: '分支路线状态：没有路线' })).toHaveAttribute('data-state-kind', 'missing');
    expect(scene).not.toHaveTextContent('两条路线同时发生');
  });

  it('labels invalid Python structure and indentation separately from a route conflict', () => {
    renderScene({ state: 'python-structure-invalid' });
    const scene = screen.getByLabelText('白虎岭分支核验舞台');
    expect(scene).toHaveClass('state-invalid');
    expect(screen.getByRole('status')).toHaveTextContent('Python 结构或缩进未通过');
    expect(screen.getByRole('img', { name: '分支路线状态：Python 结构未通过' })).toHaveAttribute('data-state-kind', 'invalid');
    expect(scene).not.toHaveTextContent('两条路线同时发生');
  });

  it('keeps mute and reduced motion presentation-only, including under StrictMode', () => {
    const ready = vi.fn();
    render(<StrictMode><WeekFourBranchScene state="ready" cards={WEEK_FOUR_BRANCH_CARDS} events={[]} muted={false} reducedMotion={false} showCanonEpilogue={false} onAssetsReady={ready} onAssetsError={vi.fn()} /></StrictMode>);
    const scene = screen.getByLabelText('白虎岭分支核验舞台');
    expect(scene).toHaveAttribute('data-muted', 'false');
    expect(scene).toHaveAttribute('data-reduced-motion', 'false');
    expect(screen.getByText('场景声音开启')).toBeInTheDocument();
    expect(screen.getByText('路线切换动效开启')).toBeInTheDocument();
  });
});
