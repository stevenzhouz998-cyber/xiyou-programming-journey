import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createParentAccessRecord, verifyParentPin, verifyRecoveryCode } from '../progress/parentAccess';
import { ParentAccessGate } from './ParentAccessGate';

function enterNewPin(pin: string, confirm = pin) {
  fireEvent.change(screen.getByLabelText(/^(设置 4 位家长 PIN|新的 4 位 PIN|新 PIN)$/), { target: { value: pin } });
  fireEvent.change(screen.getByLabelText(/^(确认家长 PIN|确认新的 PIN|确认新 PIN)$/), { target: { value: confirm } });
}

function confirmRecoverySaved() {
  fireEvent.click(screen.getByLabelText('我已安全保存恢复码'));
  fireEvent.click(screen.getByRole('button', { name: '确认已保存并进入' }));
}

describe('ParentAccessGate', () => {
  it('keeps first-use setup pending until recovery acknowledgement and clears it on unmount', async () => {
    const saveRecord = vi.fn(() => true);
    const view = render(<ParentAccessGate record="unset" saveRecord={saveRecord}><p>家长数据</p></ParentAccessGate>);
    const newPin = screen.getByLabelText('设置 4 位家长 PIN');
    expect(newPin).toHaveAttribute('type', 'password');
    expect(newPin).toHaveAttribute('autocomplete', 'new-password');
    enterNewPin('2580');
    fireEvent.click(screen.getByRole('button', { name: '创建家长 PIN' }));
    expect(await screen.findByText('不能使用已公开的旧默认码，请设置新的 PIN。')).toBeVisible();
    enterNewPin('4826', '4820');
    fireEvent.click(screen.getByRole('button', { name: '创建家长 PIN' }));
    expect(await screen.findByText('两次输入的 PIN 不一致。')).toBeVisible();
    enterNewPin('4826');
    fireEvent.click(screen.getByRole('button', { name: '创建家长 PIN' }));
    const heading = await screen.findByRole('heading', { name: '请保存一次性恢复码' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(saveRecord).not.toHaveBeenCalled();
    view.unmount();

    render(<ParentAccessGate record="unset" saveRecord={saveRecord}><p>家长数据</p></ParentAccessGate>);
    expect(screen.getByRole('heading', { name: '创建家长 PIN' })).toBeVisible();
    expect(saveRecord).not.toHaveBeenCalled();
  });

  it('commits only after acknowledgement and retries a failed transaction without losing the code', async () => {
    const saveRecord = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<ParentAccessGate record="unset" saveRecord={saveRecord}><p>家长数据</p></ParentAccessGate>);
    enterNewPin('4826');
    fireEvent.click(screen.getByRole('button', { name: '创建家长 PIN' }));
    const code = (await screen.findByLabelText('一次性恢复码')).textContent;
    confirmRecoverySaved();
    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('未能完成新 PIN 的存储确认');
    expect(error).toHaveFocus();
    expect(screen.getByLabelText('一次性恢复码')).toHaveTextContent(code!);
    expect(screen.queryByText('家长数据')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认已保存并进入' }));
    await waitFor(() => expect(screen.getByText('家长数据')).toBeVisible());
    expect(saveRecord).toHaveBeenCalledTimes(2);
  });

  it('keeps the recovery code visible when credential storage is unknown', async () => {
    const saveRecord = vi.fn(() => 'unknown' as const);
    render(<ParentAccessGate record="unset" saveRecord={saveRecord}><p>家长数据</p></ParentAccessGate>);
    enterNewPin('4826');
    fireEvent.click(screen.getByRole('button', { name: '创建家长 PIN' }));
    const code = (await screen.findByLabelText('一次性恢复码')).textContent;

    confirmRecoverySaved();

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('无法确认新 PIN 的存储状态');
    expect(error).not.toHaveTextContent('旧凭据仍有效');
    expect(screen.getByLabelText('一次性恢复码')).toHaveTextContent(code!);
    expect(screen.queryByText('家长数据')).not.toBeInTheDocument();
  });

  it('uses secret inputs, rejects the retired default, clears login PIN, and leaves change fields empty', async () => {
    const record = await createParentAccessRecord('4826', 'ABCDEFGHJKLM');
    render(<ParentAccessGate record={record} saveRecord={() => true}><p>家长数据</p></ParentAccessGate>);
    const login = screen.getByLabelText('家长 PIN');
    expect(login).toHaveAttribute('type', 'password');
    expect(login).toHaveAttribute('autocomplete', 'current-password');
    fireEvent.change(login, { target: { value: '2580' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await screen.findByText('PIN 不正确，请再检查一次。');
    fireEvent.change(login, { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await screen.findByText('家长数据');
    for (const field of ['当前 PIN', '新 PIN', '确认新 PIN']) {
      expect(screen.getByLabelText(field)).toHaveValue('');
      expect(screen.getByLabelText(field)).toHaveAttribute('type', 'password');
    }
  });

  it('relocks immediately when the saved parent access record is cleared', async () => {
    const record = await createParentAccessRecord('4826', 'ABCDEFGHJKLM');
    const view = render(<ParentAccessGate record={record} saveRecord={() => true}><p>家长数据</p></ParentAccessGate>);
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await screen.findByText('家长数据');

    view.rerender(<ParentAccessGate record="unset" saveRecord={() => true}><p>家长数据</p></ParentAccessGate>);

    expect(await screen.findByRole('heading', { name: '创建家长 PIN' })).toBeVisible();
    expect(screen.queryByText('家长数据')).not.toBeInTheDocument();
  });

  it('relocks and clears the active parent session when another valid access record arrives', async () => {
    const first = await createParentAccessRecord('4826', 'ABCDEFGHJKLM');
    const rotated = await createParentAccessRecord('7319', 'MNOPQRSTUVWX');
    const view = render(<ParentAccessGate record={first} saveRecord={() => true}><p>家长数据</p></ParentAccessGate>);
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await screen.findByText('家长数据');
    fireEvent.change(screen.getByLabelText('当前 PIN'), { target: { value: '0000' } });
    fireEvent.change(screen.getByLabelText('新 PIN'), { target: { value: '1357' } });
    fireEvent.change(screen.getByLabelText('确认新 PIN'), { target: { value: '1357' } });
    fireEvent.click(screen.getByRole('button', { name: '修改 PIN 并轮换恢复码' }));
    await screen.findByText('当前 PIN 不正确，设置没有改变。');

    view.rerender(<ParentAccessGate record={rotated} saveRecord={() => true}><p>家长数据</p></ParentAccessGate>);

    expect(await screen.findByRole('heading', { name: '家长周报' })).toBeVisible();
    expect(screen.getByLabelText('家长 PIN')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('家长数据')).not.toBeInTheDocument();
  });

  it('keeps an allowed session for the same serialized access record', async () => {
    const record = await createParentAccessRecord('4826', 'ABCDEFGHJKLM');
    const view = render(<ParentAccessGate record={record} saveRecord={() => true}><p>家长数据</p></ParentAccessGate>);
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await screen.findByText('家长数据');

    view.rerender(<ParentAccessGate record={String(record)} saveRecord={() => true}><p>家长数据</p></ParentAccessGate>);

    expect(screen.getByText('家长数据')).toBeVisible();
  });

  it('keeps the old PIN and recovery valid when a PIN change is abandoned before confirmation', async () => {
    const record = await createParentAccessRecord('4826', 'ABCDEFGHJKLM');
    const saveRecord = vi.fn(() => true);
    const view = render(<ParentAccessGate record={record} saveRecord={saveRecord}><p>家长数据</p></ParentAccessGate>);
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await screen.findByText('家长数据');
    fireEvent.change(screen.getByLabelText('当前 PIN'), { target: { value: '4826' } });
    enterNewPin('7319');
    fireEvent.click(screen.getByRole('button', { name: '修改 PIN 并轮换恢复码' }));
    await screen.findByText('请保存一次性恢复码');
    expect(saveRecord).not.toHaveBeenCalled();
    view.unmount();
    expect(await verifyParentPin(record, '4826')).toBe(true);
    expect(await verifyParentPin(record, '7319')).toBe(false);
    expect(await verifyRecoveryCode(record, 'ABCDEFGHJKLM')).toBe(true);
  });

  it('keeps the old PIN and recovery valid when recovery reset is abandoned before confirmation', async () => {
    const record = await createParentAccessRecord('4826', 'ABCDEFGHJKLM');
    const saveRecord = vi.fn(() => true);
    const view = render(<ParentAccessGate record={record} saveRecord={saveRecord}><p>家长数据</p></ParentAccessGate>);
    fireEvent.click(screen.getByRole('button', { name: '忘记 PIN，使用恢复码' }));
    fireEvent.change(screen.getByLabelText('恢复码'), { target: { value: 'ABCD-EFGH-JKLM' } });
    enterNewPin('7319');
    fireEvent.click(screen.getByRole('button', { name: '验证并重设' }));
    await screen.findByText('请保存一次性恢复码');
    expect(saveRecord).not.toHaveBeenCalled();
    view.unmount();
    expect(await verifyParentPin(record, '4826')).toBe(true);
    expect(await verifyParentPin(record, '7319')).toBe(false);
    expect(await verifyRecoveryCode(record, 'ABCDEFGHJKLM')).toBe(true);
  });

  it('upgrades a custom legacy PIN only after recovery acknowledgement', async () => {
    const saveRecord = vi.fn(() => true);
    render(<ParentAccessGate record="4826" saveRecord={saveRecord}><p>家长数据</p></ParentAccessGate>);
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await screen.findByText('请保存一次性恢复码');
    expect(saveRecord).not.toHaveBeenCalled();
    confirmRecoverySaved();
    await waitFor(() => expect(saveRecord).toHaveBeenCalledWith(expect.stringMatching(/^access-v1:/)));
  });
});
