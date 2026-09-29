// Gerekçe (framework): sayfa tek bir sabit canvas + DOM metinlerinden oluşuyor ve durum yalnızca kamera/scroll,
// bu yüzden React Three Fiber'ın sağlayacağı bileşen modeli gereksiz; vanilla three.js daha az bağımlılık ve daha küçük bundle demek.
import './style.css';
import 'lenis/dist/lenis.css';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { renderPage } from './render.js';
import { createStage, params } from './stage.js';
import { buildPoses, galleryPose, samplePose, dampPose, copyPose } from './poses.js';
import { initReveals, playHeroIntro, initNav, initCounters, initANC } from './ui.js';
import { chapters } from './content.js';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const html = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(pointer: coarse)').matches;
const debug = new URLSearchParams(location.search).has('debug');
html.classList.add('js');
if (reduced) html.classList.add('reduced');

renderPage(document.getElementById('app'));

// ---------------------------------------------------------------------------------------------
// Loader: gerçek bayt ilerlemesi (HDR + GLB). Gösterilen değer gerçeğe yumuşakça yaklaşır.
// ---------------------------------------------------------------------------------------------
const loaderEl = document.getElementById('loader');
const barEl = document.getElementById('loader-bar');
const pctEl = document.getElementById('loader-pct');
const load = { real: 0, shown: 0 };
const loaderRaf = () => {
  load.shown += (load.real - load.shown) * 0.12;
  if (load.real >= 1 && load.shown > 0.995) load.shown = 1;
  pctEl.textContent = Math.round(load.shown * 100);
  barEl.style.transform = `scaleX(${load.shown})`;
  if (load.shown < 1) requestAnimationFrame(loaderRaf);
};
requestAnimationFrame(loaderRaf);

// ---------------------------------------------------------------------------------------------
// Sahne
// ---------------------------------------------------------------------------------------------
const canvas = document.getElementById('gl');
// Loader'ın ilk boyanmasına izin ver, ağır sahne kurulumu ondan sonra başlasın.
await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
const stage = await createStage({
  canvas,
  reducedMotion: reduced,
  isMobile: isTouch,
  onProgress: (p) => (load.real = p),
});
load.real = 1;

let isMobileLayout = innerWidth <= 860;
let poses = buildPoses(stage.landmarks, isMobileLayout);
const ORDER = ['hero', 'ses', 'anc', 'konfor', 'tasarim', 'batarya', 'galeri', 'specs'];
let poseList = ORDER.map((k) => poses[k]);
let anchors = ORDER.map((_, i) => i * 1000);

// ---------------------------------------------------------------------------------------------
// Scroll (Lenis) + ScrollTrigger senkronu
// ---------------------------------------------------------------------------------------------
const lenis = reduced ? null : new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true });
const scrollY = () => (lenis ? lenis.scroll : window.scrollY);
if (lenis) lenis.on('scroll', ScrollTrigger.update);

document.querySelectorAll('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1);
    const el = id === 'top' ? document.documentElement : document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const target = id === 'top' ? 0 : ORDER.includes(id === 'teknik' ? 'specs' : id) ? anchors[ORDER.indexOf(id === 'teknik' ? 'specs' : id)] : el.offsetTop;
    if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else window.scrollTo(0, target);
    if (id !== 'top') history.replaceState(null, '', `#${id}`);
    // Klavye kullanıcıları için odağı bölüme taşı
    if (id !== 'top' && el.tabIndex < 0) { el.tabIndex = -1; }
    el.focus({ preventScroll: true });
  }),
);

/** Her poz için scroll ankrajı: bölümün orta noktasının ekranda "dinlenme" konumuna geldiği scroll değeri. */
function computeAnchors() {
  const vh = innerHeight;
  const rest = isMobileLayout ? 0.68 : 0.5;
  const sy = window.scrollY;
  const max = document.documentElement.scrollHeight - vh;
  const a = ORDER.map((key, i) => {
    const el = document.querySelector(`[data-pose="${key}"]`);
    const r = el.getBoundingClientRect();
    if (i === 0) return 0;
    if (key === 'specs') return r.top + sy - vh * 0.45;
    return r.top + sy + r.height / 2 - rest * vh;
  });
  for (let i = 1; i < a.length; i++) a[i] = Math.max(a[i], a[i - 1] + 120);
  anchors = a.map((v) => Math.min(v, Math.max(0, max)));
  for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1] + 1);
}

// ---------------------------------------------------------------------------------------------
// Kamera durumu
// ---------------------------------------------------------------------------------------------
const cur = copyPose(poses.hero);
const goal = copyPose(poses.hero);
const intro = { v: reduced ? 1 : 0 }; // giriş dolly'si
const veilEl = document.getElementById('veil');
let mode = 'scroll'; // scroll | entering | orbit | leaving
let controls = null;
let modeTimer = 0;

function resize() {
  const w = innerWidth, h = innerHeight;
  stage.setSize(w, h);
  const nowMobile = w <= 860;
  if (nowMobile !== isMobileLayout) {
    isMobileLayout = nowMobile;
    poses = buildPoses(stage.landmarks, isMobileLayout);
    poseList = ORDER.map((k) => poses[k]);
  }
  computeAnchors();
  ScrollTrigger.refresh();
}
let lastW = innerWidth, lastH = innerHeight, rt = 0;
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    // Mobil adres çubuğu (küçük yükseklik değişimi) anchor'ları kaydırmasın
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 150) { stage.setSize(innerWidth, innerHeight); return; }
    lastW = innerWidth; lastH = innerHeight;
    resize();
  }, 120);
});

// UI modülleri
initReveals(reduced);
initCounters(reduced);
initANC(reduced, (id) => {
  // ANC modu ışığa yansır: şeffaf/kapalı modda rim biraz açılır (küçük, sezgisel geri bildirim)
  const boost = { anc: 1, transparent: 1.12, off: 1.25 }[id] ?? 1;
  gsap.to(stage.lights.rimR, { intensity: params.rimIntensity * boost, duration: 0.6 });
  gsap.to(stage.lights.rimL, { intensity: params.rimIntensity * boost, duration: 0.6 });
});
initNav(scrollY);

await document.fonts.ready.catch(() => {});
resize();
if (location.hash && lenis) {
  const key = location.hash === '#teknik' ? 'specs' : location.hash.slice(1);
  const i = ORDER.indexOf(key);
  if (i > 0) lenis.scrollTo(anchors[i], { immediate: true });
}

// ---------------------------------------------------------------------------------------------
// Galeri (OrbitControls)
// ---------------------------------------------------------------------------------------------
const galleryUi = document.getElementById('gallery-ui');
const openBtn = document.getElementById('gallery-open');
const closeBtn = document.getElementById('gallery-close');

const unwrapNear = (az, ref) => az + 360 * Math.round((ref - az) / 360);

async function openGallery() {
  if (mode !== 'scroll') return;
  mode = 'entering';
  lenis?.stop();
  html.classList.add('is-locked');
  document.body.classList.add('is-gallery');
  galleryUi.hidden = false;
  const gp = galleryPose();
  gp.az = unwrapNear(gp.az, cur.az);
  Object.assign(goal, gp);
  goal.target = [...gp.target];
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
  clearTimeout(modeTimer);
  modeTimer = setTimeout(() => {
    if (mode !== 'entering') return;
    Object.assign(cur, gp);
    cur.target = [...gp.target];
    stage.applyState({ ...cur });
    stage.camera.clearViewOffset();
    controls ??= (() => {
      const c = new OrbitControls(stage.camera, canvas);
      c.enablePan = false; // zoom sınırlı, pan kapalı: model kadrajdan çıkmaz
      c.minDistance = 3.4;
      c.maxDistance = 8.5;
      c.minPolarAngle = 0.3;
      c.maxPolarAngle = Math.PI - 0.5;
      c.enableDamping = !reduced;
      c.dampingFactor = 0.07;
      c.rotateSpeed = 0.7;
      c.zoomSpeed = 0.6;
      c.autoRotate = !reduced;
      c.autoRotateSpeed = 0.7;
      return c;
    })();
    controls.target.set(...gp.target);
    controls.update();
    controls.enabled = true;
    mode = 'orbit';
    canvas.tabIndex = 0;
    closeBtn.focus();
  }, reduced ? 50 : 1100);
}

function closeGallery() {
  if (mode !== 'orbit' && mode !== 'entering') return;
  clearTimeout(modeTimer);
  if (controls) controls.enabled = false;
  // Kameranın o anki konumundan scroll pozuna yumuşak dönüş
  const cam = stage.camera.position;
  const t = controls ? controls.target : new THREE.Vector3(...goal.target);
  const dx = cam.x - t.x, dy = cam.y - t.y, dz = cam.z - t.z;
  const dist = Math.hypot(dx, dy, dz);
  cur.dist = dist;
  cur.el = THREE.MathUtils.radToDeg(Math.asin(dy / dist));
  cur.az = unwrapNear(THREE.MathUtils.radToDeg(Math.atan2(dx, dz)), sampleGoal().az);
  cur.target = [t.x, t.y, t.z];
  cur.shiftX = cur.shiftY = 0;
  mode = 'leaving';
  document.body.classList.remove('is-gallery');
  galleryUi.hidden = true;
  canvas.tabIndex = -1;
  openBtn?.focus({ preventScroll: true });
  modeTimer = setTimeout(() => {
    mode = 'scroll';
    html.classList.remove('is-locked');
    lenis?.start();
  }, reduced ? 50 : 1300);
}
openBtn?.addEventListener('click', openGallery);
closeBtn.addEventListener('click', closeGallery);
addEventListener('keydown', (e) => {
  if (mode !== 'orbit' && mode !== 'entering') return;
  if (e.key === 'Escape') return closeGallery();
  if (mode !== 'orbit') return;
  // Klavyeyle döndürme/zoom (erişilebilirlik)
  const cam = stage.camera.position, t = controls.target;
  const off = cam.clone().sub(t);
  const ang = { ArrowLeft: 0.18, ArrowRight: -0.18 }[e.key];
  if (ang) { off.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang); cam.copy(t).add(off); e.preventDefault(); }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const s = new THREE.Spherical().setFromVector3(off);
    s.phi = THREE.MathUtils.clamp(s.phi + (e.key === 'ArrowUp' ? -0.12 : 0.12), controls.minPolarAngle, controls.maxPolarAngle);
    cam.copy(t).add(off.setFromSpherical(s)); e.preventDefault();
  }
  if (e.key === '+' || e.key === '=' || e.key === '-') {
    const d = THREE.MathUtils.clamp(off.length() * (e.key === '-' ? 1.1 : 0.9), controls.minDistance, controls.maxDistance);
    cam.copy(t).add(off.setLength(d)); e.preventDefault();
  }
});

// ---------------------------------------------------------------------------------------------
// Render döngüsü (yalnızca sekme görünürken)
// ---------------------------------------------------------------------------------------------
const sampleGoal = () => samplePose(scrollY(), anchors, poseList);
const heroWeight = () => Math.max(0, 1 - scrollY() / Math.max(1, anchors[1] * 0.55));

let frames = 0, slowFrames = 0, degraded = false, last = 0;
const fixedQuality = new URLSearchParams(location.search).has('quality');

function frame(timeSec) {
  if (document.hidden) return;
  const dt = Math.min(0.1, timeSec - last || 0.016);
  last = timeSec;
  lenis?.raf(timeSec * 1000);

  if (mode === 'orbit') {
    controls.update();
    stage.syncLightsToCamera();
  } else {
    if (mode === 'scroll') Object.assign(goal, sampleGoal());
    // 'entering' → goal galeri pozuna sabitlenmiş; 'leaving' → scroll pozuna dönüş
    if (mode === 'leaving') Object.assign(goal, sampleGoal());
    const k = reduced ? 1 : 1 - Math.exp(-dt * (mode === 'scroll' ? 5.5 : 4));
    dampPose(cur, goal, k);
    const w = mode === 'scroll' ? heroWeight() : 0;
    const sway = reduced ? 0 : Math.sin(timeSec * 0.3) * 26 * w; // hero'da çok yavaş salınım/dönüş
    const i = intro.v;
    stage.applyState({
      ...cur,
      az: cur.az + (1 - i) * -32,
      dist: cur.dist * (1 + (1 - i) * 0.45),
      rotY: cur.rotY + sway,
    });
    veilEl.style.opacity = cur.veil.toFixed(3);
  }
  stage.render(timeSec);

  // Zayıf cihaz: yavaşsa önce post-processing'i, sonra çözünürlüğü kıs (bir kez)
  if (!fixedQuality && !degraded && !reduced && timeSec > 4) {
    frames++;
    if (dt > 1 / 28) slowFrames++;
    if (frames === 120) {
      if (slowFrames > 70) {
        degraded = true;
        if (stage.hasPost) stage.disablePost();
        stage.renderer.setPixelRatio(1);
        stage.setSize(innerWidth, innerHeight);
      }
      frames = slowFrames = 0;
    }
  }
}
gsap.ticker.lagSmoothing(0);
gsap.ticker.add(frame);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) gsap.ticker.sleep();
  else { gsap.ticker.wake(); last = 0; }
});

// ---------------------------------------------------------------------------------------------
// Yükleme bitti: ekranı aç, hero animasyonunu başlat
// ---------------------------------------------------------------------------------------------
stage.render(0);
await new Promise((r) => setTimeout(r, reduced ? 100 : 550));
loaderEl.classList.add('is-done');
loaderEl.setAttribute('aria-hidden', 'true');
if (!reduced) gsap.to(intro, { v: 1, duration: 2.8, ease: 'power3.out', delay: 0.1 });
playHeroIntro(reduced);

if (debug) {
  window.__noira = { stage, cur, goal, poses, get anchors() { return anchors; }, lenis, openGallery, closeGallery, get mode() { return mode; } };
  import('./debug.js').then((m) => m.initDebug(stage, params));
}
