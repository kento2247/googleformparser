import { describe, expect, it, vi } from 'vitest';
import { fetchForm, normalizeFormUrl } from '../src/fetchForm.js';
import { FORM_HTML, FORM_URL } from './fixture.js';

const redirect = (location: string) => new Response(null, { status: 302, headers: { location } });

describe('normalizeFormUrl', () => {
  it.each([
    [FORM_URL, FORM_URL],
    [`${FORM_URL}?usp=sf_link`, FORM_URL],
    ['https://docs.google.com/forms/d/e/1FAIpQLSTEST/formResponse', FORM_URL],
    ['https://docs.google.com/forms/d/ABC/edit', 'https://docs.google.com/forms/d/ABC/viewform'],
    ['https://docs.google.com/forms/u/1/d/ABC/edit', 'https://docs.google.com/forms/d/ABC/viewform'],
    ['https://forms.gle/abc123?x=1', 'https://forms.gle/abc123'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeFormUrl(input)?.toString()).toBe(expected);
  });

  it.each([
    'not a url',
    'http://docs.google.com/forms/d/e/X/viewform',
    'https://docs.google.com/document/d/X/edit',
    'https://evil.example.com/forms/d/e/X/viewform',
    'https://docs.google.com:8443/forms/d/e/X/viewform',
    'https://forms.gle/a/b',
  ])('不正な URL は null: %s', (input) => {
    expect(normalizeFormUrl(input)).toBeNull();
  });
});

describe('fetchForm', () => {
  it('公開フォームを解析して返す', async () => {
    const fetchFn = vi.fn(async () => new Response(FORM_HTML));
    const result = await fetchForm(FORM_URL, fetchFn);
    expect(result).toMatchObject({ ok: true, form_url: FORM_URL, title: 'テストフォーム' });
  });

  it('短縮 URL のリダイレクトを辿る', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(redirect(FORM_URL))
      .mockResolvedValueOnce(new Response(FORM_HTML));
    const result = await fetchForm('https://forms.gle/abc', fetchFn);
    expect(result.ok).toBe(true);
    expect(fetchFn.mock.calls[1][0]).toBe(FORM_URL);
  });

  it('ログイン画面へのリダイレクトは LOGIN_REQUIRED', async () => {
    const fetchFn = vi.fn(async () => redirect('https://accounts.google.com/v3/signin?continue=x'));
    expect(await fetchForm(FORM_URL, fetchFn)).toEqual({ ok: false, error: 'LOGIN_REQUIRED' });
  });

  it('401 は LOGIN_REQUIRED', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 401 }));
    expect(await fetchForm(FORM_URL, fetchFn)).toEqual({ ok: false, error: 'LOGIN_REQUIRED' });
  });

  it('closedform へのリダイレクトは CLOSED', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(redirect(FORM_URL.replace('viewform', 'closedform')))
      .mockResolvedValueOnce(new Response('closed'));
    expect(await fetchForm(FORM_URL, fetchFn)).toEqual({ ok: false, error: 'CLOSED' });
  });

  it('404 は NOT_FOUND', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 404 }));
    expect(await fetchForm(FORM_URL, fetchFn)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('許可ホスト以外へのリダイレクトは辿らない', async () => {
    const fetchFn = vi.fn(async () => redirect('https://evil.example.com/'));
    expect(await fetchForm(FORM_URL, fetchFn)).toEqual({ ok: false, error: 'UPSTREAM_ERROR' });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('リダイレクトが多すぎれば UPSTREAM_ERROR', async () => {
    const fetchFn = vi.fn(async () => redirect(FORM_URL));
    expect(await fetchForm(FORM_URL, fetchFn)).toEqual({ ok: false, error: 'UPSTREAM_ERROR' });
  });

  it('解析できなければ PARSE_FAILED', async () => {
    const fetchFn = vi.fn(async () => new Response('<html></html>'));
    expect(await fetchForm(FORM_URL, fetchFn)).toEqual({ ok: false, error: 'PARSE_FAILED' });
  });

  it('不正な URL は取得しない', async () => {
    const fetchFn = vi.fn();
    expect(await fetchForm('https://example.com', fetchFn)).toEqual({
      ok: false,
      error: 'INVALID_URL',
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
