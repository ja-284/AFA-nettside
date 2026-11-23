/**
 * Validering av Cloudflare Turnstile-token på serveren.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

// Cloudflares offisielle testnøkler (se «Testing» i Turnstile-dokumentasjonen).
// De gir ingen beskyttelse i seg selv, og svaret er kjent på forhånd. Derfor
// etterligner vi dem lokalt, slik at skjemaene kan testes uten nettilgang.
const TEST_SECRETS: Record<string, boolean> = {
  '1x0000000000000000000000000000000AA': true, // godkjenner alltid
  '2x0000000000000000000000000000000AA': false, // avviser alltid
  '3x0000000000000000000000000000000AA': false, // «token allerede brukt»
};

export const isTestSecret = (secret?: string) => !!secret && secret in TEST_SECRETS;

export async function verifyTurnstile(
  token: unknown,
  secret: string | undefined,
  ip: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!secret) return { ok: false, reason: 'turnstile-not-configured' };
  if (typeof token !== 'string' || token.length < 10 || token.length > 2048) {
    return { ok: false, reason: 'missing-token' };
  }
  if (isTestSecret(secret)) return TEST_SECRETS[secret] ? { ok: true } : { ok: false, reason: 'test-secret-fail' };

  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  body.append('remoteip', ip);
  body.append('idempotency_key', crypto.randomUUID());
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
    return data.success ? { ok: true } : { ok: false, reason: data['error-codes']?.join(',') ?? 'failed' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
