/** Lysboks for porteføljen (native <dialog>). Uten JavaScript åpnes filen direkte. */
const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox-dialog]');
const media = dialog?.querySelector<HTMLElement>('[data-lightbox-media]');
const title = dialog?.querySelector<HTMLElement>('[data-lightbox-title]');
let opener: HTMLElement | null = null;

if (dialog && media && title) {
  document.querySelectorAll<HTMLAnchorElement>('[data-lightbox]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      opener = link;
      media.replaceChildren();
      const { type, src, poster, title: t } = link.dataset;
      if (type === 'video' && src) {
        const v = document.createElement('video');
        v.src = src;
        if (poster) v.poster = poster;
        v.controls = true;
        v.playsInline = true;
        v.preload = 'none';
        v.autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        media.append(v);
      } else if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = t ?? '';
        media.append(img);
      }
      title.textContent = t ?? '';
      window.afaLenis?.stop();
      dialog.showModal();
    });
  });
  const close = () => dialog.close();
  dialog.querySelector('[data-lightbox-close]')?.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  dialog.addEventListener('close', () => {
    media.querySelector('video')?.pause();
    media.replaceChildren();
    window.afaLenis?.start();
    opener?.focus();
  });
}

export {};
