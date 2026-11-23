// Etter `astro build`: lag CSP med SHA-256-hasher for alle innebygde skript, og sjekk at bygget er komplett.
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const hashes = new Set();
const externalScripts = new Set();
let pages = 0;
for await (const file of walk(DIST)) {
  if (!file.endsWith('.html')) continue;
  pages++;
  const html = await readFile(file, 'utf8');
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1];
    const body = m[2];
    const src = /\bsrc=["']([^"']+)["']/i.exec(attrs)?.[1];
    if (src) {
      if (/^https?:\/\//.test(src)) externalScripts.add(new URL(src).origin);
      continue;
    }
    const type = /\btype=["']([^"']+)["']/i.exec(attrs)?.[1] ?? '';
    if (type && !/^(module|text\/javascript|application\/javascript)$/i.test(type)) continue; // JSON-LD o.l. kjøres ikke
    if (!body.trim()) continue;
    hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
}

const scriptSrc = ['https://challenges.cloudflare.com', ...externalScripts, ...[...hashes].sort()];
const connectSrc = [];
if (externalScripts.has('https://static.cloudflareinsights.com')) connectSrc.push('https://cloudflareinsights.com');

const headersPath = join(DIST, '_headers');
let headers = await readFile(headersPath, 'utf8');
headers = headers.replaceAll('__SCRIPT_SRC__', scriptSrc.join(' ')).replaceAll(' __CONNECT_SRC__', connectSrc.length ? ` ${connectSrc.join(' ')}` : '');
await writeFile(headersPath, headers);

console.log(`postbuild: ${pages} sider, ${hashes.size} innebygde skript i CSP, eksterne: ${[...externalScripts].join(', ') || 'ingen'}`);
