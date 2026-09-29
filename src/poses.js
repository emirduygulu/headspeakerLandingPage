// Scroll bölümlerine bağlı kamera pozları.
// Koordinatlar normalize edilmiş model uzayında (yükseklik 2.2 birim, merkez 0,0,0). Model yönelimi:
// pedler +Z (öne) bakar, kasaların dış yüzü/port −Z tarafındadır. Kamera azimutu: 0 = önden, 180 = arkadan.
// Değerler stage.landmarks'tan (vertex dağılımı + bounding box) türetilir; isim tahmini yok.
// az değerleri "açılmış" (unwrapped) verilir: iki poz arası hep kısa yoldan, ama yönü kontrol edilebilir.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);

export function buildPoses(L, isMobile) {
  const cupX = (L.cupR.maxX - L.cupL.minX) / 2; // kasa dış yüzü |x|
  const cy = (L.cupR.y + L.cupL.y) / 2;
  const S = 0.24; // masaüstünde modelin panelin karşı tarafına kayması (ekran genişliği oranı)
  const M = isMobile ? { x: 0, y: 0.2 } : null;

  // shiftX>0: model sağa kayar (metin solda). shiftY>0: model yukarı kayar (mobilde metin altta).
  const pose = (o) => ({
    target: [0, 0, 0], dist: 6, az: 0, el: 0, rotY: 0, shiftX: 0, shiftY: 0, veil: 0, spot: 1, ...o,
    ...(M ? { shiftX: 0, shiftY: M.y, ...(o.mobile || {}) } : {}),
  });

  return {
    // 1. Hero: önden, hafif yukarıdan; başlık altta olduğundan model biraz yukarı.
    hero: pose({ target: [0, 0.02, 0], dist: 7.2, az: 0, el: 5, shiftY: 0.18, mobile: { shiftY: 0.17 } }),
    // 2. Ses: kasaların dış yüzü + bant, arka üç-çeyrek.
    ses: pose({ target: [0, 0.05, -0.1], dist: 5.6, az: 152, el: 9, shiftX: S }),
    // 3. ANC: kasaya yaklaş (port/butonların olduğu dış yüz).
    anc: pose({ target: [-cupX * 0.92, cy - 0.12, -0.14], dist: 4.3, az: 205, el: 6, shiftX: -S, spot: 1.2, mobile: { shiftY: 0.24 } }),
    // 4. Konfor: ped yakın çekim, önden.
    konfor: pose({ target: [cupX * 0.82, cy, 0.22], dist: 3.3, az: 345, el: 4, shiftX: S, mobile: { shiftY: 0.24 } }),
    // 5. Tasarım: bant–yoke halka/menteşe makro (arkadan).
    tasarim: pose({ target: [cupX * 0.83, L.halfH * 0.45, -0.1], dist: 2.3, az: 528, el: 12, shiftX: -S, mobile: { shiftY: 0.26 } }),
    // 6. Batarya: yandan profil.
    batarya: pose({ target: [0, 0.02, 0], dist: 6.0, az: 450, el: 2, shiftX: S, mobile: { shiftY: 0.27 } }),
    // 7. Galeri: serbest üç-çeyrek.
    galeri: pose({ target: [0, 0.04, 0], dist: 5.8, az: 325, el: 14, shiftX: -S }),
    // 8. Teknik: geri çekil, tablo sağda.
    specs: pose({ target: [0, 0.02, 0], dist: 9.4, az: 380, el: 10, shiftX: -0.34, veil: 0.1, spot: 0.7, mobile: { shiftY: 0.3, veil: 0.72 } }),
  };
}

export const galleryPose = () => ({
  target: [0, 0.04, 0], dist: 5.6, az: 20, el: 12, rotY: 0, shiftX: 0, shiftY: 0, veil: 0, spot: 1,
});

const KEYS = ['dist', 'az', 'el', 'rotY', 'shiftX', 'shiftY', 'veil', 'spot'];

export function lerpPose(a, b, t) {
  const o = { target: [0, 0, 0] };
  for (let i = 0; i < 3; i++) o.target[i] = a.target[i] + (b.target[i] - a.target[i]) * t;
  for (const k of KEYS) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
}

export function copyPose(p) {
  return { ...p, target: [...p.target] };
}

/** Scroll konumu → poz. Her ankraj civarında poz sabit kalır (hold), aralarda smootherstep ile geçer. */
export function samplePose(y, anchors, list, hold = 0.24) {
  const n = list.length;
  if (y <= anchors[0]) return copyPose(list[0]);
  if (y >= anchors[n - 1]) return copyPose(list[n - 1]);
  let i = 0;
  while (i < n - 2 && y >= anchors[i + 1]) i++;
  const t = (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
  const e = smoother(clamp((t - hold) / (1 - 2 * hold), 0, 1));
  return lerpPose(list[i], list[i + 1], e);
}

/** Sayısal alanlar için kritik sönümlü yaklaşma (kare hızından bağımsız). */
export function dampPose(cur, goal, k) {
  for (let i = 0; i < 3; i++) cur.target[i] += (goal.target[i] - cur.target[i]) * k;
  for (const key of KEYS) cur[key] += (goal[key] - cur[key]) * k;
  return cur;
}
