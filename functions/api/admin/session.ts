import type { AdminIdentity } from '../../_lib/auth';
import { emailEnabled } from '../../_lib/email';
import { json, type Env } from '../../_lib/http';
import { isTestSecret } from '../../_lib/turnstile';

/** Hvem er logget inn, og hva mangler i oppsettet? */
export const onRequestGet: PagesFunction<Env> = async ({ env, data }) => {
  const warnings: string[] = [];
  if (!env.TURNSTILE_SECRET) warnings.push('TURNSTILE_SECRET er ikke satt – skjemaene avviser alle innsendinger.');
  else if (isTestSecret(env.TURNSTILE_SECRET)) warnings.push('Turnstile bruker testnøkkel – ingen ekte spambeskyttelse.');
  if (!emailEnabled(env)) warnings.push('E-postvarsling er av (RESEND_API_KEY og NOTIFY_EMAIL er ikke satt). Sjekk admin jevnlig.');
  const [counts] = await env.DB.batch([
    env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM orders WHERE status = 'ny') AS orders,
              (SELECT COUNT(*) FROM reviews WHERE status = 'venter') AS reviews,
              (SELECT COUNT(*) FROM contacts WHERE status = 'ny') AS contacts`,
    ),
  ]);
  return json({ ok: true, admin: data.admin as AdminIdentity, warnings, pending: counts?.results?.[0] ?? {} });
};
