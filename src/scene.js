import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; // the body is static; redrawn when layer visibility changes

  const scene = new THREE.Scene();
  // Photographic studio lighting (Poly Haven, CC0) gives realistic reflections on skin and tissue.
  const pmrem = new THREE.PMREMGenerator(renderer);
  new HDRLoader().load(`${import.meta.env.BASE_URL}env/studio_small_09_1k.hdr`, (hdr) => {
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    dirty = true;
  });
  scene.environmentIntensity = 0.8;

  scene.add(new THREE.HemisphereLight(0xfffaf4, 0x3a3836, 0.35));
  const key = new THREE.DirectionalLight(0xfff4ea, 1.8);
  key.position.set(2.2, 4, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 2.2, bottom: -0.2, near: 0.5, far: 10 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe8ff, 0.7);
  rim.position.set(-2.5, 2.5, -3);
  scene.add(rim);

  scene.add(makeFloor());

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 60);
  camera.position.set(0, 1.0, 4.4);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.9, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.2;
  controls.maxDistance = 9;
  controls.update();

  // Render on demand: the model is heavy, so idle frames are skipped.
  let dirty = true;
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // Smooth camera moves
  let tween = null;
  const animateTo = (target, position, ms = 700) => {
    tween = {
      t0: performance.now(), ms,
      fromT: controls.target.clone(), toT: target.clone(),
      fromP: camera.position.clone(), toP: position.clone(),
    };
  };

  const frameCallbacks = [];
  const loop = (now) => {
    if (tween) {
      const u = Math.min(1, (now - tween.t0) / tween.ms);
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      controls.target.lerpVectors(tween.fromT, tween.toT, e);
      camera.position.lerpVectors(tween.fromP, tween.toP, e);
      if (u >= 1) tween = null;
      dirty = true;
    }
    if (controls.update()) dirty = true;
    for (const fn of frameCallbacks) fn(now);
    if (dirty) {
      dirty = false;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  let bodyHeight = 1.75;

  return {
    renderer, scene, camera, controls,
    onFrame: (fn) => frameCallbacks.push(fn),
    invalidate: () => { dirty = true; },
    setBodyHeight: (h) => { bodyHeight = h; },

    /** Fly to frame a bounding box, keeping the current viewing direction. */
    focusBox(box) {
      const c = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length();
      const dist = Math.max(0.45, size * 2.8);
      const dir = camera.position.clone().sub(controls.target).normalize();
      animateTo(c, c.clone().addScaledVector(dir, dist));
    },

    setView(name) {
      const t = new THREE.Vector3(0, bodyHeight * 0.52, 0);
      const d = bodyHeight * 2.2;
      const dirs = {
        front: [0, 0.08, 1], back: [0, 0.08, -1],
        left: [1, 0.08, 0], right: [-1, 0.08, 0],
        reset: [0.35, 0.12, 1],
      };
      const v = new THREE.Vector3(...(dirs[name] ?? dirs.reset)).normalize().multiplyScalar(d);
      animateTo(t, t.clone().add(v));
    },
  };
}

function makeFloor() {
  // Invisible floor that only shows the body's soft contact shadow.
  const m = new THREE.Mesh(new THREE.CircleGeometry(1.4, 64), new THREE.ShadowMaterial({ opacity: 0.28 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = -0.002;
  m.receiveShadow = true;
  m.renderOrder = -1;
  return m;
}
