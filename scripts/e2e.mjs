// Ende-til-ende-test mot `npm run preview` (wrangler pages dev på port 8788).
// Kjør: npm run build && npm run db:migrate:local && npm run preview   (i ett vindu)
//       npm run test:e2e                                                (i et annet)
// Bruker Turnstile-testnøkkelen fra .dev.vars og ADMIN_PASSWORD derfra.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const BASE = process.env.BASE_URL ?? 'http://localhost:8788';
const vars = Object.fromEntries(
  readFileSync('.dev.vars', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const PASSWORD = vars.ADMIN_PASSWORD;
const TOKEN = 'XXXX.DUMMY.TOKEN.XXXX';
const runId = Date.now().toString(36);
let ipCounter = 1;
const freshIp = () => `10.${Math.floor(Math.random() * 200)}.${ipCounter++}.${Math.floor(Math.random() * 250)}`;

let failures = 0;
const ok = (cond, msg, extra = '') => {
  console.log(`${cond ? '✓' : '✗'} ${msg}${!cond && extra ? `\n    ${extra}` : ''}`);
  if (!cond) failures++;
};

async function req(path, { method = 'GET', body, headers = {}, ip = freshIp(), cookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    redirect: 'manual',
    headers: {
      ...(body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : {}),
      ...(method !== 'GET' ? { Origin: BASE } : {}),
      'CF-Connecting-IP': ip,
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* ikke JSON */
  }
  return { status: res.status, data, text, headers: res.headers };
}

const order = (over = {}) => ({
  package: 'prove',
  business_name: `Testkafé ${runId}`,
  industry: 'kafe',
  area: 'fornebu',
  employees: '6-20',
  web: '@testkafe',
  wishes: ['mat', 'lokaler'],
  message: 'Vi har ny lunsjmeny.',
  start_when: 'snarest',
  time_window: 'Tirsdager før kl. 11',
  contact_name: 'Kari Test',
  email: 'kari@example.com',
  phone: '400 00 000',
  contact_pref: 'epost',
  consent: true,
  turnstileToken: TOKEN,
  ...over,
});

// Lokalt: nullstill rate-begrensningen, så testene kan kjøres flere ganger på rad.
if (/localhost|127\.0\.0\.1/.test(BASE)) {
  execSync('npx wrangler d1 execute afa-videos --local --command "DELETE FROM rate_limits"', { stdio: 'ignore' });
}

console.log(`\nTester mot ${BASE}\n── Offentlige API-er ──`);
{
  const r = await req('/api/orders', { method: 'POST', body: order() });
  ok(r.status === 201 && /^AFA-[A-Z0-9]{6}$/.test(r.data?.ref ?? ''), 'Gyldig bestilling lagres og gir referanse', r.text);
}
{
  const r = await req('/api/orders', { method: 'POST', body: order({ email: 'ikke-epost', consent: false, business_name: '' }) });
  ok(r.status === 422 && r.data?.errors?.email && r.data?.errors?.consent && r.data?.errors?.business_name, 'Ugyldig bestilling gir feltfeil (422)', r.text);
}
{
  const r = await req('/api/orders', { method: 'POST', body: order({ contact_pref: 'telefon', phone: '' }) });
  ok(r.status === 422 && r.data?.errors?.phone, 'Telefon kreves når man vil bli ringt', r.text);
}
{
  const r = await req('/api/orders', { method: 'POST', body: order({ turnstileToken: '' }) });
  ok(r.status === 403, 'Bestilling uten Turnstile-token avvises (403)', r.text);
}
{
  const r = await req('/api/orders', { method: 'POST', body: order(), headers: { Origin: 'https://ondsinnet.example' } });
  ok(r.status === 403, 'Bestilling fra annet domene avvises (CORS/opprinnelse)', r.text);
}
{
  const r = await req('/api/orders', { method: 'POST', body: order({ company_website: 'http://spam.example', business_name: `Bot ${runId}` }) });
  ok(r.status === 200 && r.data?.ok, 'Honningkrukke: bot får «ok» tilbake', r.text);
}
{
  const ip = freshIp();
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await req('/api/orders', { method: 'POST', body: order({ business_name: `Spam ${i}` }), ip })).status);
  ok(codes.slice(0, 5).every((c) => c === 201) && codes[5] === 429, 'Rate-begrensning: 6. bestilling fra samme IP gir 429', codes.join(','));
}
{
  const r = await req('/api/reviews', { method: 'POST', body: { rating: 5, text: `Supert samarbeid! (${runId})`, name: 'Ola', company: 'Testbakeriet', consent: true, turnstileToken: TOKEN } });
  ok(r.status === 201, 'Vurdering sendes inn', r.text);
  const bad = await req('/api/reviews', { method: 'POST', body: { rating: 9, text: 'kort', consent: false, turnstileToken: TOKEN } });
  ok(bad.status === 422 && bad.data?.errors?.rating && bad.data?.errors?.text && bad.data?.errors?.consent, 'Ugyldig vurdering gir feltfeil', bad.text);
}
{
  const home = await req('/');
  ok(!home.text.includes(runId), 'Ny vurdering vises IKKE før godkjenning');
}
{
  const r = await req('/api/contact', { method: 'POST', body: { name: 'Per', email: 'per@example.com', message: `Hei! ${runId}`, turnstileToken: TOKEN } });
  ok(r.status === 201, 'Kontaktskjema lagres', r.text);
}

console.log('── Admin ──');
{
  const r = await req('/api/admin/session');
  ok(r.status === 401, 'Admin uten innlogging gir 401');
  const page = await req('/admin/');
  ok(/noindex/.test(page.headers.get('x-robots-tag') ?? '') && page.text.includes('noindex'), 'Admin-siden har noindex (header og meta)');
  const wrong = await req('/api/admin/login', { method: 'POST', body: { password: 'feil' } });
  ok(wrong.status === 401, 'Feil passord avvises');
  const noOrigin = await fetch(`${BASE}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: PASSWORD }) });
  ok(noOrigin.status === 403, 'Innlogging uten Origin-header avvises (CSRF-vern)');
}
const login = await req('/api/admin/login', { method: 'POST', body: { password: PASSWORD } });
const setCookie = login.headers.get('set-cookie') ?? '';
ok(login.status === 200 && /HttpOnly/i.test(setCookie) && /Secure/i.test(setCookie) && /SameSite=Strict/i.test(setCookie), 'Riktig passord gir HttpOnly/Secure/SameSite-informasjonskapsel', setCookie);
const cookie = setCookie.split(';')[0];
{
  const s = await req('/api/admin/session', { cookie });
  ok(s.status === 200 && s.data?.admin?.via === 'password', 'Sesjonen er gyldig', s.text);
  ok(Array.isArray(s.data?.warnings) && s.data.warnings.some((w) => w.includes('testnøkkel')), 'Admin varsler om Turnstile-testnøkkel');
  // Forleng utløpstiden i informasjonskapselen uten å kunne signere på nytt.
  const tampered = await req('/api/admin/session', { cookie: cookie.replace(/\.v1\.(\d+)\./, (_, exp) => `.v1.${Number(exp) + 99999}.`).replace(/=v1\.(\d+)\./, (_, exp) => `=v1.${Number(exp) + 99999}.`) });
  ok(tampered.status === 401, 'Endret informasjonskapsel avvises');
}
const orders = await req('/api/admin/orders', { cookie });
const myOrder = orders.data?.rows?.find((r) => r.business_name === `Testkafé ${runId}`);
ok(!!myOrder, 'Bestillingen vises i admin');
ok(!orders.data?.rows?.some((r) => r.business_name === `Bot ${runId}`), 'Bot-bestillingen ble ikke lagret');
if (myOrder) {
  const p = await req(`/api/admin/orders/${myOrder.id}`, { method: 'PATCH', body: { status: 'kontaktet', note: 'Ringt, avtalt møte.' }, cookie });
  ok(p.status === 200 && p.data?.row?.status === 'kontaktet' && p.data?.row?.note === 'Ringt, avtalt møte.', 'Status og notat oppdateres', p.text);
  const bad = await req(`/api/admin/orders/${myOrder.id}`, { method: 'PATCH', body: { status: 'hacket' }, cookie });
  ok(bad.status === 422, 'Ugyldig status avvises');
}
const reviews = await req('/api/admin/reviews', { cookie });
const myReview = reviews.data?.rows?.find((r) => String(r.text).includes(runId));
ok(myReview?.status === 'venter', 'Vurderingen venter på godkjenning');
if (myReview) {
  const a = await req(`/api/admin/reviews/${myReview.id}`, { method: 'PATCH', body: { status: 'godkjent' }, cookie });
  ok(a.status === 200 && a.data?.row?.status === 'godkjent', 'Vurderingen godkjennes', a.text);
  const home = await req('/');
  ok(home.text.includes(runId) && home.text.includes('review-card'), 'Godkjent vurdering vises på forsiden (uten JavaScript)');
  ok(!home.text.includes('data-reviews-empty'), 'Tom tilstand er fjernet når det finnes vurderinger');
  const page = await req('/vurderinger/');
  ok(page.text.includes('"AggregateRating"') && page.text.includes('review-stats'), 'Vurderingssiden har snitt og AggregateRating-JSON-LD');
  const api = await req('/api/reviews');
  ok(api.data?.stats?.count >= 1, 'Offentlig API returnerer godkjente vurderinger');
}
const contacts = await req('/api/admin/contacts', { cookie });
ok(contacts.data?.rows?.some((r) => String(r.message).includes(runId)), 'Kontakthenvendelsen vises i admin');
{
  const csv = await req('/api/admin/export?type=orders', { cookie });
  ok(csv.status === 200 && (csv.headers.get('content-type') ?? '').includes('text/csv') && csv.text.includes(`Testkafé ${runId}`) && csv.text.replace(/^\uFEFF/, '').startsWith('id;ref;'), 'CSV-eksport av bestillinger', csv.text.slice(0, 80));
  const raw = new Uint8Array(await (await fetch(`${BASE}/api/admin/export?type=orders`, { headers: { Cookie: cookie } })).arrayBuffer());
  ok(raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf, 'CSV har BOM, så norsk Excel viser æøå riktig');
  const noAuth = await req('/api/admin/export?type=orders');
  ok(noAuth.status === 401, 'CSV-eksport krever innlogging');
  const inj = await req('/api/contact', { method: 'POST', body: { name: '=HYPERLINK("x")', email: 'x@example.com', message: 'Formeltest', turnstileToken: TOKEN } });
  const csv2 = await req('/api/admin/export?type=contacts', { cookie });
  ok(inj.status === 201 && csv2.text.includes(`'=HYPERLINK`), 'CSV beskytter mot formel-injeksjon');
}
{
  const out = await req('/api/admin/logout', { method: 'POST', cookie });
  ok(out.status === 200 && /Max-Age=0/.test(out.headers.get('set-cookie') ?? ''), 'Utlogging sletter informasjonskapselen');
}

console.log('── Statiske filer og headere ──');
for (const path of ['/robots.txt', '/sitemap-index.xml', '/manifest.webmanifest', '/favicon.ico', '/favicon.svg', '/og/hjem.png', '/qr.svg', '/qr.png']) {
  const r = await fetch(BASE + path);
  ok(r.status === 200, `${path} finnes`);
}
{
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  ok(robots.includes('Disallow: /admin/') && robots.includes('Disallow: /api/'), 'robots.txt blokkerer /admin og /api');
  const r = await fetch(`${BASE}/om-oss/`);
  const csp = r.headers.get('content-security-policy') ?? '';
  ok(csp.includes("default-src 'self'") && !csp.includes('__'), 'CSP-header er satt');
  ok(r.headers.get('x-content-type-options') === 'nosniff' && !!r.headers.get('permissions-policy') && !!r.headers.get('referrer-policy'), 'Andre sikkerhetsheadere er satt');
  const nf = await fetch(`${BASE}/finnes-ikke/`);
  ok(nf.status === 404 && (await nf.text()).includes('Klippet bort'), 'Egen 404-side');
}

// ─── Nettleser: bestillingsskjemaet fra start til slutt ────────────────────
console.log('── Nettleser (Playwright) ──');
try {
  const require = createRequire(import.meta.url);
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Turnstile kan ikke lastes i et lukket testmiljø – vi etterligner Cloudflares testwidget.
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `window.turnstile={render:(el,o)=>{setTimeout(()=>o.callback('${TOKEN}'),50);return 'w1'},reset(){},getResponse(){return '${TOKEN}'},remove(){}};`,
    }),
  );
  await page.goto(`${BASE}/bestill/?pakke=standard`);
  await page.locator('form[data-order-form].is-enhanced').waitFor();
  ok(await page.locator('input[name="package"][value="standard"]').isChecked(), 'Pakke forhåndsvelges fra lenken (?pakke=standard)');
  await page.getByRole('button', { name: 'Neste' }).click();
  await page.getByRole('button', { name: 'Neste' }).click();
  ok(await page.locator('#b-business_name-error').textContent().then((t) => !!t?.trim()), 'Validering per steg viser feil ved tomt felt');
  ok((await page.locator('#b-business_name').getAttribute('aria-invalid')) === 'true', 'Feltet markeres med aria-invalid');
  await page.fill('#b-business_name', `Nettleserkafé ${runId}`);
  await page.selectOption('#b-industry', 'kafe');
  await page.selectOption('#b-employees', '1-5');
  await page.locator('label.choice', { hasText: 'Snarøya' }).click();
  await page.getByRole('button', { name: 'Neste' }).click();
  await page.locator('label.choice', { hasText: 'Mat og drikke' }).click();
  await page.fill('#b-message', 'Nye kanelboller hver fredag.');
  await page.getByRole('button', { name: 'Neste' }).click();
  await page.fill('#b-contact_name', 'Nora Nettleser');
  await page.fill('#b-email', 'nora@example.com');
  await page.locator('label.choice', { hasText: 'E-post' }).click();
  await page.getByRole('button', { name: 'Neste' }).click();
  ok(await page.locator('[data-summary]').textContent().then((t) => t?.includes(`Nettleserkafé ${runId}`) && t.includes('Standard')), 'Oppsummeringen viser det som er fylt ut');
  await page.getByRole('button', { name: 'Send bestilling' }).click();
  ok(await page.locator('#b-consent-error').textContent().then((t) => !!t?.trim()), 'Samtykke kreves før innsending');
  await page.check('#b-consent');
  await page.getByRole('button', { name: 'Send bestilling' }).click();
  await page.waitForURL(/\/bestill\/takk\/\?ref=AFA-/, { timeout: 15000 });
  ok(await page.locator('[data-ref]').textContent().then((t) => /^AFA-/.test(t ?? '')), 'Bekreftelsessiden viser referansen');

  // Vurdering i nettleseren
  await page.goto(`${BASE}/vurderinger/`);
  await page.locator('label[for="v-star-4"]').click();
  await page.fill('#v-text', `Fine klipp og god dialog. ${runId}-b`);
  await page.check('#v-consent');
  await page.getByRole('button', { name: 'Send vurdering' }).click();
  await page.locator('[data-form-success]').waitFor({ state: 'visible', timeout: 15000 });
  ok(true, 'Vurderingsskjemaet viser takk-melding etter innsending');

  // Admin i nettleseren
  await page.goto(`${BASE}/admin/`);
  await page.fill('#pw', PASSWORD);
  await page.getByRole('button', { name: 'Logg inn' }).click();
  await page.locator('[data-app]').waitFor({ state: 'visible' });
  await page.getByText(`Nettleserkafé ${runId}`).first().waitFor({ timeout: 10000 }).catch(() => undefined);
  ok(await page.getByText(`Nettleserkafé ${runId}`).first().isVisible(), 'Admin viser bestillingen fra nettleseren');
  await page.getByRole('tab', { name: /Vurderinger/ }).click();
  const card = page.locator('.a-item', { hasText: `${runId}-b` });
  await card.getByRole('button', { name: 'Godkjenn' }).click();
  const approved = page.locator('.a-item', { hasText: `${runId}-b` }).getByText('Godkjent');
  await approved.waitFor({ timeout: 10000 }).catch(() => undefined);
  ok(await approved.isVisible(), 'Vurderingen godkjennes fra admin-grensesnittet');
  ok(errors.length === 0, 'Ingen JavaScript-feil i nettleseren', errors.join('\n'));
  await browser.close();
} catch (err) {
  ok(false, 'Nettlesertest kjørte', String(err));
}

console.log(failures ? `\n${failures} test(er) feilet.` : '\nAlle tester bestått.');
process.exit(failures ? 1 : 0);
