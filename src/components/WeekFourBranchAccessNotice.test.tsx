import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { WeekFourBranchAccessNotice } from './WeekFourBranchAccessNotice';

describe('W4-M3 access notices', () => {
  it('explains locked access and returns to W4-M2 formal verification without actions', () => {
    render(<MemoryRouter><WeekFourBranchAccessNotice access={{ kind: 'locked' }} /></MemoryRouter>);
    expect(screen.getByRole('heading')).toHaveTextContent('先完成上一关的正式验证');
    expect(screen.getByRole('link', { name: '返回上一关继续验证' })).toHaveAttribute('href', '/mission/w4-m2');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('describes an older completed visit in child-readable story language without internal fields', () => {
    render(<MemoryRouter><WeekFourBranchAccessNotice access={{ kind: 'historical-read-only', completed: true }} /></MemoryRouter>);
    const notice = screen.getByRole('main');
    expect(notice).toHaveTextContent('以前闯过的记录已保留');
    expect(notice).toHaveTextContent('这里只能回看故事');
    expect(notice).not.toHaveTextContent(/completed|session|formal|状态|字段/i);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('describes an older readable visit without claiming the child finished it', () => {
    render(<MemoryRouter><WeekFourBranchAccessNotice access={{ kind: 'historical-read-only', completed: false }} /></MemoryRouter>);
    const notice = screen.getByRole('main');
    expect(notice).toHaveTextContent('以前已能查看这段故事');
    expect(notice).toHaveTextContent('还没有闯过这一关');
    expect(notice).not.toHaveTextContent(/completed|session|formal|状态|字段/i);
  });

  it('renders no notice for formal access', () => {
    const { container } = render(<MemoryRouter><WeekFourBranchAccessNotice access={{ kind: 'formal', upgradingLegacy: false }} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});
