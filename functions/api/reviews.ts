import { validateReview } from '../../src/lib/forms';
import { notify } from '../_lib/email';
import { guardSubmission } from '../_lib/guard';
import { fail, htmlMessage, json, preflight, type Env } from '../_lib/http';
import { getApprovedReviews } from '../_lib/reviews';

export const onRequestOptions: PagesFunction<Env> = ({ request, env }) => preflight(request, env);

/** Offentlig liste over godkjente vurderinger. */
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const data = await getApprovedReviews(env, 60);
    return json({ ok: true, ...data }, 200, { 'Cache-Control': 'public, max-age=60' });
  } catch {
    return fail(500, 'Kunne ikke hente vurderinger.');
  }
};

/** Ny vurdering. Lagres som «venter» og vises først når gruppen har godkjent den. */
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const guard = await guardSubmission(request, env, 'review', { max: 3, windowSeconds: 3600 });
  if (guard.ok === false) return guard.response;
  if (guard.ok === 'bot') return guard.html ? htmlMessage('Takk!', 'Vurderingen er mottatt.') : json({ ok: true }, 201);

  const result = validateReview(guard.body);
  if (!result.ok) {
    return guard.html
      ? htmlMessage('Noe mangler', Object.values(result.errors).join(' '), 422)
      : fail(422, 'Noen felt må rettes.', result.errors);
  }
  const d = result.data;
  try {
    await env.DB.prepare(`INSERT INTO reviews (rating, text, name, company, consent_publish) VALUES (?1, ?2, ?3, ?4, 1)`)
      .bind(d.rating, d.text, d.name || null, d.company || null)
      .run();
  } catch (err) {
    console.error('review insert failed', err);
    return fail(500, 'Vi klarte ikke å lagre vurderingen. Prøv igjen om litt.');
  }
  ctx.waitUntil(
    notify(env, 'review', [
      ['Stjerner', String(d.rating)],
      ['Tekst', d.text],
      ['Navn', d.name],
      ['Bedrift', d.company],
    ]),
  );
  return guard.html
    ? htmlMessage('Takk for vurderingen!', 'Den vises på siden så snart vi har sett over den.', 201)
    : json({ ok: true }, 201);
};
