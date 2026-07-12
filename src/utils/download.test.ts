import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadTextFile } from './download';

describe('downloadTextFile', () => {
  afterEach(() => vi.restoreAllMocks());

  it('clicks once and always removes the anchor and revokes the URL', () => {
    const click = vi.fn();
    const remove = vi.fn();
    const anchor = { click, remove, href: '', download: '' } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    downloadTextFile('backup.json', '{}', 'application/json');
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:backup');
    expect(anchor.download).toBe('backup.json');
  });

  it('cleans up when clicking throws', () => {
    const remove = vi.fn();
    const anchor = { click: vi.fn(() => { throw new Error('blocked'); }), remove, href: '', download: '' } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    expect(() => downloadTextFile('backup.json', '{}', 'application/json')).toThrow('blocked');
    expect(remove).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith('blob:backup');
  });

  it('revokes the URL when element creation or append fails', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(document, 'createElement').mockImplementation(() => { throw new Error('create failed'); });
    expect(() => downloadTextFile('x', 'x', 'text/plain')).toThrow('create failed');
    expect(revoke).toHaveBeenCalledWith('blob:backup');
    vi.restoreAllMocks();

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:append');
    const anchor = document.createElement('a');
    const remove = vi.spyOn(anchor, 'remove');
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(document.body, 'append').mockImplementation(() => { throw new Error('append failed'); });
    const revokeAppend = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    expect(() => downloadTextFile('x', 'x', 'text/plain')).toThrow('append failed');
    expect(remove).toHaveBeenCalledOnce();
    expect(revokeAppend).toHaveBeenCalledWith('blob:append');
  });

  it('preserves the click error when cleanup also throws', () => {
    const anchor = { href: '', download: '', click: vi.fn(() => { throw new Error('click primary'); }), remove: vi.fn(() => { throw new Error('remove cleanup'); }) } as unknown as HTMLAnchorElement;
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => { throw new Error('revoke cleanup'); });
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    expect(() => downloadTextFile('x', 'x', 'text/plain')).toThrow('click primary');
  });

  it('does not attempt cleanup when URL creation fails', () => {
    const createElement = vi.spyOn(document, 'createElement');
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => { throw new Error('url failed'); });
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    expect(() => downloadTextFile('x', 'x', 'text/plain')).toThrow('url failed');
    expect(createElement).not.toHaveBeenCalled();
    expect(revoke).not.toHaveBeenCalled();
  });
});
