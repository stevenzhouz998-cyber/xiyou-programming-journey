import { statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { collectRuntimeClosure, WEEK_FOUR_BOSS_MAX_LAZY_BYTES } from '../scripts/check-bundle-budget.mjs';
import { PYTHON_RUNTIME_TRANSFER_MAX_BYTES } from '../scripts/budget-limits.mjs';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { formalW4M4Prerequisite } from './support/w4m5Prerequisite';
import { parseProgress } from '../src/progress/schema';
import { createInitialProgress } from '../src/progress/progress';
const KEY='xiyou-programming-progress-v3';
const REV='xiyou-programming-progress-revision-v3';
const MODE='xiyou-test-storage-mode';
const SOLVED='for card in cards:\n    identity = read_identity(card)\n    if identity == "白骨精":\n        keep_observing(card)\n    else:\n        polite_help(card)';
const saved=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),KEY);
const session=async(page:Page)=>(await saved(page)).sessions['w4-m5'];
const button=(page:Page)=>page.getByRole('button',{name:'运行两轮核验',exact:true});
async function seed(page:Page, raw=formalW4M4Prerequisite()) {
  await page.addInitScript(({key,rev,raw})=>{if(localStorage.getItem(key)===null){localStorage.setItem(key,raw);localStorage.setItem(rev,'0');}}, {key:KEY,rev:REV,raw});
}
async function open(page:Page) {
  await page.goto('./#/mission/w4-m5');
  await expect(page.getByLabel('W4-M5 Python 代码')).toBeVisible();
  await expect(button(page)).toBeEnabled({timeout:25000});
}
async function run(page:Page) {
  await expect(button(page)).toBeEnabled();await button(page).click();
  await expect(button(page)).toBeEnabled({timeout:25000});
}
async function setCode(page:Page,code:string) {
  const editor=page.getByLabel('W4-M5 Python 代码');await editor.fill(code);
  await expect.poll(async()=> (await session(page))?.pythonCode).toBe(code);
  await expect(button(page)).toBeEnabled();
}
async function solve(page:Page) {
 await page.getByLabel('身份变量来源',{exact:true}).selectOption('identity');await expect(button(page)).toBeEnabled();
 await page.getByLabel('否则',{exact:true}).selectOption('polite_help');
 await expect.poll(async()=> (await session(page)).pythonCode).toBe(SOLVED);
}
async function success(page:Page) { await button(page).click(); await expect(page.getByRole('dialog',{name:'闯关成功'})).toBeVisible({timeout:25000}); }
async function parent(page: Page) {
  await page.goto('./#/parent');
  const acknowledge = page.getByRole('button', { name: '我知道了', exact: true });
  if (await acknowledge.isVisible()) await acknowledge.click();
  const report = page.getByRole('button', { name: '导出进度', exact: true });
  const login = page.getByLabel('家长 PIN', { exact: true });
  const setup = page.getByLabel('设置 4 位家长 PIN', { exact: true });
  await expect(report.or(login).or(setup)).toBeVisible();
  if (await report.isVisible()) return;
  if (await login.isVisible()) {
    await login.fill('4826');
    await page.getByRole('button', { name: '进入周报', exact: true }).click();
    await expect(report).toBeVisible();
    return;
  }
  await setup.fill('4826');
  const confirm = page.getByLabel('确认家长 PIN', { exact: true });
  await confirm.fill('4826');
  await expect.poll(async () => {
    if (await setup.inputValue() !== '4826') await setup.fill('4826');
    if (await confirm.inputValue() !== '4826') await confirm.fill('4826');
    return [await setup.inputValue(), await confirm.inputValue()];
  }).toEqual(['4826', '4826']);
  await page.getByRole('button', { name: '创建家长 PIN', exact: true }).click();
  await page.getByLabel('我已安全保存恢复码').check();
  await page.getByRole('button', { name: '确认已保存并进入', exact: true }).click();
  await expect(report).toBeVisible();
}

test('@w4-m5-full actual loop, independent bugs, refresh, readonly replay, parent export-clear-import and unlock',async({page},info)=>{
  test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await seed(page);await open(page);
  const before=await saved(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const control of await page.locator('.week-four-boss-controls select').all()) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({path:info.outputPath('w4m5-default.png'),fullPage:true});
  await run(page);expect((await session(page)).lastRun.state).toBe('identity-conflict');
  await expect(page.getByRole('table')).toContainText('老妇');
  await page.getByRole('button',{name:'火眼金睛：观察实际记录'}).click();
  await expect.poll(async()=> (await session(page)).conditionObservationUses.length).toBe(1);
  await run(page);expect((await session(page)).conditionObservationUses).toEqual([]);
  await page.getByLabel('身份变量来源',{exact:true}).selectOption('identity');await expect(button(page)).toBeEnabled();
  await run(page);expect((await session(page)).lastRun.state).toBe('branch-conflict');
  await page.screenshot({path:info.outputPath('w4m5-loop-conflict.png'),fullPage:true});
  await page.reload();await open(page);expect((await session(page)).lastRun.state).toBe('branch-conflict');
  await setCode(page,SOLVED.replace('read_identity(card)', '"白骨精"'));await run(page);expect((await session(page)).lastRun.state).toBe('identity-conflict');
  await setCode(page,'import os');const count=(await session(page)).totalRuns;await run(page);expect((await session(page)).validationFailures).toBe(1);expect((await session(page)).totalRuns).toBe(count);await expect(page.getByLabel('W4-M5 Python 代码')).toBeFocused();
  await setCode(page,SOLVED);await success(page);
  const completed=await saved(page);expect(completed.schemaRevision).toBe(14);expect(completed.missionCompletionEvidence['w4-m5'].kind).toBe('formal-v3');expect(completed.works['w4-m5-verification-report'].run.completed).toBe(true);
  for(const id of ['w4-m1','w4-m2','w4-m3','w4-m4']){expect(completed.sessions[id]).toEqual(before.sessions[id]);expect(completed.missionCompletionEvidence[id]).toEqual(before.missionCompletionEvidence[id]);}
  await page.reload();await open(page);const replay=await saved(page);await page.screenshot({path:info.outputPath('w4m5-proven.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByLabel('固定原著尾声')).toBeVisible();await success(page);expect(await saved(page)).toEqual(replay);
  await parent(page);const summary=page.getByRole('region',{name:'第四周总试炼学习摘要'});await expect(summary).toContainText('两轮核验正式证明与白虎岭核验报告已保存');await expect(summary).not.toContainText(/print\(|appearances|trace|pythonCode/);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出进度',exact:true}).click();const bytes=readFileSync((await(await download).path())!);expect(()=>parseProgress(bytes.toString())).not.toThrow();
  await page.getByRole('button',{name:'清空学习数据',exact:true}).click();await page.getByLabel('输入“清空”以确认').fill('清空');const backup=page.waitForEvent('download');await page.getByRole('button',{name:'备份并清空',exact:true}).click();await backup;await expect.poll(()=>saved(page)).toEqual(createInitialProgress());
  await parent(page);await page.getByLabel('选择进度文件').setInputFiles({name:'w4m5.json',mimeType:'application/json',buffer:bytes});await expect.poll(()=>saved(page)).toEqual(JSON.parse(bytes.toString()));
  await open(page);await success(page);await page.goto('./#/mission/w5-m1');await expect(page.getByRole('heading',{name:'解救僧众'})).toBeVisible();
  expect(errors).toEqual([]);
});
test('@w4-m5-keyboard direct visible code input, Tab exit, modal focus, and no overflow',async({page})=>{
  await seed(page);await open(page);
  const editor=page.getByLabel('W4-M5 Python 代码');await editor.focus();await editor.press('ControlOrMeta+A');await page.keyboard.insertText(SOLVED);
  await expect.poll(async()=> (await session(page)).pythonCode).toBe(SOLVED);await expect(button(page)).toBeEnabled();
  await editor.press('Tab');await expect(page.getByLabel('身份变量来源',{exact:true})).toBeFocused();
  await button(page).focus();await button(page).press('Enter');await expect(page.getByRole('dialog',{name:'闯关成功'})).toBeVisible({timeout:25000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
for(const stage of ['draft','run','observation','work','completion']) test(`@w4-m5-storage ${stage} failure blocks publication then recovers without duplicate execution`,async({page})=>{
  await seed(page);
  if(stage==='draft') await page.addInitScript(({mode})=>localStorage.setItem(mode,'fail-w4-m5-draft'),{mode:MODE});
  else await open(page);
  if(stage==='draft') await page.goto('./#/mission/w4-m5');
  else {
    if(stage==='observation')await run(page);
    if(stage==='work'||stage==='completion')await solve(page);
    await page.evaluate(({mode,stage})=>localStorage.setItem(mode,`fail-w4-m5-${stage}`),{mode:MODE,stage});
    if(stage==='observation')await page.getByRole('button',{name:'火眼金睛：观察实际记录'}).click();else await button(page).click();
  }
  await expect(page.getByRole('button',{name:'重试保存',exact:true})).toBeVisible({timeout:25000});
  const failed=await saved(page);expect(failed.missions['w4-m5']).toBeUndefined();expect(failed.works['w4-m5-verification-report']).toBeUndefined();
  await page.evaluate(key=>localStorage.removeItem(key),MODE);await page.getByRole('button',{name:'重试保存',exact:true}).click();
  if(stage==='work'||stage==='completion'){await expect(page.getByRole('dialog',{name:'闯关成功'})).toBeVisible();expect((await session(page)).totalRuns).toBe(1);}
  else {await expect(button(page)).toBeEnabled();if(stage==='run')expect((await session(page)).totalRuns).toBe(1);if(stage==='observation')expect((await session(page)).conditionObservationUses).toHaveLength(1);}
});
test('@w4-m5-external stale tab does not overwrite current and explicitly reloads',async({page,context})=>{
  await seed(page);await page.addInitScript(()=>window.addEventListener('storage',e=>e.stopImmediatePropagation(),true));await open(page);const second=await context.newPage();await open(second);
  await second.getByLabel('身份变量来源',{exact:true}).selectOption('identity');await expect(button(second)).toBeEnabled();
  const external=await saved(second);
  // Suppress only storage notification to exercise the coordinator compare-and-swap path.
  await button(page).click();
  await expect(page.getByRole('button',{name:'载入其他标签页进度',exact:true})).toBeVisible();expect(await saved(page)).toEqual(external);
  await page.getByRole('button',{name:'载入其他标签页进度',exact:true}).click();await expect(button(page)).toBeEnabled();expect((await session(page)).pythonCode).toBe(external.sessions['w4-m5'].pythonCode);
});
test('@w4-m5-security actual built Worker rejects unsafe programs and returns input-derived list traces',async({page})=>{
  await seed(page);await open(page);await expect(page.getByRole('status',{name:'Python 运行环境已准备'})).toBeVisible({timeout:25000});const before=await saved(page);
  const workers=readdirSync('dist-e2e/assets').filter(x=>/^weekFourBossPython\.worker-.*\.js$/.test(x));expect(workers).toHaveLength(1);
  const result=await page.evaluate(async({file,solved})=>{
    const worker=new Worker(new URL(`assets/${file}`,document.baseURI),{type:'module'});
    await new Promise<void>((resolve,reject)=>{worker.onmessage=e=>e.data.type==='ready'?resolve():reject(Error('load'));worker.onerror=()=>reject(Error('worker'));});
    const output:unknown[]=[];let id=0;
    for(const code of ['import os','while True: pass','open("x")','print(__import__("js"))','appearances = ["女子"]\nfor item in appearances:\n    print(item.__class__)',solved,solved.replace('read_identity','read_appearance')]) {
      output.push(await new Promise(resolve=>{worker.onmessage=e=>resolve(e.data);worker.postMessage({type:'run',requestId:++id,code});}));
    }worker.terminate();return output;
  },{file:workers[0],solved:SOLVED}) as any[];
  expect(result.slice(0,5).map(r=>r.type)).toEqual(Array(5).fill('error'));expect(result[5].trace).toHaveLength(8);expect(result[5].trace[4].cardId).toBe('practice');expect(result[6].trace[0].identity).toBe('女子');expect(await saved(page)).toEqual(before);
});
test('@w4-m5-legacy revision11 history remains read-only without predecessor formal proof',async({page})=>{
  const p=createInitialProgress();p.schemaRevision=11;p.privacy.localDataNoticeSeen=true;p.missions['w4-m5']={status:'completed',stars:2,hintsUsed:0,attempts:1,completedAt:'2026-09-01T00:00:00.000Z'};
  await seed(page,JSON.stringify(p));await page.goto('./#/mission/w4-m5');await expect(page.getByRole('heading',{name:'以前闯过的记录已保留'})).toBeVisible();await expect(page.getByLabel('W4-M5 Python 代码')).toHaveCount(0);
});
for(const mode of ['load','timeout']) test(`@w4-m5-runtime ${mode} preserves draft, counts infrastructure separately and retries actual Worker`,async({page})=>{
  await seed(page);let consumed=0;const pattern=mode==='load'?/pyodide\.mjs(?:\?.*)?$/:/weekFourBossPython\.worker-[^/]+\.js/;
  await page.route(pattern,async route=>{consumed++;if(mode==='load'){await route.fulfill({status:503,body:'unavailable'});return;}
    const response=await route.fetch();const actual=await response.text();expect(actual).toContain('validate_and_run');expect(actual).toContain('pyodide-314.0.2');
    await route.fulfill({response,body:`const forward=self.postMessage.bind(self);self.postMessage=(m,...r)=>m?.type==='result'?setTimeout(()=>forward(m,...r),1100):forward(m,...r);\n${actual}`,contentType:'application/javascript'});
  });await open(page);await run(page);await expect.poll(async()=> (await session(page)).runnerInfrastructureFailures).toBe(1);expect(consumed).toBeGreaterThan(0);expect((await session(page)).identityFailures).toBe(0);expect((await session(page)).lastRun).toBeNull();
  await page.unroute(pattern);await run(page);expect((await session(page)).lastRun.state).toBe('identity-conflict');
});
test('@w4-m5-assets missing image blocks publication and real image retry completes without rerun',async({page,request})=>{
  await seed(page);let consumed=0;const pattern=/white-tiger-ridge-background\.webp/;await page.route(pattern,async route=>{consumed++;await route.fulfill({status:503,body:'unavailable'});});
  await open(page);await solve(page);await run(page);expect((await session(page)).lastRun.completed).toBe(true);expect((await saved(page)).missions['w4-m5']).toBeUndefined();expect(consumed).toBeGreaterThan(0);
  await page.unroute(pattern);await page.getByRole('button',{name:'重试加载白虎岭场景'}).click();await expect(page.getByRole('dialog',{name:'闯关成功'})).toBeVisible();expect((await session(page)).totalRuns).toBe(1);
  expect((await request.get('/xiyou-programming-journey/assets/week-four-mapping/w4m5-nonexistent.webp', {headers:{Accept:'image/webp'}})).status()).toBe(404);
});
test('@w4-m5-corrupt restores snapshot, preserves damaged source and rejects malformed import',async({page})=>{
  await seed(page);await open(page);await solve(page);await success(page);const completed=await saved(page);await parent(page);
  await page.getByRole('button',{name:'关闭声音',exact:true}).click();await page.getByRole('button',{name:'开启声音',exact:true}).click();
  await page.evaluate(key=>localStorage.setItem(key,'{broken w4-m5 current'),KEY);await page.reload();await expect(page.getByText('学习进度已经安全恢复')).toBeVisible();
  const recovered=await saved(page);expect(recovered.recovery.source).toBe('snapshot');expect(recovered.works['w4-m5-verification-report']).toEqual(completed.works['w4-m5-verification-report']);
  await parent(page);const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载损坏原文'}).click();const bytes=readFileSync((await(await download).path())!,'utf8');expect(JSON.parse(bytes).current).toBe('{broken w4-m5 current');
  const before=await saved(page);await page.getByLabel('选择进度文件').setInputFiles({name:'malformed.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await expect(page.getByRole('alert').filter({hasText:'导入失败'})).toBeVisible();expect(await saved(page)).toEqual(before);
  await open(page);const replay=await saved(page);await success(page);expect(await saved(page)).toEqual(replay);
});
test('@w4-m5-assets alternate lazy URL recovers without fabricating session or result',async({page})=>{
  await seed(page);let consumed=0;
  const manifest=JSON.parse(readFileSync(new URL('../dist-e2e/.vite/manifest.json',import.meta.url),'utf8'));
  const primaryFile=manifest['src/components/WeekFourBossExperience.tsx'].file;
  const retryFile=manifest['src/components/WeekFourBossExperience.tsx?retry=1'].file;
  expect(primaryFile).not.toBe(retryFile);
  const pattern=`**/${primaryFile}`;
  await page.route(pattern,async route=>{consumed++;await route.fulfill({status:503,body:'unavailable',contentType:'application/javascript'});});
  await page.goto('./#/mission/w4-m5');await expect(page.getByRole('button',{name:'重新加载页面',exact:true})).toBeVisible();expect(consumed).toBeGreaterThan(0);expect((await saved(page)).sessions['w4-m5']).toBeUndefined();
  await page.unroute(pattern);await page.getByRole('button',{name:'重新加载页面',exact:true}).click();await expect(page.getByLabel('W4-M5 Python 代码')).toBeVisible();await run(page);expect((await session(page)).lastRun.completed).toBe(false);
});
  test('@w4-m5-cold cold closure, built Worker, five local Pyodide files, ready/first result, and warm result meet named budgets', async ({ page, context }, testInfo) => {
    testInfo.setTimeout(60_000);
    const responses: any[] = [];
    page.on('response', (response) => responses.push(response));
    const chromiumProject = testInfo.project.name.includes('chromium');
    const runtimeFiles = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
    const manifest = JSON.parse(readFileSync(new URL('../dist-e2e/.vite/manifest.json', import.meta.url), 'utf8'));
    const closureFiles = [...collectRuntimeClosure(manifest, 'src/components/WeekFourBossExperience.tsx')]
      .map((key) => manifest[key]?.file)
      .filter((file): file is string => typeof file === 'string' && file.endsWith('.js'));
    const closureBytes = closureFiles.reduce((sum, file) => sum + statSync(new URL(`../dist-e2e/${file}`, import.meta.url)).size, 0);
    const workerFiles = readdirSync(new URL('../dist-e2e/assets/', import.meta.url)).filter((file) => /^weekFourBossPython\.worker-.*\.js$/.test(file));
    expect(workerFiles).toHaveLength(1);
    const workerBytes = statSync(new URL(`../dist-e2e/assets/${workerFiles[0]}`, import.meta.url)).size;
    const compatibleBytes = new Map<string, number>();
    if (!chromiumProject) {
      await context.route('**/runtime/pyodide-314.0.2/**', async (route) => {
        const response = await route.fetch();
        const body = await response.body();
        compatibleBytes.set(new URL(route.request().url()).pathname, body.byteLength);
        await route.fulfill({ response, body });
      });
    }
    const client = chromiumProject ? await context.newCDPSession(page) : null;
    if (client) {
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: 1_250_000,
        uploadThroughput: 1_250_000,
        connectionType: 'cellular3g',
      });
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    await seed(page);
    const startedAt = performance.now();
    await page.goto('./#/mission/w4-m5');
    await expect(page.locator('.week-four-boss-experience > header').getByRole('heading', { name: '白虎岭核验站' })).toBeVisible();
    await expect(page.getByRole('status', {name:'Python 运行环境已准备'})).toBeVisible({timeout:25000});
    const readyAt = performance.now();
    const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name));
    expect(resources.some((url) => url.includes('weekFourBossPython.worker-'))).toBe(true);
    const runtimeRoot = new URL('runtime/pyodide-314.0.2/', page.url());
    const missingCompatibilityFiles = chromiumProject ? [] : runtimeFiles.filter((file) =>
      ![...compatibleBytes.keys()].some((pathname) => pathname.endsWith(file)));
    if (missingCompatibilityFiles.length) {
      await page.evaluate(async ({ root, files }) => {
        await Promise.all(files.map(async (file) => {
          const response = await fetch(new URL(file, root), { cache: 'no-store' });
          if (!response.ok) throw new Error(`runtime compatibility probe failed: ${response.status}`);
          await response.arrayBuffer();
        }));
      }, { root: runtimeRoot.href, files: missingCompatibilityFiles });
    }
    await run(page);
    await expect(page.getByRole('status', { name: '核验运行结果' })).toContainText('读入变量的内容与公开身份不符', { timeout: 25_000 });
    const firstResultAt = performance.now();
    await run(page);
    await expect.poll(async () => (await saved(page)).sessions['w4-m5']?.totalRuns).toBe(2);
    const warmResultAt = performance.now();
    const localPaths = new Set(closureFiles.map((file) => new URL(file, page.url()).pathname));
    const localResponses = responses.filter((response) => localPaths.has(new URL(response.url()).pathname));
    const runtimeResponses = responses.filter((response) => runtimeFiles.some((file) => response.url().endsWith(file)));
    const localObservedBytes = (await Promise.all(localResponses.map(async (response) => (await response.body()).byteLength)))
      .reduce((sum, bytes) => sum + bytes, 0);
    const runtimeBytes = chromiumProject
      ? (await Promise.all(runtimeResponses.map(async (response) => (await response.body()).byteLength))).reduce((sum, bytes) => sum + bytes, 0)
      : runtimeFiles.reduce((sum, file) => sum + ([...compatibleBytes.entries()].find(([pathname]) => pathname.endsWith(file))?.[1] ?? 0), 0);
    if (chromiumProject) expect(new Set(runtimeResponses.map((response) => new URL(response.url()).pathname)).size).toBe(5);
    else expect(runtimeFiles.every((file) => [...compatibleBytes.keys()].some((pathname) => pathname.endsWith(file)))).toBe(true);
    expect(closureBytes + workerBytes).toBeLessThanOrEqual(WEEK_FOUR_BOSS_MAX_LAZY_BYTES);
    expect(runtimeBytes).toBeLessThanOrEqual(PYTHON_RUNTIME_TRANSFER_MAX_BYTES);
    expect(firstResultAt - startedAt).toBeLessThanOrEqual(20_000);
    expect(warmResultAt - firstResultAt).toBeLessThanOrEqual(1_000);
    const metricsPath = testInfo.outputPath(`w4m5-cold-metrics-${testInfo.project.name}.json`);
    await writeFile(metricsPath, JSON.stringify({
      project: testInfo.project.name,
      closureBytes,
      workerBytes,
      localObservedBytes,
      runtimeBytes,
      readyMs: readyAt - startedAt,
      firstResultMs: firstResultAt - startedAt,
      warmResultMs: warmResultAt - firstResultAt,
      throttleMode: chromiumProject ? '10mbps-4x-cpu-cdp' : 'native-engine-compatible-no-cdp',
      missingCompatibilityFiles,
    }, null, 2));
    await testInfo.attach(`w4m5-cold-metrics-${testInfo.project.name}.json`, { path: metricsPath, contentType: 'application/json' });
    if (client) await client.detach();
  });test('@w4-m5-legacy actual replay upgrades revision11 history without replacing original completion time',async({page})=>{
  const old=JSON.parse(formalW4M4Prerequisite());old.schemaRevision=11;old.missions['w4-m5']={status:'completed',stars:2,hintsUsed:1,attempts:2,completedAt:'2026-09-01T00:00:20.000Z'};
  await seed(page,JSON.stringify(old));await open(page);expect((await saved(page)).missionCompletionEvidence['w4-m5'].kind).toBe('legacy-replay-only');
  await solve(page);await success(page);const current=await saved(page);expect(current.missions['w4-m5']).toEqual(old.missions['w4-m5']);expect(current.missionCompletionEvidence['w4-m5'].kind).toBe('formal-v3');
});
test('@w4-m5-keyboard reduced motion and mute controls preserve the current code and expose state',async({page})=>{
  await seed(page);await open(page);const before=await session(page);
  await page.getByRole('button',{name:'减弱动画',exact:true}).click();await expect(page.locator('.week-four-boss-experience')).toHaveAttribute('data-reduced-motion','true');
  await page.getByRole('button',{name:'关闭声音',exact:true}).click();await expect(page.locator('.week-four-boss-experience')).toHaveAttribute('data-muted','true');
  expect(await session(page)).toEqual(before);await page.reload();await open(page);await expect(page.locator('.week-four-boss-experience')).toHaveAttribute('data-muted','true');
});

test('@w4-m5-storage edited draft failure retains disk source, blocks Worker, then recovers the exact edit',async({page})=>{
 await seed(page);await open(page);const before=await session(page);
 await page.evaluate(key=>localStorage.setItem(key,'fail-w4-m5-draft'),MODE);
 await page.getByLabel('身份变量来源',{exact:true}).selectOption('identity');
 await expect(page.getByRole('button',{name:'重试保存',exact:true})).toBeVisible();
 expect(await session(page)).toEqual(before);await expect(button(page)).toBeDisabled();
 await page.evaluate(key=>localStorage.removeItem(key),MODE);await page.getByRole('button',{name:'重试保存',exact:true}).click();
 await expect(button(page)).toBeEnabled();expect((await session(page)).pythonCode).toContain('read_identity(card)');expect((await session(page)).totalRuns).toBe(0);
 await page.reload();await open(page);expect((await session(page)).pythonCode).toContain('read_identity(card)');
});
test('@w4-m5-storage formal replay hints must not mutate sealed session or prevent the next replay',async({page})=>{
 await seed(page);await open(page);await solve(page);await success(page);await page.reload();await open(page);
 const before=await saved(page);await page.getByRole('button',{name:'观察提示',exact:true}).click();
 await expect(page.getByText('先看首次偏离的卡片，程序读进了什么变量？',{exact:true})).toBeVisible();
 await expect(page.getByRole('status',{name:'核验运行结果'})).toBeVisible();
 await success(page);expect(await saved(page)).toEqual(before);
});
