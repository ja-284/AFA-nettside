# Publisering på Cloudflare – steg for steg

Denne oppskriften er skrevet for deg som ikke har gjort dette før. Følg stegene i rekkefølge.
Regn med 45–60 minutter første gang. Alt er gratis på Cloudflares gratisplan.

> **Kort fortalt:** Siden er statisk HTML (Astro) som ligger på **Cloudflare Pages**.
> Skjemaene sendes til små serverfunksjoner i mappen `functions/` (**Pages Functions**),
> som lagrer i en **D1**-database og bruker **Turnstile** som spamvern.

---

## 0. Dette trenger du

- En datamaskin med **Node.js 22** eller nyere (`node -v` i terminalen viser versjonen). Last ned fra <https://nodejs.org>.
- Prosjektmappen (denne mappen).
- En e-postadresse som gruppen har tilgang til.
- (Anbefalt) En **GitHub**-konto, hvis dere vil ha automatisk publisering.

Åpne en terminal i prosjektmappen og installer avhengighetene:

```bash
npm install
```

---

## 1. Opprett en Cloudflare-konto

1. Gå til <https://dash.cloudflare.com/sign-up> og lag en konto med gruppens e-post.
2. Bekreft e-posten.

## 2. Logg inn fra terminalen

```bash
npx wrangler login
```

Et nettleservindu åpnes. Trykk **Allow**. Sjekk at det virket:

```bash
npx wrangler whoami
```

## 3. Opprett databasen (D1)

Vi ber om at dataene lagres i EU:

```bash
npx wrangler d1 create afa-videos --jurisdiction=eu
```

Terminalen viser en `database_id` (en lang kode med bindestreker). **Kopier den** og lim den inn i
`wrangler.toml`, i stedet for `00000000-0000-0000-0000-000000000000`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "afa-videos"
database_id = "LIM-INN-ID-EN-HER"
migrations_dir = "migrations"
```

## 4. Lag tabellene i databasen

```bash
npm run db:migrate:remote
```

Svar «yes» hvis du blir spurt. Du skal se `0001_init.sql ✅`.

## 5. Sett opp spamvern (Turnstile)

1. I Cloudflare-dashbordet: **Turnstile** i menyen til venstre → **Add widget**.
2. Navn: `AFA Videos`. Under **Hostnames**: legg til `afa-videos.pages.dev` (og eget domene senere).
3. Widget mode: **Managed**. Trykk **Create**.
4. Du får to nøkler:
   - **Site key** (offentlig): lim den inn i `src/config/site.ts` under `turnstile.siteKey`.
   - **Secret key** (hemmelig): brukes i steg 7. **Aldri** legg den i koden.

> Lokalt brukes Cloudflares testnøkler, så du trenger ikke ekte nøkler for å teste på egen maskin.

## 6. Opprett Pages-prosjektet

Velg **én** av to måter. Dere kan ikke bytte senere uten å lage et nytt prosjekt.

### Alternativ A (anbefalt): Automatisk publisering fra GitHub

Hver gang dere endrer noe på GitHub, publiseres siden på nytt av seg selv.

1. Koden ligger allerede på GitHub: <https://github.com/ja-284/AFA-nettside> (gren `main`).
   Gjør dere endringer, lagre (commit) og last dem opp (push) til `main`, så publiseres de automatisk.
2. I Cloudflare: **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Gi Cloudflare tilgang til GitHub-kontoen og velg repositoriet `AFA-nettside`. Bruk disse innstillingene:
   - **Project name:** `afa-videos`
   - **Production branch:** `main`
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variables:** `NODE_VERSION` = `22`
4. Trykk **Save and Deploy**. Første bygg tar et par minutter.

Cloudflare leser `wrangler.toml`, så databasen (D1) kobles til automatisk.

### Alternativ B: Publisering fra egen maskin

```bash
npx wrangler pages project create afa-videos --production-branch=main
npm run build
npx wrangler pages deploy --branch=main
```

Kjør de to siste kommandoene på nytt hver gang dere vil publisere endringer (eller bare `npm run deploy`).

## 7. Legg inn hemmelighetene (secrets)

Disse lagres kryptert hos Cloudflare. Du blir bedt om å skrive inn verdien:

```bash
npx wrangler pages secret put TURNSTILE_SECRET --project-name=afa-videos
npx wrangler pages secret put ADMIN_PASSWORD --project-name=afa-videos
```

- `TURNSTILE_SECRET`: Secret key fra steg 5.
- `ADMIN_PASSWORD`: Et langt passord for admin-siden (minst 16 tegn, gjerne fire tilfeldige ord). Del det bare med de som skal være admin.

Valgfritt (anbefalt): to tilfeldige verdier som gjør innlogging og spamvern sikrere. Lag en verdi med
`node -e "console.log(crypto.randomUUID())"` og legg den inn:

```bash
npx wrangler pages secret put ADMIN_SESSION_SECRET --project-name=afa-videos
npx wrangler pages secret put RATE_LIMIT_SALT --project-name=afa-videos
```

> Du kan også legge inn secrets i dashbordet: **Workers & Pages → afa-videos → Settings → Variables and Secrets**.
> Etter at du har endret secrets, må siden publiseres på nytt (Alternativ A: **Deployments → Retry deployment**; Alternativ B: `npm run deploy`).

## 8. Test at alt virker

1. Åpne `https://afa-videos.pages.dev`.
2. Send en testbestilling under **Bestill**.
3. Gå til `https://afa-videos.pages.dev/admin/`, logg inn med `ADMIN_PASSWORD`, og se at bestillingen ligger der.
4. Send en testvurdering, godkjenn den i admin, og se at den dukker opp på forsiden.
5. Slett testdataene i admin.

## 9. E-postvarsling (valgfritt)

Uten dette lagres alt bare i admin, og dere må sjekke admin jevnlig. Med e-post får gruppen
beskjed om nye bestillinger, og kunden får en kvittering.

1. Lag en konto på <https://resend.com>.
2. **Domains → Add domain** og legg inn DNS-oppføringene Resend viser (krever eget domene, se steg 10).
   Uten verifisert domene kan Resend bare sende til e-posten du registrerte deg med.
3. **API Keys → Create API Key**.
4. Legg inn:
   ```bash
   npx wrangler pages secret put RESEND_API_KEY --project-name=afa-videos
   npx wrangler pages secret put NOTIFY_EMAIL --project-name=afa-videos
   ```
   `NOTIFY_EMAIL` er adressen(e) som skal få varsel, f.eks. `ola@skole.no,kari@skole.no`.
5. Endre `MAIL_FROM` i `wrangler.toml` til en adresse på det verifiserte domenet, f.eks.
   `AFA Videos <hei@afavideos.no>`, og publiser på nytt.

## 10. Eget domene (valgfritt)

1. Kjøp et domene (f.eks. via Domeneshop eller Cloudflare Registrar).
2. I Cloudflare: **Workers & Pages → afa-videos → Custom domains → Set up a custom domain**. Følg veiviseren.
3. Oppdater:
   - `url` i `src/config/site.ts` (brukes i sitemap, delingsbilder og QR-kode).
   - **Hostnames** på Turnstile-widgeten (steg 5).
   - Bruker dere både `www` og uten `www`, legg den andre i `ALLOWED_ORIGINS` i `wrangler.toml`, eller lag en videresending.
4. Publiser på nytt.

## 11. Beskytt admin med Cloudflare Access (anbefalt)

Passordet i `ADMIN_PASSWORD` er en grei reserve, men Cloudflare Access er sikrere: bare e-postadresser
dere godkjenner slipper inn, med engangskode på e-post.

1. I dashbordet: **Zero Trust** (velg gratisplanen og et teamnavn, f.eks. `afavideos`).
2. **Access → Applications → Add an application → Self-hosted**.
3. **Application name:** `AFA admin`. Legg til **to** destinasjoner (public hostnames):
   - Domain: `afa-videos.pages.dev`, Path: `admin`
   - Domain: `afa-videos.pages.dev`, Path: `api/admin`

   (Legg til de samme stiene for eget domene hvis dere har det.)
4. **Policy:** Action **Allow**, Include → **Emails** → skriv inn e-postene til de som skal være admin.
5. Lagre. Åpne applikasjonen igjen og kopier **Application Audience (AUD) Tag**.
6. Fyll inn i `wrangler.toml`:
   ```toml
   CF_ACCESS_TEAM_DOMAIN = "afavideos.cloudflareaccess.com"
   CF_ACCESS_AUD = "lim-inn-aud-taggen-her"
   ```
7. Publiser på nytt. Nå sjekker serveren også selv at Access-innloggingen er ekte.
8. Under **Workers & Pages → afa-videos → Settings → General → Access policy** kan dere i tillegg
   beskytte forhåndsvisninger (`*.afa-videos.pages.dev`).

Når Access er på, logges dere inn automatisk på `/admin/`. Passordinnloggingen virker fortsatt hvis
`ADMIN_PASSWORD` er satt. Fjern den med `npx wrangler pages secret delete ADMIN_PASSWORD --project-name=afa-videos`
hvis dere bare vil bruke Access.

## 12. Besøksstatistikk uten informasjonskapsler (valgfritt)

1. I dashbordet: **Analytics & Logs → Web Analytics → Add a site**. Velg «manual» og kopier tokenet.
2. I `src/config/site.ts`: sett `analytics.enabled: true` og lim inn `analytics.token`.
3. Bygg og publiser. Sikkerhetsheaderne (CSP) oppdateres automatisk ved bygging.

Web Analytics bruker ingen informasjonskapsler, så dere trenger fortsatt ikke samtykkebanner.

---

## Utvikle og teste lokalt

```bash
npm install
cp .dev.vars.example .dev.vars   # testnøkler og lokalt admin-passord
npm run build                    # bygger siden til dist/
npm run db:migrate:local         # lager tabellene i en lokal database
npm run preview                  # starter alt på http://localhost:8788
```

- Admin: <http://localhost:8788/admin/> – passordet står i `.dev.vars`.
- `npm run dev` gir rask forhåndsvisning med automatisk oppdatering (<http://localhost:4321>), men uten
  skjemaer og database. Bruk `npm run preview` for å teste skjemaene.
- `npm run test:e2e` tester skjemaer, admin, spamvern og CSV-eksport (mens `npm run preview` kjører).
- `npm run check` (typesjekk), `npm run lint`, `npm run check:links` og `npm run check:config`
  (viser plassholdere som gjenstår).

## Feilsøking

| Problem | Løsning |
| --- | --- |
| «Spamvernet lastet ikke» | Sjekk at site key i `site.ts` er riktig og at domenet står under Hostnames i Turnstile. |
| «Vi klarte ikke å bekrefte at du er et menneske» | `TURNSTILE_SECRET` er feil eller hører til en annen widget. |
| «Skjemaet er ikke ferdig satt opp ennå» | `TURNSTILE_SECRET` er ikke satt. Se steg 7. |
| «Admin er ikke satt opp» | Verken `ADMIN_PASSWORD` eller Access er satt. Se steg 7 eller 11. |
| Feil om database / `no such table` | Kjør `npm run db:migrate:remote` (steg 4) og sjekk `database_id` i `wrangler.toml`. |
| Endringer vises ikke | Bygget kanskje ikke. Sjekk **Deployments** i dashbordet, eller kjør `npm run deploy`. |
| Bygget feiler på Cloudflare | Sjekk at `NODE_VERSION` er satt til `22` (steg 6A). |
