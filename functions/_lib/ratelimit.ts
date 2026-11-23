import { clientIp, sha256Hex, type Env } from './http';

/**
 * Enkel rate-begrensning lagret i D1. Lagrer bare en saltet hash av IP-adressen,
 * og radene slettes automatisk når tidsvinduet er over.
 * Returnerer `true` hvis forespørselen er innenfor grensen.
 */
export async function rateLimit(
  env: Env,
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const salt = env.RATE_LIMIT_SALT ?? 'afa-videos';
  const key = `${scope}:${(await sha256Hex(`${salt}:${clientIp(request)}`)).slice(0, 32)}`;
  const now = Math.floor(Date.now() / 1000);
  try {
    const row = await env.DB.prepare(
      `INSERT INTO rate_limits (key, count, reset_at) VALUES (?1, 1, ?2 + ?3)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN reset_at <= ?2 THEN 1 ELSE count + 1 END,
         reset_at = CASE WHEN reset_at <= ?2 THEN ?2 + ?3 ELSE reset_at END
       RETURNING count`,
    )
      .bind(key, now, windowSeconds)
      .first<{ count: number }>();
    // Rydd opp utløpte rader, slik at IP-hasher aldri blir liggende lenger enn tidsvinduet.
    await env.DB.prepare('DELETE FROM rate_limits WHERE reset_at <= ?1').bind(now).run();
    return (row?.count ?? 0) <= limit;
  } catch (err) {
    console.error('rate limit error', err);
    return true; // Ikke stopp ekte brukere om databasen hikker.
  }
}
