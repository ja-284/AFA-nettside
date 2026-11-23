import { contactStatuses, orderStatuses, reviewStatuses, type Option } from '../../src/lib/forms';
import { fail, json, nowIso, readBody, type Env } from './http';

type Table = 'orders' | 'reviews' | 'contacts';

const STATUSES: Record<Table, Option[]> = { orders: orderStatuses, reviews: reviewStatuses, contacts: contactStatuses };
const HAS_NOTE: Record<Table, boolean> = { orders: true, reviews: false, contacts: true };

export async function listRows(env: Env, table: Table, request: Request): Promise<Response> {
  const status = new URL(request.url).searchParams.get('status');
  const valid = status && STATUSES[table].some((s) => s.value === status);
  const stmt = valid
    ? env.DB.prepare(`SELECT * FROM ${table} WHERE status = ?1 ORDER BY created_at DESC LIMIT 1000`).bind(status)
    : env.DB.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC LIMIT 1000`);
  const { results } = await stmt.all();
  return json({ ok: true, rows: results });
}

export async function updateRow(env: Env, table: Table, id: string | string[] | undefined, request: Request): Promise<Response> {
  const rowId = Number(Array.isArray(id) ? id[0] : id);
  if (!Number.isInteger(rowId) || rowId < 1) return fail(400, 'Ugyldig id.');
  const body = await readBody(request);
  if (!body) return fail(400, 'Ugyldig forespørsel.');

  const sets: string[] = [];
  const values: unknown[] = [];
  if (typeof body.status === 'string') {
    if (!STATUSES[table].some((s) => s.value === body.status)) return fail(422, 'Ugyldig status.');
    sets.push('status = ?');
    values.push(body.status);
    if (table === 'reviews') {
      sets.push('approved_at = ?');
      values.push(body.status === 'godkjent' ? nowIso() : null);
    }
  }
  if (typeof body.note === 'string' && HAS_NOTE[table]) {
    sets.push('note = ?');
    values.push(body.note.slice(0, 5000));
  }
  if (!sets.length) return fail(422, 'Ingenting å oppdatere.');
  sets.push('updated_at = ?');
  values.push(nowIso());
  const res = await env.DB.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`).bind(...values, rowId).run();
  if (!res.meta.changes) return fail(404, 'Fant ikke raden.');
  const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ?1`).bind(rowId).first();
  return json({ ok: true, row });
}

export async function deleteRow(env: Env, table: Table, id: string | string[] | undefined): Promise<Response> {
  const rowId = Number(Array.isArray(id) ? id[0] : id);
  if (!Number.isInteger(rowId) || rowId < 1) return fail(400, 'Ugyldig id.');
  const res = await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?1`).bind(rowId).run();
  return res.meta.changes ? json({ ok: true }) : fail(404, 'Fant ikke raden.');
}
