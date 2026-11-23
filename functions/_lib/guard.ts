import { HONEYPOT } from '../../src/lib/forms';
import { checkOrigin, clientIp, fail, htmlMessage, readBody, wantsHtml, type Env } from './http';
import { rateLimit } from './ratelimit';
import { verifyTurnstile } from './turnstile';

type Guarded =
  | { ok: true; body: Record<string, unknown>; html: boolean }
  | { ok: false; response: Response }
  /** Honningkrukka ble fylt ut: late som alt gikk fint, men lagre ingenting. */
  | { ok: 'bot'; html: boolean };

/**
 * Felles beskyttelse for offentlige skjemaer:
 * opprinnelse → størrelse/format → honningkrukke → rate-begrensning → Turnstile.
 */
export async function guardSubmission(
  request: Request,
  env: Env,
  scope: string,
  limit: { max: number; windowSeconds: number },
): Promise<Guarded> {
  const html = wantsHtml(request);
  const reply = (status: number, message: string) =>
    ({ ok: false, response: html ? htmlMessage('Noe gikk galt', message, status) : fail(status, message) }) as const;

  const originError = checkOrigin(request, env);
  if (originError) return { ok: false, response: originError };

  const body = await readBody(request);
  if (!body) return reply(400, 'Vi klarte ikke å lese skjemaet. Prøv igjen.');

  if (typeof body[HONEYPOT] === 'string' && body[HONEYPOT].trim() !== '') return { ok: 'bot', html };

  if (!(await rateLimit(env, request, scope, limit.max, limit.windowSeconds))) {
    return reply(429, 'Du har sendt mange skjemaer på kort tid. Vent litt og prøv igjen.');
  }

  const token = body['cf-turnstile-response'] ?? body.turnstileToken;
  const ts = await verifyTurnstile(token, env.TURNSTILE_SECRET, clientIp(request));
  if (!ts.ok) {
    const message =
      ts.reason === 'missing-token'
        ? 'Spamvernet er ikke ferdig. Vent et øyeblikk og prøv igjen.'
        : ts.reason === 'turnstile-not-configured'
          ? 'Skjemaet er ikke ferdig satt opp ennå. Send oss gjerne en e-post i stedet.'
          : 'Vi klarte ikke å bekrefte at du er et menneske. Prøv igjen.';
    return reply(ts.reason === 'turnstile-not-configured' ? 503 : 403, message);
  }
  return { ok: true, body, html };
}
