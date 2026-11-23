/**
 * Felles oppførsel for alle sider. Lastes som en utsatt modul, så siden er lesbar uten JavaScript.
 * Tunge ting (GSAP, skjemaer, admin) lastes bare der de trengs.
 */
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

declare global {
  interface Window {
    __revealFallback?: number;
    afaLenis?: Lenis;
  }
}

const root = document.documentElement;
const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => reducedQuery.matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

window.clearTimeout(window.__revealFallback);
root.classList.add('app-ready');

// ─── Myk scrolling (Lenis) ──────────────────────────────────────────────────
let lenis: Lenis | undefined;
function startLenis() {
  if (lenis || reduced()) return;
  lenis = new Lenis({
    autoRaf: true,
    lerp: 0.11,
    anchors: { offset: -88 },
    stopInertiaOnNavigate: true,
    prevent: (node) => !!node.closest?.('[data-lenis-prevent], dialog, [popover]'),
  });
  window.afaLenis = lenis;
}
startLenis();
reducedQuery.addEventListener('change', () => {
  if (reduced()) {
    lenis?.destroy();
    lenis = undefined;
    window.afaLenis = undefined;
  } else startLenis();
});

// ─── Avsløring ved scroll ───────────────────────────────────────────────────
const revealIO = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      revealIO.unobserve(entry.target);
    }
  },
  { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
);
document.querySelectorAll('[data-reveal]').forEach((el) => revealIO.observe(el));

// ─── Header, fremdriftslinje og «til toppen» ────────────────────────────────
const header = document.querySelector<HTMLElement>('[data-header]');
const progress = document.querySelector<HTMLElement>('[data-progress]');
const toTop = document.querySelector<HTMLAnchorElement>('[data-to-top]');
let lastY = window.scrollY;
let ticking = false;

function onScroll() {
  const y = window.scrollY;
  const delta = y - lastY;
  if (header) {
    header.classList.toggle('is-scrolled', y > 8);
    if (y < 120 || delta < -4) header.classList.remove('is-hidden');
    else if (delta > 4 && y > 240) header.classList.add('is-hidden');
  }
  if (progress) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
  }
  toTop?.classList.toggle('is-visible', y > window.innerHeight * 1.2);
  lastY = y;
  ticking = false;
}
window.addEventListener(
  'scroll',
  () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  },
  { passive: true },
);
onScroll();

toTop?.addEventListener('click', (e) => {
  e.preventDefault();
  if (lenis) lenis.scrollTo(0, { duration: 1.2 });
  else window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
  document.querySelector<HTMLElement>('.site-header .brand')?.focus({ preventScroll: true });
});

// ─── Mobilmeny (Popover API + fokusfelle) ───────────────────────────────────
const menu = document.querySelector<HTMLElement>('[data-menu]');
const openers = document.querySelectorAll<HTMLElement>('[data-menu-open]');
if (menu) {
  menu.addEventListener('toggle', (event) => {
    const open = (event as ToggleEvent).newState === 'open';
    openers.forEach((b) => b.setAttribute('aria-expanded', String(open)));
    if (open) {
      lenis?.stop();
      document.body.style.overflow = 'hidden';
      menu.querySelector<HTMLElement>('.mobile-nav a')?.focus();
    } else {
      lenis?.start();
      document.body.style.overflow = '';
      openers[0]?.focus();
    }
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const items = [...menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  menu.querySelectorAll('a[href]').forEach((a) =>
    a.addEventListener('click', () => {
      try {
        menu.hidePopover();
      } catch {
        /* allerede lukket */
      }
    }),
  );
}

// ─── Magnetiske knapper ─────────────────────────────────────────────────────
if (finePointer) {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((btn) => {
    const label = btn.querySelector<HTMLElement>('.btn-label');
    btn.addEventListener('pointermove', (e) => {
      if (reduced()) return;
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      btn.style.transform = `translate(${x * 10}px, ${y * 8}px)`;
      if (label) label.style.transform = `translate(${x * 5}px, ${y * 4}px)`;
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.transform = '';
      if (label) label.style.transform = '';
    });
  });
}

// ─── Tall som teller opp (bare ekte tall) ───────────────────────────────────
const counters = document.querySelectorAll<HTMLElement>('[data-count]');
if (counters.length && !reduced()) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        io.unobserve(el);
        const to = Number(el.dataset.to ?? 0);
        const from = to === 0 ? 0 : Math.max(0, Math.floor(to / 4));
        const start = performance.now();
        const dur = 1100;
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = String(Math.round(from + (to - from) * eased));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    },
    { threshold: 0.6 },
  );
  counters.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top > window.innerHeight) {
      const to = Number(el.dataset.to ?? 0);
      el.textContent = String(to === 0 ? 0 : Math.floor(to / 4));
      io.observe(el);
    }
  });
}

// ─── Karusell (vurderinger) ─────────────────────────────────────────────────
document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((wrap) => {
  const track = wrap.querySelector<HTMLElement>('[data-carousel-track]');
  const prev = wrap.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const next = wrap.querySelector<HTMLButtonElement>('[data-carousel-next]');
  if (!track || !prev || !next) return;
  const update = () => {
    prev.disabled = track.scrollLeft < 8;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
  };
  const by = (dir: number) => {
    const card = track.querySelector<HTMLElement>('.review-card');
    const amount = card ? card.offsetWidth + 20 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * amount, behavior: reduced() ? 'auto' : 'smooth' });
  };
  prev.addEventListener('click', () => by(-1));
  next.addEventListener('click', () => by(1));
  track.addEventListener('scroll', update, { passive: true });
  update();
});

// ─── Last inn moduler ved behov ─────────────────────────────────────────────
if (document.querySelector('[data-motion]')) {
  import('./motion').then((m) => m.initMotion(() => lenis));
}
if (document.querySelector('[data-order-form]')) import('./order-form');
if (document.querySelector('[data-simple-form]')) import('./simple-form');
if (document.querySelector('[data-lightbox]')) import('./lightbox');
if (document.querySelector('[data-portfolio-filter]')) import('./portfolio-filter');
