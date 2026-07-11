import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

describe('西游编程记', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, '', '/');
    window.location.hash = '#/';
  });

  it('shows the six-week canonical journey and the first mission', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '西游编程记' })).toBeInTheDocument();
    expect(screen.getAllByText(/第[一二三四五六]周/)).toHaveLength(6);
    expect(screen.getByRole('button', { name: /开始第一关/ })).toBeEnabled();
  });

  it('opens the first canonical mission with source and three-level hints', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    expect(screen.getByRole('heading', { name: '龙宫求兵' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /查看原著第三回/ })).toHaveAttribute('href', expect.stringContaining('wikisource.org'));
    expect(screen.getByRole('button', { name: '观察提示' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '思路提示' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '半成品提示' })).toBeInTheDocument();
  });

  it('lets a child finish the first mission through the command scroll', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    fireEvent.click(screen.getByRole('button', { name: '进入龙宫' }));
    fireEvent.click(screen.getByRole('button', { name: '请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '运行指令' }));
    expect(screen.getByRole('heading', { name: '闯关成功' })).toBeInTheDocument();
  });

  it('protects the parent report with the local PIN', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '2580' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    expect(screen.getByRole('heading', { name: '家长周报' })).toBeInTheDocument();
    expect(screen.getByText('学习数据仅保存在这台电脑')).toBeInTheDocument();
  });
});
