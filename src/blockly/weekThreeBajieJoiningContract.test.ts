import { describe, expect, it } from 'vitest';
import {
  BAJIE_JOINING_SCENARIOS,
  BajieJoiningGraphError,
  compileBajieJoiningDraft,
  createDefaultBajieJoiningDraft,
  runBajieJoiningForDraft,
  validateBajieJoiningDraft,
} from './weekThreeBajieJoiningContract';

const draft = () => structuredClone(createDefaultBajieJoiningDraft());

function withStableRenamedIds() {
  const visible = draft();
  const ids = new Map(visible.blocks.map((block, index) => [block.id, `imported-bajie-block-${index + 1}`]));
  for (const block of visible.blocks) {
    block.id = ids.get(block.id)!;
    for (const key of ['previousId', 'nextId', 'parentBlockId', 'conditionBlockId', 'leftBlockId', 'rightBlockId'] as const) {
      if (block[key] !== null) block[key] = ids.get(block[key]!)!;
    }
  }
  return visible;
}

function graphFailure(value: unknown, code: string): void {
  expect(() => compileBajieJoiningDraft(value)).toThrow(expect.objectContaining({ name: 'BajieJoiningGraphError', code }));
}

describe('W3-M4 八戒归队布尔合同', () => {
  it('三张公开卡与真假/evidence 共享唯一 scenario 数据源，并明确原著与逻辑练习边界', () => {
    expect(BAJIE_JOINING_SCENARIOS.map(({ id, cardKind, publicTitle, publicStatement, guanyinPrecepts, willingWestward, expectedBranch }) => ({ id, cardKind, publicTitle, publicStatement, guanyinPrecepts, willingWestward, expectedBranch }))).toEqual([
      { id: 'canon-bajie-joins', cardKind: 'canon', publicTitle: '原著情境·八戒归队', publicStatement: '猪悟能已蒙观音劝善受戒，也明确愿随唐僧西去。', guanyinPrecepts: true, willingWestward: true, expectedBranch: 'then' },
      { id: 'practice-precepts-only', cardKind: 'practice', publicTitle: '逻辑练习·不改变原著', publicStatement: '逻辑练习，不改变原著：这位同行者已蒙观音劝善受戒，但没有明确愿随唐僧西去。', guanyinPrecepts: true, willingWestward: false, expectedBranch: 'else' },
      { id: 'practice-willing-only', cardKind: 'practice', publicTitle: '逻辑练习·不改变原著', publicStatement: '逻辑练习，不改变原著：这位同行者明确愿随唐僧西去，但尚未蒙观音劝善受戒。', guanyinPrecepts: false, willingWestward: true, expectedBranch: 'else' },
    ]);
    for (const scenario of BAJIE_JOINING_SCENARIOS.filter((item) => item.cardKind === 'practice')) {
      expect(`${scenario.publicTitle} ${scenario.publicStatement}`).toMatch(/逻辑练习|不改变原著/);
    }
  });

  it('场景卡数组及卡片在运行时不可变，改写尝试不能改变编译结果', () => {
    const first = BAJIE_JOINING_SCENARIOS[0]!;
    const snapshot = { ...first };
    const count = BAJIE_JOINING_SCENARIOS.length;
    const baseline = compileBajieJoiningDraft(draft());
    try {
      try { (first as any).guanyinPrecepts = false; } catch { /* frozen is acceptable */ }
      try { (first as any).publicTitle = '伪造标题'; } catch { /* frozen is acceptable */ }
      try { (BAJIE_JOINING_SCENARIOS as any).push({ ...snapshot, id: 'forged-scenario' }); } catch { /* frozen is acceptable */ }
      expect(BAJIE_JOINING_SCENARIOS.length).toBe(count);
      expect(BAJIE_JOINING_SCENARIOS[0]).toEqual(snapshot);
      expect(compileBajieJoiningDraft(draft())).toEqual(baseline);
    } finally {
      if (!Object.isFrozen(first)) Object.assign(first, snapshot);
      if (!Object.isFrozen(BAJIE_JOINING_SCENARIOS)) (BAJIE_JOINING_SCENARIOS as any).splice(count);
    }
  });

  it('默认 OR 只在第二张公开练习卡形成有效失败，且没有任何惩罚', () => {
    const visible = draft();
    const run = runBajieJoiningForDraft(visible, compileBajieJoiningDraft(visible));
    expect(run).toMatchObject({
      completed: false,
      finalState: 'checking-westward-team',
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
      scenarioResults: [{ scenarioId: 'canon-bajie-joins', combined: true, actualBranch: 'then', passed: true }],
      failureSnapshot: {
        scenarioId: 'practice-precepts-only', operator: 'or', left: true, right: false,
        combined: true, actualBranch: 'then', actionOpcode: 'formally-join-team', sourceBlockId: 'bajie-boolean-operation',
        leftConditionKind: 'guanyin-precepts', rightConditionKind: 'willing-westward',
      },
    });
  });

  it('失败快照记录真实左右条件种类，交换输入后不把真值贴到错误标签', () => {
    const visible = draft();
    const operation = visible.blocks.find((block) => block.id === 'bajie-boolean-operation')!;
    [operation.leftBlockId, operation.rightBlockId] = [operation.rightBlockId, operation.leftBlockId];
    expect(runBajieJoiningForDraft(visible, compileBajieJoiningDraft(visible)).failureSnapshot).toMatchObject({
      scenarioId: 'practice-precepts-only', left: false, right: true,
      leftConditionKind: 'willing-westward', rightConditionKind: 'guanyin-precepts',
    });
  });

  it('改为 AND 后三张公开卡得到 true/false/false，并在真实归队状态完成', () => {
    const visible = draft();
    visible.blocks.find((block) => block.id === 'bajie-boolean-operation')!.operator = 'and';
    const trace = compileBajieJoiningDraft(visible);
    const run = runBajieJoiningForDraft(visible, trace);
    expect(run).toMatchObject({ completed: true, finalState: 'westward-team-departed', failureSnapshot: null, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
    expect(run.scenarioResults.map((result) => ({ scenarioId: result.scenarioId, combined: result.combined, actualBranch: result.actualBranch, passed: result.passed }))).toEqual([
      { scenarioId: 'canon-bajie-joins', combined: true, actualBranch: 'then', passed: true },
      { scenarioId: 'practice-precepts-only', combined: false, actualBranch: 'else', passed: true },
      { scenarioId: 'practice-willing-only', combined: false, actualBranch: 'else', passed: true },
    ]);
  });

  it('合法导入图使用任意稳定 block ID 时仍能编译并确定性运行', () => {
    const visible = withStableRenamedIds();
    visible.blocks.find((block) => block.type === 'w3_bajie_boolean_operation')!.operator = 'and';
    const trace = compileBajieJoiningDraft(visible);
    expect(runBajieJoiningForDraft(visible, trace)).toMatchObject({ completed: true, finalState: 'westward-team-departed' });
  });

  it('每张卡的 canonical trace 都有精确的五条真实来源指令', () => {
    const visible = draft();
    visible.blocks.find((block) => block.id === 'bajie-boolean-operation')!.operator = 'and';
    const trace = compileBajieJoiningDraft(visible);
    for (const scenarioId of ['canon-bajie-joins', 'practice-precepts-only', 'practice-willing-only'] as const) {
      const items = trace.filter((item) => item.scenarioId === scenarioId);
      expect(items.map((item) => item.opcode)).toEqual(['receive-statement', 'check-guanyin-precepts', 'check-willing-westward', 'combine-conditions', scenarioId === 'canon-bajie-joins' ? 'formally-join-team' : 'continue-verification']);
      expect(items.map((item) => item.sourceBlockId)).toEqual(['bajie-receive-statement', 'bajie-guanyin-precepts', 'bajie-willing-westward', 'bajie-boolean-operation', scenarioId === 'canon-bajie-joins' ? 'bajie-formally-join-team' : 'bajie-continue-verification']);
    }
  });

  it('AND 的左右传感器可交换，有限的极端坐标不参与编译结果', () => {
    const baseline = draft();
    baseline.blocks.find((block) => block.id === 'bajie-boolean-operation')!.operator = 'and';
    const exchanged = structuredClone(baseline);
    const operation = exchanged.blocks.find((block) => block.id === 'bajie-boolean-operation')!;
    [operation.leftBlockId, operation.rightBlockId] = [operation.rightBlockId, operation.leftBlockId];
    for (const block of exchanged.blocks) { block.x = block.id.length % 2 ? -10_000 : 10_000; block.y = block.id.length % 3 ? -10_000 : 10_000; }
    expect(runBajieJoiningForDraft(exchanged, compileBajieJoiningDraft(exchanged))).toMatchObject({ completed: true, finalState: 'westward-team-departed' });
    expect(runBajieJoiningForDraft(exchanged, compileBajieJoiningDraft(exchanged)).scenarioResults.map(({ scenarioId, combined, actualBranch, passed }) => ({ scenarioId, combined, actualBranch, passed })))
      .toEqual(runBajieJoiningForDraft(baseline, compileBajieJoiningDraft(baseline)).scenarioResults.map(({ scenarioId, combined, actualBranch, passed }) => ({ scenarioId, combined, actualBranch, passed })));
  });

  it('拒绝空根、缺输入、未知 operator 或 block、孤儿、重复、跨容器、非互惠、错误父级和环', () => {
    const empty = draft(); empty.blocks = []; graphFailure(empty, 'empty-workspace');
    const missingRoot = draft(); missingRoot.blocks.find((block) => block.id === 'bajie-receive-statement')!.nextId = null; missingRoot.blocks.find((block) => block.id === 'bajie-if-join-ready')!.previousId = null; graphFailure(missingRoot, 'root-shape');
    const missingInput = draft(); missingInput.blocks.find((block) => block.id === 'bajie-boolean-operation')!.leftBlockId = null; graphFailure(missingInput, 'missing-boolean-input');
    const unknownOperator = draft(); unknownOperator.blocks.find((block) => block.id === 'bajie-boolean-operation')!.operator = 'xor' as never; graphFailure(unknownOperator, 'unknown-operator');
    const unknownBlock = draft(); unknownBlock.blocks[0]!.type = 'fake' as never; graphFailure(unknownBlock, 'unknown-type');
    const orphan = draft(); orphan.blocks.push({ ...orphan.blocks[0]!, id: 'orphan', previousId: null, nextId: null, parentBlockId: null }); graphFailure(orphan, 'duplicate-required-block');
    const duplicate = draft(); duplicate.blocks.push({ ...duplicate.blocks[0]!, id: 'copy-receive' }); graphFailure(duplicate, 'duplicate-required-block');
    const crossContainer = draft(); crossContainer.blocks.find((block) => block.id === 'bajie-formally-join-team')!.parentBlockId = null; graphFailure(crossContainer, 'action-shape');
    const nonreciprocal = draft(); nonreciprocal.blocks.find((block) => block.id === 'bajie-if-join-ready')!.previousId = null; graphFailure(nonreciprocal, 'nonreciprocal-link');
    const wrongParent = draft(); wrongParent.blocks.find((block) => block.id === 'bajie-guanyin-precepts')!.parentBlockId = 'bajie-receive-statement'; graphFailure(wrongParent, 'condition-shape');
    const cycle = draft(); cycle.blocks.find((block) => block.id === 'bajie-if-join-ready')!.nextId = 'bajie-receive-statement'; cycle.blocks.find((block) => block.id === 'bajie-receive-statement')!.previousId = 'bajie-if-join-ready'; graphFailure(cycle, 'cycle');
  });

  it('在读取或遍历积木前拒绝超限草稿，并限制每个连接引用 ID 的长度', () => {
    const sentinel = new Array(33);
    Object.defineProperty(sentinel, 0, { get: () => { throw new Error('block getter must not run'); } });
    graphFailure({ version: 1, missionId: 'w3-m4', blocks: sentinel }, 'too-many-blocks');
    for (const [blockId, key] of [
      ['bajie-if-join-ready', 'previousId'], ['bajie-receive-statement', 'nextId'], ['bajie-boolean-operation', 'parentBlockId'],
      ['bajie-if-join-ready', 'conditionBlockId'], ['bajie-boolean-operation', 'leftBlockId'], ['bajie-boolean-operation', 'rightBlockId'],
    ] as const) {
      const visible = draft();
      visible.blocks.find((block) => block.id === blockId)![key] = 'x'.repeat(129) as never;
      graphFailure(visible, 'invalid-reference');
    }
    const nonFinite = draft(); nonFinite.blocks[0]!.x = Number.POSITIVE_INFINITY;
    graphFailure(nonFinite, 'invalid-coordinate');
  });

  it('稀疏 blocks 不能跳过结构校验或导致 TypeError', () => {
    const sparse = { version: 1, missionId: 'w3-m4', blocks: new Array(7) };
    expect(() => validateBajieJoiningDraft(sparse)).toThrow(expect.objectContaining({ name: 'BajieJoiningGraphError', code: 'invalid-block' }));
    expect(() => compileBajieJoiningDraft(sparse)).toThrow(expect.objectContaining({ name: 'BajieJoiningGraphError', code: 'invalid-block' }));
  });

  it('结构错误不被当作运行：伪 trace 只返回无快照的 invalid-trace', () => {
    const visible = draft();
    const forged = compileBajieJoiningDraft(visible).map((item) => ({ ...item, combined: !item.combined }));
    expect(runBajieJoiningForDraft(visible, forged)).toMatchObject({ completed: false, failureSnapshot: null, diagnostic: { concept: 'invalid-trace' }, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
    expect(BajieJoiningGraphError).toBeTypeOf('function');
  });

  it('把循环、BigInt、额外键、toJSON、错误长度和非数组 trace 都 fail closed', () => {
    const visible = draft();
    const canonical = compileBajieJoiningDraft(visible);
    const cyclic: unknown[] = []; cyclic.push(cyclic);
    const withBigInt = [{ value: BigInt(1) }];
    const withExtraKey = canonical.map((item) => ({ ...item, extra: true }));
    const withToJson = canonical.map((item) => ({ ...item, toJSON: () => item }));
    for (const trace of [cyclic, withBigInt, withExtraKey, withToJson, canonical.slice(0, -1), null, { length: canonical.length }] as const) {
      expect(runBajieJoiningForDraft(visible, trace)).toMatchObject({ completed: false, failureSnapshot: null, diagnostic: { concept: 'invalid-trace' } });
    }
  });

  it('完整空洞和部分空洞 trace 都 fail closed，不借用 canonical trace 运行', () => {
    const visible = draft();
    const canonical = compileBajieJoiningDraft(visible);
    const sparse = new Array(canonical.length);
    const partial = [...canonical]; delete partial[4];
    for (const trace of [sparse, partial]) {
      expect(runBajieJoiningForDraft(visible, trace)).toMatchObject({ completed: false, failureSnapshot: null, diagnostic: { concept: 'invalid-trace' } });
    }
  });

  it('拒绝真正脱离固定所有者的孤儿积木，而不是把它伪装成重复类型', () => {
    const visible = draft();
    const action = visible.blocks.find((block) => block.id === 'bajie-formally-join-team')!;
    action.parentBlockId = null;
    action.branch = null;
    graphFailure(visible, 'orphan-block');
  });
});
