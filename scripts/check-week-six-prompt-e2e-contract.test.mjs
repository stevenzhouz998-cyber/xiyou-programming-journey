import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../e2e/week-six-prompt-brief.spec.ts',import.meta.url),'utf8');
const config=readFileSync(new URL('../playwright.config.ts',import.meta.url),'utf8');

test('requires the real W6-M3 input, recovery, readonly, parent and asset paths',()=>{
  for(const tag of ['full','keyboard','touch','storage','external','corrupt','assets','lazy','parent'])assert.match(source,new RegExp(`@w6-m3-${tag}\\b`),`missing @w6-m3-${tag}`);
  for(const label of ['按原著整理二调经过','悟空变作牛魔王模样，取得真扇','牛魔王变作八戒模样，骗回真扇','二调这次没有完成灭火通行','事件表','分步列表'])assert.match(source,new RegExp(label));
  assert.match(source,/formalW6M2Completion/);assert.match(source,/sessionStorage\.getItem\(seed\)/);assert.match(source,/toEqual\(before\)/);assert.match(source,/totalRuns\)\.toBe\(1\)/);assert.match(source,/flaming-mountain-background\\\.webp/);
  assert.doesNotMatch(source,/expectedSequence/);assert.doesNotMatch(source,/missionCompletionEvidence\s*\[\s*['"]w6-m3['"]\s*\]\s*=/);
});

test('keeps W6-M3 on five fixed projects with one worker and no retries',()=>{
  for(const name of ['desktop-chromium-1440x1024','desktop-firefox-1440x1024','tablet-webkit-768x1024','mobile-chromium-390x844','narrow-chromium-320x844'])assert.match(config,new RegExp(name));
  assert.match(config,/W6_M3_DESKTOP/);assert.match(config,/W6_M3_CROSS_BROWSER/);assert.match(config,/W6_M3_KEYBOARD/);assert.match(config,/W6_M3_TOUCH/);assert.match(config,/workers:\s*1/);assert.match(config,/retries:\s*0/);
});
