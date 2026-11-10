/** 入力として受け付けるホスト。これ以外へは一切リクエストしない（SSRF 対策） */
export const ALLOWED_HOSTS: ReadonlySet<string> = new Set(['docs.google.com', 'forms.gle']);

/** 回答にログインが必要なフォームを取得したときのリダイレクト先ホスト */
export const GOOGLE_LOGIN_HOST = 'accounts.google.com';

export const MAX_REDIRECTS = 5;
export const FETCH_TIMEOUT_MS = 10_000;

/** 解析結果のエッジキャッシュ時間（秒） */
export const CACHE_TTL_SECONDS = 300;

/** Google Forms の設問種別（FB_PUBLIC_LOAD_DATA_ の item[3]） */
export const ITEM_TYPES: Record<number, string> = {
  0: 'short_answer',
  1: 'paragraph',
  2: 'multiple_choice',
  3: 'dropdown',
  4: 'checkboxes',
  5: 'linear_scale',
  6: 'text',
  7: 'grid',
  8: 'section',
  9: 'date',
  10: 'time',
  11: 'image',
  12: 'video',
  13: 'file_upload',
  18: 'rating',
};

export const ERRORS = {
  INVALID_URL: {
    status: 400,
    message:
      'url must be a Google Forms URL (https://docs.google.com/forms/... or https://forms.gle/...)',
  },
  NOT_FOUND: { status: 404, message: 'The form does not exist or has been deleted' },
  LOGIN_REQUIRED: {
    status: 403,
    message:
      'The form requires Google sign-in (restricted to an organization, "limit to 1 response", or file upload questions)',
  },
  CLOSED: { status: 403, message: 'The form is no longer accepting responses' },
  UPSTREAM_ERROR: { status: 502, message: 'Failed to fetch the form from Google' },
  PARSE_FAILED: { status: 502, message: 'Failed to parse the form' },
  RATE_LIMITED: { status: 429, message: 'Too many requests' },
} as const;

export type ErrorCode = keyof typeof ERRORS;
