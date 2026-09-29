import GUI from 'lil-gui';
import { debugLabel } from './content.js';

/** Yalnızca URL'de ?debug varken yüklenir (ayrı chunk), yayında görünmez. */
export function initDebug(stage, params) {
  const gui = new GUI({ title: `${debugLabel} · debug` });
  gui.close();
  const sync = () => stage.syncParams();

  const light = gui.addFolder('Işık');
  light.add(params, 'exposure', 0.3, 2.5, 0.01).name('exposure').onChange(sync);
  light.add(params, 'envIntensity', 0, 2, 0.01).name('env intensity').onChange(sync);
  light.add(params, 'keyIntensity', 0, 20, 0.1).name('key').onChange(sync);
  light.add(params, 'rimIntensity', 0, 30, 0.1).name('rim').onChange(sync);
  light.add(params, 'fillIntensity', 0, 2, 0.01).name('fill').onChange(sync);
  light.add(params, 'spotIntensity', 0, 1.5, 0.01).name('arka spot').onChange(sync);

  const post = gui.addFolder('Post');
  post.add(params, 'bloomStrength', 0, 1, 0.01).name('bloom').onChange(sync);
  post.add(params, 'bloomThreshold', 0, 2, 0.01).name('bloom eşik').onChange(sync);
  post.add(params, 'bloomRadius', 0, 1, 0.01).name('bloom yarıçap').onChange(sync);
  post.add(params, 'vignette', 0, 1.2, 0.01).onChange(sync);
  post.add(params, 'grain', 0, 0.15, 0.001).onChange(sync);

  const mat = gui.addFolder('Materyal');
  mat.add(params, 'metalDark', 0.2, 1.2, 0.01).name('metal koyuluk').onChange(sync);
  mat.add(params, 'roughMin', 0, 1, 0.01).name('roughness tabanı').onChange(sync);
  mat.add(params, 'metalRough', 0, 0.8, 0.01).name('metal roughness+').onChange(sync);
  mat.add(params, 'metalness', 0, 1, 0.01).name('metalness').onChange(sync);
  mat.add(params, 'clearcoat', 0, 1, 0.01).name('kasa clearcoat').onChange(sync);
  gui.add(params, 'shadowOpacity', 0, 1, 0.01).name('gölge').onChange(sync);
}
