import { accessConfigured, identify } from '../../_lib/auth';
import { checkOrigin, fail, type Env } from '../../_lib/http';

/**
 * Beskytter alt under /api/admin. Innlogging (login) er åpen, men rate-begrenset.
 * Endrende forespørsler må i tillegg komme fra eget domene (CSRF-vern sammen med SameSite=Strict).
 */
export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const path = new URL(request.url).pathname.replace(/\/$/, '');

  if (!env.ADMIN_PASSWORD && !accessConfigured(env)) {
    return fail(503, 'Admin er ikke satt opp. Sett ADMIN_PASSWORD eller Cloudflare Access (se DEPLOY.md).');
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const originError = checkOrigin(request, env);
    if (originError) return originError;
  }
  if (path === '/api/admin/login' || path === '/api/admin/logout') return ctx.next();

  const who = await identify(env, request);
  if (!who) return fail(401, 'Du må logge inn.');
  ctx.data.admin = who;
  const res = await ctx.next();
  const headers = new Headers(res.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(res.body, { status: res.status, headers });
};
