import { describe, expect, it, vi } from 'vitest';
import { focusAfterInert } from './focus';

describe('focusAfterInert', () => {
  it('cancels the scheduled animation frame before focus', () => {
    let callback: FrameRequestCallback | undefined;
    const cancel = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancel);
    vi.stubGlobal('requestAnimationFrame', vi.fn((next: FrameRequestCallback) => { callback = next; return 42; }));
    const element = document.createElement('button');
    document.body.append(element);
    const focus = vi.spyOn(element, 'focus');
    const stop = focusAfterInert(element, () => true);
    stop();
    expect(cancel).toHaveBeenCalledWith(42);
    callback?.(0);
    expect(focus).not.toHaveBeenCalled();
    element.remove();
    vi.unstubAllGlobals();
  });
});
