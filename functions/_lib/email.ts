import { escapeHtml, type Env } from './http';
import { site } from '../../src/config/site';

/** E-post er valgfritt: krever både RESEND_API_KEY og NOTIFY_EMAIL. */
export const emailEnabled = (env: Env) => Boolean(env.RESEND_API_KEY && env.NOTIFY_EMAIL);

interface Mail {
  to: string[];
  subject: string;
  rows: [string, string][];
  intro: string;
  replyTo?: string;
  outro?: string;
}

function render({ intro, rows, outro }: Mail) {
  const table = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#3E5761;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
    )
    .join('');
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:16px;line-height:1.55;color:#0B2530;max-width:560px">
<p style="font-size:20px;font-weight:700;margin:0 0 12px">${escapeHtml(site.name)}</p>
<p>${escapeHtml(intro)}</p>
<table style="border-collapse:collapse;margin:16px 0">${table}</table>
${outro ? `<p>${escapeHtml(outro)}</p>` : ''}
</div>`;
  const text = [intro, '', ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), '', outro ?? ''].join('\n');
  return { html, text };
}

async function send(env: Env, mail: Mail): Promise<void> {
  const { html, text } = render(mail);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || `${site.name} <onboarding@resend.dev>`,
      to: mail.to,
      subject: mail.subject,
      html,
      text,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
    }),
  });
  if (!res.ok) console.error('Resend error', res.status, await res.text());
}

const groupRecipients = (env: Env) =>
  (env.NOTIFY_EMAIL ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Sender varsel til gruppen og eventuelt kvittering. Feil logges, men stopper aldri innsendingen. */
export async function notify(
  env: Env,
  kind: 'order' | 'review' | 'contact',
  rows: [string, string][],
  opts: { replyTo?: string; receiptTo?: string; ref?: string } = {},
): Promise<void> {
  if (!emailEnabled(env)) return;
  const subjects = {
    order: `Ny bestilling ${opts.ref ?? ''}`.trim(),
    review: 'Ny vurdering venter på godkjenning',
    contact: 'Ny kontakthenvendelse',
  };
  const jobs: Promise<void>[] = [
    send(env, {
      to: groupRecipients(env),
      subject: `${site.name}: ${subjects[kind]}`,
      intro: kind === 'review' ? 'Godkjenn eller skjul vurderingen i admin.' : 'Svar kunden og oppdater status i admin.',
      rows,
      replyTo: opts.replyTo,
    }),
  ];
  if (opts.receiptTo) {
    jobs.push(
      send(env, {
        to: [opts.receiptTo],
        subject: `Takk for bestillingen – ${site.name}`,
        intro: `Hei! Vi har fått bestillingen din${opts.ref ? ` (${opts.ref})` : ''}. ${site.contact.responseTime} Her er det du sendte oss:`,
        rows,
        outro: `Har du spørsmål? Svar på denne e-posten eller skriv til ${site.contact.email}. Hilsen oss i ${site.name}`,
        replyTo: site.contact.email,
      }),
    );
  }
  await Promise.allSettled(jobs);
}
