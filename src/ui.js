import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { chapters } from './content.js';

/** Bölüm girişleri: fade + hafif yukarı kayma. */
export function initReveals(reduced) {
  if (reduced) return;
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    once: true,
    onEnter: (els) =>
      gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, overwrite: true }),
  });
  gsap.set('.reveal', { y: 26 });
}

/** Loader bittikten sonra hero metinleri sırayla girer. */
export function playHeroIntro(reduced) {
  if (reduced) return;
  gsap.to('.hero-in', { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.14, delay: 0.25 });
}

/** Navbar scroll'da sadeleşir; aktif bölüm nav ve dots'ta işaretlenir. */
export function initNav(getScroll) {
  const nav = document.getElementById('nav');
  const ids = ['top', 'ses', 'anc', 'konfor', 'tasarim', 'batarya', 'galeri', 'teknik'];
  const navLinks = [...document.querySelectorAll('.nav__links a')];
  const dots = [...document.querySelectorAll('[data-dot]')];

  ScrollTrigger.create({
    start: 80,
    end: 'max',
    onUpdate: (self) => nav.classList.toggle('is-compact', self.scroll() > 80),
  });
  nav.classList.toggle('is-compact', getScroll() > 80);

  const setActive = (id) => {
    for (const d of dots) d.setAttribute('aria-current', String(d.dataset.dot === id));
    for (const a of navLinks) {
      if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) continue;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => self.isActive && setActive(id),
    });
  }
  setActive('top');
}

/** Batarya sayıları: scroll ilerledikçe 0'dan hedef değere sayar (scrub). */
export function initCounters(reduced) {
  const nums = document.querySelectorAll('[data-count]');
  // Sayım, panelin ekrana girmesinden "dinlenme" konumuna gelmesine kadar sürer; ankrajda tüm değerler tamamdır.
  const rest = () => (innerWidth <= 860 ? 68 : 50);
  nums.forEach((el, i) => {
    const target = Number(el.dataset.count);
    if (reduced) { el.textContent = target; return; }
    const o = { v: 0 };
    gsap.to(o, {
      v: target,
      ease: 'none',
      scrollTrigger: {
        trigger: '#batarya',
        start: () => `top ${rest() + 22 - i * 3}%`,
        end: () => `center ${rest()}%`,
        scrub: 0.6,
      },
      onUpdate: () => (el.textContent = Math.round(o.v)),
    });
  });
}

/** ANC mod seçici (ARIA tabs) + küçük dalga gösterimi. */
export function initANC(reduced, onMode) {
  const modes = chapters.anc.modes;
  const tabs = [...document.querySelectorAll('.seg__btn')];
  const text = document.getElementById('anc-text');
  const cv = document.getElementById('anc-wave');
  if (!cv) return;
  const g = cv.getContext('2d');
  const state = { level: modes[0].level, target: modes[0].level, visible: false, raf: 0 };

  const select = (i, focus) => {
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    if (focus) tabs[i].focus();
    state.target = modes[i].level;
    text.textContent = modes[i].text;
    tabs[i].parentElement.parentElement.querySelector('#anc-panel')?.setAttribute('aria-labelledby', tabs[i].id);
    onMode?.(modes[i].id);
    if (reduced) draw(0);
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
  tabs.forEach((t, i) =>
    t.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowLeft: -1, Home: -99, End: 99 }[e.key];
      if (k === undefined) return;
      e.preventDefault();
      select(k === -99 ? 0 : k === 99 ? tabs.length - 1 : (i + k + tabs.length) % tabs.length, true);
    }),
  );

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = 400, H = 72;
  cv.width = W * dpr; cv.height = H * dpr;
  g.scale(dpr, dpr);

  function draw(t) {
    state.level += (state.target - state.level) * (reduced ? 1 : 0.08);
    g.clearRect(0, 0, W, H);
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim() || '#9cccff';
    // Dış gürültü (soluk) ve kulağa ulaşan ses (vurgu). Seviye: 1 = gürültü tam, 0 = bastırılmış.
    for (const [alpha, amp, color, width] of [
      [0.28, 1, '#ffffff', 1],
      [1, state.level, accent, 1.6],
    ]) {
      g.beginPath();
      for (let x = 0; x <= W; x += 3) {
        const p = x / W;
        const env = Math.sin(p * Math.PI);
        const n = Math.sin(p * 22 + t * 2.1) * 0.55 + Math.sin(p * 47 - t * 3.3) * 0.3 + Math.sin(p * 9 + t) * 0.35;
        const y = H / 2 + n * env * (H * 0.36) * amp;
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.globalAlpha = alpha;
      g.strokeStyle = color;
      g.lineWidth = width;
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  const loop = (ms) => {
    if (!state.visible) { state.raf = 0; return; }
    if (!document.hidden) draw(ms / 1000);
    state.raf = requestAnimationFrame(loop);
  };
  draw(0);
  if (reduced) return;
  new IntersectionObserver(([e]) => {
    state.visible = e.isIntersecting;
    if (state.visible && !state.raf) state.raf = requestAnimationFrame(loop);
  }).observe(cv);
}
