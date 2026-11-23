import { validateContact } from '../../src/lib/forms';
import { notify } from '../_lib/email';
import { guardSubmission } from '../_lib/guard';
import { fail, htmlMessage, json, preflight, type Env } from '../_lib/http';

export const onRequestOptions: PagesFunction<Env> = ({ request, env }) => preflight(request, env);

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const guard = await guardSubmission(request, env, 'contact', { max: 5, windowSeconds: 3600 });
  if (guard.ok === false) return guard.response;
  if (guard.ok === 'bot') return guard.html ? htmlMessage('Takk!', 'Meldingen er sendt.') : json({ ok: true }, 201);

  const result = validateContact(guard.body);
  if (!result.ok) {
    return guard.html
      ? htmlMessage('Noe mangler', Object.values(result.errors).join(' '), 422)
      : fail(422, 'Noen felt må rettes.', result.errors);
  }
  const d = result.data;
  try {
    await env.DB.prepare(`INSERT INTO contacts (name, email, phone, message) VALUES (?1, ?2, ?3, ?4)`)
      .bind(d.name, d.email, d.phone || null, d.message)
      .run();
  } catch (err) {
    console.error('contact insert failed', err);
    return fail(500, 'Vi klarte ikke å sende meldingen. Prøv igjen om litt, eller send oss en e-post.');
  }
  ctx.waitUntil(
    notify(env, 'contact', [
      ['Navn', d.name],
      ['E-post', d.email],
      ['Telefon', d.phone],
      ['Melding', d.message],
    ], { replyTo: d.email }),
  );
  return guard.html ? htmlMessage('Takk for meldingen!', 'Vi svarer så snart vi kan.', 201) : json({ ok: true }, 201);
};
