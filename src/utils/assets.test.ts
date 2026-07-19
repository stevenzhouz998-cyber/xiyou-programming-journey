import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { assetUrl } from './assets';

describe('assetUrl', () => {
  it('joins assets to a repository base path', () => {
    expect(assetUrl('/assets/mentor.png', '/xiyou-programming-journey/')).toBe('/xiyou-programming-journey/assets/mentor.jpg');
  });

  it('does not duplicate slashes', () => {
    expect(assetUrl('assets/audio/welcome.m4a', './')).toBe('./assets/audio/welcome.m4a');
  });

  it('keeps both Four Seas shipping assets in real scene assetUrl slots', async () => {
    const source = await readFile(join(process.cwd(), 'src', 'components', 'FourSeasRegaliaScene.tsx'), 'utf8');
    expect(source).toContain("assetUrl('/assets/dragon-palace/regalia.webp')");
    expect(source).toContain("assetUrl('/assets/dragon-palace/wukong-regalia.webp')");
  });
});
