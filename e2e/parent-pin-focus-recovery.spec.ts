import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { formalW4M5Prerequisite } from './support/w5m1Prerequisite';

for (const input of ['fill', 'keyboard'] as const) {
  test(`@w5-m5-full parent PIN ${input} survives privacy dismissal after clear without refilling`, async ({ page }) => {
    const key = 'xiyou-programming-progress-v3';
    await page.addInitScript(({ key, raw }) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, raw);
        localStorage.setItem('xiyou-programming-progress-revision-v3', '0');
      }
    }, { key, raw: formalW4M5Prerequisite() });
    const saved = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
    const setup = page.getByLabel('设置 4 位家长 PIN', { exact: true });
    const confirm = page.getByLabel('确认家长 PIN', { exact: true });
    const report = page.getByRole('button', { name: '导出进度', exact: true });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    async function enter() {
      await page.goto('./#/parent');
      const notice = page.getByRole('button', { name: '我知道了', exact: true });
      if (await notice.isVisible()) await notice.click();
      await expect(page.getByTestId('app-background')).not.toHaveAttribute('inert', '');
      await expect(setup).toBeVisible();
      await setup.click();
      if (input === 'keyboard') {
        await setup.pressSequentially('4826', { delay: 80 });
        await confirm.pressSequentially('4826', { delay: 80 });
      } else {
        await setup.fill('4826');
        await confirm.fill('4826');
      }
      await expect(setup).toHaveValue('4826');
      await expect(confirm).toHaveValue('4826');
      await page.getByRole('button', { name: '创建家长 PIN', exact: true }).click();
      await page.getByLabel('我已安全保存恢复码').check();
      await page.getByRole('button', { name: '确认已保存并进入', exact: true }).click();
      await expect(report).toBeVisible();
    }
    await enter();
    const download = page.waitForEvent('download');
    await report.click();
    const bytes = readFileSync((await (await download).path())!);
    await page.getByRole('button', { name: '清空学习数据', exact: true }).click();
    await page.getByLabel('输入“清空”以确认').fill('清空');
    const backup = page.waitForEvent('download');
    await page.getByRole('button', { name: '备份并清空', exact: true }).click();
    await backup;
    await expect.poll(async () => Object.keys((await saved()).missions)).toEqual([]);
    await expect(setup).toBeVisible();
    await enter();
    await page.getByLabel('选择进度文件').setInputFiles({ name: 'parent-focus-recovery.json', mimeType: 'application/json', buffer: bytes });
    await expect.poll(async () => (await saved()).missionCompletionEvidence).toEqual(JSON.parse(bytes.toString()).missionCompletionEvidence);
    expect(errors).toEqual([]);
  });
}
