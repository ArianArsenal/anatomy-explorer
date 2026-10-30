import * as THREE from 'three';
import { loadBody, LAYERS } from './body/loadBody.js';
import { clipPlane, setCutShading } from './body/materials.js';

// Highlights tint a part's instance colour toward these (amount = how far).
const HIGHLIGHT = {
  selected: { color: new THREE.Color(0x4f9dff), amount: 0.6 },
  hover: { color: new THREE.Color(0xffffff), amount: 0.3 },
  // Muscles worked by the selected exercise; the other muscles turn neutral so these stand out.
  // (Workout heatmaps pass their own { color, amount } per muscle.)
  primary: { color: new THREE.Color(0xff3a12), amount: 0.85 },
  secondary: { color: new THREE.Color(0xffc53d), amount: 0.8 },
  neutral: { color: new THREE.Color(0xc4b8b4), amount: 0.82 },
};

/**
 * Cross-section planes: which coordinate they cut, and which side is kept by default
 * (+1 keeps larger values). Coronal keeps the back, sagittal the body's left, axial the part below.
 */
const SLICE_AXES = { coronal: { dim: 'z', keep: -1 }, sagittal: { dim: 'x', keep: 1 }, axial: { dim: 'y', keep: -1 } };

// How far each part moves in the exploded view, relative to its centre (sideways more than up/down),
// plus an outward push per layer so outer layers peel away from inner ones.
const EXPLODE_SPREAD = new THREE.Vector3(1.2, 0.3, 1.2);
const EXPLODE_LAYER_PUSH = 0.045;
const LAYER_DEPTH = Object.fromEntries(LAYERS.map((l) => [l.id, l.order - 1]));

/**
 * Central state: current body, per-layer visibility/opacity, selection, hover,
 * isolation and temporary flashes. UI modules talk to each other only through
 * this object and its events.
 */
export function createApp(view) {
  const listeners = {};
  const app = {
    view,
    body: null,
    layers: Object.fromEntries(LAYERS.map((l) => [l.id, { visible: true, opacity: 1 }])),
    selectedKey: null,
    hoverKey: null,
    isolateKey: null,
    flashes: new Map(), // key -> { color, until }
    muscleTint: new Map(), // key -> 'primary' | 'secondary' | 'neutral' | { color, amount }
    _tinted: new Map(), // key -> highlight currently applied to its instances
    muscleHidden: new Set(), // keys hidden so a deep exercise target can be seen
    _hidden: [], // [batch, instanceId] pairs currently hidden by isolation or an exercise
    slice: { axis: null, pos: 0.5, flip: false }, // axis: null | 'coronal' | 'sagittal' | 'axial'
    explode: 0, // 0 = assembled, 1 = fully exploded
    _shadowTimer: 0,

    on(evt, fn) { (listeners[evt] ??= []).push(fn); },
    emit(evt, data) { for (const fn of listeners[evt] ?? []) fn(data); },

    async loadBody(onProgress) {
      const body = await loadBody(onProgress);
      if (app.body) app.body.dispose();
      app.body = body;
      app._tinted.clear();
      app._hidden = [];
      app.body.bounds = new THREE.Box3();
      for (const p of app.body.parts.values()) app.body.bounds.union(p.box);
      view.scene.add(app.body.root);
      view.setBodyHeight(app.body.P.H);
      app.setSlice({});
      if (app.explode) app.setExplode(app.explode);
      if (app.selectedKey && !app.body.parts.has(app.selectedKey)) app.selectedKey = null;
      if (app.isolateKey && !app.body.parts.has(app.isolateKey)) app.isolateKey = null;
      app.hoverKey = null;
      app.applyVisibility();
      app.refreshHighlights();
      app.emit('body', app.body);
      app.emit('select', app.part(app.selectedKey));
    },

    part: (key) => (key && app.body ? app.body.parts.get(key) ?? null : null),

    setLayer(id, patch) {
      Object.assign(app.layers[id], patch);
      app.applyVisibility();
      app.emit('layers', app.layers);
    },

    setAllLayers(map) {
      for (const l of LAYERS) Object.assign(app.layers[l.id], map[l.id] ?? { visible: false });
      app.applyVisibility();
      app.emit('layers', app.layers);
    },

    /** Opacity a layer is drawn with (0 = hidden), taking isolation into account. */
    layerOpacity(layer) {
      if (app.isolateKey) return app.part(app.isolateKey)?.layer === layer ? 1 : 0;
      const L = app.layers[layer];
      return L.visible ? L.opacity : 0;
    },

    applyVisibility() {
      if (!app.body) return;
      const iso = app.part(app.isolateKey);
      const isoBatches = new Set(iso?.items.map((it) => it.batch));

      // Per-instance visibility: isolation hides everything else in the isolated part's batches;
      // otherwise an exercise may hide muscles covering its target. Restore, then hide again.
      for (const [b, i] of app._hidden) b.setVisibleAt(i, true);
      app._hidden = [];
      const hide = (b, i) => {
        b.setVisibleAt(i, false);
        app._hidden.push([b, i]);
      };
      if (iso) {
        for (const b of isoBatches) b.userData.keys.forEach((k, i) => k !== iso.key && hide(b, i));
      } else {
        for (const key of app.muscleHidden) for (const { batch, instanceId } of app.part(key)?.items ?? []) hide(batch, instanceId);
      }

      for (const b of app.body.batches) {
        const { layer, alpha, prepass } = b.userData;
        const o = (iso ? (isoBatches.has(b) ? 1 : 0) : app.layerOpacity(layer)) * alpha;
        const mat = b.material;
        const transparent = o < 0.999;
        b.visible = o > 0.01;
        if (mat.transparent !== transparent) {
          mat.transparent = transparent;
          mat.needsUpdate = true;
        }
        mat.opacity = o;
        // The prepass draws the batch geometry unmoved, so it would mask exploded parts.
        prepass.visible = b.visible && transparent && !app.explode;
      }
      app.scheduleShadow();
      view.invalidate();
    },

    /** Redrawing the shadow map is costly; wait until slider drags settle. */
    scheduleShadow() {
      clearTimeout(app._shadowTimer);
      app._shadowTimer = setTimeout(() => {
        view.renderer.shadowMap.needsUpdate = true;
        view.invalidate();
      }, 200);
    },

    /** Cut the body with a plane: { axis, pos (0–1 across the body), flip (keep the other half) }. */
    setSlice(patch) {
      Object.assign(app.slice, patch);
      const { axis, pos, flip } = app.slice;
      const a = SLICE_AXES[axis];
      const on = !!(a && app.body);
      setCutShading(on);
      view.renderer.localClippingEnabled = on; // clipping costs a few % of frame time, so only while slicing
      if (!a || !app.body) {
        clipPlane.set(new THREE.Vector3(0, 1, 0), 1e6);
      } else {
        const { min, max } = app.body.bounds;
        const at = min[a.dim] + (max[a.dim] - min[a.dim]) * pos;
        const sign = flip ? -a.keep : a.keep;
        const normal = new THREE.Vector3();
        normal[a.dim] = sign;
        clipPlane.set(normal, -sign * at); // keeps points where sign * (coordinate - at) > 0
      }
      app.scheduleShadow();
      view.invalidate();
      app.emit('slice', app.slice);
    },

    /** Whether a world-space box lies entirely in the half removed by the slicer. */
    isSlicedAway(box) {
      if (!app.slice.axis) return false;
      const n = clipPlane.normal;
      const far = new THREE.Vector3(n.x > 0 ? box.max.x : box.min.x, n.y > 0 ? box.max.y : box.min.y, n.z > 0 ? box.max.z : box.min.z);
      return clipPlane.distanceToPoint(far) < 0;
    },

    /** Point is in the half removed by the slicer (raycasts ignore clipping, so picking checks this). */
    isPointSlicedAway: (p) => !!app.slice.axis && clipPlane.distanceToPoint(p) < 0,

    /** Pull every part away from the body's centre line by a fraction f (0–1). */
    setExplode(f) {
      app.explode = f;
      if (!app.body) return;
      const { H } = app.body.P;
      const m = new THREE.Matrix4();
      for (const p of app.body.parts.values()) {
        if (!p.explodeDir) {
          const c = p.box.getCenter(new THREE.Vector3());
          const out = new THREE.Vector3(c.x, 0, c.z);
          const r = out.length();
          p.explodeDir = new THREE.Vector3(c.x, c.y - H * 0.5, c.z).multiply(EXPLODE_SPREAD);
          if (r > 0.01) p.explodeDir.addScaledVector(out, (LAYER_DEPTH[p.layer] * EXPLODE_LAYER_PUSH) / r);
        }
        m.makeTranslation(p.explodeDir.x * f, p.explodeDir.y * f, p.explodeDir.z * f);
        for (const { batch, instanceId } of p.items) batch.setMatrixAt(instanceId, m);
      }
      // Culling uses the batch bounds, which must follow the moved instances.
      for (const b of app.body.batches) {
        b.computeBoundingBox();
        b.computeBoundingSphere();
      }
      app.applyVisibility();
      app.emit('explode', f);
    },

    /** Whether a part can currently be hovered or clicked. */
    isPickablePart(part) {
      if (!part) return false;
      if (app.isolateKey) return part.key === app.isolateKey;
      return app.layerOpacity(part.layer) >= 0.15 && !app.isSlicedAway(app.partBox(part.key));
    },

    /** Batches worth raycasting against right now. */
    pickableBatches() {
      if (!app.body) return [];
      if (app.isolateKey) return app.part(app.isolateKey)?.items.map((it) => it.batch) ?? [];
      return app.body.batches.filter((b) => b.visible && app.layerOpacity(b.userData.layer) >= 0.15);
    },

    select(key) {
      app.selectedKey = key;
      app.refreshHighlights();
      app.emit('select', app.part(key));
    },

    hover(key) {
      if (key === app.hoverKey) return;
      app.hoverKey = key;
      app.refreshHighlights();
    },

    isolate(key) {
      app.isolateKey = key;
      app.applyVisibility();
      app.emit('isolate', key);
    },

    /** Make sure a part can be seen: switch its layer on and leave isolation. */
    reveal(key) {
      const p = app.part(key);
      if (!p) return;
      if (app.isolateKey && app.isolateKey !== key) app.isolate(null);
      const L = app.layers[p.layer];
      if (!L.visible || L.opacity < 0.25) app.setLayer(p.layer, { visible: true, opacity: Math.max(L.opacity, 1) });
    },

    /** World-space bounds of a part as currently drawn. */
    partBox(key) {
      const p = app.part(key);
      if (!p) return new THREE.Box3();
      if (!app.explode || !p.explodeDir) return p.box;
      return p.box.clone().translate(p.explodeDir.clone().multiplyScalar(app.explode));
    },

    focus(key) {
      if (!app.part(key)) return;
      view.focusBox(app.partBox(key));
    },

    /**
     * Tint muscles for an exercise or workout: Map key → a HIGHLIGHT role name or a { color, amount }
     * object, or null to clear. Muscles not in the map turn neutral so the tinted ones stand out.
     * `hidden` lists muscles to hide because they cover a deep target.
     */
    setMuscleTint(map, hidden = []) {
      app.muscleHidden = new Set(map?.size ? hidden : []);
      app.applyVisibility();
      app.muscleTint = new Map();
      if (map?.size && app.body) {
        for (const p of app.body.parts.values()) if (p.layer === 'muscles') app.muscleTint.set(p.key, 'neutral');
        for (const [k, tint] of map) app.muscleTint.set(k, tint);
      }
      app.refreshHighlights();
      app.emit('muscle-tint', app.muscleTint);
    },

    flash(key, color, ms = 1200) {
      if (!key) return;
      app.flashes.set(key, { color: new THREE.Color(color), until: performance.now() + ms });
      app.refreshHighlights();
    },

    refreshHighlights() {
      if (!app.body) return;
      const now = performance.now();
      const want = new Map();
      for (const [key, tint] of app.muscleTint) want.set(key, HIGHLIGHT[tint] ?? tint);
      if (app.hoverKey) want.set(app.hoverKey, HIGHLIGHT.hover);
      if (app.selectedKey) want.set(app.selectedKey, HIGHLIGHT.selected);
      for (const [key, f] of app.flashes) {
        if (f.until > now) want.set(key, { color: f.color, amount: 0.45 + 0.3 * Math.sin(now / 90) });
      }
      // Only touch parts whose tint changed; there are thousands of them.
      const keys = new Set([...app._tinted.keys(), ...want.keys()]);
      const c = new THREE.Color();
      for (const key of keys) {
        const h = want.get(key);
        const prev = app._tinted.get(key);
        if (h === prev && !app.flashes.has(key)) continue;
        for (const { batch, instanceId } of app.part(key)?.items ?? []) {
          c.copy(batch.userData.baseColors[instanceId]);
          if (h) c.lerp(h.color, h.amount);
          batch.setColorAt(instanceId, c);
        }
        if (h) app._tinted.set(key, h);
        else app._tinted.delete(key);
      }
      view.invalidate();
    },
  };

  // Animate flashes and drop expired ones.
  view.onFrame((now) => {
    if (!app.flashes.size) return;
    for (const [k, f] of app.flashes) if (f.until <= now) app.flashes.delete(k);
    app.refreshHighlights();
  });

  return app;
}
