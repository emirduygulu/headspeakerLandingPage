import { brand, nav, hero, chapters, specs, footer } from './content.js';

const arrowDown = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>`;
const arrowRight = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function stats(list = []) {
  if (!list.length) return '';
  return `<dl class="stats reveal">${list
    .map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`)
    .join('')}</dl>`;
}

function head(c) {
  return `<p class="kicker reveal">${esc(c.kicker)}</p>
    <h2 class="reveal">${esc(c.title)}</h2>
    <p class="lead reveal">${esc(c.text)}</p>`;
}

function chapter(c, extra, { pose, cls = '' } = {}) {
  return `<section class="chapter ${cls}" id="${c.id}" data-pose="${pose ?? c.id}" data-side="${c.side}" aria-labelledby="${c.id}-t">
    <div class="panel glass" data-panel>
      ${head(c).replace('<h2 ', `<h2 id="${c.id}-t" `)}
      ${extra}
    </div>
  </section>`;
}

function ancExtra(c) {
  const tabs = c.modes
    .map(
      (m, i) => `<button role="tab" type="button" class="seg__btn" id="anc-tab-${m.id}" aria-selected="${i === 0}" aria-controls="anc-panel" tabindex="${i === 0 ? 0 : -1}" data-mode="${m.id}">${esc(m.label)}</button>`,
    )
    .join('');
  return `<div class="seg reveal" role="tablist" aria-label="${esc(c.modesLabel)}">${tabs}</div>
    <div id="anc-panel" class="anc__desc reveal" role="tabpanel" aria-live="polite" tabindex="0">
      <canvas id="anc-wave" class="anc__wave" width="400" height="72" aria-hidden="true"></canvas>
      <p id="anc-text">${esc(c.modes[0].text)}</p>
    </div>`;
}

function batteryExtra(c) {
  const rows = c.counters
    .map(
      (n) => `<li class="counter">
        <span class="counter__num" aria-hidden="true"><b data-count="${n.value}">0</b><small>${esc(n.unit)}</small></span>
        <span class="counter__label">${esc(n.label)}</span>
        <span class="sr-only">${n.value} ${esc(n.unit)}, ${esc(n.label)}</span>
      </li>`,
    )
    .join('');
  return `<ul class="counters reveal">${rows}</ul><p class="footnote reveal">${esc(c.footnote)}</p>`;
}

function galleryExtra(c) {
  return `<div class="actions reveal"><button class="btn btn--primary" id="gallery-open" type="button">${esc(c.open)}${arrowRight}</button></div>`;
}

/** Hero, build sırasında index.html'e statik olarak basılır (vite.config.js) → ilk boyamada görünür (LCP). */
export function heroHtml() {
  return `<section class="hero" id="top" data-pose="hero" aria-labelledby="hero-t">
    <div class="hero__inner" data-panel>
      <p class="kicker hero-in">${esc(hero.kicker)}</p>
      <h1 class="hero-in hero-in--solid" id="hero-t">${esc(hero.title)}</h1>
      <p class="hero__text hero-in">${esc(hero.text)}</p>
      <div class="actions hero-in"><a class="btn btn--primary" href="#ses" id="hero-cta">${esc(hero.cta)}${arrowDown}</a></div>
    </div>
    <a class="scroll-cue hero-in" href="#ses" aria-label="Aşağı kaydır"><span>${esc(hero.scroll)}</span><i></i></a>
  </section>`;
}

export function renderPage(root) {
  document.getElementById('nav-links').innerHTML = nav.links.map((l) => `<a href="${l.href}">${esc(l.label)}</a>`).join('');
  document.getElementById('nav-cta').textContent = nav.cta;
  document.getElementById('gl').setAttribute('aria-label', brand.canvasLabel);
  document.getElementById('dots').innerHTML =
    `<ul>${[['top', 'Giriş'], ...nav.links.map((l) => [l.href.slice(1), l.label])]
      .map(([id, label]) => `<li><a href="#${id}" data-dot="${id}" aria-label="${esc(label)}"><span>${esc(label)}</span></a></li>`)
      .join('')}</ul>`;
  document.getElementById('gallery-close').textContent = chapters.galeri.close;
  document.getElementById('gallery-hint').textContent = chapters.galeri.hint;

  const c = chapters;
  const hasHero = !!root.querySelector('#top');
  root.insertAdjacentHTML('beforeend', `
  ${hasHero ? '' : heroHtml()}

  ${chapter(c.ses, stats(c.ses.stats))}
  ${chapter(c.anc, ancExtra(c.anc))}
  ${chapter(c.konfor, stats(c.konfor.stats))}
  ${chapter(c.tasarim, stats(c.tasarim.stats))}
  ${chapter(c.batarya, batteryExtra(c.batarya), { cls: 'chapter--wide' })}
  ${chapter(c.galeri, galleryExtra(c.galeri))}

  <section class="specs" id="${specs.id}" data-pose="specs" aria-labelledby="specs-t">
    <div class="specs__grid" data-panel>
      <div class="specs__table panel glass">
        <p class="kicker reveal">${esc(specs.kicker)}</p>
        <h2 class="reveal" id="specs-t">${esc(specs.title)}</h2>
        <dl class="table reveal">${specs.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      </div>
      <aside class="buy panel glass reveal" aria-label="Fiyat">
        <p class="kicker">${esc(specs.price.label)}</p>
        <p class="buy__price">${esc(specs.price.amount)}</p>
        <p class="buy__note">${esc(specs.price.note)}</p>
        <a class="btn btn--primary btn--lg" href="${specs.ctaHref}">${esc(specs.cta)}${arrowRight}</a>
      </aside>
    </div>
  </section>

  <footer class="footer" id="satin-al">
    <div class="footer__top">
      <div class="footer__brand"><strong>NOIRA</strong><span>${esc(brand.slogan)}</span></div>
      ${footer.columns
        .map((col) => `<nav aria-label="${esc(col.title)}"><h3>${esc(col.title)}</h3><ul>${col.links.map((l) => `<li><a href="#top">${esc(l)}</a></li>`).join('')}</ul></nav>`)
        .join('')}
    </div>
    <p class="footer__legal">${esc(footer.legal)}</p>
  </footer>`);
}
