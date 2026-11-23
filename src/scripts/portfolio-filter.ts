/** Filter per bransje på /eksempler/. */
const group = document.querySelector<HTMLElement>('[data-portfolio-filter]');
const status = document.querySelector<HTMLElement>('[data-filter-status]');
if (group) {
  const buttons = [...group.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const items = [...document.querySelectorAll<HTMLElement>('li[data-category]')];
  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      buttons.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      let shown = 0;
      items.forEach((li) => {
        const show = f === 'alle' || li.dataset.category === f;
        li.hidden = !show;
        if (show) shown++;
      });
      if (status) status.textContent = `Viser ${shown} ${shown === 1 ? 'eksempel' : 'eksempler'}.`;
    }),
  );
}

export {};
