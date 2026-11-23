import type { Errors } from '../lib/forms';

/** Gjør skjemadata om til et objekt. Felt som slutter på [] blir lister. */
export function formToObject(form: HTMLFormElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of new FormData(form).entries()) {
    if (typeof value !== 'string') continue;
    if (key.endsWith('[]')) {
      const k = key.slice(0, -2);
      out[k] = [...((out[k] as string[] | undefined) ?? []), value];
    } else out[key] = value;
  }
  form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:not([name$="[]"])').forEach((c) => {
    out[c.name] = c.checked;
  });
  return out;
}

export function clearErrors(form: HTMLElement, fields?: string[]) {
  form.querySelectorAll<HTMLElement>('[data-field-wrap]').forEach((wrap) => {
    if (fields && !fields.includes(wrap.dataset.fieldWrap ?? '')) return;
    const err = wrap.querySelector('.field-error');
    if (err) err.textContent = '';
    wrap.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  });
}

/** Viser feil ved hvert felt og flytter fokus til det første. Returnerer antall feil. */
export function showErrors(form: HTMLElement, errors: Errors, focus = true): number {
  let first: HTMLElement | null = null;
  for (const [name, message] of Object.entries(errors)) {
    const wrap = form.querySelector<HTMLElement>(`[data-field-wrap="${CSS.escape(name)}"]`);
    if (!wrap) continue;
    const err = wrap.querySelector('.field-error');
    if (err) err.textContent = message;
    const inputs = wrap.querySelectorAll<HTMLElement>('input, select, textarea');
    inputs.forEach((el) => el.setAttribute('aria-invalid', 'true'));
    if (wrap.tagName === 'FIELDSET') wrap.setAttribute('aria-invalid', 'true');
    first ??= wrap.tagName === 'FIELDSET' ? (inputs[0] ?? wrap) : (inputs[0] ?? null);
  }
  if (focus && first) {
    first.focus({ preventScroll: true });
    first.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  return Object.keys(errors).length;
}

export function setBusy(button: HTMLButtonElement | null, busy: boolean, label = 'Sender …') {
  if (!button) return;
  const labelEl = button.querySelector<HTMLElement>('.btn-label');
  if (busy) {
    button.dataset.label = labelEl?.textContent ?? '';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    if (labelEl) labelEl.innerHTML = `<span class="spinner" aria-hidden="true"></span>&nbsp;${label}`;
  } else {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (labelEl && button.dataset.label) labelEl.textContent = button.dataset.label;
  }
}

export interface ApiResult {
  ok: boolean;
  status: number;
  data: { ok?: boolean; message?: string; errors?: Errors; ref?: string };
}

export async function postJson(url: string, body: unknown): Promise<ApiResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    });
    const data = (await res.json().catch(() => ({}))) as ApiResult['data'];
    return { ok: res.ok && data.ok !== false, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { message: 'Fikk ikke kontakt med serveren. Sjekk nettforbindelsen og prøv igjen.' } };
  }
}

export const TURNSTILE_FAILED =
  'Spamvernet lastet ikke. Prøv å laste siden på nytt, slå av eventuelle blokkeringsutvidelser, eller send oss en e-post.';
