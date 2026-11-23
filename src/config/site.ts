/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AFA Videos – all innhold som gruppen skal kunne endre, samlet på ett sted.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Endre tekstene og verdiene her, og bygg siden på nytt (`npm run build`).
 *  Du trenger ikke røre noe annet i koden.
 *
 *  Verdier merket «TODO» er plassholdere som må byttes før publisering.
 *  Se TODO.md for hele listen. Kjør `npm run check:config` for å se hva som gjenstår.
 *
 *  Tips: Tomme felt ('') skjules automatisk på siden. Sett for eksempel
 *  `phone: ''` hvis dere ikke vil vise telefonnummer.
 */

export type PackageId = 'prove' | 'standard' | 'plus';

export interface Package {
  id: PackageId;
  name: string;
  /** Pris i kroner. `0` = gratis. `null` = vis `priceLabel` i stedet. */
  price: number | null;
  /** Vises når `price` er `null`, f.eks. «Pris på forespørsel». */
  priceLabel: string;
  /** F.eks. «per måned». Tom for engangspris. */
  unit: string;
  /** Vis «Fra» foran prisen. */
  priceFrom: boolean;
  tagline: string;
  features: string[];
  cta: string;
  /** Liten etikett på kortet, f.eks. «Anbefalt». Tom = ingen etikett. */
  badge: string;
  highlight: boolean;
}

export interface TeamMember {
  name: string;
  role: string;
  text: string;
  /** Filnavn i `src/assets/team/`, f.eks. 'ola.jpg'. Tom = nøytral plassholder. */
  image: string;
}

export interface Industry {
  id: string;
  /** Fullt navn, brukes i lister og skjema. */
  name: string;
  /** Kort navn i STORE BOKSTAVER i tekstbåndet. */
  short: string;
  /** Idéer til hva vi kan filme for denne bransjen. */
  ideas: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export const site = {
  name: 'AFA Videos',
  /** Kort slagord, brukes i bl.a. tittel og delingsbilder. */
  tagline: 'Korte videoer. Lokale historier.',
  /** Beskrivelse for søkemotorer og deling (ca. 150 tegn). */
  description:
    'Elever fra Fornebu som lager korte reels og bilder for lokale bedrifter på Fornebu, Snarøya og Lysaker. Første prøve er gratis. Ingen binding.',

  /** TODO: Endelig nettadresse (uten skråstrek til slutt). Brukes i sitemap, delingslenker og QR-kode. */
  url: 'https://afa-videos.pages.dev',

  lang: 'nb',
  locale: 'nb_NO',

  contact: {
    /** Gruppens e-postadresse. Vises på siden og brukes som svaradresse. */
    email: 'aarsnesfilip@gmail.com',
    /** TODO: Telefonnummer, f.eks. '+47 400 00 000'. Tom = skjules. */
    phone: '',
    /** Hvor raskt vi svarer – vises ved skjemaene. */
    responseTime: 'Vi svarer som regel innen to virkedager.',
    /** Brukes i strukturert data for søkemotorer. */
    locality: 'Fornebu',
    region: 'Bærum',
    country: 'NO',
  },

  /** Organisasjonsnummer, hvis bedriften har et. Tom = skjules. */
  orgNumber: '',

  /** Valgfaget vi driver bedriften gjennom. */
  course: 'Utvikling av produkt og tjenester',

  /** TODO: Lenker til sosiale medier. Tom = skjules. */
  social: {
    instagram: '',
    tiktok: '',
    facebook: '',
  },

  areas: {
    core: ['Fornebu', 'Snarøya', 'Lysaker'],
    later: 'Vi kan også ta oppdrag i resten av Bærum og i Oslo etter avtale.',
  },

  /** TODO (bekreftes): Hvor lang tid det tar fra filming til levering. */
  deliveryTime: 'innen fem virkedager etter filming',

  /** Hvor lenge vi tar vare på personopplysninger etter siste kontakt (måneder). */
  retentionMonths: 12,

  /** Gratis prøve – tallene brukes i tellerne på forsiden. */
  trial: {
    clips: 3,
    lengthMin: 15,
    lengthMax: 30,
  },

  packages: [
    {
      id: 'prove',
      name: 'Gratis prøve',
      price: 0,
      priceLabel: 'Gratis',
      unit: '',
      priceFrom: false,
      tagline: 'Se hva vi kan før dere bestemmer dere.',
      features: [
        '3 korte klipp på 15–30 sekunder',
        'Én filmøkt hos dere',
        'Ferdig redigert og klart til å legges ut',
        'Ingen forpliktelser etterpå',
      ],
      cta: 'Bestill gratis prøve',
      badge: '',
      highlight: false,
    },
    {
      id: 'standard',
      name: 'Standard',
      price: null, // TODO: f.eks. 2490
      priceLabel: 'Pris på forespørsel',
      unit: 'per måned',
      priceFrom: true,
      tagline: 'Jevnt påfyll til sosiale medier, hver måned.',
      features: [
        '6 reels i måneden',
        '15 redigerte bilder i måneden',
        'Vi filmer og fotograferer hos dere',
        'Dere bestemmer hva som vises',
        'Ingen binding',
      ],
      cta: 'Velg Standard',
      // «Mest populær» bør først brukes når det faktisk stemmer.
      badge: 'Anbefalt',
      highlight: true,
    },
    {
      id: 'plus',
      name: 'Plus',
      price: null, // TODO
      priceLabel: 'Pris på forespørsel',
      unit: 'per måned',
      priceFrom: true,
      tagline: 'For dere som vil vise mer, oftere.',
      features: [
        'Flere reels enn Standard',
        'Flere bilder enn Standard',
        'Mer tid på stedet',
        'Dere bestemmer hva som vises',
        'Ingen binding',
      ],
      cta: 'Velg Plus',
      badge: '',
      highlight: false,
    },
  ] satisfies Package[],

  /** Sammenligningstabell på «Tjenester og priser». */
  comparison: [
    { label: 'Reels', values: { prove: '3 klipp, én gang', standard: '6 i måneden', plus: 'Flere – avtales' } },
    { label: 'Bilder', values: { prove: '–', standard: '15 i måneden', plus: 'Flere – avtales' } },
    { label: 'Filming hos dere', values: { prove: 'Én økt', standard: 'Hver måned', plus: 'Mer tid på stedet' } },
    { label: 'Ferdig redigert', values: { prove: 'Ja', standard: 'Ja', plus: 'Ja' } },
    { label: 'Bindingstid', values: { prove: 'Ingen', standard: 'Ingen', plus: 'Ingen' } },
  ] satisfies { label: string; values: Record<PackageId, string> }[],

  /** TODO: Navn, roller, bilder og korte tekster for hver i gruppen. */
  team: [
    {
      name: 'Navn kommer',
      role: 'Daglig leder',
      text: 'Holder oversikten og passer på at vi leverer det vi har lovet, når vi har lovet det.',
      image: '',
    },
    {
      name: 'Navn kommer',
      role: 'Foto og film',
      text: 'Finner vinkelen, lyset og øyeblikket som får folk til å stoppe opp.',
      image: '',
    },
    {
      name: 'Navn kommer',
      role: 'Redigering',
      text: 'Klipper råopptak til korte, rytmiske reels med tekst som er lett å lese.',
      image: '',
    },
    {
      name: 'Navn kommer',
      role: 'Kunder og sosiale medier',
      text: 'Den du snakker med først. Følger med på hva som fungerer i feeden akkurat nå.',
      image: '',
    },
  ] satisfies TeamMember[],

  industries: [
    {
      id: 'kafe',
      name: 'Kafeer og restauranter',
      short: 'Kafeer',
      ideas: 'Ferske bakevarer, lunsjrushet og kokken som legger opp dagens rett.',
    },
    {
      id: 'frisor',
      name: 'Frisører og skjønnhet',
      short: 'Frisører',
      ideas: 'Før og etter, teknikk på nært hold og stemningen i salongen.',
    },
    {
      id: 'trening',
      name: 'Trening og helse',
      short: 'Trening',
      ideas: 'En øvelse forklart på 20 sekunder, timeplanen og folkene bak.',
    },
    {
      id: 'butikk',
      name: 'Butikker',
      short: 'Butikker',
      ideas: 'Nye varer, detaljene i produktene og tips fra de som jobber der.',
    },
    {
      id: 'kontor',
      name: 'Kontor og tjenester',
      short: 'Kontorer',
      ideas: 'Hvem dere er, hva dere gjør, og hvordan det er å jobbe hos dere.',
    },
    {
      id: 'klubb',
      name: 'Klubber og foreninger',
      short: 'Klubber',
      ideas: 'Treninger, dugnader, kamper og alle som får det til å gå rundt.',
    },
    {
      id: 'arrangement',
      name: 'Arrangementer',
      short: 'Arrangementer',
      ideas: 'Oppbygging, stemning og høydepunkter – klare til å deles samme uke.',
    },
  ] satisfies Industry[],

  /** Ofte stilte spørsmål på forsiden. */
  faq: [
    {
      q: 'Er den gratis prøven virkelig gratis?',
      a: 'Ja. Vi lager tre korte klipp for dere uten at det koster noe, og uten at dere forplikter dere til noe etterpå. Vi vil heller vise hva vi kan enn å love det.',
    },
    {
      q: 'Hva koster det etter prøven?',
      a: 'Det avhenger av hvor mye dere vil ha. Standard gir dere seks reels og femten bilder i måneden. Plus gir mer. Ta kontakt, så finner vi en pris som passer.',
    },
    {
      q: 'Er det bindingstid?',
      a: 'Nei. Dere kan stoppe når dere vil. Vi tror på å gjøre en så god jobb at dere vil fortsette.',
    },
    {
      q: 'Hva slags utstyr bruker dere?',
      a: 'Vi filmer med mobil – det samme formatet folk ser reels i – og redigerer alt selv. Det gjør oss raske og lite forstyrrende i lokalene deres.',
    },
    {
      q: 'Hvem eier videoene og bildene?',
      a: 'Dere får bruksrett til alt vi leverer, og kan bruke det på sosiale medier, nettsiden og i annen markedsføring. Vi viser ingenting i porteføljen vår uten at dere har sagt ja.',
    },
    {
      q: 'Må vi være med på videoene selv?',
      a: 'Bare hvis dere vil. Mange av de beste klippene viser produktene, maten eller lokalene. Vi spør alltid før vi filmer ansatte eller kunder.',
    },
    {
      q: 'Når kan dere filme?',
      a: 'Vi går på skolen, så vi filmer oftest ettermiddager og noen skoletimer etter avtale. Si hva som passer for dere, så finner vi et tidspunkt.',
    },
    {
      q: 'Hvilke områder dekker dere?',
      a: 'Fornebu, Snarøya og Lysaker. Vi kan også ta oppdrag i resten av Bærum og i Oslo etter avtale.',
    },
  ] satisfies FaqItem[],

  /**
   * Spørsmål om rettigheter, endringer og avbestilling (side «Tjenester og priser»).
   * UTKAST – gruppen må bekrefte vilkårene før publisering.
   */
  termsFaq: [
    {
      q: 'Hvem har rettighetene til materialet?',
      a: 'Dere får bruksrett til alle ferdige klipp og bilder vi leverer, til egen markedsføring – på sosiale medier, nettside, i nyhetsbrev og på trykk. Vi beholder retten til å vise arbeidet i porteføljen vår bare hvis dere har sagt ja til det.',
    },
    {
      q: 'Kan vi be om endringer?',
      a: 'Ja. Dere ser alt før det er ferdig. En runde med endringer per klipp er inkludert, for eksempel ny tekst, annen musikk eller et annet utsnitt. Større endringer avtaler vi.',
    },
    {
      q: 'Hva om vi må avlyse en filmøkt?',
      a: 'Gi beskjed så tidlig som mulig, helst minst 24 timer før. Da finner vi en ny dag uten at det koster noe.',
    },
    {
      q: 'Hvordan avslutter vi en månedlig avtale?',
      a: 'Send oss en e-post. Det er ingen binding. Avtalen stopper ved slutten av måneden dere sier opp i, og dere beholder alt vi har levert.',
    },
  ] satisfies FaqItem[],

  /** Delvis gjennomsiktig etikett på sider som er utkast. */
  draftNotice: 'Utkast – bekreftes av gruppen',

  /** Cloudflare Turnstile (spamvern). Den offentlige nøkkelen (site key) for afa-videos.pages.dev. */
  turnstile: {
    /**
     * Offentlig nøkkel – trygg å ha i koden. Den hemmelige nøkkelen ligger som secret i Cloudflare.
     * Lokalt (npm run dev / npm run build:local) brukes Cloudflares testnøkkel automatisk.
     * Får dere eget domene: legg det til under Hostnames på widgeten «AFA Videos» i Turnstile.
     */
    siteKey: '0x4AAAAAAGPQVJC6j6Fsp7_t',
  },

  /** Cloudflare Web Analytics – informasjonskapselfri statistikk. Av som standard. */
  analytics: {
    enabled: false,
    /** Token fra Cloudflare-dashbordet → Web Analytics. */
    token: '',
  },
};

export type Site = typeof site;

/** Formaterer en pakkepris for visning. */
export function formatPrice(p: Pick<Package, 'price' | 'priceLabel' | 'priceFrom'>): string {
  if (p.price === null) return p.priceLabel;
  if (p.price === 0) return p.priceLabel || 'Gratis';
  const kr = new Intl.NumberFormat('nb-NO').format(p.price);
  return `${p.priceFrom ? 'Fra ' : ''}${kr} kr`;
}

export const packageById = (id: string) => site.packages.find((p) => p.id === id);
