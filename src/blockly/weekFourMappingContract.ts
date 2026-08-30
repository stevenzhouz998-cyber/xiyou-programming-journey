export type WeekFourMappingField = 'appearance' | 'identity';
export type WeekFourMappingAction = 'continue-verification' | 'polite-pass';
export type WeekFourMappingState = 'mapping-ready' | 'mapping-proven';

export interface WeekFourMappingCard {
  id: 'canon-mysterious-visitor' | 'practice-mountain-traveller';
  kind: 'canon-intro' | 'practice';
  appearance: '陌生来客' | '山中樵夫';
  identity: '白骨精' | '普通人';
}

export type WeekFourMappingSource = { kind: 'blockly'; blockId: string } | { kind: 'python'; line: 1; from: number; to: number };
export interface WeekFourMappingTraceItem {
  cardId: WeekFourMappingCard['id'];
  field: WeekFourMappingField;
  value: string;
  conditionResult: boolean;
  branchAction: WeekFourMappingAction;
  finalSceneState: 'verification-continued' | 'traveller-cleared';
  source: WeekFourMappingSource;
}
export interface WeekFourMappingFailureSnapshot {
  snapshotId: string;
  cardId: WeekFourMappingCard['id'];
  blocklyField: WeekFourMappingField;
  pythonField: WeekFourMappingField;
  blocklyValue: string;
  pythonValue: string;
  blocklyConditionResult: boolean;
  pythonConditionResult: boolean;
  blocklyBranchAction: WeekFourMappingAction;
  pythonBranchAction: WeekFourMappingAction;
}
export interface WeekFourMappingRunResult {
  completed: boolean;
  finalState: WeekFourMappingState;
  cardResults: WeekFourMappingTraceItem[];
  failureSnapshot: WeekFourMappingFailureSnapshot | null;
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

export const WEEK_FOUR_MAPPING_CARDS: readonly WeekFourMappingCard[] = Object.freeze([
  Object.freeze({ id: 'canon-mysterious-visitor', kind: 'canon-intro', appearance: '陌生来客', identity: '白骨精' }),
  Object.freeze({ id: 'practice-mountain-traveller', kind: 'practice', appearance: '山中樵夫', identity: '普通人' }),
]);

const penalty = Object.freeze({ livesLost: 0, resourcesLost: 0, starsLost: 0 }) as { livesLost: 0; resourcesLost: 0; starsLost: 0 };
const actionFor = (conditionResult: boolean): WeekFourMappingAction => conditionResult ? 'continue-verification' : 'polite-pass';
const sceneFor = (conditionResult: boolean): WeekFourMappingTraceItem['finalSceneState'] => conditionResult ? 'verification-continued' : 'traveller-cleared';

export function traceForField(field: WeekFourMappingField, source: WeekFourMappingSource): WeekFourMappingTraceItem[] {
  return WEEK_FOUR_MAPPING_CARDS.map((card) => {
    const value = card[field];
    const conditionResult = value === '白骨精';
    return { cardId: card.id, field, value, conditionResult, branchAction: actionFor(conditionResult), finalSceneState: sceneFor(conditionResult), source: structuredClone(source) };
  });
}

function canonicalTrace(trace: readonly WeekFourMappingTraceItem[], expectedSource: WeekFourMappingSource['kind']): void {
  if (!Array.isArray(trace) || trace.length !== WEEK_FOUR_MAPPING_CARDS.length) throw new Error('W4-M1 trace 必须含两张固定公开卡。');
  const field = trace[0]?.field;
  if (field !== 'appearance' && field !== 'identity') throw new Error('W4-M1 trace 字段不合法。');
  const source: WeekFourMappingSource = expectedSource === 'blockly'
    ? { kind: 'blockly', blockId: 'mapping-condition' }
    : { kind: 'python', line: 1, from: 3, to: 3 + field.length };
  const expected = traceForField(field, source);
  for (let index = 0; index < expected.length; index += 1) {
    const actual = trace[index]; const canonical = expected[index]!;
    if (!actual || actual.source.kind !== expectedSource || actual.cardId !== canonical.cardId || actual.field !== canonical.field || actual.value !== canonical.value || actual.conditionResult !== canonical.conditionResult || actual.branchAction !== canonical.branchAction || actual.finalSceneState !== canonical.finalSceneState || JSON.stringify(actual.source) !== JSON.stringify(canonical.source)) throw new Error('W4-M1 trace 不匹配公开语义或稳定来源。');
  }
}

function snapshot(blockly: WeekFourMappingTraceItem, python: WeekFourMappingTraceItem): WeekFourMappingFailureSnapshot {
  return {
    snapshotId: `w4-m1-${blockly.cardId}-${blockly.field}-${python.field}`,
    cardId: blockly.cardId,
    blocklyField: blockly.field,
    pythonField: python.field,
    blocklyValue: blockly.value,
    pythonValue: python.value,
    blocklyConditionResult: blockly.conditionResult,
    pythonConditionResult: python.conditionResult,
    blocklyBranchAction: blockly.branchAction,
    pythonBranchAction: python.branchAction,
  };
}

export function compareWeekFourMappingTraces(blockly: readonly WeekFourMappingTraceItem[], python: readonly WeekFourMappingTraceItem[]): WeekFourMappingRunResult {
  canonicalTrace(blockly, 'blockly');
  canonicalTrace(python, 'python');
  for (let index = 0; index < WEEK_FOUR_MAPPING_CARDS.length; index += 1) {
    const left = blockly[index]!; const right = python[index]!;
    if (left.cardId !== right.cardId || left.field !== right.field || left.value !== right.value || left.conditionResult !== right.conditionResult || left.branchAction !== right.branchAction || left.finalSceneState !== right.finalSceneState) return { completed: false, finalState: 'mapping-ready', cardResults: structuredClone(blockly.slice(0, index + 1)), failureSnapshot: snapshot(left, right), penalty };
  }
  return { completed: true, finalState: 'mapping-proven', cardResults: structuredClone([...blockly]), failureSnapshot: null, penalty };
}
