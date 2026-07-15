import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createParentAccessRecord } from '../progress/parentAccess';
import { ParentAccessGate } from './ParentAccessGate';

describe('ParentAccessGate', () => {
  it('requires first-use PIN setup and one-time recovery acknowledgement', async () => {
    const saveRecord = vi.fn(() => true);
    render(<ParentAccessGate record="unset" saveRecord={saveRecord}><p>家长数据</p></ParentAccessGate>);
    expect(screen.queryByText('家长数据')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('设置 4 位家长 PIN'), { target: { value: '4826' } });
    fireEvent.change(screen.getByLabelText('确认家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '创建家长 PIN' }));
    await screen.findByText('请保存一次性恢复码');
    expect(saveRecord).toHaveBeenCalledWith(expect.stringMatching(/^access-v1:/));
    expect(screen.queryByText('家长数据')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('我已安全保存恢复码'));
    fireEvent.click(screen.getByRole('button', { name: '确认已保存并进入' }));
    expect(screen.getByText('家长数据')).toBeInTheDocument();
  });

  it('does not accept the retired public default and does accept a hashed PIN', async () => {
    const record = await createParentAccessRecord('4826', 'ABCDEFGHJKLM');
    render(<ParentAccessGate record={record} saveRecord={() => true}><p>家长数据</p></ParentAccessGate>);
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '2580' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await screen.findByText('PIN 不正确，请再检查一次。');
    expect(screen.queryByText('家长数据')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await waitFor(() => expect(screen.getByText('家长数据')).toBeInTheDocument());
  });

  it('changes a PIN only after the current PIN is verified and rotates recovery', async () => {
    const record = await createParentAccessRecord('4826', 'ABCDEFGHJKLM');
    const saveRecord = vi.fn(() => true);
    render(<ParentAccessGate record={record} saveRecord={saveRecord}><p>家长数据</p></ParentAccessGate>);
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await screen.findByText('家长数据');
    fireEvent.change(screen.getByLabelText('当前 PIN'), { target: { value: '0000' } });
    fireEvent.change(screen.getByLabelText('新 PIN'), { target: { value: '7319' } });
    fireEvent.change(screen.getByLabelText('确认新 PIN'), { target: { value: '7319' } });
    fireEvent.click(screen.getByRole('button', { name: '修改 PIN 并轮换恢复码' }));
    await screen.findByText('当前 PIN 不正确，设置没有改变。');
    expect(saveRecord).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('当前 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '修改 PIN 并轮换恢复码' }));
    await screen.findByText('请保存一次性恢复码');
    expect(saveRecord).toHaveBeenCalledWith(expect.stringMatching(/^access-v1:/));
  });

  it('requires the recovery code, resets the PIN, and rotates recovery', async () => {
    const record = await createParentAccessRecord('4826', 'ABCDEFGHJKLM');
    const saveRecord = vi.fn(() => true);
    render(<ParentAccessGate record={record} saveRecord={saveRecord}><p>家长数据</p></ParentAccessGate>);
    fireEvent.click(screen.getByRole('button', { name: '忘记 PIN，使用恢复码' }));
    fireEvent.change(screen.getByLabelText('恢复码'), { target: { value: 'WRONGCODE123' } });
    fireEvent.change(screen.getByLabelText('新的 4 位 PIN'), { target: { value: '7319' } });
    fireEvent.change(screen.getByLabelText('确认新的 PIN'), { target: { value: '7319' } });
    fireEvent.click(screen.getByRole('button', { name: '验证并重设' }));
    await screen.findByText('恢复码不正确，家长设置没有改变。');
    expect(saveRecord).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('恢复码'), { target: { value: 'ABCD-EFGH-JKLM' } });
    fireEvent.click(screen.getByRole('button', { name: '验证并重设' }));
    await screen.findByText('请保存一次性恢复码');
    expect(saveRecord).toHaveBeenCalledWith(expect.stringMatching(/^access-v1:/));
  });

  it('upgrades a custom legacy PIN after authentication and creates recovery', async () => {
    const saveRecord = vi.fn(() => true);
    render(<ParentAccessGate record="4826" saveRecord={saveRecord}><p>家长数据</p></ParentAccessGate>);
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await screen.findByText('请保存一次性恢复码');
    expect(saveRecord).toHaveBeenCalledWith(expect.stringMatching(/^access-v1:/));
  });
});
