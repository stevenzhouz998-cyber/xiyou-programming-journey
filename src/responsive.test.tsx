import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { MissionTools, type MissionToolLoaders } from './components/MissionTools';
import { RuyiStaffExperience } from './components/RuyiStaffExperience';
import { ProgressProvider } from './context/ProgressContext';
import './styles.css';
import './components/MissionPageContent.css';

const readCss = (path: string) => readFileSync(path, 'utf8');

function coarsePointerRules(css: string): CSSStyleRule[] {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  const sheet = style.sheet as CSSStyleSheet;
  const rules = [...sheet.cssRules]
    .filter((rule): rule is CSSMediaRule => 'media' in rule && (rule as CSSMediaRule).media.mediaText.includes('pointer: coarse'))
    .flatMap((media) => [...media.cssRules].filter((rule): rule is CSSStyleRule => 'selectorText' in rule));
  style.remove();
  return rules;
}

describe('commercial responsive shell', () => {
  it('keeps heavy mission tools out of the app entry and declares responsive foundations', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const missionPage = readFileSync('src/components/MissionPageContent.tsx', 'utf8');
    const globalCss = readCss('src/styles.css');
    const missionPageCss = readCss('src/components/MissionPageContent.css');
    const ruyiCss = readCss('src/components/RuyiStaffExperience.css');
    const fourSeasCss = readCss('src/components/FourSeasRegaliaExperience.css');
    const parentCss = readCss('src/components/ParentAccessGate.css');
    const parentToolsCss = readCss('src/components/ParentDataTools.css');
    const css = [globalCss, missionPageCss, ruyiCss, fourSeasCss, parentCss, parentToolsCss].join('\n');
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('<html lang="zh-CN">');
    expect(app).not.toMatch(/from ['"].*BlocklyWorkspace/);
    expect(app).not.toMatch(/from ['"].*PythonEditor/);
    expect(app).not.toMatch(/from ['"].*AiLab/);
    expect(app).not.toMatch(/from ['"].*GameScene/);
    expect(app).not.toMatch(/from ['"].*RuyiStaffExperience/);
    expect(app).not.toMatch(/from ['"].*MissionPageContent/);
    expect(app).toMatch(/lazy\(\(\) => import\(['"]\.\/components\/MissionPageContent['"]\)/);
    expect(missionPage).toMatch(/lazy\(\(\) => import\(['"]\.\/DragonPalaceExperience['"]\)/);
    expect(missionPage).toMatch(/lazy\(\(\) => import\(['"]\.\/MissionTools['"]\)/);
    expect(missionPage).toMatch(/lazy\(\(\) => import\(['"]\.\/RuyiStaffExperience['"]\)/);
    expect(readFileSync('src/components/RuyiStaffExperience.tsx', 'utf8')).toMatch(/import ['"]\.\/RuyiStaffExperience\.css['"]/);
    expect(missionPage).toMatch(/import ['"]\.\/MissionPageContent\.css['"]/);
    expect(readFileSync('src/components/FourSeasRegaliaExperience.tsx', 'utf8')).toMatch(/import ['"]\.\/FourSeasRegaliaExperience\.css['"]/);
    expect(readFileSync('src/components/ParentAccessGate.tsx', 'utf8')).toMatch(/import ['"]\.\/ParentAccessGate\.css['"]/);
    expect(readFileSync('src/components/ParentDataTools.tsx', 'utf8')).toMatch(/import ['"]\.\/ParentDataTools\.css['"]/);
    expect(globalCss).not.toMatch(/\.ruyi-staff-experience\s*\{/);
    expect(globalCss).not.toMatch(/\.four-seas-regalia-experience\s*\{/);
    expect(globalCss).not.toMatch(/\.parent-page\s*\{/);
    expect(globalCss).not.toMatch(/\.mission-page\s*\{/);
    expect(css).not.toMatch(/(?:html|body)\s*\{[^}]*min-width:\s*1180px/s);
    expect(css).toMatch(/@media\s*\([^)]*max-width:\s*900px/);
    expect(css).toMatch(/@media\s*\([^)]*max-width:\s*600px/);
    expect(css).toMatch(/:focus-visible/);
    expect(css).not.toMatch(/(?:html|body)\s*\{[^}]*overflow-x:\s*hidden/s);
    expect(css).toMatch(/@media\s*\(hover:\s*none\),\s*\(pointer:\s*coarse\),\s*\(max-width:\s*900px\)[\s\S]*min-height:\s*44px/);
    expect(css).toMatch(/\.game-scene\s*\{[^}]*aspect-ratio:\s*19\s*\/\s*8/s);
    expect(css).not.toMatch(/\.game-scene\s*\{[^}]*min-height:/s);
    expect(css).toMatch(/\.game-scene canvas\s*\{[^}]*width:\s*100%[^}]*height:\s*auto/s);
    expect(css).toMatch(/@media\s*\([^)]*max-width:\s*900px[\s\S]*\.ruyi-staff-scene-region[^}]*grid-row:\s*1/s);
    expect(css).toMatch(/@media\s*\([^)]*max-width:\s*900px[\s\S]*\.ruyi-staff-program-region[^}]*grid-row:\s*2/s);
    expect(css).toMatch(/@media\s*\([^)]*max-width:\s*900px[\s\S]*\.ruyi-staff-feedback-region[^}]*grid-row:\s*3/s);
    expect(css).toMatch(/\.ruyi-staff-experience\s*\{[^}]*min-width:\s*0/s);
    expect(css).toMatch(/\.ruyi-staff-program-region\s*\{[^}]*min-width:\s*0/s);
    expect(css).toMatch(/\.four-seas-regalia-workspace\s*\{[^}]*min-width:\s*0[^}]*overflow-x:\s*hidden/s);
    expect(css).toMatch(/\.four-seas-regalia-workspace\s+\.blockly-host\s*\{[^}]*height:\s*540px/s);
    expect(css).toMatch(/@media\s*\([^)]*max-width:\s*600px[\s\S]*\.four-seas-regalia-workspace\s+\.blockly-host\s*\{[^}]*height:\s*540px/s);
  });

  it('keeps only a minimal current-run durability latch instead of retaining saved progress snapshots', () => {
    const experience = readFileSync('src/components/RuyiStaffExperience.tsx', 'utf8');
    expect(experience).not.toMatch(/new Map<number,\s*CoordinatedSaveResult>/);
    expect(experience).not.toMatch(/\.set\(requestId,\s*saved\)/);
    expect(experience).toMatch(/durableRunRef/);
  });

  it('renders the executable w1-m2 mobile structure in scene-controls-program-feedback order with controlled overflow', async () => {
    localStorage.clear();
    const view = render(<div style={{ width: '320px' }}><ProgressProvider><RuyiStaffExperience reducedMotion muted onComplete={() => undefined} /></ProgressProvider></div>);
    await screen.findByRole('button', { name: '执行战斗指令' }, { timeout: 5000 });
    await screen.findByRole('img', { name: '龙宫定海神针代码执行场景' }, { timeout: 5000 });
    const experience = view.container.querySelector<HTMLElement>('.ruyi-staff-experience')!;
    const scene = experience.querySelector<HTMLElement>('.ruyi-staff-scene-frame')!;
    const controls = experience.querySelector<HTMLElement>('.dragon-palace-scene-controls')!;
    const program = experience.querySelector<HTMLElement>('.ruyi-staff-program-region')!;
    const workspace = experience.querySelector<HTMLElement>('.ruyi-staff-workspace')!;
    const feedback = experience.querySelector<HTMLElement>('.ruyi-staff-feedback-region')!;
    const comesBefore = (first: Node, second: Node) => Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(comesBefore(scene, controls)).toBe(true);
    expect(comesBefore(controls, program)).toBe(true);
    expect(comesBefore(program, feedback)).toBe(true);
    expect(['0', '0px']).toContain(getComputedStyle(experience).minWidth);
    expect(['0', '0px']).toContain(getComputedStyle(program).minWidth);
    expect(['0', '0px']).toContain(getComputedStyle(workspace).minWidth);
    expect(getComputedStyle(workspace).overflowX).toBe('hidden');
    expect(getComputedStyle(screen.getByLabelText('Blockly 积木编辑区')).overflowX).toBe('hidden');
  });

  it('gives Blockly actions, feedback and unsaved recovery exact 44px coarse-pointer targets', () => {
    const rules = coarsePointerRules([readCss('src/styles.css'), readCss('src/components/FourSeasRegaliaExperience.css')].join('\n'));
    const targetSelectors = [
      '.block-program-actions button',
      '.battle-feedback button',
      '.unsaved-session button',
      '.four-seas-helper button',
    ];
    for (const selector of targetSelectors) {
      const rule = rules.find((candidate) => candidate.selectorText.split(',').map((item) => item.trim()).includes(selector));
      expect(rule, `${selector} must be present in the coarse-pointer contract`).toBeDefined();
      expect(rule?.style.minWidth).toBe('44px');
      expect(rule?.style.minHeight).toBe('44px');
    }
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
