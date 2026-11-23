/**
 * Skjemadefinisjoner og validering som deles av nettleseren og serveren
 * (Cloudflare Pages Functions). Ingen avhengigheter til DOM eller Node.
 */
import { site } from '../config/site';

export interface Option {
  value: string;
  label: string;
}

export const orderPackages: Option[] = [
  ...site.packages.map((p) => ({ value: p.id, label: p.name })),
  { value: 'usikker', label: 'Vet ikke ennå' },
];

export const industries: Option[] = [
  ...site.industries.map((i) => ({ value: i.id, label: i.name })),
  { value: 'annet', label: 'Annet' },
];

export const areas: Option[] = [
  ...site.areas.core.map((a) => ({ value: a.toLowerCase(), label: a })),
  { value: 'annet', label: 'Annet sted' },
];

export const employeeRanges: Option[] = [
  { value: '1-5', label: '1–5' },
  { value: '6-20', label: '6–20' },
  { value: '21-50', label: '21–50' },
  { value: '50+', label: 'Over 50' },
];

export const wishes: Option[] = [
  { value: 'mat', label: 'Mat og drikke' },
  { value: 'lokaler', label: 'Lokalene' },
  { value: 'ansatte', label: 'Ansatte' },
  { value: 'arrangement', label: 'Et arrangement' },
  { value: 'produkter', label: 'Produkter' },
  { value: 'annet', label: 'Noe annet' },
];

export const startOptions: Option[] = [
  { value: 'snarest', label: 'Så snart som mulig' },
  { value: 'en-maned', label: 'I løpet av en måned' },
  { value: 'senere', label: 'Om en til tre måneder' },
  { value: 'usikker', label: 'Vet ikke ennå' },
];

export const contactPrefs: Option[] = [
  { value: 'epost', label: 'E-post' },
  { value: 'telefon', label: 'Telefon' },
  { value: 'sms', label: 'SMS' },
];

export const orderStatuses: Option[] = [
  { value: 'ny', label: 'Ny' },
  { value: 'kontaktet', label: 'Kontaktet' },
  { value: 'avtalt', label: 'Avtalt' },
  { value: 'ferdig', label: 'Ferdig' },
  { value: 'avslatt', label: 'Avslått' },
];

export const reviewStatuses: Option[] = [
  { value: 'venter', label: 'Venter' },
  { value: 'godkjent', label: 'Godkjent' },
  { value: 'skjult', label: 'Skjult' },
];

export const contactStatuses: Option[] = [
  { value: 'ny', label: 'Ny' },
  { value: 'besvart', label: 'Besvart' },
  { value: 'arkivert', label: 'Arkivert' },
];

export const labelOf = (list: Option[], value: string | null | undefined) =>
  list.find((o) => o.value === value)?.label ?? value ?? '';

// ─── Hjelpefunksjoner ────────────────────────────────────────────────────────

export type Errors = Record<string, string>;
export type Result<T> = { ok: true; data: T } | { ok: false; errors: Errors };

type Input = Record<string, unknown>;

/** Fjerner kontrolltegn, normaliserer mellomrom og kutter til maks lengde. */
export function clean(value: unknown, max = 500): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, max);
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const PHONE_RE = /^\+?[0-9 ()-]{8,20}$/;

export const isEmail = (v: string) => v.length <= 254 && EMAIL_RE.test(v);
export const isPhone = (v: string) => PHONE_RE.test(v) && v.replace(/\D/g, '').length >= 8;
const inList = (list: Option[], v: string) => list.some((o) => o.value === v);

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : typeof v === 'string' && v ? [v] : [];

const truthy = (v: unknown) => v === true || v === 'on' || v === 'true' || v === '1' || v === 1;

// ─── Bestilling ──────────────────────────────────────────────────────────────

export interface OrderData {
  package: string;
  business_name: string;
  industry: string;
  area: string;
  area_other: string;
  employees: string;
  web: string;
  wishes: string[];
  message: string;
  start_when: string;
  time_window: string;
  contact_name: string;
  email: string;
  phone: string;
  contact_pref: string;
  consent: boolean;
}

/** Felter per steg i bestillingsskjemaet, slik at klienten kan validere ett steg om gangen. */
export const orderSteps: (keyof OrderData)[][] = [
  ['package'],
  ['business_name', 'industry', 'area', 'area_other', 'employees', 'web'],
  ['wishes', 'message', 'start_when', 'time_window'],
  ['contact_name', 'email', 'phone', 'contact_pref'],
  ['consent'],
];

export function validateOrder(input: Input): Result<OrderData> {
  const d: OrderData = {
    package: clean(input.package, 20),
    business_name: clean(input.business_name, 120),
    industry: clean(input.industry, 20),
    area: clean(input.area, 20),
    area_other: clean(input.area_other, 80),
    employees: clean(input.employees, 10),
    web: clean(input.web, 200),
    wishes: [...new Set(asArray(input.wishes).map((w) => clean(w, 20)))].filter((w) => inList(wishes, w)),
    message: clean(input.message, 2000),
    start_when: clean(input.start_when, 20),
    time_window: clean(input.time_window, 200),
    contact_name: clean(input.contact_name, 120),
    email: clean(input.email, 254).toLowerCase(),
    phone: clean(input.phone, 30),
    contact_pref: clean(input.contact_pref, 20),
    consent: truthy(input.consent),
  };
  const e: Errors = {};

  if (!inList(orderPackages, d.package)) e.package = 'Velg en pakke, eller «Vet ikke ennå».';
  if (d.business_name.length < 2) e.business_name = 'Skriv navnet på bedriften.';
  if (!inList(industries, d.industry)) e.industry = 'Velg bransje.';
  if (!inList(areas, d.area)) e.area = 'Velg område.';
  if (d.area === 'annet' && d.area_other.length < 2) e.area_other = 'Skriv hvor bedriften holder til.';
  if (!inList(employeeRanges, d.employees)) e.employees = 'Velg omtrent hvor mange som jobber hos dere.';
  if (d.start_when && !inList(startOptions, d.start_when)) e.start_when = 'Velg et alternativ.';
  if (d.contact_name.length < 2) e.contact_name = 'Skriv navnet ditt.';
  if (!isEmail(d.email)) e.email = 'Skriv en gyldig e-postadresse, f.eks. navn@bedrift.no.';
  if (d.phone && !isPhone(d.phone)) e.phone = 'Skriv et gyldig telefonnummer, f.eks. 400 00 000.';
  if (!inList(contactPrefs, d.contact_pref)) e.contact_pref = 'Velg hvordan vi skal kontakte deg.';
  else if (d.contact_pref !== 'epost' && !d.phone) e.phone = 'Skriv telefonnummeret ditt, så kan vi ringe eller sende SMS.';
  if (!d.consent) e.consent = 'Du må godta at vi lagrer opplysningene for å kunne svare deg.';

  return Object.keys(e).length ? { ok: false, errors: e } : { ok: true, data: d };
}

// ─── Vurdering ───────────────────────────────────────────────────────────────

export interface ReviewData {
  rating: number;
  text: string;
  name: string;
  company: string;
  consent: boolean;
}

export function validateReview(input: Input): Result<ReviewData> {
  const rating = Number.parseInt(String(input.rating ?? ''), 10);
  const d: ReviewData = {
    rating,
    text: clean(input.text, 1000),
    name: clean(input.name, 80),
    company: clean(input.company, 120),
    consent: truthy(input.consent),
  };
  const e: Errors = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) e.rating = 'Velg fra én til fem stjerner.';
  if (d.text.length < 10) e.text = 'Skriv litt mer – minst 10 tegn.';
  if (!d.consent) e.consent = 'Du må samtykke til at vurderingen kan publiseres.';
  return Object.keys(e).length ? { ok: false, errors: e } : { ok: true, data: d };
}

// ─── Kontakt ─────────────────────────────────────────────────────────────────

export interface ContactData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export function validateContact(input: Input): Result<ContactData> {
  const d: ContactData = {
    name: clean(input.name, 120),
    email: clean(input.email, 254).toLowerCase(),
    phone: clean(input.phone, 30),
    message: clean(input.message, 3000),
  };
  const e: Errors = {};
  if (d.name.length < 2) e.name = 'Skriv navnet ditt.';
  if (!isEmail(d.email)) e.email = 'Skriv en gyldig e-postadresse, f.eks. navn@bedrift.no.';
  if (d.phone && !isPhone(d.phone)) e.phone = 'Skriv et gyldig telefonnummer, f.eks. 400 00 000.';
  if (d.message.length < 5) e.message = 'Skriv en kort melding.';
  return Object.keys(e).length ? { ok: false, errors: e } : { ok: true, data: d };
}

/** Navnet på det skjulte honningkrukke-feltet. Ekte brukere fyller det aldri ut. */
export const HONEYPOT = 'company_website';
