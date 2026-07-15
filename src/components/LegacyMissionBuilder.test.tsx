import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LegacyMissionBuilder } from './LegacyMissionBuilder';

describe('LegacyMissionBuilder', () => {
  it('honestly exposes one visible compatibility sequence as the only run input', () => {
    const onRun = vi.fn();
    const { container } = render(<LegacyMissionBuilder missionId="w1-m2" commands={['inspect_weight', 'choose_heaviest', 'shrink_staff']} onRun={onRun} />);
    expect(screen.getByRole('heading', { name: '兼容指令序列' })).toBeVisible();
    expect(screen.getByText('旧版指令序列兼容工具（非正式 Blockly，未完成关卡升级）')).toBeVisible();
    expect(container.querySelector('.blockly-host')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '缩小金箍棒' }));
    fireEvent.click(screen.getByRole('button', { name: '选择最重' }));
    fireEvent.click(screen.getByRole('button', { name: '查看重量' }));
    fireEvent.click(screen.getByRole('button', { name: '上移：选择最重' }));
    fireEvent.click(screen.getByRole('button', { name: '删除：查看重量' }));
    fireEvent.click(screen.getByRole('button', { name: '运行兼容指令' }));

    expect(onRun).toHaveBeenCalledWith(['choose_heaviest', 'shrink_staff']);
  });

  it('resets the same visible sequence that determines execution', () => {
    const onRun = vi.fn();
    render(<LegacyMissionBuilder missionId="w1-m2" commands={['choose_heaviest']} onRun={onRun} />);
    fireEvent.click(screen.getByRole('button', { name: '选择最重' }));
    fireEvent.click(screen.getByRole('button', { name: '清空兼容序列' }));
    fireEvent.click(screen.getByRole('button', { name: '运行兼容指令' }));
    expect(onRun).toHaveBeenCalledWith([]);
  });
});
