// Lager favicon og app-ikoner i public/ fra logoen. Kjør: npm run icons
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const mark = (size, { pad = 0, radius = 18 } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-pad} ${-pad} ${64 + pad * 2} ${64 + pad * 2}">
  ${pad ? `<rect x="${-pad}" y="${-pad}" width="${64 + pad * 2}" height="${64 + pad * 2}" fill="#0B2530"/>` : ''}
  <rect width="64" height="64" rx="${radius}" fill="#0B2530"/>
  <path d="M25 20.6v22.8a2 2 0 0 0 3 1.7l18.6-11.4a2 2 0 0 0 0-3.4L28 18.9a2 2 0 0 0-3 1.7z" fill="#F7F4EF"/>
  <circle cx="47.5" cy="16.5" r="5.5" fill="#D9482B"/>
</svg>`;

const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

/** ICO-fil med PNG-innhold (støttes av alle moderne nettlesere). */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

const svg = mark(64);
await writeFile('public/favicon.svg', svg);
const p16 = await png(mark(64, { radius: 14 }), 16);
const p32 = await png(mark(64, { radius: 14 }), 32);
await writeFile('public/favicon.ico', ico([{ size: 16, data: p16 }, { size: 32, data: p32 }]));
await writeFile('public/apple-touch-icon.png', await png(mark(180, { pad: 6, radius: 0 }), 180));
await writeFile('public/icon-192.png', await png(svg, 192));
await writeFile('public/icon-512.png', await png(svg, 512));
await writeFile('public/icon-maskable-512.png', await png(mark(512, { pad: 14, radius: 0 }), 512));
console.log('Ikoner laget i public/');
