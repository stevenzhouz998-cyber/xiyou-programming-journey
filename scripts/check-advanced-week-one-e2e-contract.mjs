import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'

const advancedIds = new Set(['w1-m4', 'w1-m5'])

function parse(source) { return ts.createSourceFile('contract.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX) }
function descendants(node) {
  const result = []
  const visit = (current) => { result.push(current); ts.forEachChild(current, visit) }
  visit(node)
  return result
}

export function assertAdvancedWeekOneE2ESourceContract(source) {
  const file = parse(source)
  for (const node of descendants(file)) {
    if (!ts.isCallExpression(node)) continue
    const text = node.expression.getText(file)
    if (text.endsWith('.evaluate') || text.endsWith('.addInitScript')) {
      const body = node.arguments.map((argument) => argument.getText(file)).join('\n')
      for (const id of advancedIds) assert.doesNotMatch(body, new RegExp(`['\"]${id}['\"]`), `advanced E2E must not inject ${id} browser state`)
    }
  }
  assert.match(source, /attachHealth\(page\)/, 'advanced E2E must collect browser health')
  assert.match(source, /expect\(healthEvents[^\n]*\)\.toEqual\(\[\]\)/, 'advanced E2E must assert unfiltered health')
  assert.doesNotMatch(source, /healthEvents\.filter\(/, 'advanced E2E health must exempt only the active fault while it is captured, never filter afterwards')
  assert.doesNotMatch(source, /\b(?:eval|Function)\s*\(/, 'advanced E2E must not dynamically execute browser or test code')
  for (const tag of ['@advanced-full', '@advanced-storage', '@advanced-keyboard', '@advanced-parity', '@advanced-external', '@advanced-corrupt', '@advanced-cold', '@advanced-parent', '@advanced-chunk-fault', '@advanced-asset-fault', '@advanced-narrow']) {
    assert.match(source, new RegExp(tag), `advanced E2E must contain ${tag} evidence`)
    assert.match(source, new RegExp(`test\\(\\s*['\"][^'\"]*${tag}`), `advanced E2E must not use ${tag} as an unexecuted label`)
  }
  for (const required of [
    '重试保存积木', '重试保存本次记录', '重试保存通关', '载入其他标签页版本',
    '下载损坏原文', '导出进度', '选择进度文件', 'UNDERWORLD_REGISTER_COLD_LOAD_MAX_BYTES',
    'THIRD_CHAPTER_BOSS_COLD_LOAD_MAX_BYTES', 'AdvancedWeekOneExperience',
    'AdvancedWeekOneScene', 'AdvancedWeekOneBlocklyWorkspace',
  ]) assert.match(source, new RegExp(required), `advanced E2E must visibly cover ${required}`)
}

export function assertAdvancedHelpSourceContract(source) {
  const file = parse(source)
  const hintPanel = file.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === 'HintPanel')
  assert.ok(hintPanel && hintPanel.body, 'HintPanel must remain a standalone help component')
  const body = hintPanel.body.getText(file)
  assert.doesNotMatch(body, /Blockly|run[A-Z]|\.complete\s*\(/, 'help must not edit Blockly, run code, or complete a mission')
}

export function assertWeekOneSystemE2ESourceContract(source, configSource) {
  const file = parse(source)
  assert.doesNotMatch(source, /\.addInitScript\s*\(/, 'unified week-one E2E must begin from real initial progress')
  assert.doesNotMatch(source, /\bstorageState\b/, 'unified week-one E2E must not preload browser state')
  for (const node of descendants(file)) {
    if (!ts.isCallExpression(node) || !node.expression.getText(file).endsWith('.evaluate')) continue
    for (const inner of descendants(node)) {
      if (ts.isCallExpression(inner) && /(?:setItem|removeItem|clear)$/.test(inner.expression.getText(file))) {
        assert.fail('unified week-one E2E evaluate callbacks must be read-only')
      }
      if (ts.isBinaryExpression(inner) && ts.isAssignmentOperator(inner.operatorToken.kind)) {
        assert.fail('unified week-one E2E evaluate callbacks must not assign browser state')
      }
      if (ts.isPrefixUnaryExpression(inner) || ts.isPostfixUnaryExpression(inner)) {
        assert.fail('unified week-one E2E evaluate callbacks must not mutate browser state')
      }
    }
  }
  assert.match(source, /test\(\s*['"][^'"]*@week-one-system/, 'unified week-one evidence tag must execute on a real test')
  assert.match(source, /attachHealth\(page\)/, 'unified week-one E2E must capture browser health')
  assert.match(source, /expect\(healthEvents[^\n]*\)\.toEqual\(\[\]\)/, 'unified week-one E2E must assert raw browser health')
  assert.doesNotMatch(source, /healthEvents\.filter\(/, 'unified week-one health evidence must not be filtered after collection')
  for (const visibleControl of [
    '执行战斗指令', '执行披挂指令', '执行幽冥勾名指令', '执行第三回总试炼指令',
    '打开装备行囊', '查看重量资料', '查看任务拆分图', '回看已走通步骤', '再次定位问题积木',
    '卸下', '导出进度', '选择进度文件',
  ]) assert.match(source, new RegExp(visibleControl), `unified week-one E2E must use visible control: ${visibleControl}`)
  assert.equal((configSource.match(/@week-one-system/g) ?? []).length, 5, 'all five approved projects must execute the unified week-one path')
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const root = new URL('..', import.meta.url)
  assertAdvancedWeekOneE2ESourceContract(fs.readFileSync(new URL('../e2e/underworld-boss-code-battle.spec.ts', import.meta.url), 'utf8'))
  assertWeekOneSystemE2ESourceContract(
    fs.readFileSync(new URL('../e2e/week-one-system-loop.spec.ts', import.meta.url), 'utf8'),
    fs.readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8'),
  )
  assertAdvancedHelpSourceContract(fs.readFileSync(new URL('../src/components/MissionPageContent.tsx', root), 'utf8'))
}
