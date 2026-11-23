# TODO – dette må gruppen gjøre før publisering

Nesten alt dere skal endre ligger i **`src/config/site.ts`** (tekster, priser, kontaktinfo, team, FAQ)
og **`src/config/images.ts`** (bilder). Kjør `npm run check:config` for å se hva som gjenstår.

Kryss av etter hvert: `- [x]`.

---

## 1. Bestemmelser gruppen må ta

- [ ] **Priser og pakkeinnhold.** Standard og Plus viser nå «Pris på forespørsel». Sett `price` (f.eks. `2490`) i `site.packages`, og sjekk punktlistene (`features`) og sammenligningstabellen (`site.comparison`). Hvor mange reels og bilder gir Plus?
- [ ] **«Anbefalt»-merket** på Standard. Bytt til «Mest populær» (`badge`) først når det faktisk stemmer – vi har ingen kunder ennå.
- [ ] **Leveringstid.** Nå står det «innen fem virkedager etter filming» (`site.deliveryTime`). Klarer vi det?
- [ ] **Endringer og avbestilling.** Bekreft svarene i `site.termsFaq` (én endringsrunde, 24 timers varsel, oppsigelse ved månedsslutt).
- [ ] **Vilkår** (`src/pages/vilkar.astro`): gå gjennom alle punktene, særlig betaling, musikk og ansvar. Fjern «Utkast»-merket (`draft`) når dere er enige.
- [ ] **Personvern** (`src/pages/personvern.astro`): gå gjennom sammen med ansvarlig lærer. Hvem er formelt behandlingsansvarlig – elevbedriften eller skolen? Fjern «Utkast»-merket når den er godkjent.
- [ ] **Fakturering.** Hvordan tar elevbedriften betalt (f.eks. via Ungt Entreprenørskap)? Oppdater punkt 9 i vilkårene.
- [ ] **Hvem er admin?** Bestem hvem som får admin-passordet og/eller Cloudflare Access, og hvem som sjekker nye bestillinger hver dag.
- [ ] **Domenenavn.** Skal dere ha eget domene (f.eks. `afavideos.no`), eller holder `afa-videos.pages.dev`?

## 2. Kontaktinformasjon (`src/config/site.ts`)

- [x] `contact.email` – satt til `aarsnesfilip@gmail.com`. Bytt hvis gruppen får en felles adresse (f.eks. på eget domene).
- [ ] `contact.phone` – valgfritt. Tomt felt skjules.
- [ ] `orgNumber` – hvis bedriften har organisasjonsnummer. Tomt felt skjules.
- [ ] `social.instagram`, `social.tiktok`, `social.facebook` – hele lenker. Tomme felt skjules.
- [ ] `url` – endelig nettadresse. Styrer sitemap, delingsbilder og **QR-koden**.

## 3. Teamet (`site.team` i `src/config/site.ts`)

- [ ] Navn, rolle og én setning for hver person. Nå står det «Navn kommer».
- [ ] Portrettbilder: lagre i `src/assets/team/` (f.eks. `ola.jpg`) og skriv filnavnet i `image`.
  Format **4:5 stående**, minst **800 × 1000 px**, samme bakgrunn og lys for alle.
- [ ] Flere eller færre personer? Kopier eller slett et av objektene i listen.
- [ ] **Samtykke:** Dere er under 18. Snakk med foresatte og lærer før dere bruker fullt navn og bilde på nettet. Bare fornavn er helt greit.

## 4. Bilder (`src/assets/photos/`)

Lagre bildene med **nøyaktig disse filnavnene**, så dukker de opp automatisk ved neste bygg.
Siden lager selv AVIF/WebP i riktige størrelser – dere trenger bare å levere én god JPG.
Til da vises pene plassholdere i riktig format.

| Filnavn | Hva bildet skal vise | Format | Størrelse |
| --- | --- | --- | --- |
| `hero.jpg` | Over skulderen på en som filmer med mobil i en kafé eller et bakeri. Varmt lys, ingen synlige logoer. Hold motivet midt i bildet – det beskjæres litt på store skjermer. | 4:5 (stående) | minst 1600 × 2000 px |
| `tjeneste-reels.jpg` | Nærbilde av hender som filmer vertikalt med mobil, gjerne i en salong eller butikk. | 4:5 (stående) | minst 1200 × 1500 px |
| `tjeneste-bilder.jpg` | Mat, produkter eller håndverk på nært hold, i dagslys. | 4:5 (stående) | minst 1200 × 1500 px |
| `tjeneste-lokalt.jpg` | Sjø, brygger eller lys på Fornebu, Snarøya eller Lysaker. Gjerne kveldslys. | 4:5 (stående) | minst 1200 × 1500 px |
| `gruppen.jpg` | Hele gruppen sammen, utendørs på Fornebu. Naturlig, ikke oppstilt. **Gruppens eget bilde.** | 4:5 (stående) | minst 1600 × 2000 px |
| `filming.jpg` | En fra gruppen filmer i en salong, et treningssenter eller en butikk. **Gruppens eget bilde.** | 4:5 (stående) | minst 1600 × 2000 px |
| `skjerm-filming.jpg` | Det kameraet ser når vi filmer: en barista, frisør eller trener i arbeid. Vises inne i telefonrammen. | 9:16 (stående) | minst 900 × 1600 px |
| `skjerm-innlegg.jpg` | Et ferdig, redigert bilde av et produkt eller en rett. Vises inne i telefonrammen. | 9:16 (stående) | minst 900 × 1600 px |

**Regler for bildene**

- Ta bildene selv, eller bruk frie bilder fra Unsplash/Pexels. Skriv i så fall fotograf og lenke i `public/images/CREDITS.md`.
- **Aldri** stockbilder av personer som om det var oss.
- Ingen synlige logoer, merkevarer eller kjente personer. Spør alltid før dere tar bilde av noen, og få skriftlig ja fra bedriften.
- JPG, sRGB, helst under 8 MB. Ta bildene i dagslys og hold mobilen stødig.
- Oppdater **alt-teksten** (`alt`) i `src/config/images.ts` så den beskriver det som faktisk er på bildet.

## 5. Portefølje (`src/content/portfolio/`)

- [ ] Når dere har laget noe for en bedrift **og fått lov** til å vise det: følg `src/content/portfolio/_LES-MEG.md`.
  Forsidebilde 9:16 (1080 × 1920 px) i `src/content/portfolio/media/`, video (MP4, H.264, 9:16, maks ca. 8 MB) i `public/portfolio/`.
- [ ] Tomme plasser og tomme tilstander forsvinner av seg selv når det første klippet er lagt inn.

## 6. Teknisk oppsett (se DEPLOY.md)

Allerede gjort (23. november 2026):

- [x] Cloudflare-konto og API-nøkkel.
- [x] D1-database `afa-videos`, lagret i EU, med tabeller. `database_id` står i `wrangler.toml`.
- [x] Pages-prosjektet `afa-videos` (https://afa-videos.pages.dev), koblet til GitHub – publiseres automatisk ved push til `main`.
- [x] Turnstile-widgeten «AFA Videos» med ekte nøkler. Site key i `site.ts`, `TURNSTILE_SECRET` som secret.
- [x] Secrets `ADMIN_SESSION_SECRET` og `RATE_LIMIT_SALT`.

Gjenstår:

- [ ] **`ADMIN_PASSWORD`** – settes av dere selv, se DEPLOY.md steg 7. Uten den er admin stengt.
- [ ] Cloudflare Access for `/admin` (anbefalt, steg 11).
- [ ] **E-postvarsling** (valgfritt): `RESEND_API_KEY`, `NOTIFY_EMAIL` og `MAIL_FROM` (steg 9). Uten dette må dere sjekke admin jevnlig.
- [ ] Eget domene (valgfritt, steg 10). Husk å legge domenet til i Turnstile-widgeten.
- [ ] Besøksstatistikk uten informasjonskapsler (valgfritt, steg 12).
- [ ] Slett API-nøkkelen «AFA-oppsett» (eller fjern rettighetene) når oppsettet er ferdig, hvis dere ikke trenger den mer.

## 7. Etter lansering

- [ ] Send en testbestilling, en testvurdering og en kontaktmelding på den ekte siden. Slett dem i admin etterpå.
- [ ] Skriv ut QR-koden til flyers: `https://<deres-adresse>/qr.png` (1200 px) eller `/qr.svg` (skalerbar).
- [ ] Legg inn siden i Google Search Console og send inn `sitemap-index.xml`.
- [ ] Sjekk admin minst én gang i uken. Bruk «Slett gamle data» i admin jevnlig (personvern: maks 12 måneder).
- [ ] Be fornøyde kunder om en vurdering på `/vurderinger/#skriv`.
