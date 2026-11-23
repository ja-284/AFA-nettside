import { createSession, safeEqual, sessionCookie } from '../../_lib/auth';
import { fail, json, readBody, type Env } from '../../_lib/http';
import { rateLimit } from '../../_lib/ratelimit';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD) return fail(503, 'Passordinnlogging er ikke satt opp. Bruk Cloudflare Access.');
  if (!(await rateLimit(env, request, 'admin-login', 10, 15 * 60))) {
    return fail(429, 'For mange forsøk. Vent et kvarter og prøv igjen.');
  }
  const body = await readBody(request);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!password || !(await safeEqual(password, env.ADMIN_PASSWORD))) {
    return fail(401, 'Feil passord.');
  }
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(await createSession(env)) });
};
