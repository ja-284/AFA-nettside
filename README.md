# AFA Videos – nettside

**https://afa-videos.pages.dev**

Nettsiden til **AFA Videos**: korte reels og bilder for lokale bedrifter på Fornebu, Snarøya og Lysaker,
laget av elever gjennom valgfaget «Utvikling av produkt og tjenester».

- **Astro 7** (statisk) + TypeScript + håndskrevet CSS med CSS-variabler
- **GSAP + ScrollTrigger** og **Lenis** for bevegelse (respekterer «redusert bevegelse», virker uten JavaScript)
- **Cloudflare Pages** + **Pages Functions** (`functions/`) + **D1** (database) + **Turnstile** (spamvern)
- Selvhostede skrifter, ingen informasjonskapsler, ingen sporing

## Kom i gang

```bash
npm install
cp .dev.vars.example .dev.vars
npm run build:local
npm run db:migrate:local
npm run preview          # http://localhost:8788  (admin: /admin/, passord i .dev.vars)
```

`npm run dev` gir rask forhåndsvisning på http://localhost:4321 uten skjemaer og database.

| Kommando | Hva den gjør |
| --- | --- |
| `npm run build` | Bygger siden til `dist/` og lager sikkerhetsheadere (CSP) – brukes av Cloudflare |
| `npm run build:local` | Som `build`, men med Turnstile-testnøkkel, for testing på egen maskin |
| `npm run preview` | Kjører siden med skjemaer og database lokalt (Wrangler) |
| `npm run check` | Typesjekk av Astro-filer og serverfunksjoner |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Tester skjemaer, admin, spamvern, CSV og headere (krever `npm run preview`) |
| `npm run screenshots` | Skjermbilder på 360/768/1280/1920 px + sjekk av overflyt og skjult innhold |
| `npm run check:links` | Sjekker interne lenker, alt-tekster og overskrifter i `dist/` |
| `npm run check:config` | Viser plassholdere som må fylles ut |
| `npm run icons` | Lager favicon og app-ikoner på nytt |
| `npm run deploy` | Bygger og publiserer til Cloudflare Pages |

## Hvor ligger hva?

```
src/config/site.ts        ← ALT innhold gruppen skal endre: tekster, priser, kontakt, team, FAQ
src/config/images.ts      ← bildeplasser (legg bildene i src/assets/photos/)
src/content/portfolio/    ← porteføljen (én fil per klipp, se _LES-MEG.md)
src/pages/                ← sidene
src/components/           ← gjenbrukbare komponenter (Button, Card, PhoneFrame, Marquee …)
src/styles/               ← designtokens og felles CSS
src/scripts/              ← JavaScript (animasjoner, skjemaer, admin)
src/lib/forms.ts          ← skjemavalidering (deles av nettleser og server)
functions/                ← API og serverlogikk (Cloudflare Pages Functions)
migrations/               ← databasetabeller (D1)
public/_headers           ← sikkerhetsheadere
```

- **Publisering:** se [DEPLOY.md](DEPLOY.md)
- **Det som gjenstår:** se [TODO.md](TODO.md)
