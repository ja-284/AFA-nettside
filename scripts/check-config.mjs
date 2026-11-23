// Viser hvilke plassholdere som fortsatt står i konfigurasjonen. Kjør: npm run check:config
import { existsSync, readFileSync } from 'node:fs';
import { site } from '../src/config/site.ts';
import { images } from '../src/config/images.ts';

const todo = [];
const add = (msg) => todo.push(msg);

if (site.url.endsWith('.pages.dev')) add(`Nettadresse er ${site.url} – bytt hvis dere får eget domene (site.url).`);
if (site.contact.email.endsWith('example.com')) add('E-postadressen er en plassholder (site.contact.email).');
if (!site.contact.phone) add('Telefonnummer er ikke satt (valgfritt, site.contact.phone).');
if (!Object.values(site.social).some(Boolean)) add('Ingen lenker til sosiale medier (site.social).');
for (const p of site.packages) if (p.price === null) add(`Pris for «${p.name}» er ikke satt – viser «${p.priceLabel}».`);
const unnamed = site.team.filter((m) => /navn kommer/i.test(m.name)).length;
if (unnamed) add(`${unnamed} i teamet mangler navn (site.team).`);
const noPhoto = site.team.filter((m) => !m.image).length;
if (noPhoto) add(`${noPhoto} i teamet mangler bilde (src/assets/team/).`);
if (site.turnstile.siteKey.startsWith('1x0000')) add('Turnstile bruker testnøkkel (site.turnstile.siteKey).');
const missing = Object.entries(images).filter(([, s]) => !existsSync(`src/assets/photos/${s.file}`));
if (missing.length) add(`${missing.length} av ${Object.keys(images).length} bilder mangler: ${missing.map(([, s]) => s.file).join(', ')}`);
if (readFileSync('wrangler.toml', 'utf8').includes('00000000-0000-0000-0000-000000000000')) add('database_id i wrangler.toml er en plassholder.');

console.log(todo.length ? `Gjenstår (${todo.length}):\n${todo.map((t) => `  • ${t}`).join('\n')}\n\nSe TODO.md for detaljer.` : 'Alt er fylt ut. 🎉');
