import ts from 'typescript';

const TAGS = ['@w3-m3-full', '@w3-m3-keyboard', '@w3-m3-storage', '@w3-m3-corrupt', '@w3-m3-parent', '@w3-m3-cold', '@w3-m3-asset-fault', '@w3-m3-narrow', '@w3-m3-external', '@w3-m3-lazy'];
const hasW3M3Literal = (node) => {
  let found = false;
  const walk = (current) => {
    if (ts.isStringLiteralLike(current) && current.text === 'w3-m3') found = true;
    ts.forEachChild(current, walk);
  };
  walk(node);
  return found;
};

function assertHealthEvidence(source, file) {
  if (!source.includes('attachHealth(page)') || !/test\.afterEach[\s\S]*healthEvents\.get\(page\)[\s\S]*toEqual\(\[\]\)/.test(source)) throw new Error('w3-m3 source contract: missing raw health evidence.');
  const extraPages = new Set();
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isAwaitExpression(node.initializer) && ts.isCallExpression(node.initializer.expression)) {
      const call = node.initializer.expression;
      if (ts.isPropertyAccessExpression(call.expression) && call.expression.name.text === 'newPage') extraPages.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  for (const pageName of extraPages) {
    if (!new RegExp(`attachHealth\\(${pageName}\\)`).test(source)) throw new Error(`w3-m3 source contract: ${pageName} lacks attachHealth.`);
    if (!new RegExp(`finally[\\s\\S]*await ${pageName}\\.close\\(\\)`).test(source)) throw new Error(`w3-m3 source contract: ${pageName} must finally close.`);
  }
}

export function assertWeekThreeYunzhanDialogueE2ESourceContract(source) {
  if (typeof source !== 'string') throw new Error('w3-m3 source contract: E2E source must be text.');
  for (const tag of TAGS) if (!source.includes(tag)) throw new Error(`w3-m3 source contract: missing ${tag}.`);
  if (/expectedSequence|LegacyMissionBuilder|MissionTools|\beval\s*\(|\bnew Function\b|\bimport\s*\(/.test(source)) throw new Error('w3-m3 source contract: legacy or dynamic shortcut is forbidden.');
  const file = ts.createSourceFile('w3m3.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.parseDiagnostics.length > 0) throw new Error('w3-m3 source contract: E2E source must parse.');
  assertHealthEvidence(source, file);
  const walk = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const name = node.expression.name.text;
      if (['setItem', 'removeItem', 'clear'].includes(name) && node.arguments.some(hasW3M3Literal)) throw new Error('w3-m3 source contract: direct browser storage write is forbidden.');
      if (node.expression.expression.getText(file) === 'healthEvents' && ['clear', 'delete'].includes(name)) throw new Error('w3-m3 source contract: health evidence mutation is forbidden.');
      if (['defineProperty', 'defineProperties', 'setPrototypeOf'].includes(name) && ['Object', 'Reflect'].includes(node.expression.expression.getText(file))) throw new Error('w3-m3 source contract: dynamic monkeypatch is forbidden.');
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && /(?:localStorage|sessionStorage|Storage\.prototype|healthEvents)/.test(node.left.getText(file))) throw new Error('w3-m3 source contract: browser-state or health mutation is forbidden.');
    ts.forEachChild(node, walk);
  };
  walk(file);
}
