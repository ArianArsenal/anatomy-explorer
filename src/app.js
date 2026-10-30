import * as THREE from 'three';
import { loadBody, LAYERS } from './body/loadBody.js';

const HIGHLIGHT = {
  selected: new THREE.Color(0x2f8cff),
  hover: new THREE.Color(0x6a6a6a),
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

    on(evt, fn) { (listeners[evt] ??= []).push(fn); },
    emit(evt, data) { for (const fn of listeners[evt] ?? []) fn(data); },

    async loadBody(onProgress) {
      const body = await loadBody(onProgress);
      if (app.body) app.body.dispose();
      app.body = body;
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

    /** Effective opacity a mesh is drawn with (0 = hidden). */
    effectiveOpacity(mesh) {
      if (app.isolateKey) return mesh.userData.key === app.isolateKey ? 1 : 0;
      const L = app.layers[mesh.userData.layer];
      return L.visible ? L.opacity : 0;
    },

    applyVisibility() {
      if (!app.body) return;
      for (const part of app.body.parts.values()) {
        for (const mesh of part.meshes) {
          const mat = mesh.material;
          const o = app.effectiveOpacity(mesh) * mat.userData.alpha;
          const transparent = o < 0.999;
          mesh.visible = o > 0.01;
          if (mat.transparent !== transparent) {
            mat.transparent = transparent;
            mat.needsUpdate = true;
          }
          mat.opacity = o;
          mesh.userData.prepass.visible = mesh.visible && transparent;
        }
      }
      view.renderer.shadowMap.needsUpdate = true;
      view.invalidate();
    },

    isPickable(mesh) {
      return mesh.visible && app.effectiveOpacity(mesh) >= 0.15;
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
      const box = new THREE.Box3();
      for (const m of p.meshes) box.expandByObject(m);
      view.focusBox(box);
    },

    flash(key, color, ms = 1200) {
      if (!key) return;
      app.flashes.set(key, { color: new THREE.Color(color), until: performance.now() + ms });
      app.refreshHighlights();
    },

    refreshHighlights() {
      if (!app.body) return;
      const now = performance.now();
      for (const part of app.body.parts.values()) {
        const f = app.flashes.get(part.key);
        let color = null;
        let intensity = 0;
        if (f && f.until > now) {
          color = f.color;
          intensity = 0.55 + 0.35 * Math.sin(now / 90);
        } else if (part.key === app.selectedKey) {
          color = HIGHLIGHT.selected;
          intensity = 0.9;
        } else if (part.key === app.hoverKey) {
          color = HIGHLIGHT.hover;
          intensity = 0.5;
        }
        for (const m of part.meshes) {
          if (color) m.material.emissive.copy(color);
          else m.material.emissive.setRGB(0, 0, 0);
          m.material.emissiveIntensity = intensity;
        }
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
