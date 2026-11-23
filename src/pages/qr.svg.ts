import type { APIRoute } from 'astro';
import QRCode from 'qrcode';
import { site } from '../config/site';

/** QR-kode (SVG) til nettsiden – for flyers og plakater. Adressen styres av `site.url`. */
export const GET: APIRoute = async () => {
  const svg = await QRCode.toString(`${site.url}/`, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: { dark: '#0B2530', light: '#FFFFFF' },
  });
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
