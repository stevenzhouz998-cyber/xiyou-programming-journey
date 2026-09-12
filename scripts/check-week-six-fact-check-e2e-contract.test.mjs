import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../e2e/week-six-fact-check.spec.ts',import.meta.url),'utf8');
const config=readFileSync(new URL('../playwright.config.ts',import.meta.url),'utf8');

test('requires the real W6-M4 blank review, source, evidence, recovery, parent and asset paths',()=>{
  for(const tag of ['full','keyboard','touch','storage','external','corrupt','assets','lazy','parent'])assert.match(source,new RegExp(`@w6-m4-${tag}\\b`),`missing @w6-m4-${tag}`);
  for(const label of ['核验而非猜测·回答审校台','人为编写的本地核验练习','我的 M3 正式说明书与输出','材料支持','与材料冲突','本页材料不足','保留原句','有据修订','暂不能确认'])assert.match(source,new RegExp(label));
  assert.match(source,/formalW6M3Completion/);
  assert.match(source,/sessionStorage\.getItem\(seed\)/);
  assert.match(source,/schemaRevision:21/);
  assert.match(source,/totalRuns\)\.toBe\(1\)/);
  assert.match(source,/flaming-mountain-background\\\.webp/);
  assert.doesNotMatch(source,/expectedSequence/);
  assert.doesNotMatch(source,/missionCompletionEvidence\s*\[\s*['"]w6-m4['"]\s*\]\s*=/);
});

test('keeps W6-M4 on five fixed projects with one worker and no retries',()=>{
  for(const name of ['desktop-chromium-1440x1024','desktop-firefox-1440x1024','tablet-webkit-768x1024','mobile-chromium-390x844','narrow-chromium-320x844'])assert.match(config,new RegExp(name));
  assert.match(config,/W6_M4_DESKTOP/);
  assert.match(config,/W6_M4_CROSS_BROWSER/);
  assert.match(config,/W6_M4_KEYBOARD/);
  assert.match(config,/W6_M4_TOUCH/);
  assert.match(config,/workers:\s*1/);
  assert.match(config,/retries:\s*0/);
});
