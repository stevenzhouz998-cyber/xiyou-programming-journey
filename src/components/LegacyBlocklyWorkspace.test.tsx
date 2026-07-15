import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LegacyBlocklyWorkspace } from './LegacyBlocklyWorkspace';

describe('LegacyBlocklyWorkspace', () => {
  it('keeps the legacy mission builder independent from the Dragon Palace workspace', () => {
    const onRun = vi.fn();
    render(<LegacyBlocklyWorkspace missionId="w1-m2" commands={['inspect_weight', 'choose_heaviest']} onRun={onRun} />);

    fireEvent.click(screen.getByRole('button', { name: /查看重量/ }));
    fireEvent.click(screen.getByRole('button', { name: /选择最重/ }));
    expect(screen.getByRole('list')).toHaveTextContent('查看重量');
    expect(screen.getByRole('list')).toHaveTextContent('选择最重');

    fireEvent.click(screen.getByRole('button', { name: '上移：选择最重' }));
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('选择最重');
    fireEvent.click(screen.getByRole('button', { name: '删除：选择最重' }));
    fireEvent.click(screen.getByRole('button', { name: '选择最重' }));

    fireEvent.click(screen.getByRole('button', { name: /运行指令/ }));
    expect(onRun).toHaveBeenCalledWith(['inspect_weight', 'choose_heaviest']);

    fireEvent.click(screen.getByRole('button', { name: /重新排列/ }));
    expect(screen.getByRole('list')).toBeEmptyDOMElement();
  });
});
