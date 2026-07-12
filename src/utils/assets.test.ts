import { describe, expect, it } from 'vitest';
import { assetUrl } from './assets';

describe('assetUrl', () => {
  it('joins assets to a repository base path', () => {
    expect(assetUrl('/assets/mentor.png', '/xiyou-programming-journey/')).toBe('/xiyou-programming-journey/assets/mentor.jpg');
  });

  it('does not duplicate slashes', () => {
    expect(assetUrl('assets/audio/welcome.m4a', './')).toBe('./assets/audio/welcome.m4a');
  });
});
