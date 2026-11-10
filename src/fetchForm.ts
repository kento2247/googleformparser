import {
  ALLOWED_HOSTS,
  type ErrorCode,
  FETCH_TIMEOUT_MS,
  GOOGLE_LOGIN_HOST,
  MAX_REDIRECTS,
} from './config.js';
import { type ParsedForm, parseGoogleFormHtml } from './parse.js';

export type FormResult =
  | ({ ok: true; form_url: string } & ParsedForm)
  | { ok: false; error: ErrorCode };

/**
 * 入力 URL を検証し、取得先 URL に正規化する。
 * /edit や /prefill などの URL も回答用の /viewform に置き換える（/edit は編集者以外ログイン画面になるため）。
 */
export function normalizeFormUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname) || url.port) {
    return null;
  }
  if (url.hostname === 'forms.gle') {
    return /^\/[\w-]+$/.test(url.pathname) ? new URL(`https://forms.gle${url.pathname}`) : null;
  }
  const match = url.pathname.match(/^\/forms\/(?:u\/\d+\/)?d\/(e\/)?([\w-]+)(?:\/|$)/);
  if (!match) {
    return null;
  }
  return new URL(`https://docs.google.com/forms/d/${match[1] ?? ''}${match[2]}/viewform`);
}

/**
 * フォームを取得し、誰でも回答できる公開状態かを検証してから解析する。
 * リダイレクトは手動で辿り、許可ホスト以外へは遷移しない。
 */
export async function fetchForm(value: string, fetchFn: typeof fetch = fetch): Promise<FormResult> {
  let url = normalizeFormUrl(value);
  if (!url) {
    return { ok: false, error: 'INVALID_URL' };
  }

  let response: Response | null = null;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    try {
      response = await fetchFn(url.toString(), {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch {
      return { ok: false, error: 'UPSTREAM_ERROR' };
    }
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) {
      break;
    }
    url = new URL(location, url);
    if (url.hostname === GOOGLE_LOGIN_HOST) {
      return { ok: false, error: 'LOGIN_REQUIRED' };
    }
    if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) {
      return { ok: false, error: 'UPSTREAM_ERROR' };
    }
    response = null;
  }

  if (!response) {
    return { ok: false, error: 'UPSTREAM_ERROR' };
  }
  if (response.status === 401) {
    return { ok: false, error: 'LOGIN_REQUIRED' };
  }
  if (response.status === 404 || response.status === 410) {
    return { ok: false, error: 'NOT_FOUND' };
  }
  if (url.pathname.endsWith('/closedform')) {
    return { ok: false, error: 'CLOSED' };
  }
  if (!response.ok) {
    return { ok: false, error: 'UPSTREAM_ERROR' };
  }

  const form = parseGoogleFormHtml(await response.text());
  if (!form) {
    return { ok: false, error: 'PARSE_FAILED' };
  }
  return { ok: true, form_url: `https://docs.google.com/forms/d/e/${form.form_id}/viewform`, ...form };
}
