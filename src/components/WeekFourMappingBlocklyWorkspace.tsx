import * as Blockly from 'blockly';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { compileWeekFourMappingWorkspace, restoreWeekFourMappingWorkspace, type WeekFourMappingCompileResult, type WeekFourMappingWorkspaceDraftV1 } from '../blockly/weekFourMappingCompiler';

export interface WeekFourMappingBlocklyWorkspaceProps {
  draft: WeekFourMappingWorkspaceDraftV1;
  focusBlockId: string | null;
}

export interface WeekFourMappingBlocklyWorkspaceHandle {
  compile(): WeekFourMappingCompileResult;
  focusBlock(id: string): void;
}

export const WeekFourMappingBlocklyWorkspace = forwardRef<WeekFourMappingBlocklyWorkspaceHandle, WeekFourMappingBlocklyWorkspaceProps>(function WeekFourMappingBlocklyWorkspace({ draft, focusBlockId }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const focusBlock = (id: string) => {
    const block = workspaceRef.current?.getBlockById(id);
    if (!block) return;
    block.select();
    (block as Blockly.BlockSvg).getSvgRoot()?.focus();
  };
  const compile = () => {
    if (!workspaceRef.current) throw new Error('Blockly 参考图尚未准备好。');
    return compileWeekFourMappingWorkspace(workspaceRef.current);
  };
  useImperativeHandle(ref, () => ({ compile, focusBlock }), [draft]);

  useEffect(() => {
    if (!hostRef.current) return;
    const workspace = Blockly.inject(hostRef.current, { readOnly: true, scrollbars: true, trashcan: false, zoom: { controls: false, wheel: false, startScale: 0.85 } });
    workspaceRef.current = workspace;
    try {
      Blockly.Events.disable();
      restoreWeekFourMappingWorkspace(workspace, draft);
      for (const block of workspace.getAllBlocks(false)) (block as Blockly.BlockSvg).initSvg();
      for (const block of workspace.getTopBlocks(false)) (block as Blockly.BlockSvg).render();
      for (const block of workspace.getAllBlocks(false)) (block as Blockly.BlockSvg).getSvgRoot()?.classList.add('blocklyDraggable');
      Blockly.svgResize(workspace);
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : '参考图无法恢复。');
    } finally { Blockly.Events.enable(); }
    return () => { workspace.dispose(); workspaceRef.current = null; };
  }, [draft]);
  useEffect(() => { if (focusBlockId) focusBlock(focusBlockId); }, [focusBlockId]);

  return <section className="week-four-mapping-blockly-panel" aria-label="Blockly 参考条件图">
    <header><h3>Blockly 参考图</h3><p>只读参考图</p></header>
    <div ref={hostRef} className="week-four-mapping-blockly-host" aria-label="Blockly 参考条件图" tabIndex={0} />
    {recoveryError ? <p role="alert">无法恢复 Blockly 参考图：{recoveryError}</p> : null}
  </section>;
});
