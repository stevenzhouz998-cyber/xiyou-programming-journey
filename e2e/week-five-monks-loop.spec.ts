import { statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { collectRuntimeClosure, WEEK_FIVE_MONKS_MAX_LAZY_BYTES } from '../scripts/check-bundle-budget.mjs';
import { PYTHON_RUNTIME_TRANSFER_MAX_BYTES } from '../scripts/budget-limits.mjs';
import { test, expect, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { formalW4M5Prerequisite } from './support/w5m1Prerequisite';
import { parseProgress } from '../src/progress/schema';
import { createInitialProgress } from '../src/progress/progress';
const KEY='xiyou-programming-progress-v3';
const REV='xiyou-programming-progress-revision-v3';
const MODE='xiyou-test-storage-mode';
const SOLVED='monks = ["甲", "乙", "丙"]\nfor monk in monks:\n    release(monk)\n    register(monk)';
const saved=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),KEY);
const session=async(page:Page)=>(await saved(page)).sessions['w5-m1'];
const button=(page:Page)=>page.getByRole('button',{name:'运行解困程序',exact:true});
async function seed(page:Page, raw=formalW4M5Prerequisite()) {
  await page.addInitScript(({key,rev,raw})=>{if(localStorage.getItem(key)===null){localStorage.setItem(key,raw);localStorage.setItem(rev,'0');}}, {key:KEY,rev:REV,raw});
}
async function open(page:Page) {
  await page.goto('./#/mission/w5-m1');
  await expect(page.getByLabel('W5-M1 Python 代码')).toBeVisible();
  await expect(button(page)).toBeEnabled({timeout:25000});
}
async function run(page:Page) {
  await expect(button(page)).toBeEnabled();await button(page).click();
  await expect(button(page)).toBeEnabled({timeout:25000});
}
async function setCode(page:Page,code:string) {
  const editor=page.getByLabel('W5-M1 Python 代码');await editor.fill(code);
  await expect.poll(async()=> (await session(page))?.pythonCode).toBe(code);
  await expect(button(page)).toBeEnabled();
}
async function solve(page:Page) {
 await page.getByLabel('末行动作的位置',{exact:true}).selectOption('inside');
 await expect.poll(async()=> (await session(page)).pythonCode).toBe(SOLVED);
}
async function success(page:Page) { await button(page).click(); await expect(page.getByRole('dialog',{name:'闯关成功'})).toBeVisible({timeout:25000}); }
async function parent(page: Page) {
  await page.goto('./#/parent');
  const acknowledge = page.getByRole('button', { name: '我知道了', exact: true });
  const report = page.getByRole('button', { name: '导出进度', exact: true });
  const login = page.getByLabel('家长 PIN', { exact: true });
  const setup = page.getByLabel('设置 4 位家长 PIN', { exact: true });
  if (!(await saved(page)).privacy.localDataNoticeSeen) {
    await expect(acknowledge).toBeVisible();
    await acknowledge.click();
    await expect.poll(async () => (await saved(page)).privacy.localDataNoticeSeen).toBe(true);
  }
  await expect(page.getByTestId('app-background')).not.toHaveAttribute('inert', '');
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
  await expect(setup).toHaveValue('4826');
  await expect(confirm).toHaveValue('4826');
  await page.getByRole('button', { name: '创建家长 PIN', exact: true }).click();
  await page.getByLabel('我已安全保存恢复码').check();
  await page.getByRole('button', { name: '确认已保存并进入', exact: true }).click();
  await expect(report).toBeVisible();
}

test('@w5-m1-full actual loop, independent bugs, refresh, readonly replay, parent export-clear-import and unlock',async({page},info)=>{
  test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await seed(page);await open(page);
  const before=await saved(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const control of await page.locator('.week-five-monks-controls select').all()) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({path:info.outputPath('w5m1-default.png'),fullPage:true});
  await run(page);expect((await session(page)).lastRun.state).toBe('action-conflict');
  await expect(page.getByRole('table')).toContainText('未执行');
  await page.getByRole('button',{name:'逐步查看本次执行',exact:true}).click();
  await expect(page.getByRole('rowheader',{name:'僧众甲 · 当前',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'查看下一步',exact:true}).click();
  await expect(page.getByRole('rowheader',{name:'僧众乙 · 当前',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'查看全部结果',exact:true}).click();
  await page.getByRole('button',{name:'火眼金睛：观察实际记录'}).click();
  await expect.poll(async()=> (await session(page)).conditionObservationUses.length).toBe(1);
  await run(page);expect((await session(page)).conditionObservationUses).toEqual([]);
  await page.reload();await open(page);expect((await session(page)).lastRun.state).toBe('action-conflict');
  await setCode(page,SOLVED.replace('release(monk)','release("甲")'));await run(page);expect((await session(page)).lastRun.state).toBe('action-conflict');
  await setCode(page,SOLVED.replace('["甲", "乙", "丙"]','[]'));await run(page);expect((await session(page)).lastRun.state).toBe('coverage-conflict');
  await setCode(page,SOLVED.replace('    release(monk)\n    register(monk)','    register(monk)\n    release(monk)'));await run(page);expect((await session(page)).lastRun.state).toBe('action-conflict');
  await page.screenshot({path:info.outputPath('w5m1-action-conflict.png'),fullPage:true});
  await setCode(page,'import os');const count=(await session(page)).totalRuns;await run(page);expect((await session(page)).validationFailures).toBe(1);expect((await session(page)).totalRuns).toBe(count);await expect(page.getByLabel('W5-M1 Python 代码')).toBeFocused();
  await setCode(page,SOLVED);await success(page);
  const completed=await saved(page);expect(completed.schemaRevision).toBe(19);expect(completed.missionCompletionEvidence['w5-m1'].kind).toBe('formal-v3');expect(completed.works['w5-m1-monks-rescue-record'].run.completed).toBe(true);
  for(const id of ['w4-m1','w4-m2','w4-m3','w4-m4','w4-m5']){expect(completed.sessions[id]).toEqual(before.sessions[id]);expect(completed.missionCompletionEvidence[id]).toEqual(before.missionCompletionEvidence[id]);}
  await page.reload();await open(page);const replay=await saved(page);await page.screenshot({path:info.outputPath('w5m1-proven.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByLabel('固定原著尾声')).toBeVisible();await success(page);expect(await saved(page)).toEqual(replay);
  await parent(page);const summary=page.getByRole('region',{name:'第五周循环学习摘要'});await expect(summary).toContainText('逐人解困正式证明与僧众解困记录已保存');await expect(summary).not.toContainText(/print\(|appearances|trace|pythonCode/);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出进度',exact:true}).click();const bytes=readFileSync((await(await download).path())!);expect(()=>parseProgress(bytes.toString())).not.toThrow();
  await page.getByRole('button',{name:'清空学习数据',exact:true}).click();await page.getByLabel('输入“清空”以确认').fill('清空');const backup=page.waitForEvent('download');await page.getByRole('button',{name:'备份并清空',exact:true}).click();await backup;await expect.poll(()=>saved(page)).toEqual(createInitialProgress());
  await parent(page);await page.getByLabel('选择进度文件').setInputFiles({name:'w5m1.json',mimeType:'application/json',buffer:bytes});await expect.poll(()=>saved(page)).toEqual(JSON.parse(bytes.toString()));
  await open(page);await success(page);await page.goto('./#/mission/w5-m2');await expect(page.getByRole('heading',{name:'三清观',exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});
test('@w5-m1-keyboard direct visible code input, Tab exit, modal focus, and no overflow',async({page})=>{
  await seed(page);await open(page);
  const editor=page.getByLabel('W5-M1 Python 代码');await editor.focus();await editor.press('ControlOrMeta+A');await page.keyboard.insertText(SOLVED);
  await expect.poll(async()=> (await session(page)).pythonCode).toBe(SOLVED);await expect(button(page)).toBeEnabled();
  await editor.press('Tab');await expect(page.getByLabel('第一条动作',{exact:true})).toBeFocused();
  await button(page).focus();await button(page).press('Enter');await expect(page.getByRole('dialog',{name:'闯关成功'})).toBeVisible({timeout:25000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
for(const stage of ['draft','run','observation','work','completion']) test(`@w5-m1-storage ${stage} failure blocks publication then recovers without duplicate execution`,async({page})=>{
  await seed(page);
  if(stage==='draft') await page.addInitScript(({mode})=>localStorage.setItem(mode,'fail-w5-m1-draft'),{mode:MODE});
  else await open(page);
  if(stage==='draft') await page.goto('./#/mission/w5-m1');
  else {
    if(stage==='observation')await run(page);
    if(stage==='work'||stage==='completion')await solve(page);
    await page.evaluate(({mode,stage})=>localStorage.setItem(mode,`fail-w5-m1-${stage}`),{mode:MODE,stage});
    if(stage==='observation')await page.getByRole('button',{name:'火眼金睛：观察实际记录'}).click();else await button(page).click();
  }
  await expect(page.getByRole('button',{name:'重试保存',exact:true})).toBeVisible({timeout:25000});
  const failed=await saved(page);expect(failed.missions['w5-m1']).toBeUndefined();expect(failed.works['w5-m1-monks-rescue-record']).toBeUndefined();
  await page.evaluate(key=>localStorage.removeItem(key),MODE);await page.getByRole('button',{name:'重试保存',exact:true}).click();
  if(stage==='work'||stage==='completion'){await expect(page.getByRole('dialog',{name:'闯关成功'})).toBeVisible();expect((await session(page)).totalRuns).toBe(1);}
  else {await expect(button(page)).toBeEnabled();if(stage==='run')expect((await session(page)).totalRuns).toBe(1);if(stage==='observation')expect((await session(page)).conditionObservationUses).toHaveLength(1);}
});
test('@w5-m1-external stale tab does not overwrite current and explicitly reloads',async({page,context})=>{
  await seed(page);await page.addInitScript(()=>window.addEventListener('storage',e=>e.stopImmediatePropagation(),true));await open(page);const second=await context.newPage();await open(second);
  await second.getByLabel('第一条动作',{exact:true}).selectOption('register');await expect(button(second)).toBeEnabled();
  const external=await saved(second);
  // Suppress only storage notification to exercise the coordinator compare-and-swap path.
  await button(page).click();
  await expect(page.getByRole('button',{name:'载入其他标签页进度',exact:true})).toBeVisible();expect(await saved(page)).toEqual(external);
  await page.getByRole('button',{name:'载入其他标签页进度',exact:true}).click();await expect(button(page)).toBeEnabled();expect((await session(page)).pythonCode).toBe(external.sessions['w5-m1'].pythonCode);
});
test('@w5-m1-security actual built Worker rejects unsafe programs and returns input-derived list traces',async({page})=>{
  await seed(page);await open(page);await expect(page.getByRole('status',{name:'Python 运行环境已准备'})).toBeVisible({timeout:25000});const before=await saved(page);
  const workers=readdirSync('dist-e2e/assets').filter(x=>/^weekFiveMonksPython\.worker-.*\.js$/.test(x));expect(workers).toHaveLength(1);
  const result=await page.evaluate(async({file,solved})=>{
    const worker=new Worker(new URL(`assets/${file}`,document.baseURI),{type:'module'});
    await new Promise<void>((resolve,reject)=>{worker.onmessage=e=>e.data.type==='ready'?resolve():reject(Error('load'));worker.onerror=()=>reject(Error('worker'));});
    const output:unknown[]=[];let id=0;
    for(const code of ['import os','while True: pass','open("x")','print(__import__("js"))','appearances = ["女子"]\nfor item in appearances:\n    print(item.__class__)',solved,solved.replace('    register(monk)','register(monk)')]) {
      output.push(await new Promise(resolve=>{worker.onmessage=e=>resolve(e.data);worker.postMessage({type:'run',requestId:++id,code});}));
    }worker.terminate();return output;
  },{file:workers[0],solved:SOLVED}) as any[];
  expect(result.slice(0,5).map(r=>r.type)).toEqual(Array(5).fill('error'));expect(result[5].trace).toHaveLength(7);expect(result[5].trace[4].target).toBe('乙');expect(result[6].trace).toHaveLength(5);expect(result[6].trace[4].scope).toBe('outside');expect(await saved(page)).toEqual(before);
});
test('@w5-m1-legacy revision12 history remains read-only without predecessor formal proof',async({page})=>{
  const p=createInitialProgress();p.schemaRevision=12;p.privacy.localDataNoticeSeen=true;p.missions['w5-m1']={status:'completed',stars:2,hintsUsed:0,attempts:1,completedAt:'2026-09-01T00:00:00.000Z'};
  await seed(page,JSON.stringify(p));await page.goto('./#/mission/w5-m1');await expect(page.getByRole('heading',{name:'以前闯过的记录已保留'})).toBeVisible();await expect(page.getByLabel('W5-M1 Python 代码')).toHaveCount(0);
});
for(const mode of ['load','timeout']) test(`@w5-m1-runtime ${mode} preserves draft, counts infrastructure separately and retries actual Worker`,async({page})=>{
  await seed(page);let consumed=0;const pattern=mode==='load'?/pyodide\.mjs(?:\?.*)?$/:/weekFiveMonksPython\.worker-[^/]+\.js/;
  await page.route(pattern,async route=>{consumed++;if(mode==='load'){await route.fulfill({status:503,body:'unavailable'});return;}
    const response=await route.fetch();const actual=await response.text();expect(actual).toContain('validate_and_run');expect(actual).toContain('pyodide-314.0.2');
    await route.fulfill({response,body:`const forward=self.postMessage.bind(self);self.postMessage=(m,...r)=>m?.type==='result'?setTimeout(()=>forward(m,...r),1100):forward(m,...r);\n${actual}`,contentType:'application/javascript'});
  });await open(page);await run(page);await expect.poll(async()=> (await session(page)).runnerInfrastructureFailures).toBe(1);expect(consumed).toBeGreaterThan(0);expect((await session(page)).coverageFailures).toBe(0);expect((await session(page)).lastRun).toBeNull();
  await page.unroute(pattern);await run(page);expect((await session(page)).lastRun.state).toBe('action-conflict');
});
test('@w5-m1-assets missing image blocks publication and real image retry completes without rerun',async({page,request})=>{
  await seed(page);let consumed=0;const pattern=/chechi-rescue-background\.webp/;await page.route(pattern,async route=>{consumed++;await route.fulfill({status:503,body:'unavailable'});});
  await open(page);await solve(page);await run(page);expect((await session(page)).lastRun.completed).toBe(true);expect((await saved(page)).missions['w5-m1']).toBeUndefined();expect(consumed).toBeGreaterThan(0);
  await page.unroute(pattern);await page.getByRole('button',{name:'重试加载车迟国场景'}).click();await expect(page.getByRole('dialog',{name:'闯关成功'})).toBeVisible();expect((await session(page)).totalRuns).toBe(1);
  expect((await request.get('/xiyou-programming-journey/assets/week-five-monks/w5m1-nonexistent.webp', {headers:{Accept:'image/webp'}})).status()).toBe(404);
});
test('@w5-m1-corrupt restores snapshot, preserves damaged source and rejects malformed import',async({page})=>{
  await seed(page);await open(page);await solve(page);await success(page);const completed=await saved(page);await parent(page);
  await page.getByRole('button',{name:'关闭声音',exact:true}).click();await page.getByRole('button',{name:'开启声音',exact:true}).click();
  await page.evaluate(key=>localStorage.setItem(key,'{broken w5-m1 current'),KEY);await page.reload();await expect(page.getByText('学习进度已经安全恢复')).toBeVisible();
  const recovered=await saved(page);expect(recovered.recovery.source).toBe('snapshot');expect(recovered.works['w5-m1-monks-rescue-record']).toEqual(completed.works['w5-m1-monks-rescue-record']);
  await parent(page);const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载损坏原文'}).click();const bytes=readFileSync((await(await download).path())!,'utf8');expect(JSON.parse(bytes).current).toBe('{broken w5-m1 current');
  const before=await saved(page);await page.getByLabel('选择进度文件').setInputFiles({name:'malformed.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await expect(page.getByRole('alert').filter({hasText:'导入失败'})).toBeVisible();expect(await saved(page)).toEqual(before);
  await open(page);const replay=await saved(page);await success(page);expect(await saved(page)).toEqual(replay);
});
test('@w5-m1-assets alternate lazy URL recovers without fabricating session or result',async({page})=>{
  await seed(page);let consumed=0;
  const manifest=JSON.parse(readFileSync(new URL('../dist-e2e/.vite/manifest.json',import.meta.url),'utf8'));
  const primaryFile=manifest['src/components/WeekFiveMonksExperience.tsx'].file;
  const retryFile=manifest['src/components/WeekFiveMonksExperience.tsx?retry=1'].file;
  expect(primaryFile).not.toBe(retryFile);
  const pattern=`**/${primaryFile}`;
  await page.route(pattern,async route=>{consumed++;await route.fulfill({status:503,body:'unavailable',contentType:'application/javascript'});});
  await page.goto('./#/mission/w5-m1');await expect(page.getByRole('button',{name:'重新加载页面',exact:true})).toBeVisible();expect(consumed).toBeGreaterThan(0);expect((await saved(page)).sessions['w5-m1']).toBeUndefined();
  await page.unroute(pattern);await page.getByRole('button',{name:'重新加载页面',exact:true}).click();await expect(page.getByLabel('W5-M1 Python 代码')).toBeVisible();await run(page);expect((await session(page)).lastRun.completed).toBe(false);
});
  test('@w5-m1-cold cold closure, built Worker, five local Pyodide files, ready/first result, and warm result meet named budgets', async ({ page, context }, testInfo) => {
    testInfo.setTimeout(60_000);
    const responses: any[] = [];
    page.on('response', (response) => responses.push(response));
    const chromiumProject = testInfo.project.name.includes('chromium');
    const runtimeFiles = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
    const manifest = JSON.parse(readFileSync(new URL('../dist-e2e/.vite/manifest.json', import.meta.url), 'utf8'));
    const closureFiles = [...collectRuntimeClosure(manifest, 'src/components/WeekFiveMonksExperience.tsx')]
      .map((key) => manifest[key]?.file)
      .filter((file): file is string => typeof file === 'string' && file.endsWith('.js'));
    const closureBytes = closureFiles.reduce((sum, file) => sum + statSync(new URL(`../dist-e2e/${file}`, import.meta.url)).size, 0);
    const workerFiles = readdirSync(new URL('../dist-e2e/assets/', import.meta.url)).filter((file) => /^weekFiveMonksPython\.worker-.*\.js$/.test(file));
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
    await page.goto('./#/mission/w5-m1');
    await expect(page.locator('.week-five-monks-experience > header').getByRole('heading', { name: '逐人解困：每个人都不能漏下' })).toBeVisible();
    await expect(page.getByRole('status', {name:'Python 运行环境已准备'})).toBeVisible({timeout:25000});
    const readyAt = performance.now();
    const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name));
    expect(resources.some((url) => url.includes('weekFiveMonksPython.worker-'))).toBe(true);
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
    await expect(page.getByRole('status', { name: '解困运行结果' })).toContainText('有人没有按先后完成两步', { timeout: 25_000 });
    const firstResultAt = performance.now();
    await run(page);
    await expect.poll(async () => (await saved(page)).sessions['w5-m1']?.totalRuns).toBe(2);
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
    expect(closureBytes + workerBytes).toBeLessThanOrEqual(WEEK_FIVE_MONKS_MAX_LAZY_BYTES);
    expect(runtimeBytes).toBeLessThanOrEqual(PYTHON_RUNTIME_TRANSFER_MAX_BYTES);
    expect(firstResultAt - startedAt).toBeLessThanOrEqual(20_000);
    expect(warmResultAt - firstResultAt).toBeLessThanOrEqual(1_000);
    const metricsPath = testInfo.outputPath(`w5m1-cold-metrics-${testInfo.project.name}.json`);
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
    await testInfo.attach(`w5m1-cold-metrics-${testInfo.project.name}.json`, { path: metricsPath, contentType: 'application/json' });
    if (client) await client.detach();
  });test('@w5-m1-legacy actual replay upgrades revision12 history without replacing original completion time',async({page})=>{
  const old=JSON.parse(formalW4M5Prerequisite());old.schemaRevision=12;old.missions['w5-m1']={status:'completed',stars:2,hintsUsed:1,attempts:2,completedAt:'2026-09-01T00:00:20.000Z'};
  await seed(page,JSON.stringify(old));await open(page);expect((await saved(page)).missionCompletionEvidence['w5-m1'].kind).toBe('legacy-replay-only');
  await solve(page);await success(page);const current=await saved(page);expect(current.missions['w5-m1']).toEqual(old.missions['w5-m1']);expect(current.missionCompletionEvidence['w5-m1'].kind).toBe('formal-v3');
});
test('@w5-m1-keyboard reduced motion and mute controls preserve the current code and expose state',async({page})=>{
  await seed(page);await open(page);const before=await session(page);
  await page.getByRole('button',{name:'减弱动画',exact:true}).click();await expect(page.locator('.week-five-monks-experience')).toHaveAttribute('data-reduced-motion','true');
  await page.getByRole('button',{name:'关闭声音',exact:true}).click();await expect(page.locator('.week-five-monks-experience')).toHaveAttribute('data-muted','true');
  expect(await session(page)).toEqual(before);await page.reload();await open(page);await expect(page.locator('.week-five-monks-experience')).toHaveAttribute('data-muted','true');
});

test('@w5-m1-storage edited draft failure retains disk source, blocks Worker, then recovers the exact edit',async({page})=>{
 await seed(page);await open(page);const before=await session(page);
 await page.evaluate(key=>localStorage.setItem(key,'fail-w5-m1-draft'),MODE);
 await page.getByLabel('第一条动作',{exact:true}).selectOption('register');
 await expect(page.getByRole('button',{name:'重试保存',exact:true})).toBeVisible();
 expect(await session(page)).toEqual(before);await expect(button(page)).toBeDisabled();
 await page.evaluate(key=>localStorage.removeItem(key),MODE);await page.getByRole('button',{name:'重试保存',exact:true}).click();
 await expect(button(page)).toBeEnabled();expect((await session(page)).pythonCode).toContain('register(monk)');expect((await session(page)).totalRuns).toBe(0);
 await page.reload();await open(page);expect((await session(page)).pythonCode).toContain('register(monk)');
});
test('@w5-m1-storage formal replay hints must not mutate sealed session or prevent the next replay',async({page})=>{
 await seed(page);await open(page);await solve(page);await success(page);await page.reload();await open(page);
 const before=await saved(page);await page.getByRole('button',{name:'观察提示',exact:true}).click();
 await expect(page.getByText('查看实际记录：哪些人执行了动作，分别执行几次？',{exact:true})).toBeVisible();
 await expect(page.getByRole('status',{name:'解困运行结果'})).toBeVisible();
 await success(page);expect(await saved(page)).toEqual(before);
});

test('@w5-m1-runtime editing during execution cancels the old Worker and discards its late result',async({page})=>{
 await seed(page);let delivered=false;const pattern=/weekFiveMonksPython\.worker-[^/]+\.js/;
 await page.route(pattern,async route=>{const response=await route.fetch();await route.fulfill({response,body:`const f=self.postMessage.bind(self);self.postMessage=(m,...r)=>m?.type==='result'?setTimeout(()=>f(m,...r),600):f(m,...r);\n${await response.text()}`,contentType:'application/javascript'});delivered=true;});
 await open(page);await expect(page.getByRole('status',{name:'Python 运行环境已准备'})).toBeVisible({timeout:25000});
 await button(page).click();await expect(button(page)).toBeDisabled();
 await page.getByLabel('W5-M1 Python 代码').fill(SOLVED);
 await expect.poll(async()=>(await session(page)).pythonCode).toBe(SOLVED);
 await expect(button(page)).toBeEnabled();expect(delivered).toBe(true);expect((await session(page)).lastRun).toBeNull();expect((await saved(page)).missions['w5-m1']).toBeUndefined();
 await page.unroute(pattern);await success(page);expect((await session(page)).totalRuns).toBe(1);
});
