import { escapeHtml, type Env } from './http';
import { site } from '../../src/config/site';

export interface PublicReview {
  id: number;
  rating: number;
  text: string;
  name: string | null;
  company: string | null;
  date: string;
}

export interface ReviewStats {
  count: number;
  average: number;
}

export async function getApprovedReviews(env: Env, limit = 50): Promise<{ reviews: PublicReview[]; stats: ReviewStats }> {
  const [list, agg] = await env.DB.batch([
    env.DB.prepare(
      `SELECT id, rating, text, name, company, COALESCE(approved_at, created_at) AS date
       FROM reviews WHERE status = 'godkjent' AND consent_publish = 1
       ORDER BY date DESC LIMIT ?1`,
    ).bind(limit),
    env.DB.prepare(
      `SELECT COUNT(*) AS count, AVG(rating) AS average FROM reviews WHERE status = 'godkjent' AND consent_publish = 1`,
    ),
  ]);
  const reviews = (list?.results ?? []) as unknown as PublicReview[];
  const row = (agg?.results?.[0] ?? { count: 0, average: 0 }) as { count: number; average: number | null };
  return { reviews, stats: { count: Number(row.count) || 0, average: Math.round((Number(row.average) || 0) * 10) / 10 } };
}

const dateFmt = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Oslo' });

export function starsHtml(rating: number): string {
  const stars = Array.from({ length: 5 }, (_, i) =>
    `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" class="${i < rating ? 'on' : 'off'}"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>`,
  ).join('');
  return `<span class="stars" role="img" aria-label="${rating} av 5 stjerner">${stars}</span>`;
}

/** HTML for ett vurderingskort. Klassene matcher stilene i src/styles/components.css. */
export function reviewCardHtml(r: PublicReview, tag: 'li' | 'div' = 'li'): string {
  const who = [r.name, r.company].filter(Boolean).map((s) => escapeHtml(String(s))).join(', ');
  const iso = escapeHtml(r.date);
  return `<${tag} class="review-card">
  <figure>
    ${starsHtml(r.rating)}
    <blockquote><p>${escapeHtml(r.text).replace(/\n+/g, '</p><p>')}</p></blockquote>
    <figcaption><span class="review-who">${who || 'Anonym kunde'}</span><time datetime="${iso}">${escapeHtml(dateFmt.format(new Date(r.date)))}</time></figcaption>
  </figure>
</${tag}>`;
}

export function statsHtml(stats: ReviewStats): string {
  const avg = stats.average.toLocaleString('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `<div class="review-stats">${starsHtml(Math.round(stats.average))}<p><strong>${avg}</strong> av 5 · basert på ${stats.count} ${stats.count === 1 ? 'vurdering' : 'vurderinger'}</p></div>`;
}

/** JSON-LD med AggregateRating – legges bare inn når det finnes ekte, godkjente vurderinger. */
export function aggregateJsonLd(reviews: PublicReview[], stats: ReviewStats): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${site.url}/#bedrift`,
    name: site.name,
    url: site.url,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: stats.average,
      reviewCount: stats.count,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.slice(0, 10).map((r) => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      author: { '@type': 'Person', name: r.name || 'Anonym kunde' },
      datePublished: r.date.slice(0, 10),
      reviewBody: r.text,
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

/**
 * Setter inn godkjente vurderinger i den statiske HTML-en (HTMLRewriter), slik at de
 * vises uten JavaScript og kan leses av søkemotorer. Faller tilbake til tom tilstand ved feil.
 */
export async function injectReviews(env: Env, response: Response, mode: 'home' | 'page'): Promise<Response> {
  const type = response.headers.get('Content-Type') ?? '';
  if (!response.ok || !type.includes('text/html')) return response;
  let data: Awaited<ReturnType<typeof getApprovedReviews>>;
  try {
    data = await getApprovedReviews(env, mode === 'home' ? 12 : 60);
  } catch (err) {
    console.error('Kunne ikke hente vurderinger', err);
    return response;
  }
  if (data.stats.count === 0) return response;

  const cards = data.reviews.map((r) => reviewCardHtml(r)).join('');
  const rewriter = new HTMLRewriter()
    .on('[data-reviews-list]', {
      element(el) {
        el.setInnerContent(cards, { html: true });
        el.removeAttribute('hidden');
      },
    })
    .on('[data-reviews-empty]', {
      element(el) {
        el.remove();
      },
    })
    .on('[data-reviews-stats]', {
      element(el) {
        el.setInnerContent(statsHtml(data.stats), { html: true });
        el.removeAttribute('hidden');
      },
    })
    .on('[data-reviews-has]', {
      element(el) {
        el.removeAttribute('hidden');
      },
    })
    .on('head', {
      element(el) {
        if (mode === 'page') el.append(aggregateJsonLd(data.reviews, data.stats), { html: true });
      },
    });
  const out = rewriter.transform(response);
  const headers = new Headers(out.headers);
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  headers.delete('ETag');
  return new Response(out.body, { status: out.status, headers });
}
