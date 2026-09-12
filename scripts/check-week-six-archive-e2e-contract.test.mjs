import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../e2e/week-six-archive.spec.ts',import.meta.url),'utf8');
const config=readFileSync(new URL('../playwright.config.ts',import.meta.url),'utf8');
test('requires the real W6-M5 terminal chain, faults, recovery, provenance and parent path',()=>{
  for(const tag of ['full','keyboard','touch','storage','assets','external','corrupt','runtime','lazy','parent'])assert.match(source,new RegExp(`@w6-m5-${tag}\\b`),`missing @w6-m5-${tag}`);
  for(const label of ['三调芭蕉扇·取经档案总编','M1 至 M4 正式作品只读档案','教师编写的最终核验练习','尚未运行，暂无本次程序记录','运行代码并生成最终档案','回看取经档案'])assert.match(source,new RegExp(label));
  assert.match(source,/SOLVED_WEEK_SIX_RECORDS_PYTHON/);
  assert.match(source,/sessionStorage\.getItem\(seed\)/);
  assert.match(source,/schemaRevision:22/);
  assert.match(source,/weekSixRecordsPython\\\.worker-/);
  assert.match(source,/flaming-mountain-background\\\.webp/);
  assert.doesNotMatch(source,/missionCompletionEvidence\s*\[\s*['"]w6-m5['"]\s*\]\s*=/);
  assert.doesNotMatch(source,/w7-m1.*status:\s*['"]completed/);
});
test('keeps W6-M5 on five fixed projects with one worker and no retries',()=>{
  for(const name of ['desktop-chromium-1440x1024','desktop-firefox-1440x1024','tablet-webkit-768x1024','mobile-chromium-390x844','narrow-chromium-320x844'])assert.match(config,new RegExp(name));
  assert.match(config,/@w6-m5-/);assert.match(config,/workers:\s*1/);assert.match(config,/retries:\s*0/);
});
