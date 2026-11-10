import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { CACHE_TTL_SECONDS, ERRORS, type ErrorCode } from './config.js';
import { fetchForm, normalizeFormUrl } from './fetchForm.js';

type Bindings = { RATE_LIMITER: RateLimit };

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'] }));

const errorResponse = (code: ErrorCode) =>
  Response.json({ error: { code, message: ERRORS[code].message } }, { status: ERRORS[code].status });

app.get('/', (c) =>
  c.json({
    usage: 'GET /v1/forms?url=<Google Forms URL>  or  POST /v1/forms {"url": "<Google Forms URL>"}',
  })
);

app.use('/v1/*', async (c, next) => {
  const key = c.req.header('cf-connecting-ip') ?? 'unknown';
  const { success } = await c.env.RATE_LIMITER.limit({ key });
  if (!success) {
    return errorResponse('RATE_LIMITED');
  }
  await next();
});

async function handleForm(
  value: unknown,
  ctx: Pick<ExecutionContext, 'waitUntil'>
): Promise<Response> {
  const url = typeof value === 'string' ? normalizeFormUrl(value) : null;
  if (!url) {
    return errorResponse('INVALID_URL');
  }

  // 同じフォームへの連続アクセスで Google に負荷をかけないよう、正規化 URL 単位でキャッシュする
  const cacheKey = new Request(`https://cache.internal/v1/forms?url=${encodeURIComponent(url.toString())}`);
  const cached = await caches.default.match(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await fetchForm(url.toString());
  if (!result.ok) {
    return errorResponse(result.error);
  }
  const { ok, ...form } = result;
  const response = Response.json(form, {
    headers: { 'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}` },
  });
  ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
  return response;
}

app.get('/v1/forms', (c) => handleForm(c.req.query('url'), c.executionCtx));

app.post('/v1/forms', async (c) => {
  const body = await c.req.json().catch(() => null);
  return handleForm(body?.url, c.executionCtx);
});

export default app;
