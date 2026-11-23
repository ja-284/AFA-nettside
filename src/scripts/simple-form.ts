/** Kontaktskjema og vurderingsskjema: validering, Turnstile og innsending. */
import { validateContact, validateReview } from '../lib/forms';
import { clearErrors, formToObject, postJson, setBusy, showErrors, TURNSTILE_FAILED } from './form-utils';
import { mountTurnstile, type Widget } from './turnstile';

const validators = { contact: validateContact, review: validateReview };

document.querySelectorAll<HTMLFormElement>('form[data-simple-form]').forEach((form) => {
  const kind = form.dataset.simpleForm as keyof typeof validators;
  const validate = validators[kind];
  const alert = form.querySelector<HTMLElement>('[data-form-alert]');
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]');
  const success = form.parentElement?.querySelector<HTMLElement>('[data-form-success]');
  const box = form.querySelector<HTMLElement>('[data-turnstile]');
  const sitekey = form.dataset.sitekey ?? '';
  let widget: Promise<Widget | null> | null = null;

  const ensureWidget = () => {
    if (!widget && box) widget = mountTurnstile(box, sitekey, () => alert && (alert.textContent = TURNSTILE_FAILED));
    return widget;
  };

  // Last spamvernet når skjemaet nærmer seg skjermen eller får fokus.
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        ensureWidget();
        io.disconnect();
      }
    },
    { rootMargin: '300px' },
  );
  io.observe(form);
  form.addEventListener('focusin', () => ensureWidget(), { once: true });

  // Fjern feilmelding når feltet rettes.
  form.addEventListener('input', (e) => {
    const wrap = (e.target as HTMLElement).closest<HTMLElement>('[data-field-wrap]');
    if (wrap?.dataset.fieldWrap) clearErrors(form, [wrap.dataset.fieldWrap]);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (alert) alert.textContent = '';
    clearErrors(form);
    const data = formToObject(form);
    const result = validate(data);
    if (!result.ok) {
      showErrors(form, result.errors);
      if (alert) alert.textContent = 'Noen felt må rettes før du kan sende.';
      return;
    }
    setBusy(submit, true);
    const w = await ensureWidget();
    const token = w ? await w.token() : null;
    if (!token) {
      setBusy(submit, false);
      if (alert) alert.textContent = w ? 'Spamvernet er ikke ferdig ennå. Vent et øyeblikk og prøv igjen.' : TURNSTILE_FAILED;
      return;
    }
    const res = await postJson(form.action, { ...data, turnstileToken: token });
    setBusy(submit, false);
    if (res.ok) {
      form.hidden = true;
      if (success) {
        success.hidden = false;
        success.focus();
      }
      return;
    }
    w?.reset();
    if (res.data.errors) showErrors(form, res.data.errors);
    if (alert) alert.textContent = res.data.message ?? 'Noe gikk galt. Prøv igjen om litt.';
    alert?.scrollIntoView({ block: 'center' });
  });
});

export {};
