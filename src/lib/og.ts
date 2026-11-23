/** Lager delingsbilder (1200×630) ved bygging med Satori + Sharp. Ingen nettverkskall. */
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import sharp from 'sharp';
import { site } from '../config/site';

const require = createRequire(import.meta.url);
const font = (p: string) => readFile(require.resolve(p));

let fontsPromise: Promise<{ display: Buffer; body: Buffer }> | null = null;
const fonts = () =>
  (fontsPromise ??= Promise.all([
    font('@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff'),
    font('@fontsource/inter/files/inter-latin-500-normal.woff'),
  ]).then(([display, body]) => ({ display, body })));

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({ type, props: { style, children } });

export async function renderOg(title: string, subtitle: string): Promise<Buffer> {
  const { display, body } = await fonts();
  const tree = h(
    'div',
    {
      width: 1200,
      height: 630,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '64px 72px',
      backgroundColor: '#F7F4EF',
      backgroundImage:
        'radial-gradient(circle at 92% 8%, rgba(27,138,156,0.55) 0%, rgba(247,244,239,0) 42%), radial-gradient(circle at 8% 110%, rgba(233,169,43,0.5) 0%, rgba(247,244,239,0) 40%), radial-gradient(circle at 70% 120%, rgba(217,72,43,0.35) 0%, rgba(247,244,239,0) 35%)',
      fontFamily: 'Inter',
      color: '#0B2530',
    },
    [
      h('div', { display: 'flex', alignItems: 'center', gap: 18 }, [
        h('div', { width: 64, height: 64, borderRadius: 18, backgroundColor: '#0B2530', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }, [
          h('div', { width: 0, height: 0, borderTop: '14px solid transparent', borderBottom: '14px solid transparent', borderLeft: '22px solid #F7F4EF', marginLeft: 6 }),
          h('div', { position: 'absolute', top: 9, right: 9, width: 12, height: 12, borderRadius: 12, backgroundColor: '#D9482B' }),
        ]),
        h('div', { fontFamily: 'Bricolage', fontSize: 34, letterSpacing: -1 }, site.name),
      ]),
      h('div', { display: 'flex', flexDirection: 'column', gap: 22 }, [
        h('div', { fontFamily: 'Bricolage', fontSize: title.length > 26 ? 84 : 104, lineHeight: 0.95, letterSpacing: -4, textTransform: 'uppercase', maxWidth: 1000 }, title),
        h('div', { fontSize: 30, color: '#3E5761', maxWidth: 900, lineHeight: 1.35 }, subtitle),
      ]),
      h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 24, color: '#3E5761' }, [
        h('div', {}, site.areas.core.join(' · ')),
        h('div', { display: 'flex', padding: '12px 24px', borderRadius: 999, backgroundColor: '#C43D21', color: '#FFFFFF', fontSize: 24 }, 'Første prøve er gratis'),
      ]),
    ],
  );
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Bricolage', data: display, weight: 800, style: 'normal' },
      { name: 'Inter', data: body, weight: 500, style: 'normal' },
    ],
  });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
}
