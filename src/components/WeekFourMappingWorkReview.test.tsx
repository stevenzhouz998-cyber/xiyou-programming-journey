import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { traceForField, compareWeekFourMappingTraces } from '../blockly/weekFourMappingContract';
import { SOLVED_WEEK_FOUR_MAPPING_PYTHON } from '../engine/weekFourPythonMappingGrammar';
import type { WeekFourMappingWorkV1 } from '../progress/types';
import { WeekFourMappingWorkReview } from './WeekFourMappingWorkReview';

function savedWork(): WeekFourMappingWorkV1 {
  const blocklyTrace = traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' });
  const pythonTrace = traceForField('identity', { kind: 'python', line: 1, from: 3, to: 11 });
  return {
    kind: 'blockly-python-mapping-v1', workId: 'w4-m1-first-python-mapping', missionId: 'w4-m1',
    title: '第一份积木与 Python 对照经卷',
    workspace: { version: 1, missionId: 'w4-m1', blocks: [] },
    pythonCode: SOLVED_WEEK_FOUR_MAPPING_PYTHON,
    blocklyTrace, pythonTrace, run: compareWeekFourMappingTraces(blocklyTrace, pythonTrace),
    createdAt: '2026-08-30T00:00:00.000Z', verifiedAt: '2026-08-30T00:00:00.000Z',
  };
}

describe('WeekFourMappingWorkReview', () => {
  it('does not render any W4-M1 review when the stable saved-work ID is absent', () => {
    render(<WeekFourMappingWorkReview work={undefined} />);
    expect(screen.queryByRole('region', { name: 'W4-M1 只读对照作品' })).not.toBeInTheDocument();
  });

  it('opens a read-only Blockly and Python replay without actions or progress side effects', () => {
    const work = savedWork();
    const before = structuredClone(work);
    render(<WeekFourMappingWorkReview work={work} />);
    const disclosure = screen.getByRole('group', { name: '回看 W4-M1 对照作品' });
    expect(disclosure).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('回看 W4-M1 对照作品'));
    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByRole('region', { name: 'W4-M1 只读对照作品' })).toHaveTextContent('Blockly：如果真实身份是白骨精，就继续核验；否则礼貌放行。');
    expect(screen.getByLabelText('W4-M1 Python 只读作品').textContent).toBe(SOLVED_WEEK_FOUR_MAPPING_PYTHON);
    expect(screen.getByText('原著引子：继续核验')).toBeInTheDocument();
    expect(screen.getByText('逻辑练习：礼貌放行')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /复制|运行|编辑|自动填入|完成/ })).not.toBeInTheDocument();
    expect(work).toEqual(before);
  });
});
