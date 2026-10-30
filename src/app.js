import * as THREE from 'three';
import { loadBody, LAYERS } from './body/loadBody.js';

// Highlights tint a part's instance colour toward these (amount = how far).
const HIGHLIGHT = {
  selected: { color: new THREE.Color(0x4f9dff), amount: 0.6 },
  hover: { color: new THREE.Color(0xffffff), amount: 0.3 },
};

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
    _tinted: new Map(), // key -> highlight currently applied to its instances
    _isoBatches: [], // batches whose instances were hidden for isolation
    _shadowTimer: 0,

    on(evt, fn) { (listeners[evt] ??= []).push(fn); },
    emit(evt, data) { for (const fn of listeners[evt] ?? []) fn(data); },

    async loadBody(onProgress) {
      const body = await loadBody(onProgress);
      if (app.body) app.body.dispose();
      app.body = body;
      app._tinted.clear();
      app._isoBatches = [];
      view.scene.add(app.body.root);
      view.setBodyHeight(app.body.P.H);
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

      // Instance visibility only changes with isolation: restore what was hidden, then hide again.
      for (const b of app._isoBatches) {
        for (let i = 0; i < b.userData.keys.length; i++) b.setVisibleAt(i, true);
      }
      app._isoBatches = [...isoBatches];
      for (const b of app._isoBatches) {
        for (let i = 0; i < b.userData.keys.length; i++) b.setVisibleAt(i, b.userData.keys[i] === iso.key);
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
        prepass.visible = b.visible && transparent;
      }
      // Redrawing the shadow map is costly; wait until slider drags settle.
      clearTimeout(app._shadowTimer);
      app._shadowTimer = setTimeout(() => {
        view.renderer.shadowMap.needsUpdate = true;
        view.invalidate();
      }, 200);
      view.invalidate();
    },

    /** Whether a part can currently be hovered or clicked. */
    isPickablePart(part) {
      if (!part) return false;
      if (app.isolateKey) return part.key === app.isolateKey;
      return app.layerOpacity(part.layer) >= 0.15;
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

    focus(key) {
      const p = app.part(key);
      if (!p) return;
      view.focusBox(p.box);
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
