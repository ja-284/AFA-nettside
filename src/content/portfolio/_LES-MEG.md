# Portefølje – slik legger dere til et klipp eller bilde

Hver fil i denne mappen blir ett kort under «Eksempler» på forsiden og på /eksempler/.
Filer som starter med `_` (som denne) blir ikke publisert.

**Viktig:** Legg bare ut arbeid som bedriften har sagt ja til at vi viser.

## Slik gjør du det

1. Lagre forsidebildet (stående, helst 1080 × 1920) i `src/content/portfolio/media/`.
2. Er det en video: legg MP4-filen i `public/portfolio/` (H.264, maks ca. 8 MB, 9:16).
3. Kopier `_mal.md` til et nytt navn, f.eks. `kafe-lunsj.md`, og fyll ut feltene.
4. Kjør `npm run build` (eller `npm run dev` for å se det lokalt).

## Felt

| Felt          | Forklaring                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| `title`       | Kort tittel, f.eks. «Ny lunsjmeny»                                         |
| `business`    | Navnet på bedriften                                                         |
| `category`    | En av: kafe, frisor, trening, butikk, kontor, klubb, arrangement, annet     |
| `type`        | `video` eller `bilde`                                                       |
| `image`       | Sti til bildet, f.eks. `./media/kafe-lunsj.jpg`                             |
| `video`       | Bare for video: `/portfolio/kafe-lunsj.mp4`                                 |
| `date`        | Dato, f.eks. `2026-03-14`                                                   |
| `description` | Valgfri, én setning                                                         |
| `featured`    | `true` for å vise den først                                                 |
| `permission`  | Må være `true` – bekrefter at bedriften har sagt ja                         |
