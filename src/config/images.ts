/**
 * Bildeplasser på nettsiden.
 *
 * Slik legger dere inn et ekte bilde:
 *   1. Ta bildet (se `subject`, format og størrelse under – og bildelisten i TODO.md).
 *   2. Lagre det i `src/assets/photos/` med nøyaktig filnavnet i `file`.
 *   3. Bygg siden på nytt. Bildet blir automatisk komprimert til AVIF/WebP i flere størrelser.
 *
 * Finnes ikke filen, vises en pen plassholder i riktig format.
 * Bruk aldri stockbilder av personer som om det var oss, og unngå synlige logoer og kjente personer.
 */

export type Tone = 'warm' | 'sea' | 'mint' | 'sun' | 'night';

export interface ImageSlot {
  file: string;
  alt: string;
  /** Hva bildet bør vise – brukes i TODO.md og som hjelpetekst. */
  subject: string;
  /** Bredde:høyde, f.eks. '4:5'. */
  ratio: string;
  /** Anbefalt minste bredde i piksler for originalfilen. */
  minWidth: number;
  /** Farge på plassholderen. */
  tone: Tone;
}

export const images = {
  hero: {
    file: 'hero.jpg',
    alt: 'En mobil som filmer en kafédisk med ferske bakevarer i morgenlys',
    subject: 'Over skulderen på en som filmer med mobil i en kafé eller et bakeri. Varmt lys, ingen synlige logoer. Hold motivet midt i bildet – det beskjæres litt på store skjermer.',
    ratio: '4:5',
    minWidth: 1600,
    tone: 'warm',
  },
  reels: {
    file: 'tjeneste-reels.jpg',
    alt: 'Hender som holder en mobil vertikalt og filmer',
    subject: 'Nærbilde av hender som filmer vertikalt med mobil, gjerne i en salong eller butikk.',
    ratio: '4:5',
    minWidth: 1200,
    tone: 'sea',
  },
  photos: {
    file: 'tjeneste-bilder.jpg',
    alt: 'Nærbilde av en nylaget rett servert på et bord',
    subject: 'Mat, produkter eller håndverk på nært hold, i dagslys.',
    ratio: '4:5',
    minWidth: 1200,
    tone: 'sun',
  },
  local: {
    file: 'tjeneste-lokalt.jpg',
    alt: 'Brygge ved Oslofjorden på Snarøya i kveldslys',
    subject: 'Sjø, brygger eller lys på Fornebu, Snarøya eller Lysaker. Gjerne kveldslys.',
    ratio: '4:5',
    minWidth: 1200,
    tone: 'mint',
  },
  group: {
    file: 'gruppen.jpg',
    alt: 'Gruppen bak AFA Videos samlet utendørs på Fornebu',
    subject: 'Hele gruppen sammen, utendørs på Fornebu. Naturlig, ikke oppstilt. (Gruppens eget bilde.)',
    ratio: '4:5',
    minWidth: 1600,
    tone: 'sea',
  },
  filming: {
    file: 'filming.jpg',
    alt: 'En fra gruppen filmer en frisør i arbeid',
    subject: 'En fra gruppen filmer i en salong, et treningssenter eller en butikk. (Gruppens eget bilde.)',
    ratio: '4:5',
    minWidth: 1600,
    tone: 'warm',
  },
  screenFilm: {
    file: 'skjerm-filming.jpg',
    alt: 'Utsikt gjennom mobilkameraet mot en barista som lager kaffe',
    subject: 'Det kameraet ser når vi filmer: en barista, frisør eller trener i arbeid. Stående format.',
    ratio: '9:16',
    minWidth: 900,
    tone: 'warm',
  },
  screenPost: {
    file: 'skjerm-innlegg.jpg',
    alt: 'Et ferdig bilde av en kanelbolle, klart til å legges ut',
    subject: 'Et ferdig, redigert bilde av et produkt eller en rett. Stående format.',
    ratio: '9:16',
    minWidth: 900,
    tone: 'sun',
  },
} satisfies Record<string, ImageSlot>;

export type ImageKey = keyof typeof images;
