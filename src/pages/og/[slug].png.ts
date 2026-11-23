import type { APIRoute, GetStaticPaths } from 'astro';
import { renderOg } from '../../lib/og';
import { site } from '../../config/site';

const pages = {
  hjem: ['Dere er gode på noe. Vi filmer det.', 'Reels og bilder for lokale bedrifter, laget av elever på Fornebu.'],
  'om-oss': ['Unge, lokale og nysgjerrige', `Møt gruppen bak ${site.name}.`],
  tjenester: ['Reels, bilder og null binding', 'Start med en gratis prøve på tre klipp.'],
  eksempler: ['Det vi har laget', 'Korte klipp og bilder for bedrifter i nabolaget.'],
  bestill: ['La oss komme i gang', 'Fem korte steg. Første prøve er gratis.'],
  vurderinger: ['Hva kundene sier', 'Ekte vurderinger fra ekte kunder.'],
  kontakt: ['Si hei', site.contact.responseTime],
  personvern: ['Personvern', 'Ingen sporing. Bare det du selv sender oss.'],
  vilkar: ['Vilkår', 'Gratis prøve, ingen binding og klare rettigheter.'],
} as const;

export const getStaticPaths = (() => Object.keys(pages).map((slug) => ({ params: { slug } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const [title, subtitle] = pages[params.slug as keyof typeof pages];
  const png = await renderOg(title, subtitle);
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
