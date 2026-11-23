import { fail, type Env } from '../../_lib/http';

const COLUMNS = {
  orders: ['id', 'ref', 'created_at', 'updated_at', 'status', 'package', 'business_name', 'industry', 'area', 'area_other',
    'employees', 'web', 'wishes', 'message', 'start_when', 'time_window', 'contact_name', 'email', 'phone', 'contact_pref',
    'consent_at', 'note'],
  reviews: ['id', 'created_at', 'updated_at', 'status', 'rating', 'text', 'name', 'company', 'consent_publish', 'approved_at'],
  contacts: ['id', 'created_at', 'updated_at', 'status', 'name', 'email', 'phone', 'message', 'note'],
} as const;

type Table = keyof typeof COLUMNS;

/** Én CSV-celle. Beskytter mot formel-injeksjon i Excel/Sheets. */
function cell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV med semikolon og BOM, slik at norsk Excel åpner den riktig. */
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const type = new URL(request.url).searchParams.get('type') as Table | null;
  if (!type || !(type in COLUMNS)) return fail(400, 'Ugyldig type.');
  const cols = COLUMNS[type];
  const { results } = await env.DB.prepare(`SELECT ${cols.join(', ')} FROM ${type} ORDER BY created_at DESC`).all();
  const lines = [cols.join(';'), ...results.map((r) => cols.map((c) => cell((r as Record<string, unknown>)[c])).join(';'))];
  const date = new Date().toISOString().slice(0, 10);
  return new Response(`\uFEFF${lines.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="afa-${type}-${date}.csv"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
