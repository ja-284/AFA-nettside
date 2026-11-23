import { areas, contactPrefs, employeeRanges, industries, labelOf, orderPackages, startOptions, validateOrder, wishes } from '../../src/lib/forms';
import { emailEnabled, notify } from '../_lib/email';
import { guardSubmission } from '../_lib/guard';
import { fail, htmlMessage, json, nowIso, preflight, type Env } from '../_lib/http';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeRef = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `AFA-${[...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')}`;
};

export const onRequestOptions: PagesFunction<Env> = ({ request, env }) => preflight(request, env);

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const guard = await guardSubmission(request, env, 'order', { max: 5, windowSeconds: 3600 });
  if (guard.ok === false) return guard.response;
  if (guard.ok === 'bot') {
    return guard.html ? Response.redirect(new URL('/bestill/takk/', request.url).toString(), 303) : json({ ok: true, ref: makeRef() });
  }

  const result = validateOrder(guard.body);
  if (!result.ok) {
    return guard.html
      ? htmlMessage('Noe mangler', Object.values(result.errors).join(' '), 422)
      : fail(422, 'Noen felt må rettes.', result.errors);
  }
  const d = result.data;

  let ref = makeRef();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await env.DB.prepare(
        `INSERT INTO orders (ref, package, business_name, industry, area, area_other, employees, web, wishes, message,
           start_when, time_window, contact_name, email, phone, contact_pref, consent_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)`,
      )
        .bind(
          ref, d.package, d.business_name, d.industry, d.area, d.area === 'annet' ? d.area_other : null, d.employees,
          d.web || null, JSON.stringify(d.wishes), d.message || null, d.start_when || null, d.time_window || null,
          d.contact_name, d.email, d.phone || null, d.contact_pref, nowIso(),
        )
        .run();
      break;
    } catch (err) {
      if (String(err).includes('UNIQUE') && attempt < 2) {
        ref = makeRef();
        continue;
      }
      console.error('order insert failed', err);
      return guard.html
        ? htmlMessage('Noe gikk galt', 'Vi klarte ikke å lagre bestillingen. Prøv igjen om litt.', 500)
        : fail(500, 'Vi klarte ikke å lagre bestillingen. Prøv igjen om litt, eller send oss en e-post.');
    }
  }

  if (emailEnabled(env)) {
    const rows: [string, string][] = [
      ['Referanse', ref],
      ['Pakke', labelOf(orderPackages, d.package)],
      ['Bedrift', d.business_name],
      ['Bransje', labelOf(industries, d.industry)],
      ['Område', d.area === 'annet' ? d.area_other : labelOf(areas, d.area)],
      ['Ansatte', labelOf(employeeRanges, d.employees)],
      ['Nettside/Instagram', d.web],
      ['Ønsker å vise', d.wishes.map((w) => labelOf(wishes, w)).join(', ')],
      ['Melding', d.message],
      ['Oppstart', labelOf(startOptions, d.start_when)],
      ['Når passer det', d.time_window],
      ['Kontaktperson', d.contact_name],
      ['E-post', d.email],
      ['Telefon', d.phone],
      ['Kontaktes via', labelOf(contactPrefs, d.contact_pref)],
    ];
    ctx.waitUntil(notify(env, 'order', rows, { replyTo: d.email, receiptTo: d.email, ref }));
  }

  return guard.html
    ? Response.redirect(new URL(`/bestill/takk/?ref=${encodeURIComponent(ref)}`, request.url).toString(), 303)
    : json({ ok: true, ref }, 201);
};
