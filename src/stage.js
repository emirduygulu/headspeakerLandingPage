import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'; // RGBELoader'ın r180+ adı
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const MODEL_URL = `${import.meta.env.BASE_URL}models/headphones.glb`;
const HDR_URL = `${import.meta.env.BASE_URL}hdr/studio.hdr`;
const MODEL_HEIGHT = 2.2; // normalize sonrası modelin yüksekliği (dünya birimi)

/** Ayarlanabilir sahne parametreleri (lil-gui buraya bağlanır). */
export const params = {
  exposure: 1.0,
  envIntensity: 1.0, // önerilen aralık 0.8–1.2
  keyIntensity: 5.5,
  rimIntensity: 9,
  fillIntensity: 0.22,
  bloomStrength: 0.16,
  bloomThreshold: 0.92,
  bloomRadius: 0.5,
  vignette: 0.55,
  grain: 0.035,
  shadowOpacity: 0.85,
  spotIntensity: 0.42,
  clearcoat: 0.5,
  metalDark: 0.42, // metal bölgelerde baz rengi karartma (1 = dokudaki gibi)
  roughMin: 0.42, // tüm yüzeylerde roughness tabanı (dokudaki yarı-parlak pişmiş bölgeleri mat'a çeker)
  metalRough: 0.22, // metal bölgelere eklenen roughness (fırçalanmış görünüm)
  metalness: 0.9,
};

// ---------------------------------------------------------------------------------------------
// Arka plan: koyu antrasit → siyah radyal gradient + modelin arkasında yumuşak "spot" parlaması.
// Tam ekran üçgen olarak çizilir; sahnenin parçası olduğu için post-processing'e dahildir.
// ---------------------------------------------------------------------------------------------
function createBackground() {
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uInner: { value: new THREE.Color('#17191d') },
      uOuter: { value: new THREE.Color('#020203') },
      uSpotColor: { value: new THREE.Color('#56616d') },
      uSpot: { value: new THREE.Vector2(0.5, 0.5) },
      uSpotRadius: { value: 0.34 },
      uSpotIntensity: { value: params.spotIntensity },
      uAspect: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 1.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInner, uOuter, uSpotColor;
      uniform vec2 uSpot;
      uniform float uSpotRadius, uSpotIntensity, uAspect;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 c = (vUv - vec2(0.5, 0.56)) * vec2(uAspect, 1.0);
        vec3 col = mix(uInner, uOuter, smoothstep(0.0, 0.95, length(c)));
        vec2 q = (vUv - uSpot) * vec2(uAspect, 1.0);
        col += uSpotColor * exp(-dot(q, q) / (uSpotRadius * uSpotRadius)) * uSpotIntensity;
        col += (hash(gl_FragCoord.xy) - 0.5) / 255.0; // banding'i kırar
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  return mesh;
}

// Vignette + film grain (tone mapping'den sonra, ekran uzayında).
const FilmShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.5 }, uGrain: { value: 0.03 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(41.31, 289.13)) + uTime) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      c.rgb *= 1.0 - uVignette * smoothstep(0.3, 0.95, d);
      c.rgb += (hash(vUv * 1024.0) - 0.5) * uGrain;
      gl_FragColor = c;
    }`,
};

// Yumuşak temas gölgesi: blur'lu radyal gradient dokusu taşıyan zemin düzlemi (zemin görünmez).
function createContactShadow() {
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(0,0,0,1)');
  grd.addColorStop(0.35, 'rgba(0,0,0,0.65)');
  grd.addColorStop(0.7, 'rgba(0,0,0,0.18)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: params.shadowOpacity,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  return mesh;
}

export function detectQuality() {
  const q = new URLSearchParams(location.search).get('quality');
  if (q === 'high') return { post: true };
  if (q === 'low') return { post: false };
  const cores = navigator.hardwareConcurrency || 8;
  const mem = navigator.deviceMemory || 8;
  return { post: !(cores <= 4 || mem <= 2) };
}

export async function createStage({ canvas, onProgress, reducedMotion = false, isMobile = false }) {
  const quality = detectQuality();
  const maxDpr = isMobile ? 1.5 : 2;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = params.exposure;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(camera);

  const bg = createBackground();
  scene.add(bg);

  // ---- Işıklar: lightRig kameranın azimutunu takip eder; rim ışıkları hep silüeti çerçeveler.
  RectAreaLightUniformsLib.init();
  const lightRig = new THREE.Group();
  scene.add(lightRig);

  const key = new THREE.RectAreaLight(0xfff4ea, params.keyIntensity, 4.5, 4.5); // sol üst, geniş, yumuşak
  key.position.set(-3.6, 4.2, 4.2);
  key.lookAt(0, 0, 0);
  lightRig.add(key);

  const rimColor = 0xa9c6ff; // soğuk beyaz-mavi
  const rimR = new THREE.RectAreaLight(rimColor, params.rimIntensity, 0.9, 5.5);
  rimR.position.set(3.8, 0.8, -4.2);
  rimR.lookAt(0, 0, 0);
  const rimL = new THREE.RectAreaLight(0xc5dbff, params.rimIntensity, 0.9, 5.5);
  rimL.position.set(-3.8, 0.8, -4.2);
  rimL.lookAt(0, 0, 0);
  lightRig.add(rimR, rimL);

  const fill = new THREE.DirectionalLight(0x8fa3bd, params.fillIntensity); // gölgeleri kapatmayan çok düşük fill
  fill.position.set(3, 0.5, 4);
  lightRig.add(fill);

  // ---- Post-processing
  let composer = null;
  let bloom = null;
  let film = null;
  const size = new THREE.Vector2(1, 1);

  function buildComposer() {
    const dpr = renderer.getPixelRatio();
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, target);
    composer.setPixelRatio(dpr);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), params.bloomStrength, params.bloomRadius, params.bloomThreshold);
    composer.addPass(bloom);
    composer.addPass(new OutputPass()); // ACES + sRGB burada uygulanır
    film = new ShaderPass(FilmShader);
    composer.addPass(film);
    composer.setSize(size.x, size.y);
  }
  if (quality.post) buildComposer();

  function disablePost() {
    if (!composer) return;
    composer.dispose();
    composer = null;
    document.body.classList.add('no-post');
  }
  document.body.classList.toggle('no-post', !quality.post);

  // ---- Yükleme (gerçek bayt ilerlemesi: HDR + GLB)
  const prog = { hdr: [0, 1_600_000], glb: [0, 2_200_000] };
  const report = () => {
    const loaded = prog.hdr[0] + prog.glb[0];
    const total = prog.hdr[1] + prog.glb[1];
    onProgress?.(Math.min(1, loaded / total));
  };
  const track = (key) => (e) => {
    if (e.lengthComputable && e.total) prog[key] = [e.loaded, e.total];
    else prog[key][0] = e.loaded;
    report();
  };

  const pmrem = new THREE.PMREMGenerator(renderer);
  const hdrPromise = new HDRLoader().loadAsync(HDR_URL, track('hdr')).then((tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const env = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
    pmrem.dispose();
    scene.environment = env; // arka plan ayrı (bg mesh), env sadece aydınlatma/yansıma
    scene.environmentIntensity = params.envIntensity;
    return env;
  });

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltfPromise = loader.loadAsync(MODEL_URL, track('glb'));

  const [, gltf] = await Promise.all([hdrPromise, gltfPromise]);

  // ---- Model: node/materyal isimlerini logla, ortala, normalize et
  const model = gltf.scene;
  console.groupCollapsed('[NOIRA] GLB içeriği');
  model.traverse((o) => {
    const mats = o.material ? [].concat(o.material).map((m) => m.name || '(isimsiz)') : [];
    console.log(`${o.type.padEnd(12)} "${o.name || '(isimsiz)'}"`, mats.length ? `materyal: ${mats.join(', ')}` : '');
  });
  console.groupEnd();

  const pivot = new THREE.Group(); // dönüş/ölçek pivotu
  scene.add(pivot);
  pivot.add(model);

  const box0 = new THREE.Box3().setFromObject(model);
  const size0 = box0.getSize(new THREE.Vector3());
  const center0 = box0.getCenter(new THREE.Vector3());
  const scale = MODEL_HEIGHT / size0.y;
  model.position.sub(center0); // pivot'u geometrik merkeze taşı (dosyadaki pivot kaymış olabilir)
  pivot.scale.setScalar(scale);
  pivot.updateMatrixWorld(true);
  console.log('[NOIRA] ham bbox boyutu', size0.toArray().map((v) => +v.toFixed(3)), 'ölçek', +scale.toFixed(3));

  // ---- Materyal düzeltmeleri (dosya Tripo'dan geldiği için dokuda pişmiş ışık olabilir)
  const shaderTweaks = [];
  const matUniforms = {
    uMetalDark: { value: params.metalDark },
    uMetalRough: { value: params.metalRough },
    uMetalScale: { value: params.metalness },
    uRoughMin: { value: params.roughMin },
  };
  model.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.material;
    console.log('[NOIRA] materyal', src.name, {
      map: !!src.map, normalMap: !!src.normalMap, mr: !!src.metalnessMap,
      metalness: src.metalness, roughness: src.roughness,
    });
    // Tek materyal tüm parçaları kapsıyor. Physical'a çevirip clearcoat'i yalnızca pürüzsüz (kasa/halka)
    // bölgelere veriyoruz: kumaş/deri (yüksek roughness) clearcoat almaz.
    const mat = new THREE.MeshPhysicalMaterial({
      name: src.name,
      map: src.map,
      normalMap: src.normalMap,
      normalScale: src.normalScale,
      metalnessMap: src.metalnessMap,
      roughnessMap: src.roughnessMap,
      aoMap: src.aoMap,
      metalness: 1, // glTF: faktör × doku (B kanalı)
      roughness: 1,
      clearcoat: params.clearcoat,
      clearcoatRoughness: 0.32,
      envMapIntensity: 1,
    });
    // Düzeltme: dokudaki metal parçalar krom aynası gibi parlak ve açık gri geliyor; markanın koyu antrasit /
    // fırçalanmış alüminyum hissine uymuyor. Metalness maskesiyle yalnızca metal bölgelerde (1) baz rengi
    // karartıyor, (2) roughness ekliyor, (3) metalness'i biraz kısıyoruz. Ped/bant (yüksek roughness,
    // düşük metalness) etkilenmez.
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, matUniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform float uMetalDark;\nuniform float uMetalRough;\nuniform float uMetalScale;\nuniform float uRoughMin;\nvoid main() {')
        .replace(
          '#include <metalnessmap_fragment>',
          `#include <metalnessmap_fragment>
           float mMask = smoothstep(0.08, 0.55, metalnessFactor);
           diffuseColor.rgb *= mix(1.0, uMetalDark, mMask);
           roughnessFactor = clamp(max(roughnessFactor, uRoughMin) + uMetalRough * mMask, 0.04, 1.0);
           metalnessFactor *= uMetalScale;`,
        )
        .replace(
          '#include <lights_physical_fragment>',
          `#include <lights_physical_fragment>
           #ifdef USE_CLEARCOAT
             material.clearcoat *= smoothstep(0.62, 0.3, roughnessFactor); // sadece pürüzsüz yüzeyler
           #endif`,
        );
    };
    src.dispose?.();
    o.material = mat;
    shaderTweaks.push(mat);
    o.frustumCulled = false;
  });

  // ---- Landmark'lar: tek mesh olduğundan bölgeleri vertex dağılımından türetiyoruz (isim tahmini yok)
  const landmarks = computeLandmarks(model, pivot);
  console.log('[NOIRA] landmark\'lar', JSON.parse(JSON.stringify(landmarks)));

  // Shader'ları paralel derle: ilk karede ana thread'i bloklamaz (TBT'yi düşürür).
  await renderer.compileAsync(scene, camera).catch(() => {});

  // ---- Zemin gölgesi
  const shadow = createContactShadow();
  const halfH = MODEL_HEIGHT / 2;
  shadow.position.set(0, -halfH - 0.01, 0);
  shadow.scale.set(landmarks.halfW * 2.6, landmarks.halfW * 1.1, 1); // düzlem XZ'de: scale.y -> z ekseni
  scene.add(shadow);

  // ---- Boyut/kamera
  function setSize(w, h) {
    size.set(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(w, h, false);
    composer?.setPixelRatio(renderer.getPixelRatio());
    composer?.setSize(w, h);
    camera.aspect = w / h;
    bg.material.uniforms.uAspect.value = w / h;
  }

  const tmp = new THREE.Vector3();
  const camState = { az: 0 };

  /** state: {target:[x,y,z], dist, az, el, rotY, shiftX, shiftY, veil, spot} */
  function applyState(s) {
    const aspect = size.x / size.y;
    // Dikey ekranda model kadrajdan taşmasın: mesafeyi en/boy oranına göre büyüt.
    const fit = Math.pow(Math.max(1, 1 / aspect), 0.72);
    const d = s.dist * fit;
    const az = THREE.MathUtils.degToRad(s.az);
    const el = THREE.MathUtils.degToRad(s.el);
    tmp.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d);
    camera.position.set(s.target[0] + tmp.x, s.target[1] + tmp.y, s.target[2] + tmp.z);
    camera.lookAt(s.target[0], s.target[1], s.target[2]);
    // shiftX/Y: görüntüyü ekran genişliği/yüksekliği oranında kaydırır (metin panelinin karşı tarafına).
    camera.setViewOffset(size.x, size.y, -s.shiftX * size.x, s.shiftY * size.y, size.x, size.y);
    pivot.rotation.y = THREE.MathUtils.degToRad(s.rotY);
    lightRig.rotation.y = az;
    camState.az = az;
    bg.material.uniforms.uSpot.value.set(0.5 + s.shiftX, 0.5 + s.shiftY);
    bg.material.uniforms.uSpotIntensity.value = params.spotIntensity * (s.spot ?? 1);
  }

  /** Dışarıdan (OrbitControls) yönetilen kamera için: ışık rig'ini kameranın azimutuna hizala. */
  function syncLightsToCamera() {
    lightRig.rotation.y = Math.atan2(camera.position.x, camera.position.z);
    bg.material.uniforms.uSpot.value.set(0.5, 0.5);
  }

  function syncParams() {
    renderer.toneMappingExposure = params.exposure;
    scene.environmentIntensity = params.envIntensity;
    key.intensity = params.keyIntensity;
    rimR.intensity = rimL.intensity = params.rimIntensity;
    fill.intensity = params.fillIntensity;
    if (bloom) {
      bloom.strength = params.bloomStrength;
      bloom.threshold = params.bloomThreshold;
      bloom.radius = params.bloomRadius;
    }
    if (film) {
      film.uniforms.uVignette.value = params.vignette;
      film.uniforms.uGrain.value = reducedMotion ? 0 : params.grain;
    }
    shadow.material.opacity = params.shadowOpacity;
    bg.material.uniforms.uSpotIntensity.value = params.spotIntensity;
    for (const m of shaderTweaks) m.clearcoat = params.clearcoat;
    matUniforms.uMetalDark.value = params.metalDark;
    matUniforms.uMetalRough.value = params.metalRough;
    matUniforms.uMetalScale.value = params.metalness;
    matUniforms.uRoughMin.value = params.roughMin;
  }
  syncParams();

  function render(time) {
    if (film) film.uniforms.uTime.value = reducedMotion ? 0 : time % 100;
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  return {
    renderer, scene, camera, pivot, landmarks, params, quality,
    setSize, applyState, syncParams, syncLightsToCamera, render, disablePost,
    get hasPost() { return !!composer; },
    lights: { key, rimR, rimL, fill },
  };
}

/** Vertex dağılımından kabaca bölgeleri (kasalar, bant tepesi) çıkarır. Değerler pivot-yerel uzayda. */
function computeLandmarks(model, pivot) {
  const v = new THREE.Vector3();
  const inv = new THREE.Matrix4().copy(pivot.matrixWorld).invert();
  const pts = [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const step = Math.max(1, Math.floor(pos.count / 60000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m);
      pts.push(v.x, v.y, v.z);
    }
  });
  // pivot ölçeği dahil dünya birimine çevir (pivot rotasyonu 0 iken)
  const s = pivot.scale.x;
  const box = new THREE.Box3();
  for (let i = 0; i < pts.length; i += 3) box.expandByPoint(v.set(pts[i] * s, pts[i + 1] * s, pts[i + 2] * s));
  const min = box.min, max = box.max;
  const halfW = (max.x - min.x) / 2, halfD = (max.z - min.z) / 2;

  const region = (test) => {
    const acc = { n: 0, x: 0, y: 0, z: 0, minX: 1e9, maxX: -1e9 };
    for (let i = 0; i < pts.length; i += 3) {
      const x = pts[i] * s, y = pts[i + 1] * s, z = pts[i + 2] * s;
      if (!test(x, y, z)) continue;
      acc.n++; acc.x += x; acc.y += y; acc.z += z;
      acc.minX = Math.min(acc.minX, x); acc.maxX = Math.max(acc.maxX, x);
    }
    const n = Math.max(1, acc.n);
    return { x: acc.x / n, y: acc.y / n, z: acc.z / n, n: acc.n, minX: acc.minX, maxX: acc.maxX };
  };

  // Yalnızca y < 0: menteşe/bant parçaları ortalamayı yukarı çekmesin (kasalar aşağıda asılı).
  const cupR = region((x, y) => x > max.x * 0.7 && y < 0);
  const cupL = region((x, y) => x < min.x * 0.7 && y < 0);
  const top = region((x, y) => y > max.y * 0.85);

  return {
    min: min.toArray(), max: max.toArray(), halfW, halfD,
    halfH: (max.y - min.y) / 2,
    cupR, cupL, top,
  };
}
