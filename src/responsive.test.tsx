import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { MissionTools, type MissionToolLoaders } from './components/MissionTools';

describe('commercial responsive shell', () => {
  it('keeps heavy mission tools out of the app entry and declares responsive foundations', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const css = readFileSync('src/styles.css', 'utf8');
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('<html lang="zh-CN">');
    expect(app).not.toMatch(/from ['"].*BlocklyWorkspace/);
    expect(app).not.toMatch(/from ['"].*PythonEditor/);
    expect(app).not.toMatch(/from ['"].*AiLab/);
    expect(app).not.toMatch(/from ['"].*GameScene/);
    expect(css).not.toMatch(/(?:html|body)\s*\{[^}]*min-width:\s*1180px/s);
    expect(css).toMatch(/@media\s*\([^)]*max-width:\s*900px/);
    expect(css).toMatch(/@media\s*\([^)]*max-width:\s*600px/);
    expect(css).toMatch(/:focus-visible/);
    expect(css).not.toMatch(/(?:html|body)\s*\{[^}]*overflow-x:\s*hidden/s);
    expect(css).toMatch(/@media\s*\(hover:\s*none\),\s*\(pointer:\s*coarse\),\s*\(max-width:\s*900px\)[\s\S]*min-height:\s*44px/);
    expect(css).toMatch(/\.game-scene\s*\{[^}]*aspect-ratio:\s*19\s*\/\s*8/s);
    expect(css).not.toMatch(/\.game-scene\s*\{[^}]*min-height:/s);
    expect(css).toMatch(/\.game-scene canvas\s*\{[^}]*width:\s*100%[^}]*height:\s*auto/s);
  });

  it('shows a status while loading and renders the real selected tool', async () => {
    let resolve!: (module: { default: () => React.ReactNode }) => void;
    const blockly = vi.fn(() => new Promise<{ default: () => React.ReactNode }>((done) => {
      resolve = done;
    }));
    const loaders = { scene: vi.fn().mockResolvedValue({ default: () => <div>场景</div> }), blockly } as unknown as MissionToolLoaders;
    render(<MissionTools missionId="w1-m1" mode="blockly" loaders={loaders} toolProps={{}} sceneProps={{}} />);
    expect(screen.getByText(/任务工具加载中/)).toHaveAttribute('role', 'status');
    resolve({ default: () => <div>真实 Blockly</div> });
    expect(await screen.findByText('真实 Blockly')).toBeInTheDocument();
  });

  it('reloads the page after a chunk failure', async () => {
    const blockly = vi.fn().mockRejectedValue(new Error('chunk unavailable'));
    const reloadPage = vi.fn();
    const loaders = { scene: vi.fn().mockResolvedValue({ default: () => <div>场景</div> }), blockly } as unknown as MissionToolLoaders;
    render(<MissionTools missionId="w1-m1" mode="blockly" loaders={loaders} reloadPage={reloadPage} toolProps={{}} sceneProps={{}} />);
    expect(await screen.findByText('任务工具加载失败')).toBeInTheDocument();
    expect(screen.getByText(/网络恢复后/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重新加载页面' }));
    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it('keeps the tool usable when only the scene chunk fails', async () => {
    const loaders = {
      scene: vi.fn().mockRejectedValue(new Error('scene failed')),
      blockly: vi.fn().mockResolvedValue({ default: () => <div>工具可用</div> }),
    } as unknown as MissionToolLoaders;
    render(<MissionTools missionId="w1-m1" mode="blockly" loaders={loaders} toolProps={{}} sceneProps={{}} />);
    expect(await screen.findByText('工具可用')).toBeInTheDocument();
    expect(await screen.findByText('任务场景加载失败')).toBeInTheDocument();
  });

  it('keeps the scene visible when only the selected tool chunk fails', async () => {
    const loaders = {
      scene: vi.fn().mockResolvedValue({ default: () => <div>场景可见</div> }),
      blockly: vi.fn().mockRejectedValue(new Error('tool failed')),
    } as unknown as MissionToolLoaders;
    render(<MissionTools missionId="w1-m1" mode="blockly" loaders={loaders} toolProps={{}} sceneProps={{}} />);
    expect(await screen.findByText('场景可见')).toBeInTheDocument();
    expect(await screen.findByText('任务工具加载失败')).toBeInTheDocument();
  });
});
