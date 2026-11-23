import { site, type FaqItem } from '../config/site';

export const abs = (path: string) => new URL(path, site.url).toString();

/** LocalBusiness/Organization. Ingen vurderinger her – de legges til på serveren når de finnes. */
export function businessLd() {
  const sameAs = Object.values(site.social).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${site.url}/#bedrift`,
    name: site.name,
    slogan: site.tagline,
    description: site.description,
    url: site.url,
    logo: abs('/icon-512.png'),
    image: abs('/og/hjem.png'),
    email: site.contact.email,
    ...(site.contact.phone ? { telephone: site.contact.phone } : {}),
    ...(site.orgNumber ? { vatID: site.orgNumber } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: site.contact.locality,
      addressRegion: site.contact.region,
      addressCountry: site.contact.country,
    },
    areaServed: site.areas.core.map((name) => ({ '@type': 'Place', name })),
    knowsLanguage: 'nb',
    priceRange: 'Gratis prøve',
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function breadcrumbLd(items: { name: string; href: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.href) })),
  };
}

export function faqLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

/** JSON trygt for <script type="application/ld+json">. */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
