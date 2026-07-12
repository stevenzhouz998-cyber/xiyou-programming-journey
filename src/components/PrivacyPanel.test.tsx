import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PrivacyPanel } from './PrivacyPanel';

describe('PrivacyPanel', () => {
  it('explains local data without collecting personal information', () => {
    render(<PrivacyPanel acknowledged={false} onAcknowledge={() => ({ status: 'saved' })} />);
    expect(screen.getByRole('dialog', { name: '你的学习数据保存在这台设备' })).toBeInTheDocument();
    expect(screen.getByText(/不会发送广告、分析或儿童行为数据/)).toBeInTheDocument();
    expect(screen.getByText(/保存内容/)).toBeInTheDocument();
    expect(screen.getByText('导出：')).toBeInTheDocument();
    expect(screen.getByText('清空：')).toBeInTheDocument();
    expect(screen.getByText('恢复：')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('only disappears after acknowledgement is durably saved', () => {
    const onAcknowledge = vi.fn(() => ({ status: 'unsaved' as const, error: '存储不可用' }));
    render(<PrivacyPanel acknowledged={false} onAcknowledge={onAcknowledge} />);
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/确认尚未保存/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('确认尚未保存');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('traps focus, ignores Escape, and restores the previous focus on unmount', async () => {
    const previous = document.createElement('button');
    previous.textContent = '原来的按钮';
    document.body.append(previous);
    previous.focus();
    const view = render(<PrivacyPanel acknowledged={false} onAcknowledge={() => ({ status: 'saved' })} />);
    const acknowledge = screen.getByRole('button', { name: '我知道了' });
    expect(acknowledge).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(acknowledge).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
    expect(acknowledge).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    view.unmount();
    await waitFor(() => expect(previous).toHaveFocus());
    previous.remove();
  });
});
