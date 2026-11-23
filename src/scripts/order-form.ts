/** Bestillingsskjema i fem steg: fremdrift, validering per steg, oppsummering, Turnstile og innsending. */
import {
  areas, contactPrefs, employeeRanges, industries, labelOf, orderPackages, orderSteps, startOptions,
  validateOrder, wishes,
} from '../lib/forms';
import { clearErrors, formToObject, postJson, setBusy, showErrors, TURNSTILE_FAILED } from './form-utils';
import { mountTurnstile, loadTurnstile, type Widget } from './turnstile';

const form = document.querySelector<HTMLFormElement>('form[data-order-form]');
if (form) init(form);

function init(form: HTMLFormElement) {
  const steps = [...form.querySelectorAll<HTMLElement>('[data-step]')];
  const stepper = document.querySelector<HTMLElement>('[data-stepper]');
  const prev = form.querySelector<HTMLButtonElement>('[data-prev]');
  const next = form.querySelector<HTMLButtonElement>('[data-next]');
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]');
  const alert = form.querySelector<HTMLElement>('[data-form-alert]');
  const summary = form.querySelector<HTMLElement>('[data-summary]');
  const box = form.querySelector<HTMLElement>('[data-turnstile]');
  const areaOther = form.querySelector<HTMLElement>('[data-field-wrap="area_other"]');
  const DRAFT_KEY = 'afa-bestilling-utkast';
  let current = 0;
  let widget: Promise<Widget | null> | null = null;

  form.classList.add('is-enhanced');
  stepper?.classList.add('is-on');

  // ── Utkast i sessionStorage (bare i denne fanen) ──
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null') as Record<string, unknown> | null;
    if (draft) restore(draft);
  } catch {
    /* ignorer */
  }
  const pkg = new URLSearchParams(location.search).get('pakke');
  if (pkg && orderPackages.some((p) => p.value === pkg)) {
    const radio = form.querySelector<HTMLInputElement>(`input[name="package"][value="${CSS.escape(pkg)}"]`);
    if (radio) radio.checked = true;
  }

  function restore(data: Record<string, unknown>) {
    for (const [key, value] of Object.entries(data)) {
      if (key === 'consent' || key.startsWith('cf-') || key === 'turnstileToken') continue;
      const fields = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        `[name="${CSS.escape(key)}"], [name="${CSS.escape(key)}[]"]`,
      );
      fields.forEach((el) => {
        if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox')) {
          el.checked = Array.isArray(value) ? value.includes(el.value) : value === el.value;
        } else if (typeof value === 'string') el.value = value;
      });
    }
  }
  const saveDraft = () => {
    try {
      const data = formToObject(form);
      delete data.consent;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      /* privat modus e.l. */
    }
  };

  const toggleAreaOther = () => {
    const value = form.querySelector<HTMLInputElement>('input[name="area"]:checked')?.value;
    if (areaOther) areaOther.hidden = value !== 'annet';
  };
  toggleAreaOther();

  form.addEventListener('input', (e) => {
    const wrap = (e.target as HTMLElement).closest<HTMLElement>('[data-field-wrap]');
    if (wrap?.dataset.fieldWrap) clearErrors(form, [wrap.dataset.fieldWrap]);
    if ((e.target as HTMLInputElement).name === 'area') toggleAreaOther();
    saveDraft();
  });
  form.addEventListener('change', saveDraft);

  function go(index: number, focus = true) {
    current = Math.max(0, Math.min(steps.length - 1, index));
    steps.forEach((s, i) => {
      s.classList.toggle('is-current', i === current);
      s.toggleAttribute('inert', i !== current);
    });
    if (prev) prev.hidden = current === 0;
    if (next) next.hidden = current === steps.length - 1;
    if (submit) submit.hidden = current !== steps.length - 1;
    if (alert) alert.textContent = '';

    if (stepper) {
      const name = stepper.querySelector('[data-stepper-name]');
      const num = stepper.querySelector('[data-stepper-current]');
      const fill = stepper.querySelector<HTMLElement>('[data-stepper-fill]');
      if (num) num.textContent = String(current + 1);
      if (name) name.textContent = stepper.querySelectorAll('.stepper-list .name')[current]?.textContent ?? '';
      if (fill) fill.style.width = `${((current + 1) / steps.length) * 100}%`;
      stepper.querySelectorAll<HTMLElement>('[data-step-dot]').forEach((dot, i) => {
        dot.classList.toggle('done', i < current);
        if (i === current) dot.setAttribute('aria-current', 'step');
        else dot.removeAttribute('aria-current');
      });
    }
    if (current === steps.length - 2) loadTurnstile().catch(() => undefined); // forhåndslast
    if (current === steps.length - 1) {
      renderSummary();
      if (!widget && box) widget = mountTurnstile(box, form.dataset.sitekey ?? '', () => alert && (alert.textContent = TURNSTILE_FAILED));
    }
    if (focus) {
      const heading = steps[current]?.querySelector<HTMLElement>('.step-title');
      const top = form.closest('.order-card') as HTMLElement | null;
      top?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      heading?.focus({ preventScroll: true });
    }
  }

  function stepErrors(index: number) {
    const result = validateOrder(formToObject(form));
    if (result.ok) return {};
    const fields = orderSteps[index] ?? [];
    return Object.fromEntries(Object.entries(result.errors).filter(([k]) => (fields as string[]).includes(k)));
  }

  next?.addEventListener('click', () => {
    clearErrors(form, orderSteps[current] as string[]);
    const errors = stepErrors(current);
    if (Object.keys(errors).length) {
      showErrors(form, errors);
      if (alert) alert.textContent = 'Noen felt må fylles ut før du går videre.';
      return;
    }
    go(current + 1);
  });
  prev?.addEventListener('click', () => go(current - 1));

  // Enter i et tekstfelt skal gå til neste steg, ikke sende skjemaet.
  form.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (e.key === 'Enter' && t.tagName === 'INPUT' && current < steps.length - 1) {
      e.preventDefault();
      next?.click();
    }
  });

  function renderSummary() {
    if (!summary) return;
    const d = formToObject(form);
    const s = (v: unknown) => (typeof v === 'string' ? v : '');
    const rows: [string, string][] = [
      ['Pakke', labelOf(orderPackages, s(d.package))],
      ['Bedrift', s(d.business_name)],
      ['Bransje', labelOf(industries, s(d.industry))],
      ['Område', d.area === 'annet' ? s(d.area_other) : labelOf(areas, s(d.area))],
      ['Ansatte', labelOf(employeeRanges, s(d.employees))],
      ['Nettside/Instagram', s(d.web)],
      ['Vil vise', ((d.wishes as string[] | undefined) ?? []).map((w) => labelOf(wishes, w)).join(', ')],
      ['Mer informasjon', s(d.message)],
      ['Oppstart', labelOf(startOptions, s(d.start_when))],
      ['Når passer det', s(d.time_window)],
      ['Kontaktperson', s(d.contact_name)],
      ['E-post', s(d.email)],
      ['Telefon', s(d.phone)],
      ['Kontaktes via', labelOf(contactPrefs, s(d.contact_pref))],
    ];
    summary.replaceChildren();
    for (const [label, value] of rows) {
      if (!value) continue;
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      row.append(dt, dd);
      summary.append(row);
    }
    const editRow = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = 'Noe feil?';
    const dd = document.createElement('dd');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Gå tilbake og endre';
    btn.addEventListener('click', () => go(0));
    dd.append(btn);
    editRow.append(dt, dd);
    summary.append(editRow);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (alert) alert.textContent = '';
    clearErrors(form);
    const data = formToObject(form);
    const result = validateOrder(data);
    if (!result.ok) {
      const firstStep = orderSteps.findIndex((fields) => fields.some((f) => f in result.errors));
      if (firstStep >= 0 && firstStep !== current) go(firstStep);
      showErrors(form, result.errors);
      if (alert) alert.textContent = 'Noen felt må rettes før du kan sende.';
      return;
    }
    setBusy(submit, true);
    const w = await (widget ?? (box ? (widget = mountTurnstile(box, form.dataset.sitekey ?? '')) : null));
    const token = w ? await w.token() : null;
    if (!token) {
      setBusy(submit, false);
      if (alert) alert.textContent = w ? 'Spamvernet er ikke ferdig ennå. Vent et øyeblikk og prøv igjen.' : TURNSTILE_FAILED;
      return;
    }
    const res = await postJson(form.action, { ...data, turnstileToken: token });
    if (res.ok) {
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignorer */
      }
      location.assign(`/bestill/takk/?ref=${encodeURIComponent(res.data.ref ?? '')}`);
      return;
    }
    setBusy(submit, false);
    w?.reset();
    if (res.data.errors) {
      const firstStep = orderSteps.findIndex((fields) => fields.some((f) => f in (res.data.errors ?? {})));
      if (firstStep >= 0 && firstStep !== current) go(firstStep);
      showErrors(form, res.data.errors);
    }
    if (alert) {
      alert.textContent = res.data.message ?? 'Noe gikk galt. Prøv igjen om litt.';
      alert.scrollIntoView({ block: 'center' });
    }
  });

  go(0, false);
}
