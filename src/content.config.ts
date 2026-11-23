import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { site } from './config/site';

const categories: [string, ...string[]] = ['annet', ...site.industries.map((i) => i.id)];

/**
 * Portefølje: én fil per klipp eller bilde i src/content/portfolio/.
 * Se src/content/portfolio/_LES-MEG.md for mal og forklaring.
 * Filer som starter med «_» blir ikke publisert.
 */
const portfolio = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,yaml,yml,json}', base: './src/content/portfolio' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      business: z.string(),
      category: z.enum(categories),
      type: z.enum(['video', 'bilde']),
      /** Bildet (for type «bilde»), eller forsidebilde/poster for video. Sti relativt til filen. */
      image: image(),
      /** Videofil i public/portfolio/, f.eks. «/portfolio/kafe-lunsj.mp4». Bare for type «video». */
      video: z.string().startsWith('/portfolio/').optional(),
      date: z.coerce.date(),
      description: z.string().optional(),
      /** Vises først. */
      featured: z.boolean().default(false),
      /** Må være true: bedriften har sagt ja til at vi viser arbeidet. */
      permission: z.literal(true),
    }),
});

export const collections = { portfolio };
