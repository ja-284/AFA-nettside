import type { APIRoute } from 'astro';
import QRCode from 'qrcode';
import { site } from '../config/site';

/** QR-kode (PNG, 1200 px) til nettsiden – klar for utskrift. */
export const GET: APIRoute = async () => {
  const png = await QRCode.toBuffer(`${site.url}/`, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 1200,
    color: { dark: '#0B2530', light: '#FFFFFF' },
  });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
