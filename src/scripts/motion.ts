/**
 * Scroll-animasjoner med GSAP + ScrollTrigger.
 * Med «redusert bevegelse» slås parallaks, festing og horisontal scrolling av – da brukes bare enkle overganger.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export function initMotion(getLenis: () => Lenis | undefined) {
  let hooked: Lenis | undefined;
  const hookLenis = () => {
    const lenis = getLenis();
    if (lenis && lenis !== hooked) {
      lenis.on('scroll', ScrollTrigger.update);
      hooked = lenis;
    }
  };
  hookLenis();

  const mm = gsap.matchMedia();

  mm.add(
    {
      full: '(prefers-reduced-motion: no-preference)',
      reduced: '(prefers-reduced-motion: reduce)',
      wide: '(min-width: 900px)',
    },
    (ctx) => {
      const { full } = ctx.conditions as { full: boolean; reduced: boolean; wide: boolean };
      hookLenis();

      if (full) {
        heroParallax();
        parallaxImages();
        statement();
      }
      const cleanups = [howItWorks(full), rail(full)];
      return () => cleanups.forEach((fn) => fn?.());
    },
  );

  // Bilder og fonter kan endre høyder etter lasting.
  window.addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

function heroParallax() {
  const hero = document.querySelector<HTMLElement>('[data-motion="hero"]');
  if (!hero) return;
  const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
  const blobs = hero.querySelector('[data-hero-blobs]');
  if (blobs) gsap.to(blobs, { yPercent: 18, ease: 'none', scrollTrigger: st });
  const phone = hero.querySelector('[data-hero-phone]');
  if (phone) gsap.to(phone, { y: -70, rotate: 2, ease: 'none', scrollTrigger: st });
}

function parallaxImages() {
  gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
    const wrap = el.closest<HTMLElement>('[data-parallax-wrap]') ?? el;
    gsap.fromTo(
      el,
      { yPercent: -7 },
      { yPercent: 7, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top bottom', end: 'bottom top', scrub: true } },
    );
  });
}

function statement() {
  const el = document.querySelector<HTMLElement>('[data-statement]');
  if (!el) return;
  const words = gsap.utils.toArray<HTMLElement>('.sw', el);
  // Startfargen har minst 3:1 kontrast mot bakgrunnen (stor tekst), så teksten er lesbar hele veien.
  const finals = words.map((w) => getComputedStyle(w).color);
  gsap.fromTo(
    words,
    { color: '#7a8689' },
    {
      color: (i: number) => finals[i] ?? 'inherit',
      ease: 'none',
      stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 42%', scrub: 0.6 },
    },
  );
}

/** «Slik fungerer det»: festet seksjon der stegene og telefonskjermen bytter mens man scroller. */
function howItWorks(full: boolean) {
  const section = document.querySelector<HTMLElement>('[data-motion="how"]');
  if (!section) return;
  const stage = section.querySelector<HTMLElement>('[data-how-stage]');
  const steps = [...section.querySelectorAll<HTMLElement>('[data-how-step]')];
  const screens = [...section.querySelectorAll<HTMLElement>('[data-how-screen]')];
  const bars = [...section.querySelectorAll<HTMLElement>('[data-how-bar]')];
  if (!stage || !steps.length) return;

  let current = -1;
  const setActive = (index: number) => {
    if (index === current) return;
    current = index;
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i === index);
      s.classList.toggle('is-past', i < index);
      s.setAttribute('aria-current', i === index ? 'step' : 'false');
    });
    screens.forEach((s, i) => s.classList.toggle('is-active', i === index));
  };

  if (!full) {
    // Redusert bevegelse: ingen festing. Skjermen byttes når et steg er midt på skjermen.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(steps.indexOf(e.target as HTMLElement));
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    steps.forEach((s) => io.observe(s));
    setActive(0);
    return () => io.disconnect();
  }

  section.classList.add('is-pinned');
  setActive(0);
  const n = steps.length;
  const trigger = ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: () => `+=${window.innerHeight * (n - 0.2)}`,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate(self) {
      const p = self.progress;
      setActive(Math.min(n - 1, Math.floor(p * n)));
      bars.forEach((bar, i) => {
        const local = Math.min(1, Math.max(0, p * n - i));
        bar.style.transform = `scaleX(${local})`;
      });
    },
  });
  return () => {
    trigger.kill();
    section.classList.remove('is-pinned');
    steps.forEach((s) => s.classList.remove('is-past'));
  };
}

/** Horisontalt galleri: man scroller nedover, og kortene glir sidelengs. */
function rail(full: boolean) {
  const section = document.querySelector<HTMLElement>('[data-motion="rail"]');
  if (!section || !full) return;
  const pin = section.querySelector<HTMLElement>('[data-rail-pin]');
  const viewport = section.querySelector<HTMLElement>('[data-rail-viewport]');
  const track = section.querySelector<HTMLElement>('[data-rail-track]');
  if (!pin || !viewport || !track) return;

  const distance = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
  if (distance() < 40) return;

  section.classList.add('is-pinned');
  viewport.removeAttribute('tabindex');
  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      start: 'center center',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 0.8,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });
  // Tastaturbrukere: hold fokusert kort synlig ved å scrolle siden til riktig posisjon.
  const onFocus = (e: FocusEvent) => {
    const st = tween.scrollTrigger;
    const target = e.target as HTMLElement;
    if (!st || !track.contains(target)) return;
    const item = target.closest<HTMLElement>('.rail-item');
    if (!item) return;
    const ratio = Math.min(1, Math.max(0, (item.offsetLeft - window.innerWidth * 0.2) / distance()));
    window.scrollTo({ top: st.start + (st.end - st.start) * ratio });
  };
  track.addEventListener('focusin', onFocus);
  return () => {
    track.removeEventListener('focusin', onFocus);
    section.classList.remove('is-pinned');
    viewport.setAttribute('tabindex', '0');
    gsap.set(track, { clearProps: 'transform' });
  };
}
