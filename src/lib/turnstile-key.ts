import { site } from '../config/site';

/** Cloudflares offisielle testnøkkel – godkjenner alltid. Brukes bare lokalt. */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

/**
 * Site key som brukes i skjemaene:
 * 1. PUBLIC_TURNSTILE_SITE_KEY hvis den er satt ved bygging (f.eks. `npm run build:local`),
 * 2. testnøkkelen under `npm run dev`,
 * 3. ellers den ekte nøkkelen fra site.ts.
 */
export const turnstileSiteKey: string =
  import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || (import.meta.env.DEV ? TURNSTILE_TEST_SITE_KEY : site.turnstile.siteKey);
