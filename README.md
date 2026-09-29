# NOIRA N1 — Sinematik ürün landing page'i

Scroll ile ilerleyen, kurgusal bir kulaklık markası (NOIRA) için 3B ürün sayfası.
Vite + three.js + GSAP ScrollTrigger + Lenis. Framework yok (gerekçe: sayfa tek bir sabit canvas ve DOM metninden ibaret, R3F'in bileşen modeli gereksiz).

## Kurulum

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
npm run preview    # build'i yerelde dene
```

Debug paneli (lil-gui): `http://localhost:5173/?debug` — yayında (parametresiz) yüklenmez.
Kalite zorlama: `?quality=high` (post-processing açık, otomatik düşürme kapalı) / `?quality=low`.

## GLB'yi optimize etme

Orijinal (64 MB) `assets/headphones.original.glb` olarak yedeklidir. Yayındaki dosya `public/models/headphones.glb` (**2,1 MB**).

```bash
npm run optimize
# = gltf-transform optimize assets/headphones.original.glb public/models/headphones.glb \
#     --compress meshopt --texture-compress webp --texture-size 2048 --simplify-error 0.0002
```

- Model tek mesh / tek materyaldı ve 1,9 milyon üçgen içeriyordu. `--simplify-error 0.0002` ile ~250 bin üçgene iner, silüet ve normal map detayı görsel olarak korunur.
- Daha da küçültmek için `--texture-size 1024` deneyin (görsel fark özellikle ped/bant makro çekimlerinde belirir).
- Hata değerleri: `0.0001` ≈ 700 bin üçgen / 4,5 MB, `0.0003` ≈ 120 bin üçgen / 1,4 MB.
- Yükleyici: `GLTFLoader` + `MeshoptDecoder` (Draco/KTX2 kullanılmıyor; WebP dokuları tarayıcı çözer).

Konsolda `[NOIRA] GLB içeriği` grubu tüm node ve materyal isimlerini yazdırır.

## Işık ve render ayarları

Tüm varsayılanlar `src/stage.js` içindeki `params` nesnesindedir (`?debug` paneli aynı değerleri canlı değiştirir):

| Parametre | Anlamı |
|---|---|
| `exposure` | ACES tone mapping pozlaması |
| `envIntensity` | HDRI şiddeti (0.8–1.2 önerilir) |
| `keyIntensity` | Sol üst geniş RectAreaLight |
| `rimIntensity` | Arkadan sağ/sol soğuk beyaz-mavi kenar ışıkları |
| `fillIntensity` | Çok düşük dolgu ışığı |
| `bloomStrength/Threshold/Radius` | Çok hafif bloom (yalnız parlak metal vurguları) |
| `vignette`, `grain` | Vignette ve ince film grain |
| `metalDark`, `metalRough`, `roughMin`, `metalness`, `clearcoat` | Materyal düzeltmeleri (aşağıya bakın) |

- HDRI: `public/hdr/studio.hdr` (Poly Haven "studio_small_09", CC0). Değiştirmek için aynı yola başka bir `.hdr` koyun. `scene.environment` olarak kullanılır; arka plan ayrı bir gradient shader'dır.
- Işıklar kameranın azimutunu takip eden bir rig içindedir, böylece rim ışıkları hangi açıdan bakılırsa bakılsın silüeti çizer.
- **Materyal düzeltmesi:** Tripo dokusunda metaller krom aynası gibi parlaktı. Tek materyal olduğundan, metalness dokusunu maske olarak kullanan bir shader düzeltmesi var (`stage.js`, `onBeforeCompile`): metal bölgelerde baz rengi karartır, roughness ekler, tüm yüzeylere roughness tabanı koyar ve clearcoat'i yalnız pürüzsüz yüzeylere verir.

## Kamera pozları ve içerik

- `src/content.js` — **tüm metinler ve teknik değerler** (marka, bölümler, ANC modları, sayaçlar, tablo, fiyat, footer).
- `src/poses.js` — her bölüm için kamera hedefi, mesafe, azimut/elevasyon, model rotasyonu, ekran kaydırması (masaüstü/mobil ayrı). Hedefler bounding box + vertex dağılımından türetilir (model tek mesh olduğundan isimlerden değil).
- `src/style.css` — tasarım token'ları (`:root`): renk, tipografi, boşluk, hareket.
- `src/stage.js` — renderer, HDRI, ışıklar, arka plan, gölge, post-processing, model yükleme.
- `src/main.js` — loader, Lenis/ScrollTrigger, kamera sönümlemesi, galeri (OrbitControls), performans koruması.

## Tasarım sistemi

`ui-ux-pro-max` skill'i ile belirlendi (`.claude/skills/ui-ux-pro-max`): Parallax Storytelling düzeni + Dark OLED stili, Space Grotesk (başlık) / DM Sans (gövde), tek vurgu rengi buz mavisi (`#9cccff`), 4 px boşluk ölçeği, sakin ease-out hareket dili. Not: skill'in önerdiği Syncopate fontu Türkçe karakterleri (İ, Ğ, Ş) desteklemediği için Space Grotesk seçildi.

## Performans ve erişilebilirlik

- DPR üst sınırı 2 (dokunmatik cihazlarda 1.5). Sekme gizliyken render durur.
- Zayıf cihaz (≤4 çekirdek / ≤2 GB) post-processing'siz açılır; çalışırken kare hızı düşükse post kapatılır ve çözünürlük 1'e iner.
- `prefers-reduced-motion`: Lenis yok, kamera geçişleri anlık, hero salınımı/grain/giriş animasyonları yok, sayaçlar son değerde.
- Dikey ekranda kamera mesafesi en/boy oranına göre büyür; paneller altta, model üstte durur.
- Klavye: tüm butonlar odaklanabilir, ANC sekmeleri ok tuşlarıyla, galeri oklarla/`+`/`-` ile döner, `Esc` kapatır. Canvas'ta `aria-label` var.

## Lighthouse (production build, yerel ölçüm)

| | Perf | A11y | Best Pract. | SEO | FCP | LCP¹ | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Masaüstü | 58 | 100 | 100 | 100 | 0,6 sn | 3,3 sn | 610 ms | 0,004 |
| Mobil (4× CPU yavaşlatma) | 41 | 100 | 100 | 100 | 2,7 sn | 19,7 sn | 2,9 sn | 0,003 |

¹ Bu ölçümler **GPU'suz** (SwiftShader yazılım WebGL) ortamda alındı; shader derleme, PMREM ve model çözme CPU'da koştuğundan TBT/LCP gerçek cihazlardan çok kötü çıkıyor. Aynı ortamda gerçek tarayıcı ölçümünde LCP (hero başlığı) ≈ 1,2 sn. Gerçek cihaz ölçümü için Chrome DevTools > Lighthouse'ı GPU'lu bir makinede çalıştırın.

Skoru yükseltmek için sıradaki adımlar:
1. `three` paketini tree-shake edilmiş (yalnız kullanılan sınıflar) bir bundle'a indirmek; ana chunk şu an 853 KB (gzip 276 KB).
2. Sahne kurulumunu (`createStage`) bir Web Worker + `OffscreenCanvas` içine almak; ana thread bloklaması (TBT) belirgin düşer.
3. Mobilde `--texture-size 1024` ile ikinci bir GLB (`headphones.mobile.glb`) sunmak ve HDRI'yi 512 px'e indirmek.
4. HDRI'yi `.hdr` yerine önceden PMREM'lenmiş KTX2'ye çevirmek (PMREM maliyeti kalkar).
5. Google Fonts yerine fontları kendi sunucudan (`woff2`, yalnız latin + latin-ext) yayınlamak.

## Bilinen sınırlar

- Model tek mesh ve tek materyal olduğundan parça bazlı (yalnız port, yalnız halka) materyal/ışık ayarı yapılamıyor; kasa merkezleri vertex dağılımından tahmin ediliyor. Parçalara ayrılmış bir GLB ile pozlar tek satırla daha hassas hedeflenebilir.
- Dokudaki pişmiş ışık tamamen giderilemez; pedin iç yüzü hâlâ hafif metalik parlar.
- SSAO eklenmedi (post zaten hafif tutuldu; gölge için contact-shadow düzlemi yeterli).
- Tüm teknik değerler, fiyat ve marka **kurgusaldır**.
