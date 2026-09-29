// Tüm metinler ve teknik değerler burada. Demo içeriktir; sayfayı değiştirmeden buradan düzenleyin.

export const brand = {
  name: 'NOIRA',
  product: 'N1',
  productFull: 'NOIRA N1',
  category: 'Kablosuz Aktif Gürültü Engelleyici Kulaklık',
  slogan: 'Sessizliği duy.',
  sub: 'Dünya sussun. Müzik kalsın.',
  canvasLabel:
    'NOIRA N1 kulaklığın üç boyutlu modeli. Sayfayı kaydırdıkça kamera kulaklığın farklı detaylarına geçer.',
};

export const nav = {
  links: [
    { href: '#ses', label: 'Ses' },
    { href: '#anc', label: 'ANC' },
    { href: '#konfor', label: 'Konfor' },
    { href: '#tasarim', label: 'Tasarım' },
    { href: '#batarya', label: 'Batarya' },
    { href: '#teknik', label: 'Teknik' },
  ],
  cta: 'Satın Al',
};

export const hero = {
  kicker: 'Yeni · NOIRA N1',
  title: brand.slogan,
  text: brand.sub,
  cta: 'Keşfet',
  scroll: 'Kaydır',
};

// Her chapter: id, side (desktop'ta metin tarafı), kicker/title/text ve isteğe bağlı stats.
export const chapters = {
  ses: {
    id: 'ses',
    side: 'left',
    kicker: '01 — Ses',
    title: 'Her nota, olduğu yerde.',
    text: '40 mm dinamik sürücüler stüdyo hassasiyetinde çalışır. Derin bas, net vokal, geniş bir ses sahnesi.',
    stats: [
      { value: '40 mm', label: 'Sürücü' },
      { value: '4 Hz–40 kHz', label: 'Frekans aralığı' },
      { value: 'Hi-Res', label: 'LDAC · aptX Adaptive' },
    ],
  },
  anc: {
    id: 'anc',
    side: 'right',
    kicker: '02 — Aktif gürültü engelleme',
    title: 'Dünyayı kıs. Ya da içeri al.',
    text: 'Her kasada üç mikrofon çevreyi saniyede binlerce kez ölçer ve gürültüyü tersiyle siler.',
    modes: [
      {
        id: 'anc',
        label: 'Gürültü Engelleme',
        text: '−45 dB’e kadar. Uçak, metro, ofis: hepsi geri planda kalır.',
        level: 0.06,
      },
      {
        id: 'transparent',
        label: 'Şeffaf',
        text: 'Çevre sesi doğal biçimde içeri girer. Kulaklığı çıkarmadan konuşun.',
        level: 0.62,
      },
      {
        id: 'off',
        label: 'Kapalı',
        text: 'Yalnızca müzik. Saf ve işlenmemiş ses, en uzun pil ömrü.',
        level: 1,
      },
    ],
    modesLabel: 'Dinleme modu',
  },
  konfor: {
    id: 'konfor',
    side: 'left',
    kicker: '03 — Konfor',
    title: 'Saatlerce. Hissetmeden.',
    text: 'Hafıza köpüklü pedler kulağınızın şeklini alır. Yumuşak koruyucu deri ve geniş bant baskıyı dağıtır.',
    stats: [
      { value: '254 g', label: 'Toplam ağırlık' },
      { value: '8 sa+', label: 'Kesintisiz kullanım konforu' },
    ],
  },
  tasarim: {
    id: 'tasarim',
    side: 'right',
    kicker: '04 — Tasarım ve malzeme',
    title: 'Metalin dokusu. Sessiz bir duruş.',
    text: 'Fırçalanmış alüminyum halkalar, mat antrasit kasa. Menteşeler katlanır; N1 çantanıza ince bir hacimle sığar.',
    stats: [
      { value: 'Alüminyum', label: 'CNC işlenmiş halkalar' },
      { value: 'Katlanır', label: 'Çift eksenli menteşe' },
    ],
  },
  batarya: {
    id: 'batarya',
    side: 'left',
    kicker: '05 — Batarya',
    title: 'Şarjı unutun.',
    text: 'Bir kez şarj edin, haftalarca dinleyin. Acele ederseniz USB-C ile beş dakika yeter.',
    counters: [
      { value: 40, unit: 'saat', label: 'Pil ömrü (ANC açık)' },
      { value: 3, unit: 'saat', label: '5 dakikalık hızlı şarjla' },
      { value: 2, unit: 'saat', label: 'USB-C ile tam şarj', prefix: '' },
    ],
    footnote: 'USB-C · Kablolu dinleme için 3,5 mm kablo dahil',
  },
  galeri: {
    id: 'galeri',
    side: 'right',
    kicker: '06 — Galeri',
    title: 'Her açıdan bakın.',
    text: 'Modeli parmağınızla ya da fareyle döndürün. Yakınlaştırın, ayrıntıya inin.',
    open: 'Keşfet',
    close: 'Kapat',
    hint: 'Döndürmek için sürükleyin · Yakınlaştırmak için kaydırın',
  },
};

export const specs = {
  id: 'teknik',
  kicker: '07 — Teknik özellikler',
  title: 'Detaylar.',
  rows: [
    ['Sürücü', '40 mm dinamik, berilyum kaplı'],
    ['Frekans aralığı', '4 Hz – 40 kHz'],
    ['Gürültü engelleme', 'Hibrit ANC, 6 mikrofon, −45 dB'],
    ['Bağlantı', 'Bluetooth 5.3, çoklu cihaz'],
    ['Kodekler', 'LDAC, aptX Adaptive, AAC, SBC'],
    ['Pil ömrü', '40 saat (ANC açık) · 60 saat (ANC kapalı)'],
    ['Şarj', 'USB-C · 5 dk ile 3 saat dinleme'],
    ['Ağırlık', '254 g'],
    ['Malzeme', 'Alüminyum halka, mat polikarbonat, hafıza köpüğü'],
    ['Kutu içeriği', 'Taşıma kılıfı, USB-C kablo, 3,5 mm kablo'],
  ],
  price: {
    label: 'Fiyat',
    amount: '₺12.990',
    note: 'KDV dahil · 2 yıl garanti · Ücretsiz kargo',
  },
  cta: 'Şimdi Satın Al',
  ctaHref: '#satin-al',
};

export const footer = {
  columns: [
    { title: 'Ürün', links: ['NOIRA N1', 'Aksesuarlar', 'Karşılaştır'] },
    { title: 'Destek', links: ['Kullanım kılavuzu', 'Garanti', 'İletişim'] },
    { title: 'Şirket', links: ['Hakkımızda', 'Sürdürülebilirlik', 'Basın'] },
  ],
  legal: '© 2026 NOIRA. Kurgusal marka, demo içerik. Tüm hakları saklıdır.',
};

export const debugLabel = 'NOIRA N1';
