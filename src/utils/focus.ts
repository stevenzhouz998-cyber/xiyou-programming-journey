export function focusAfterInert(element: HTMLElement | null, isMounted: () => boolean): () => void {
  let cancelled = false;
  let attempts = 0;
  const useRaf = typeof requestAnimationFrame === 'function';
  let pending: number | null = null;
  const schedule = (callback: FrameRequestCallback) => {
    pending = useRaf ? requestAnimationFrame(callback) : window.setTimeout(() => callback(performance.now()), 0);
  };
  const run = () => {
    pending = null;
    if (cancelled || !isMounted() || !element?.isConnected) return;
    if (element.closest('[inert]') && attempts++ < 1) { schedule(run); return; }
    if (!element.closest('[inert]')) element.focus();
  };
  schedule(run);
  return () => {
    cancelled = true;
    if (pending !== null) {
      if (useRaf) cancelAnimationFrame(pending); else clearTimeout(pending);
      pending = null;
    }
  };
}
