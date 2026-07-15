import { fireEvent, render, screen } from '@testing-library/react';
import { lazy, Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LazySectionBoundary } from './LazySectionBoundary';

describe('LazySectionBoundary', () => {
  it('keeps a named visible recovery action when a lazy section rejects', async () => {
    const Broken = lazy(() => Promise.reject(new Error('chunk 503')));
    const reloadPage = vi.fn();
    render(<><h1>仍可使用的页面</h1><LazySectionBoundary label="家长入口" reloadPage={reloadPage}>
      <Suspense fallback={<p>加载中</p>}><Broken /></Suspense>
    </LazySectionBoundary></>);

    expect(await screen.findByRole('alert')).toHaveTextContent('家长入口加载失败');
    expect(screen.getByRole('heading', { name: '仍可使用的页面' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '重新加载页面' }));
    expect(reloadPage).toHaveBeenCalledOnce();
  });
});
