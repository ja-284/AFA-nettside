/** Felles HTTP-hjelpere for Pages Functions. */

export interface Env {
  DB: D1Database;
  TURNSTILE_SECRET?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
  NOTIFY_EMAIL?: string;
  MAIL_FROM?: string;
  ALLOWED_ORIGINS?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  RATE_LIMIT_SALT?: string;
}

export type Ctx = EventContext<Env, string, Record<string, unknown>>;

const baseHeaders: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Robots-Tag': 'noindex, nofollow',
};

export function json(data: unknown, status = 200, extra: HeadersInit = {}): Response {
  const headers = new Headers({ ...baseHeaders, 'Content-Type': 'application/json; charset=utf-8' });
  new Headers(extra).forEach((v, k) => headers.set(k, v));
  return new Response(JSON.stringify(data), { status, headers });
}

export const fail = (status: number, message: string, errors?: Record<string, string>) =>
  json({ ok: false, message, ...(errors ? { errors } : {}) }, status);

/** Opprinnelser som får sende forespørsler: sidens egen + ALLOWED_ORIGINS. */
export function allowedOrigins(request: Request, env: Env): Set<string> {
  const own = new URL(request.url).origin;
  const extra = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return new Set([own, ...extra]);
}

/**
 * CORS er låst til eget domene. Nettlesere sender alltid Origin på POST/PATCH/DELETE,
 * så forespørsler fra andre nettsteder avvises her.
 */
export function checkOrigin(request: Request, env: Env): Response | null {
  const origin = request.headers.get('Origin');
  if (!origin) {
    // Ingen Origin (f.eks. curl eller eldre nettlesere ved GET). Tillat bare trygge metoder.
    return ['GET', 'HEAD'].includes(request.method) ? null : fail(403, 'Mangler opprinnelse.');
  }
  if (!allowedOrigins(request, env).has(origin)) return fail(403, 'Forespørselen kommer fra et annet nettsted.');
  return null;
}

/** Svar på CORS-preflight kun for tillatte opprinnelser. */
export function preflight(request: Request, env: Env): Response {
  const origin = request.headers.get('Origin') ?? '';
  if (!allowedOrigins(request, env).has(origin)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    },
  });
}

const MAX_BODY = 32 * 1024;

/** Leser JSON eller skjemadata (urlencoded/multipart) til et vanlig objekt. */
export async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  const len = Number(request.headers.get('Content-Length') ?? '0');
  if (len > MAX_BODY) return null;
  const type = request.headers.get('Content-Type') ?? '';
  try {
    if (type.includes('application/json')) {
      const text = await request.text();
      if (text.length > MAX_BODY) return null;
      const data: unknown = JSON.parse(text);
      return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
    }
    if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
      const form = await request.formData();
      const out: Record<string, unknown> = {};
      for (const [key, value] of form.entries()) {
        if (typeof value !== 'string') continue;
        const k = key.replace(/\[\]$/, '');
        const prev = out[k];
        if (prev === undefined) out[k] = key.endsWith('[]') ? [value] : value;
        else out[k] = Array.isArray(prev) ? [...prev, value] : [prev, value];
      }
      return out;
    }
  } catch {
    return null;
  }
  return null;
}

/** Ønsker klienten HTML (vanlig skjemainnsending uten JavaScript)? */
export const wantsHtml = (request: Request) =>
  !(request.headers.get('Accept') ?? '').includes('application/json') &&
  !(request.headers.get('Content-Type') ?? '').includes('application/json');

/** Enkel HTML-side for innsending uten JavaScript. */
export function htmlMessage(title: string, body: string, status = 200): Response {
  const page = `<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} – AFA Videos</title><style>body{font:18px/1.6 system-ui,sans-serif;background:#F7F4EF;color:#0B2530;max-width:36rem;margin:10vh auto;padding:0 1.25rem}a{color:#C43D21}</style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><p>Bruk tilbakeknappen i nettleseren for å prøve igjen, eller <a href="/">gå til forsiden</a>.</p></body></html>`;
  return new Response(page, { status, headers: { ...baseHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

export const clientIp = (request: Request) =>
  request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ?? '0.0.0.0';

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const nowIso = () => new Date().toISOString();
