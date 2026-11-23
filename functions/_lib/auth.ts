import type { Env } from './http';

/**
 * Tilgangskontroll for /api/admin.
 *
 * 1. Cloudflare Access (anbefalt): Når CF_ACCESS_TEAM_DOMAIN og CF_ACCESS_AUD er satt,
 *    godtas en gyldig Access-JWT (header «Cf-Access-Jwt-Assertion»), verifisert mot Access sine nøkler.
 * 2. Reserve: passord i secret ADMIN_PASSWORD. Innlogging gir en signert, HttpOnly-informasjonskapsel.
 */

export const COOKIE = 'afa_admin';
const SESSION_SECONDS = 12 * 60 * 60;
const enc = new TextEncoder();

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const fromB64url = (s: string) => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
};

/** Konstanttidssammenligning av to strenger (via SHA-256, så lengden ikke lekker). */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(ha, hb);
}

async function hmacKey(env: Env) {
  const secret = `${env.ADMIN_SESSION_SECRET ?? ''}|${env.ADMIN_PASSWORD ?? ''}`;
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function createSession(env: Env): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `v1.${exp}.${b64url(crypto.getRandomValues(new Uint8Array(12)))}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(env), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySession(env: Env, token: string | undefined): Promise<boolean> {
  if (!token || !env.ADMIN_PASSWORD) return false;
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  try {
    return await crypto.subtle.verify(
      'HMAC',
      await hmacKey(env),
      fromB64url(parts[3] ?? ''),
      enc.encode(parts.slice(0, 3).join('.')),
    );
  } catch {
    return false;
  }
}

export function sessionCookie(value: string, maxAge = SESSION_SECONDS): string {
  return `${COOKIE}=${value}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('Cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

// ─── Cloudflare Access ───────────────────────────────────────────────────────

interface Jwk extends JsonWebKey {
  kid: string;
}
let jwksCache: { domain: string; keys: Jwk[]; at: number } | null = null;

const accessDomain = (env: Env) =>
  (env.CF_ACCESS_TEAM_DOMAIN ?? '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

export const accessConfigured = (env: Env) => Boolean(accessDomain(env) && env.CF_ACCESS_AUD);

async function getKeys(domain: string): Promise<Jwk[]> {
  if (jwksCache && jwksCache.domain === domain && Date.now() - jwksCache.at < 3600_000) return jwksCache.keys;
  const res = await fetch(`https://${domain}/cdn-cgi/access/certs`);
  const data = (await res.json()) as { keys: Jwk[] };
  jwksCache = { domain, keys: data.keys ?? [], at: Date.now() };
  return jwksCache.keys;
}

/** Returnerer e-postadressen til innlogget bruker hvis Access-JWT er gyldig. */
export async function verifyAccess(env: Env, request: Request): Promise<string | null> {
  if (!accessConfigured(env)) return null;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return null;
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(fromB64url(h))) as { kid?: string; alg?: string };
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(p))) as {
      aud?: string | string[];
      exp?: number;
      iss?: string;
      email?: string;
    };
    if (header.alg !== 'RS256') return null;
    const domain = accessDomain(env);
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(env.CF_ACCESS_AUD)) return null;
    if (!payload.exp || payload.exp < Date.now() / 1000) return null;
    if (payload.iss !== `https://${domain}`) return null;
    const jwk = (await getKeys(domain)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromB64url(s), enc.encode(`${h}.${p}`));
    return valid ? (payload.email ?? 'access-bruker') : null;
  } catch {
    return null;
  }
}

export type AdminIdentity = { via: 'access'; email: string } | { via: 'password' };

export async function identify(env: Env, request: Request): Promise<AdminIdentity | null> {
  const email = await verifyAccess(env, request);
  if (email) return { via: 'access', email };
  if (await verifySession(env, readCookie(request, COOKIE))) return { via: 'password' };
  return null;
}
