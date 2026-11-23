import { site } from '../../../src/config/site';
import { json, type Env } from '../../_lib/http';

/**
 * Sletter bestillinger og henvendelser uten aktivitet de siste `retentionMonths` månedene,
 * og vurderinger som aldri ble publisert. Godkjente vurderinger beholdes.
 */
export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - site.retentionMonths);
  const iso = cutoff.toISOString();
  const results = await env.DB.batch([
    env.DB.prepare('DELETE FROM orders WHERE updated_at < ?1').bind(iso),
    env.DB.prepare('DELETE FROM contacts WHERE updated_at < ?1').bind(iso),
    env.DB.prepare(`DELETE FROM reviews WHERE status != 'godkjent' AND updated_at < ?1`).bind(iso),
    env.DB.prepare('DELETE FROM rate_limits WHERE reset_at <= ?1').bind(Math.floor(Date.now() / 1000)),
  ]);
  const [orders, contacts, reviews] = results.map((r) => r.meta.changes ?? 0);
  return json({ ok: true, deleted: { orders, contacts, reviews }, before: iso });
};
