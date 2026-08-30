import ts from 'typescript';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const W3_M5_TAGS = ['@w3-m5-full', '@w3-m5-keyboard', '@w3-m5-mouse', '@w3-m5-touch', '@w3-m5-storage', '@w3-m5-corrupt', '@w3-m5-parent', '@w3-m5-cold', '@w3-m5-asset-fault', '@w3-m5-narrow', '@w3-m5-external', '@w3-m5-lazy'];
const FORBIDDEN = /expectedSequence|LegacyMissionBuilder|MissionTools|\beval\s*\(|\bnew Function\b|\bimport\s*\(|healthEvents\.(?:clear|delete|filter|splice|pop|shift)\s*\(/;
const W3_M5_WRITE = /(?:localStorage|sessionStorage)\.setItem\([^)]*(?:['"`]w3-m5['"`]|w3['"`][^)]{0,20}m5)|(?:missions|sessions|missionCompletionEvidence)\s*:\s*\{[^}]{0,240}(?:['"`]w3-m5['"`]|w3['"`][^}]{0,20}m5)/;

function functionText(file, name) {
  let value = null;
  const visit = (node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === name) value = node.getText(file); ts.forEachChild(node, visit); };
  visit(file); return value;
}

export function assertWeekThreeBossE2ESourceContract(source) {
  if (typeof source !== 'string') throw new Error('w3-m5 source contract: E2E source must be text.');
  for (const tag of W3_M5_TAGS) if (!source.includes(tag)) throw new Error(`w3-m5 source contract: missing ${tag}.`);
  if (FORBIDDEN.test(source)) throw new Error('w3-m5 source contract: forbidden legacy, dynamic-code, or health shortcut.');
  if (W3_M5_WRITE.test(source)) throw new Error('w3-m5 source contract: direct W3-M5 browser storage/proof injection is forbidden.');
  if (/\btest\.skip\b|\.skip\s*\(/.test(source)) throw new Error('w3-m5 source contract: skipped W3-M5 evidence is forbidden.');
  const file = ts.createSourceFile('w3m5.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.parseDiagnostics.length) throw new Error('w3-m5 source contract: E2E source must parse.');
  const helper = functionText(file, 'formalW3M4Prerequisite');
  if (!helper) throw new Error('w3-m5 source contract: missing the only legal W3-M4 formal prerequisite helper.');
  if (helper.includes("'w3-m5'") || helper.includes('w3-m5')) throw new Error('w3-m5 source contract: prerequisite helper may not write W3-M5 state.');
  const helperHash = createHash('sha256').update(helper).digest('hex');
  if (!source.includes(`W3_M4_PREREQUISITE_SHA256 = '${helperHash}'`)) throw new Error('w3-m5 source contract: prerequisite helper requires a fixed SHA-256 review marker.');
  if (!source.includes('attachHealth(page)') || !/test\.afterEach[\s\S]*healthEvents\.get\(page\)[\s\S]*toEqual\(\[\]\)/.test(source)) throw new Error('w3-m5 source contract: missing raw browser-health evidence.');
  for (const marker of ['replaceConditionFromToolbox', 'swapYunzhanBranches', 'selectBossOperator', 'completeBoss', 'retry', 'conditionObservationUses', 'missionCompletionEvidence', '下载当前积木备份', '重试加载场景图片', '重新加载页面']) if (!source.includes(marker)) throw new Error(`w3-m5 source contract: missing real repair, success, or recovery evidence (${marker}).`);
  const config = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');
  const expectedProjects = [
    ['desktop-chromium-1440x1024', '@w3-m5/'],
    ['tablet-webkit-768x1024', '@w3-m5-full', '@w3-m5-cold'],
    ['mobile-chromium-390x844', '@w3-m5-full', '@w3-m5-touch', '@w3-m5-cold'],
    ['desktop-firefox-1440x1024', '@w3-m5-full', '@w3-m5-keyboard', '@w3-m5-cold'],
    ['narrow-chromium-320x844', '@w3-m5-full', '@w3-m5-touch', '@w3-m5-narrow', '@w3-m5-cold'],
  ];
  for (const [project, ...tags] of expectedProjects) { const start = config.indexOf(`name: '${project}'`); const end = start < 0 ? -1 : config.indexOf("\n    },", start); const segment = start < 0 ? '' : config.slice(start, end < 0 ? undefined : end); if (!tags.every((tag) => segment.includes(tag))) throw new Error(`w3-m5 source contract: ${project} must collect ${tags.join(', ')}.`); }
  const pages = [...source.matchAll(/const\s+(\w+)\s*=\s+await\s+context\.newPage\(\)/g)].map((match) => match[1]);
  for (const page of pages) if (!new RegExp(`attachHealth\\(${page}\\)[\\s\\S]*finally[\\s\\S]*await ${page}\\.close\\(\\)`).test(source)) throw new Error(`w3-m5 source contract: ${page} must attach health and close in finally.`);
}
