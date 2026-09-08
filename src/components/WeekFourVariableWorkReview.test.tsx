import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseWeekFourVariablePython, SOLVED_WEEK_FOUR_VARIABLE_PYTHON } from '../engine/weekFourVariablePythonGrammar';
import type { WeekFourVariableWorkV1 } from '../progress/types';
import { WeekFourVariableWorkReview } from './WeekFourVariableWorkReview';

function savedWork(): WeekFourVariableWorkV1 {
  const parsed = parseWeekFourVariablePython(SOLVED_WEEK_FOUR_VARIABLE_PYTHON);
  return {
    kind: 'python-variable-evidence-v1',
    workId: 'w4-m2-variable-evidence-record',
    missionId: 'w4-m2',
    title: '第一次变化变量取证记录',
    pythonCode: SOLVED_WEEK_FOUR_VARIABLE_PYTHON,
    canonicalTrace: parsed.trace,
    workerTrace: parsed.trace,
    run: parsed.run,
    createdAt: '2026-08-31T00:00:00.000Z',
    verifiedAt: '2026-08-31T00:00:01.000Z',
  };
}

describe('W4-M2 read-only work review inside W4-M3', () => {
  it('stays collapsed and exposes only a non-answer sealed summary without side effects', () => {
    const work = savedWork();
    const before = structuredClone(work);
    render(<WeekFourVariableWorkReview work={work} />);
    const disclosure = screen.getByRole('group', { name: '回看上一关变量取证' });
    expect(disclosure).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('回看上一关变量取证'));
    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByRole('region', { name: 'W4-M2 只读取证摘要' })).toHaveTextContent('取证已封存');
    expect(screen.getByText('第一次变化变量取证记录')).toBeInTheDocument();
    expect(screen.getByText(/2026-08-31/)).toBeInTheDocument();
    expect(disclosure).not.toHaveTextContent(/appearance|identity|seal_record|ordinary_eyes|fiery_eye_check/);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/else|polite_help|keep_observing/)).not.toBeInTheDocument();
    expect(work).toEqual(before);
  });

  it('renders nothing for a missing work record', () => {
    const { container } = render(<WeekFourVariableWorkReview work={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
