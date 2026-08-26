import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import manorHelpCss from './WeekThreeManorHelpExperience.css?raw';
import { completeMission, createInitialProgress } from '../progress/progress';
import { CURRENT_PROGRESS_KEY } from '../progress/storage';
import { ProgressProvider, useProgress } from '../context/ProgressContext';
import { WeekThreeManorHelpExperience } from './WeekThreeManorHelpExperience';

function stableProgress() {
  let progress = createInitialProgress();
  progress = completeMission(progress, 'w2-m4', { stars: 3, hintsUsed: 0 });
  return completeMission(progress, 'w2-m5', { stars: 3, hintsUsed: 0 });
}

function renderExperience(onComplete = vi.fn()) {
  localStorage.setItem(CURRENT_PROGRESS_KEY, JSON.stringify(stableProgress()));
  render(<ProgressProvider><WeekThreeManorHelpExperience reducedMotion muted onComplete={onComplete} /></ProgressProvider>);
  return onComplete;
}

function FormalCompletionHarness() {
  const { complete } = useProgress();
  return <WeekThreeManorHelpExperience reducedMotion muted onComplete={async (evidence) => (await complete('w3-m1', evidence)).status === 'saved'} />;
}

function PersistedWorkspaceProbe({ draft, onDraftChange }: any) {
  return <><output data-testid="persisted-workspace-root-x">{draft.blocks.find((block: any) => block.id === 'manor-root')?.x}</output><button type="button" onClick={() => void onDraftChange(draft)}>保存探针草稿</button></>;
}

function SceneProbe() { return <section />; }

async function loadScene() {
  fireEvent.load(await screen.findByAltText('高老庄求助道路'));
  fireEvent.load(screen.getByAltText('高才回庄与庄客问路状态'));
}

describe('W3-M1 庄上求助体验', () => {
  beforeEach(() => localStorage.clear());

  it('只在已保存的失败后开放火眼金睛，并且不扣除星级', async () => {
    const complete = renderExperience();
    await loadScene();
    expect(screen.queryByRole('button', { name: '火眼金睛·条件观察' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('这封练习口信提到高老庄，却没有请求降妖帮助，所以不该主动应承。');
    expect(screen.getByText('本次错误不会扣除生命、资源或星级。')).toBeInTheDocument();
    const observationButton = await screen.findByRole('button', { name: '火眼金睛·条件观察' });
    await waitFor(() => expect(observationButton).toBeEnabled());
    expect(complete).not.toHaveBeenCalled();
  });

  it('在运行前展示两张公开口信，而不泄露内部运行或答案信息', async () => {
    renderExperience();
    const messages = await screen.findByRole('region', { name: '双情境口信' });
    expect(messages).toHaveTextContent('原著情境');
    expect(messages).toHaveTextContent('高才奉高太公之命，正在寻找能降妖、解除庄上困扰的法师。');
    expect(messages).toHaveTextContent('练习情境·不改变原著');
    expect(messages).toHaveTextContent('庄客只介绍高老庄的位置和道路，没有请求帮助。');
    expect(messages.querySelectorAll('article')).toHaveLength(2);
    expect(messages).not.toHaveTextContent(/canon-gaocai-help|practice-manor-directions|true|false|正确答案|请改成|trace/i);
  });

  it('火眼金睛保存观察审计后才显示四项孩子可见事实，重复打开不重复记账', async () => {
    renderExperience();
    await loadScene();
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    const button = await screen.findByRole('button', { name: '火眼金睛·条件观察' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    const panel = await screen.findByRole('region', { name: '条件观察结果' });
    expect(panel).toHaveTextContent('口信提到了高老庄');
    expect(panel).toHaveTextContent('真');
    expect(panel).toHaveTextContent('这封练习口信只介绍高老庄的位置和道路，没有提出求助。');
    expect(panel).toHaveTextContent('主动应承');
    expect(panel).not.toHaveTextContent(/正确|下一步|请改成|evidence|snapshot/i);
    const before = JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!);
    fireEvent.click(button);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w3-m1'].conditionObservationUses).toHaveLength(1));
    const after = JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!);
    const normalize = (value: any) => {
      const copy = structuredClone(value);
      delete copy.savedAt;
      delete copy.sessions['w3-m1'].savedAt;
      delete copy.sessions['w3-m1'].conditionObservationUses;
      return copy;
    };
    expect(normalize(after)).toEqual(normalize(before));
  });

  it('图的语义编辑保存后关闭旧观察结果，并且成功运行必须等场景回放后才完成', async () => {
    const complete = renderExperience();
    await loadScene();
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    const observationButton = await screen.findByRole('button', { name: '火眼金睛·条件观察' });
    await waitFor(() => expect(observationButton).toBeEnabled());
    fireEvent.click(observationButton);
    await screen.findByRole('region', { name: '条件观察结果' });
    fireEvent.click(screen.getByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: '条件观察结果' })).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '火眼金睛·条件观察' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(complete).toHaveBeenCalledWith({ stars: 3, hintsUsed: 0 }));
  });

  it('保存失败不发布运行，明确重试保存后才发布', async () => {
    let failRun = true;
    const saveProgressCoordinated = vi.fn(async (progress: any) => {
      if (failRun && progress.sessions['w3-m1']?.lastRun !== null) return { status: 'unsaved' as const, progress, error: 'synthetic run fault' };
      localStorage.setItem(CURRENT_PROGRESS_KEY, JSON.stringify(progress));
      return { status: 'saved' as const, revision: 1, progress };
    });
    localStorage.setItem(CURRENT_PROGRESS_KEY, JSON.stringify(stableProgress()));
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as any)}><WeekThreeManorHelpExperience reducedMotion muted onComplete={() => undefined} /></ProgressProvider>);
    await loadScene();
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    expect(await screen.findByText('本次学习记录尚未保存，请重试。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '火眼金睛·条件观察' })).not.toBeInTheDocument();
    failRun = false;
    fireEvent.click(screen.getByRole('button', { name: '重试保存本次记录' }));
    const observationButton = await screen.findByRole('button', { name: '火眼金睛·条件观察' });
    await waitFor(() => expect(observationButton).toBeEnabled());
  });

  it('观察审计保存失败时不打开面板，重试成功后才打开', async () => {
    let failObservation = true;
    const saveProgressCoordinated = vi.fn(async (progress: any) => {
      if (failObservation && progress.sessions['w3-m1']?.conditionObservationUses.length > 0) {
        return { status: 'unsaved' as const, progress, error: 'synthetic observation fault' };
      }
      localStorage.setItem(CURRENT_PROGRESS_KEY, JSON.stringify(progress));
      return { status: 'saved' as const, revision: 1, progress };
    });
    localStorage.setItem(CURRENT_PROGRESS_KEY, JSON.stringify(stableProgress()));
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as any)}><WeekThreeManorHelpExperience reducedMotion muted onComplete={() => undefined} /></ProgressProvider>);
    await loadScene();
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    const button = await screen.findByRole('button', { name: '火眼金睛·条件观察' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    expect(await screen.findByText('本次学习记录尚未保存，请重试。')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '条件观察结果' })).not.toBeInTheDocument();
    failObservation = false;
    fireEvent.click(screen.getByRole('button', { name: '重试保存本次记录' }));
    expect(await screen.findByRole('region', { name: '条件观察结果' })).toBeInTheDocument();
  });

  it('外层完成回调拒绝后，新的合法运行仍可重新提交', async () => {
    const complete = vi.fn().mockResolvedValue(false);
    renderExperience(complete);
    await loadScene();
    fireEvent.click(screen.getByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '执行两张口信' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: '执行两张口信' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(2));
  });

  it('真实完成回调只在资源就绪的可见成功播放后写入 formal-v3 证明', async () => {
    localStorage.setItem(CURRENT_PROGRESS_KEY, JSON.stringify(stableProgress()));
    render(<ProgressProvider><FormalCompletionHarness /></ProgressProvider>);
    fireEvent.click(await screen.findByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '执行两张口信' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '执行两张口信' })).toBeDisabled());
    const beforeResources = JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!);
    expect(beforeResources.missions['w3-m1']).toBeUndefined();
    expect(beforeResources.missionCompletionEvidence['w3-m1']).toBeUndefined();
    await loadScene();
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!);
      expect(saved.missions['w3-m1']).toMatchObject({ status: 'completed' });
      expect(saved.missionCompletionEvidence['w3-m1']).toMatchObject({ kind: 'formal-v3', run: { completed: true, failureSnapshot: null } });
      expect(saved.missionCompletionEvidence['w3-m1'].run.scenarioResults).toHaveLength(2);
      expect(saved.missionCompletionEvidence['w3-m1'].run.scenarioResults.every((scenario: any) => scenario.passed)).toBe(true);
    });
  });

  it('获得但尚未稳定的能力在失败后仍隐藏火眼金睛', async () => {
    let progress = createInitialProgress();
    progress = completeMission(progress, 'w2-m4', { stars: 3, hintsUsed: 0 });
    localStorage.setItem(CURRENT_PROGRESS_KEY, JSON.stringify(progress));
    render(<ProgressProvider><WeekThreeManorHelpExperience reducedMotion muted onComplete={() => undefined} /></ProgressProvider>);
    await loadScene();
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: '火眼金睛·条件观察' })).not.toBeInTheDocument();
  });

  it('运行保存冲突不发布旧结果，载入外部版本会清除待发布结果', async () => {
    const saveProgressCoordinated = vi.fn(async (progress: any) => {
      if (progress.sessions['w3-m1']?.lastRun !== null) return { status: 'conflict' as const, progress, expectedRevision: 0, actualRevision: 1, error: 'synthetic conflict' };
      return { status: 'saved' as const, revision: 1, progress };
    });
    localStorage.setItem(CURRENT_PROGRESS_KEY, JSON.stringify(stableProgress()));
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as any)}><WeekThreeManorHelpExperience reducedMotion muted onComplete={() => undefined} /></ProgressProvider>);
    await loadScene();
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    expect(await screen.findByText('本次记录与其他标签页冲突。')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toHaveTextContent('本次记录与其他标签页冲突。');
    expect(screen.queryByRole('button', { name: '火眼金睛·条件观察' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '载入其他标签页版本' }));
    await waitFor(() => expect(screen.queryByText('本次记录与其他标签页冲突。')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '火眼金睛·条件观察' })).not.toBeInTheDocument();
  });

  it('workspace 始终回灌 coordinator 返回的已保存规范草稿，而不是瞬时闭包草稿', async () => {
    const saveProgressCoordinated = vi.fn(async (progress: any) => {
      const canonical = structuredClone(progress);
      canonical.sessions['w3-m1'].workspace.blocks.find((block: any) => block.id === 'manor-root').x = 777;
      return { status: 'saved' as const, revision: 1, progress: canonical };
    });
    localStorage.setItem(CURRENT_PROGRESS_KEY, JSON.stringify(stableProgress()));
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as any)}><WeekThreeManorHelpExperience reducedMotion muted onComplete={() => undefined} workspaceLoader={() => Promise.resolve({ default: PersistedWorkspaceProbe as any })} sceneLoader={() => Promise.resolve({ default: SceneProbe as any })} /></ProgressProvider>);
    expect(await screen.findByTestId('persisted-workspace-root-x')).toHaveTextContent('48');
    fireEvent.click(screen.getByRole('button', { name: '保存探针草稿' }));
    await waitFor(() => expect(screen.getByTestId('persisted-workspace-root-x')).toHaveTextContent('777'));
  });

  it('连续双击运行只保存一条实际运行记录', async () => {
    renderExperience();
    await loadScene();
    const run = screen.getByRole('button', { name: '执行两张口信' });
    fireEvent.click(run);
    fireEvent.click(run);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w3-m1'].totalRuns).toBe(1));
  });

  it('连续双击恢复保存只调用一次 coordinator retry', async () => {
    let failRun = true;
    const saveProgressCoordinated = vi.fn(async (progress: any) => {
      if (failRun && progress.sessions['w3-m1']?.lastRun !== null) return { status: 'unsaved' as const, progress, error: 'synthetic run fault' };
      return { status: 'saved' as const, revision: 1, progress };
    });
    localStorage.setItem(CURRENT_PROGRESS_KEY, JSON.stringify(stableProgress()));
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as any)}><WeekThreeManorHelpExperience reducedMotion muted onComplete={() => undefined} /></ProgressProvider>);
    await loadScene();
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await screen.findByRole('button', { name: '重试保存本次记录' });
    failRun = false;
    const retry = screen.getByRole('button', { name: '重试保存本次记录' });
    fireEvent.click(retry);
    fireEvent.click(retry);
    await waitFor(() => expect(saveProgressCoordinated).toHaveBeenCalledTimes(2));
  });

  it('完成保存 Promise 未结束时保持播放锁且只调用一次完成回调', async () => {
    let resolve!: (accepted: boolean) => void;
    const complete = vi.fn(() => new Promise<boolean>((done) => { resolve = done; }));
    renderExperience(complete);
    await loadScene();
    fireEvent.click(screen.getByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '执行两张口信' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '执行两张口信' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '重播最近一次' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    expect(complete).toHaveBeenCalledTimes(1);
    resolve(true);
    await waitFor(() => expect(screen.getByRole('button', { name: '执行两张口信' })).toBeEnabled());
  });

  it('完成回调拒绝后会解锁，并允许下一次合法运行重新提交', async () => {
    const complete = vi.fn().mockRejectedValueOnce(new Error('synthetic completion failure')).mockResolvedValueOnce(true);
    renderExperience(complete);
    await loadScene();
    fireEvent.click(screen.getByRole('button', { name: '换成：口信是在明确请求降妖帮助' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '执行两张口信' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: '执行两张口信' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '执行两张口信' }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(2));
  });

  it('CSS 将竖向状态表约束在按高度计算的 viewport 内，而不是按宽度放大', () => {
    expect(manorHelpCss).toMatch(/\.week-three-manor-help-sprite-viewport\s*\{[^}]*height:\s*min\(86%,\s*360px\)/s);
    expect(manorHelpCss).toMatch(/\.week-three-manor-help-sprite-viewport\s*\{[^}]*aspect-ratio:\s*418\s*\/\s*941/s);
    expect(manorHelpCss).not.toMatch(/\.week-three-manor-help-sprite-viewport\s*\{[^}]*width:\s*min\(30%/s);
  });

  it('窄屏只固定唯一列，让场景、积木、口信和后续反馈按 DOM 流自然排布', () => {
    const narrowLayout = manorHelpCss.match(/@media \(max-width: 900px\) \{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(narrowLayout).toMatch(/\.advanced-week-one-experience\.week-three-manor-help-experience\s*>\s*\.advanced-week-one-workspace\.week-three-manor-help-workspace\s*\{[^}]*grid-column:\s*1/s);
    expect(narrowLayout).not.toMatch(/\.week-three-manor-help-(?:scene|workspace|messages)[^{]*\{[^}]*grid-row\s*:/s);
  });
});
