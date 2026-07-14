import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ParentDataTools } from './ParentDataTools';
import { createInitialProgress } from '../progress/progress';

function props(overrides = {}) {
  return {
    progress: createInitialProgress(), loadStatus: 'normal' as const, loadPersistence: 'saved' as const,
    saveStatus: 'idle' as const, corruptDownload: null,
    onImport: vi.fn(() => ({ status: 'rejected' as const, error: '进度文件无法读取' })),
    onClear: vi.fn(() => ({ status: 'cleared' as const, progress: createInitialProgress() })),
    onCreateBackup: vi.fn(() => ({ filename: 'backup.json', contents: '{}', mimeType: 'application/json' as const })),
    onDownload: vi.fn(), ...overrides,
  };
}

describe('ParentDataTools', () => {
  it('shows an honest never-saved state', () => {
    render(<ParentDataTools {...props({ loadPersistence: 'idle' })} />);
    expect(screen.getByText('尚未保存过', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('尚无保存时间')).toBeInTheDocument();
  });
  it('rejects malformed imports and says current progress was not changed', async () => {
    render(<ParentDataTools {...props()} />);
    fireEvent.change(screen.getByLabelText('选择进度文件'), { target: { files: [new File(['{bad'], 'bad.json')] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('当前进度未被修改');
  });

  it('shows corrupt download only when source exists', () => {
    const { rerender } = render(<ParentDataTools {...props()} />);
    expect(screen.queryByRole('button', { name: '下载损坏原文' })).not.toBeInTheDocument();
    rerender(<ParentDataTools {...props({ corruptDownload: '{bad' })} />);
    expect(screen.getByRole('button', { name: '下载损坏原文' })).toBeInTheDocument();
  });

  it('requires the exact phrase before clear', () => {
    const clear = vi.fn(() => ({ status: 'cleared' as const, progress: createInitialProgress() }));
    render(<ParentDataTools {...props({ onClear: clear })} />);
    fireEvent.click(screen.getByRole('button', { name: '清空学习数据' }));
    const confirm = screen.getByRole('button', { name: '备份并清空' });
    expect(screen.getByLabelText('输入“清空”以确认')).toHaveFocus();
    fireEvent.change(screen.getByLabelText('输入“清空”以确认'), { target: { value: '清空 ' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText('输入“清空”以确认'), { target: { value: '清空' } });
    fireEvent.click(confirm);
    expect(clear).toHaveBeenCalledOnce();
  });

  it('downloads backup before clear and never clears when download throws', () => {
    const order: string[] = [];
    const clear = vi.fn(() => { order.push('clear'); return { status: 'cleared' as const, progress: createInitialProgress() }; });
    const download = vi.fn(() => order.push('download'));
    render(<ParentDataTools {...props({ onClear: clear, onDownload: download })} />);
    fireEvent.click(screen.getByRole('button', { name: '清空学习数据' }));
    fireEvent.change(screen.getByLabelText('输入“清空”以确认'), { target: { value: '清空' } });
    fireEvent.click(screen.getByRole('button', { name: '备份并清空' }));
    expect(order).toEqual(['download', 'clear']);

    clear.mockClear(); download.mockImplementation(() => { throw new Error('下载被阻止'); });
    fireEvent.click(screen.getByRole('button', { name: '清空学习数据' }));
    fireEvent.change(screen.getByLabelText('输入“清空”以确认'), { target: { value: '清空' } });
    fireEvent.click(screen.getByRole('button', { name: '备份并清空' }));
    expect(clear).not.toHaveBeenCalled();
    expect(screen.getByText(/学习数据未清空/)).toBeInTheDocument();
  });

  it('keeps the dialog result honest when clear storage fails', () => {
    const failed = { status: 'unchanged' as const, progress: createInitialProgress(), error: '存储已禁用' };
    render(<ParentDataTools {...props({ onClear: vi.fn(() => failed) })} />);
    fireEvent.click(screen.getByRole('button', { name: '清空学习数据' }));
    fireEvent.change(screen.getByLabelText('输入“清空”以确认'), { target: { value: '清空' } });
    fireEvent.click(screen.getByRole('button', { name: '备份并清空' }));
    expect(screen.getByRole('status')).toHaveTextContent('当前进度未清空');
    expect(screen.getByRole('status')).toHaveTextContent('存储已禁用');
  });

  it.each([
    [1, '已将 V1 升级为 V3'],
    [2, '已将 V2 升级为 V3'],
    [3, '来源版本 V3'],
  ] as const)('reports imported source version V%s truthfully', async (sourceVersion, expected) => {
    const imported = { status: 'saved' as const, progress: createInitialProgress(), sourceVersion };
    render(<ParentDataTools {...props({ onImport: vi.fn(() => imported) })} />);
    fireEvent.change(screen.getByLabelText('选择进度文件'), { target: { files: [new File(['{}'], `v${sourceVersion}.json`)] } });
    expect(await screen.findByRole('status')).toHaveTextContent(expected);
  });

  it('uses a real button to open the hidden import file input', () => {
    render(<ParentDataTools {...props()} />);
    const button = screen.getByRole('button', { name: '导入进度' });
    const input = screen.getByLabelText('选择进度文件') as HTMLInputElement;
    const click = vi.spyOn(input, 'click').mockImplementation(() => undefined);
    fireEvent.click(button);
    expect(click).toHaveBeenCalledOnce();
  });

  it('shows the rollback-failed warning without claiming storage stayed unchanged', async () => {
    const failed = { status: 'rollback-failed' as const, progress: createInitialProgress(), error: '回滚写入失败' };
    render(<ParentDataTools {...props({ onImport: vi.fn(() => failed) })} />);
    fireEvent.change(screen.getByLabelText('选择进度文件'), { target: { files: [new File(['{}'], 'v2.json')] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('设备存储可能部分变化');
    expect(screen.getByRole('alert')).not.toHaveTextContent('当前进度未被修改');
  });

  it('clears the file input so the same file can be selected again', async () => {
    const onImport = vi.fn(() => ({ status: 'rejected' as const, error: 'bad' }));
    render(<ParentDataTools {...props({ onImport })} />);
    const input = screen.getByLabelText('选择进度文件') as HTMLInputElement;
    const file = new File(['{}'], 'same.json');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    expect(input.value).toBe('');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(2));
  });

  it('reports File.text rejection, does not import, and resets the input', async () => {
    const onImport = vi.fn();
    const file = new File(['{}'], 'unreadable.json');
    Object.defineProperty(file, 'text', { value: vi.fn().mockRejectedValue(new Error('读取器故障')) });
    render(<ParentDataTools {...props({ onImport })} />);
    const input = screen.getByLabelText('选择进度文件') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('文件读取失败');
    expect(screen.getByRole('alert')).toHaveTextContent('当前进度未被修改');
    expect(onImport).not.toHaveBeenCalled();
    expect(input.value).toBe('');
  });

  it('only imports the latest file when reads finish out of order', async () => {
    let resolveFirst!: (value: string) => void;
    let resolveSecond!: (value: string) => void;
    const first = new File([''], 'first.json');
    const second = new File([''], 'second.json');
    Object.defineProperty(first, 'text', { value: () => new Promise<string>((resolve) => { resolveFirst = resolve; }) });
    Object.defineProperty(second, 'text', { value: () => new Promise<string>((resolve) => { resolveSecond = resolve; }) });
    const onImport = vi.fn(() => ({ status: 'rejected' as const, error: 'bad' }));
    render(<ParentDataTools {...props({ onImport })} />);
    const input = screen.getByLabelText('选择进度文件');
    fireEvent.change(input, { target: { files: [first] } });
    fireEvent.change(input, { target: { files: [second] } });
    resolveSecond('second');
    await waitFor(() => expect(onImport).toHaveBeenCalledWith('second'));
    resolveFirst('first');
    await Promise.resolve();
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('traps focus, closes on Escape, and restores focus', async () => {
    render(<ParentDataTools {...props()} />);
    const opener = screen.getByRole('button', { name: '清空学习数据' });
    opener.focus(); fireEvent.click(opener);
    const input = screen.getByLabelText('输入“清空”以确认');
    const cancel = screen.getByRole('button', { name: '取消' });
    cancel.focus(); fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(input).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
