import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

const values = new Map<string, string>();
const memoryStorage: Storage = {
  get length() { return values.size; },
  clear: () => values.clear(),
  getItem: (key) => values.get(key) ?? null,
  key: (index) => [...values.keys()][index] ?? null,
  removeItem: (key) => { values.delete(key); },
  setItem: (key, value) => { values.set(key, String(value)); },
};

Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true });
Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true });
Object.defineProperty(window.HTMLMediaElement.prototype, 'play', { value: () => Promise.resolve(), configurable: true });
Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', { value: () => new Proxy({
  canvas: document.createElement('canvas'),
  getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  measureText: () => ({ width: 0 }),
}, { get: (target, property) => property in target ? target[property as keyof typeof target] : () => undefined }), configurable: true });

afterEach(() => cleanup());
