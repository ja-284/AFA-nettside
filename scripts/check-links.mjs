// Sjekker at alle interne lenker, bilder og skript i dist/ peker på filer som finnes,
// at alle <img> har alt-attributt, og at hver side har én <h1>. Kjør etter `npm run build`.
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const API_ROUTES = ['/api/orders', '/api/reviews', '/api/contact'];
async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}
const resolves = (url) => {
  const path = decodeURIComponent(url.split(/[?#]/)[0]);
  if (!path || API_ROUTES.includes(path) || path.startsWith('/api/admin/')) return true;
  const f = join(DIST, path);
  return existsSync(f) && !path.endsWith('/') ? true : existsSync(join(f, 'index.html'));
};

let problems = 0;
let checked = 0;
for await (const file of walk(DIST)) {
  if (!file.endsWith('.html')) continue;
  const html = await readFile(file, 'utf8');
  const page = file.slice(DIST.length).replace(/index\.html$/, '');
  for (const m of html.matchAll(/\s(?:href|src|poster|action)=["']([^"']+)["']/g)) {
    const url = m[1];
    if (!url.startsWith('/') || url.startsWith('//')) continue;
    checked++;
    if (!resolves(url)) {
      problems++;
      console.log(`✗ ${page}: brutt lenke ${url}`);
    }
  }
  for (const m of html.matchAll(/\ssrcset=["']([^"']+)["']/g)) {
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (url?.startsWith('/') && !resolves(url)) {
        problems++;
        console.log(`✗ ${page}: brutt srcset ${url}`);
      }
    }
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt=/.test(m[0])) {
      problems++;
      console.log(`✗ ${page}: <img> uten alt: ${m[0].slice(0, 80)}`);
    }
  }
  const h1 = (html.match(/<h1\b/g) ?? []).length;
  if (h1 !== 1) {
    problems++;
    console.log(`✗ ${page}: ${h1} <h1>-elementer (skal være 1)`);
  }
  for (const m of html.matchAll(/\shref="#([^"]+)"/g)) {
    if (!new RegExp(`\\sid=["']${m[1]}["']`).test(html)) {
      problems++;
      console.log(`✗ ${page}: ankerlenke #${m[1]} mangler mål`);
    }
  }
}
console.log(problems ? `${problems} problem(er) funnet (${checked} lenker sjekket).` : `Alle ${checked} interne lenker virker, alle bilder har alt, alle sider har én h1.`);
process.exit(problems ? 1 : 0);
