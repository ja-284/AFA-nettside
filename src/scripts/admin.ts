/** Admin for gruppen: bestillinger, vurderinger og henvendelser. All tekst settes med textContent. */
import {
  areas, contactPrefs, contactStatuses, employeeRanges, industries, labelOf, orderPackages, orderStatuses,
  reviewStatuses, startOptions, wishes, type Option,
} from '../lib/forms';

type Kind = 'orders' | 'reviews' | 'contacts';
type Row = Record<string, string | number | null>;

const $ = <T extends HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const live = $('[data-live]');
const announce = (msg: string) => {
  if (live) live.textContent = msg;
};

const dateFmt = new Intl.DateTimeFormat('nb-NO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Oslo' });
const fmtDate = (iso: unknown) => (typeof iso === 'string' && iso ? dateFmt.format(new Date(iso)) : '');

async function api<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<{ status: number; data: T }> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {}, ...children: (Node | string | null | undefined)[]) {
  const node = document.createElement(tag);
  const { class: cls, ...rest } = props;
  if (cls) node.className = cls;
  Object.assign(node, rest);
  for (const c of children) if (c !== null && c !== undefined) node.append(c);
  return node;
}

function statusSelect(options: Option[], value: string, label: string) {
  const select = el('select', { class: 'select a-status' });
  select.setAttribute('aria-label', label);
  for (const o of options) select.append(el('option', { value: o.value, textContent: o.label, selected: o.value === value }));
  return select;
}

function details(pairs: [string, unknown][]) {
  const dl = el('dl', { class: 'a-details' });
  for (const [k, v] of pairs) {
    if (v === null || v === undefined || v === '') continue;
    dl.append(el('dt', { textContent: k }), el('dd', { textContent: String(v) }));
  }
  return dl;
}

function button(text: string, cls = 'btn btn-ghost btn-sm') {
  const b = el('button', { type: 'button', class: cls });
  b.append(el('span', { class: 'btn-label', textContent: text }));
  return b;
}

const state: Record<Kind, Row[]> = { orders: [], reviews: [], contacts: [] };

async function patch(kind: Kind, id: unknown, body: Record<string, unknown>) {
  const res = await api<{ ok: boolean; row?: Row; message?: string }>(`/api/admin/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  if (res.status === 401) return showLogin();
  if (!res.data.ok) {
    alert(res.data.message ?? 'Kunne ikke lagre.');
    return;
  }
  const i = state[kind].findIndex((r) => r.id === id);
  if (i >= 0 && res.data.row) state[kind][i] = res.data.row;
  announce('Lagret.');
  render(kind);
  refreshSession();
}

async function remove(kind: Kind, id: unknown, what: string) {
  if (!confirm(`Slette ${what}? Dette kan ikke angres.`)) return;
  const res = await api<{ ok: boolean; message?: string }>(`/api/admin/${kind}/${id}`, { method: 'DELETE' });
  if (res.status === 401) return showLogin();
  if (!res.data.ok) return alert(res.data.message ?? 'Kunne ikke slette.');
  state[kind] = state[kind].filter((r) => r.id !== id);
  announce('Slettet.');
  render(kind);
  refreshSession();
}

function noteEditor(kind: Kind, row: Row) {
  const wrap = el('div', { class: 'field' });
  const id = `note-${kind}-${row.id}`;
  const label = el('label', { class: 'field-label', htmlFor: id, textContent: 'Notat (bare for gruppen)' });
  const ta = el('textarea', { class: 'textarea a-note', id, value: String(row.note ?? '') });
  const save = button('Lagre notat');
  save.addEventListener('click', () => patch(kind, row.id, { note: ta.value }));
  wrap.append(label, ta, el('div', { class: 'a-actions' }, save));
  return wrap;
}

function orderItem(r: Row) {
  const wishList = (() => {
    try {
      return (JSON.parse(String(r.wishes ?? '[]')) as string[]).map((w) => labelOf(wishes, w)).join(', ');
    } catch {
      return '';
    }
  })();
  const status = statusSelect(orderStatuses, String(r.status), `Status for ${r.business_name}`);
  status.addEventListener('change', () => patch('orders', r.id, { status: status.value }));
  const del = button('Slett', 'btn btn-ghost btn-sm a-danger');
  del.addEventListener('click', () => remove('orders', r.id, `bestillingen fra ${r.business_name}`));
  return el(
    'article',
    { class: `a-item${r.status === 'ny' ? ' is-new' : ''}` },
    el(
      'div',
      { class: 'a-row' },
      el('span', { class: 'a-date', textContent: fmtDate(r.created_at) }),
      el('div', {}, el('div', { class: 'a-title', textContent: String(r.business_name) }), el('div', { class: 'a-sub', textContent: `${r.ref} · ${labelOf(orderPackages, String(r.package))}` })),
      el('div', {}, el('div', { textContent: String(r.contact_name) }), el('div', { class: 'a-sub', textContent: [r.email, r.phone].filter(Boolean).join(' · ') })),
      status,
    ),
    el(
      'details',
      {},
      el('summary', { textContent: 'Detaljer og notat' }),
      details([
        ['Referanse', r.ref],
        ['Pakke', labelOf(orderPackages, String(r.package))],
        ['Bransje', labelOf(industries, String(r.industry))],
        ['Område', r.area === 'annet' ? r.area_other : labelOf(areas, String(r.area))],
        ['Ansatte', labelOf(employeeRanges, String(r.employees))],
        ['Nettside/Instagram', r.web],
        ['Vil vise', wishList],
        ['Melding', r.message],
        ['Oppstart', labelOf(startOptions, String(r.start_when ?? ''))],
        ['Når passer det', r.time_window],
        ['E-post', r.email],
        ['Telefon', r.phone],
        ['Kontaktes via', labelOf(contactPrefs, String(r.contact_pref))],
        ['Samtykke gitt', fmtDate(r.consent_at)],
        ['Sist endret', fmtDate(r.updated_at)],
      ]),
      noteEditor('orders', r),
      el('div', { class: 'a-actions' }, del),
    ),
  );
}

function reviewItem(r: Row) {
  const actions = el('div', { class: 'a-actions' });
  const add = (text: string, cls: string, fn: () => void) => {
    const b = button(text, cls);
    b.addEventListener('click', fn);
    actions.append(b);
  };
  if (r.status !== 'godkjent') add('Godkjenn', 'btn btn-sm', () => patch('reviews', r.id, { status: 'godkjent' }));
  if (r.status !== 'skjult') add('Skjul', 'btn btn-ghost btn-sm', () => patch('reviews', r.id, { status: 'skjult' }));
  add('Slett', 'btn btn-ghost btn-sm a-danger', () => remove('reviews', r.id, 'vurderingen'));
  const stars = '★'.repeat(Number(r.rating)) + '☆'.repeat(5 - Number(r.rating));
  const pill = el('span', { class: 'a-pill', textContent: labelOf(reviewStatuses, String(r.status)) });
  pill.dataset.s = String(r.status);
  return el(
    'article',
    { class: `a-item${r.status === 'venter' ? ' is-new' : ''}` },
    el(
      'div',
      { class: 'a-row' },
      el('span', { class: 'a-date', textContent: fmtDate(r.created_at) }),
      el('div', {}, el('div', { class: 'a-title', textContent: stars, ariaLabel: `${r.rating} av 5 stjerner` }), el('div', { class: 'a-sub', textContent: [r.name, r.company].filter(Boolean).join(', ') || 'Uten navn' })),
      el('div', {}, pill),
      actions,
    ),
    el('p', { class: 'a-text', textContent: String(r.text) }),
  );
}

function contactItem(r: Row) {
  const status = statusSelect(contactStatuses, String(r.status), `Status for henvendelse fra ${r.name}`);
  status.addEventListener('change', () => patch('contacts', r.id, { status: status.value }));
  const del = button('Slett', 'btn btn-ghost btn-sm a-danger');
  del.addEventListener('click', () => remove('contacts', r.id, `henvendelsen fra ${r.name}`));
  return el(
    'article',
    { class: `a-item${r.status === 'ny' ? ' is-new' : ''}` },
    el(
      'div',
      { class: 'a-row' },
      el('span', { class: 'a-date', textContent: fmtDate(r.created_at) }),
      el('div', {}, el('div', { class: 'a-title', textContent: String(r.name) }), el('div', { class: 'a-sub', textContent: [r.email, r.phone].filter(Boolean).join(' · ') })),
      el('div', { class: 'a-sub', textContent: String(r.message).slice(0, 90) + (String(r.message).length > 90 ? ' …' : '') }),
      status,
    ),
    el('details', {}, el('summary', { textContent: 'Hele meldingen og notat' }), el('p', { class: 'a-text', textContent: String(r.message) }), noteEditor('contacts', r), el('div', { class: 'a-actions' }, del)),
  );
}

const renderers: Record<Kind, (r: Row) => HTMLElement> = { orders: orderItem, reviews: reviewItem, contacts: contactItem };

function render(kind: Kind) {
  const panel = $(`[data-panel="${kind}"]`);
  if (!panel) return;
  const list = $('[data-list]', panel);
  const empty = $('[data-empty]', panel);
  const q = ($<HTMLInputElement>('[data-search]', panel)?.value ?? '').trim().toLowerCase();
  const rows = state[kind].filter((r) => !q || Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q)));
  list?.replaceChildren(...rows.map(renderers[kind]));
  if (empty) empty.hidden = rows.length > 0;
}

async function load(kind: Kind) {
  const panel = $(`[data-panel="${kind}"]`);
  const status = $<HTMLSelectElement>('[data-filter-status]', panel ?? document)?.value ?? '';
  const res = await api<{ ok: boolean; rows: Row[] }>(`/api/admin/${kind}${status ? `?status=${encodeURIComponent(status)}` : ''}`);
  if (res.status === 401) return showLogin();
  state[kind] = res.data.rows ?? [];
  render(kind);
}

async function refreshSession() {
  const res = await api<{ ok: boolean; admin?: { via: string; email?: string }; warnings?: string[]; pending?: Record<string, number> }>('/api/admin/session');
  if (res.status !== 200 || !res.data.ok) return false;
  const label = $('[data-user-label]');
  if (label) label.textContent = res.data.admin?.via === 'access' ? `Innlogget som ${res.data.admin.email}` : 'Innlogget med passord';
  const logout = $('[data-logout]');
  if (logout) logout.hidden = res.data.admin?.via === 'access';
  const warn = $('[data-warnings]');
  warn?.replaceChildren(...(res.data.warnings ?? []).map((w) => el('li', { textContent: w })));
  for (const k of ['orders', 'reviews', 'contacts'] as Kind[]) {
    const c = $(`[data-count="${k}"]`);
    const n = Number(res.data.pending?.[k] ?? 0);
    if (c) c.textContent = n ? String(n) : '';
  }
  return true;
}

function showLogin(message?: string) {
  $('[data-loading]')?.setAttribute('hidden', '');
  $('[data-app]')?.setAttribute('hidden', '');
  $('[data-user]')?.setAttribute('hidden', '');
  const login = $('[data-login]');
  login?.removeAttribute('hidden');
  const a = $('[data-login-alert]');
  if (a) a.textContent = message ?? '';
  $<HTMLInputElement>('#pw')?.focus();
}

async function showApp() {
  $('[data-loading]')?.setAttribute('hidden', '');
  $('[data-login]')?.setAttribute('hidden', '');
  $('[data-app]')?.removeAttribute('hidden');
  $('[data-user]')?.removeAttribute('hidden');
  await Promise.all((['orders', 'reviews', 'contacts'] as Kind[]).map(load));
}

// ─── Faner ──────────────────────────────────────────────────────────────────
const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
function selectTab(tab: HTMLButtonElement, focus = false) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls') ?? '');
    if (panel) panel.hidden = !on;
  }
  if (focus) tab.focus();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', (e) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    if (next) selectTab(next, true);
  });
});

document.querySelectorAll<HTMLElement>('[data-panel]').forEach((panel) => {
  const kind = panel.dataset.panel as Kind;
  $('[data-filter-status]', panel)?.addEventListener('change', () => load(kind));
  $('[data-search]', panel)?.addEventListener('input', () => render(kind));
  $('[data-refresh]', panel)?.addEventListener('click', () => {
    load(kind);
    refreshSession();
  });
});

// ─── Innlogging ─────────────────────────────────────────────────────────────
$<HTMLFormElement>('[data-login-form]')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = $<HTMLInputElement>('#pw');
  const res = await api<{ ok: boolean; message?: string }>('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: pw?.value ?? '' }) });
  if (res.data.ok) {
    if (pw) pw.value = '';
    await refreshSession();
    await showApp();
    announce('Logget inn.');
  } else showLogin(res.data.message ?? 'Innloggingen feilet.');
});

$('[data-logout]')?.addEventListener('click', async () => {
  await api('/api/admin/logout', { method: 'POST' });
  showLogin('Du er logget ut.');
});

$('[data-cleanup]')?.addEventListener('click', async () => {
  if (!confirm('Slette gamle bestillinger, henvendelser og upubliserte vurderinger? Dette kan ikke angres.')) return;
  const res = await api<{ ok: boolean; deleted?: Record<string, number>; message?: string }>('/api/admin/cleanup', { method: 'POST' });
  const out = $('[data-cleanup-status]');
  if (res.status === 401) return showLogin();
  if (out) {
    const d = res.data.deleted;
    out.textContent = d ? `Slettet ${d.orders} bestillinger, ${d.contacts} henvendelser og ${d.reviews} vurderinger.` : (res.data.message ?? 'Noe gikk galt.');
  }
  await showApp();
});

// ─── Start ──────────────────────────────────────────────────────────────────
(async () => {
  try {
    const res = await api<{ ok?: boolean; message?: string }>('/api/admin/session');
    if (res.status === 200 && res.data.ok) {
      await refreshSession();
      await showApp();
    } else if (res.status === 503) showLogin(res.data.message);
    else showLogin();
  } catch {
    showLogin('Fikk ikke kontakt med serveren.');
  }
})();
