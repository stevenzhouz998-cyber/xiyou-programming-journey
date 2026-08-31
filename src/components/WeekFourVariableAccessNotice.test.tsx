import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WeekFourVariableAccessNotice } from './WeekFourVariableAccessNotice';

describe('W4-M2 access notices', () => {
  it('shows a pure locked explanation with the W4-M1 route and no action callback', () => {
    render(<MemoryRouter><WeekFourVariableAccessNotice access={{ kind: 'locked' }} /></MemoryRouter>);
    expect(screen.getByRole('heading')).toHaveTextContent('先完成 W4-M1 正式复习');
    expect(screen.getByRole('link', { name: '返回 W4-M1 正式重玩' })).toHaveAttribute('href', '/mission/w4-m1');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('preserves historical completion as read-only without creating a run or session', () => {
    render(<MemoryRouter><WeekFourVariableAccessNotice access={{ kind: 'historical-read-only' }} /></MemoryRouter>);
    expect(screen.getByRole('heading')).toHaveTextContent('历史记录已保留');
    expect(screen.getByText(/不会建立新的取证记录/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
