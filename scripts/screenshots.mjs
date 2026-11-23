// Tar skjermbilder av sidene på mobil og desktop, og sjekker horisontal scroll og skjult innhold.
// Kjør mens `npm run preview` går: npm run screenshots   (bilder havner i reports/screenshots/)
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL ?? 'http://localhost:8788';
const OUT = process.env.OUT ?? 'reports/screenshots';
const pages = (process.env.PAGES ?? '/,/om-oss/,/tjenester/,/eksempler/,/bestill/,/vurderinger/,/kontakt/,/personvern/,/vilkar/,/bestill/takk/,/finnes-ikke/').split(',');
const widths = (process.env.WIDTHS ?? '360,768,1280,1920').split(',').map(Number);
const shoot = process.env.SHOOT !== '0';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
let problems = 0;
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 800 ? 800 : 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // Nettverksfeil mot Turnstile (blokkert i testmiljøet) og 404 for testsiden /finnes-ikke/ er forventet.
  page.on('requestfailed', (r) => !r.url().includes('challenges.cloudflare.com') && errors.push(`Feilet: ${r.url()}`));
  page.on('response', (r) => r.status() >= 400 && !r.url().includes('/finnes-ikke/') && errors.push(`${r.status()}: ${r.url()}`));
  for (const path of pages) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    // Scroll gjennom siden så alle «reveal»-elementer vises.
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    const overflow = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const offenders = [...document.querySelectorAll('body *')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.right <= w + 1) return false;
          // Elementer inne i scrollbare/klippede beholdere er ok.
          let p = el.parentElement;
          while (p && p !== document.body) {
            const s = getComputedStyle(p);
            if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return false;
            p = p.parentElement;
          }
          return true;
        })
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`);
      return { scroll: document.documentElement.scrollWidth > w, offenders };
    });
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('[data-reveal]')].filter((el) => getComputedStyle(el).opacity === '0').length,
    );
    const name = `${path.replace(/\//g, '_').replace(/^_|_$/g, '') || 'hjem'}-${width}`;
    if (overflow.scroll || overflow.offenders.length) {
      problems++;
      console.log(`✗ ${name}: horisontal overflyt ${overflow.offenders.join(', ')}`);
    }
    if (hidden) {
      problems++;
      console.log(`✗ ${name}: ${hidden} elementer er fortsatt usynlige`);
    }
    if (shoot) await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  }
  if (errors.length) {
    problems++;
    console.log(`✗ ${width}px: konsollfeil:\n  ${[...new Set(errors)].join('\n  ')}`);
  }
  await ctx.close();
}

// Uten JavaScript: alt innhold skal være synlig.
const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
const p = await noJs.newPage();
for (const path of pages) {
  await p.goto(BASE + path);
  await p.waitForTimeout(1600); // la CSS-animasjonene i toppen bli ferdige
  const invisible = await p.evaluate(() =>
    [...document.querySelectorAll('main h1, main h2, main p, main li')].filter((el) => {
      const s = getComputedStyle(el);
      return el.getClientRects().length && (s.opacity === '0' || s.visibility === 'hidden');
    }).length,
  );
  if (invisible) {
    problems++;
    console.log(`✗ Uten JS ${path}: ${invisible} usynlige tekstelementer`);
  }
}
if (shoot) {
  await p.goto(BASE + '/');
  await p.screenshot({ path: `${OUT}/uten-js-hjem-390.png`, fullPage: true });
}
await browser.close();
console.log(problems ? `${problems} problem(er) funnet.` : 'Ingen problemer funnet (overflyt, skjult innhold, konsollfeil, uten JS).');
process.exit(problems ? 1 : 0);
