import * as THREE from 'three';
import { displayName } from '../data/structures.js';

/** Hover tooltip + click-to-pick. Emits 'pick' with { key } (or null on empty space). */
export function initPicking(app) {
  const { camera, renderer } = app.view;
  const canvas = renderer.domElement;
  const tooltip = document.getElementById('tooltip');
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pending = null;
  let down = null;
  let dragging = false;

  /** Key of the nearest pickable part under the pointer, or null. */
  const hit = (clientX, clientY) => {
    if (!app.body) return null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    for (const h of raycaster.intersectObjects(app.pickableBatches(), false)) {
      if (app.isPointSlicedAway(h.point)) continue;
      const key = h.object.userData.keys[h.batchId];
      if (app.isPickablePart(app.part(key))) return key;
    }
    return null;
  };

  const labelFor = (key) => {
    const p = app.part(key);
    return displayName(p.id, p.side);
  };

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    dragging = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5;
    if (dragging) {
      tooltip.hidden = true;
      app.hover(null);
      return;
    }
    if (pending) return;
    pending = requestAnimationFrame(() => {
      pending = null;
      const key = hit(e.clientX, e.clientY);
      app.hover(key);
      canvas.style.cursor = key ? 'pointer' : '';
      if (key && !app.quiz?.active) {
        tooltip.textContent = labelFor(key);
        tooltip.style.left = `${e.clientX}px`;
        tooltip.style.top = `${e.clientY}px`;
        tooltip.hidden = false;
      } else {
        tooltip.hidden = true;
      }
    });
  });

  canvas.addEventListener('pointerleave', () => {
    tooltip.hidden = true;
    app.hover(null);
  });

  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 5 || e.button !== 0) return;
    const key = hit(e.clientX, e.clientY);
    app.emit('pick', key ? { key } : null);
  });

  canvas.addEventListener('dblclick', () => {
    if (app.selectedKey) app.focus(app.selectedKey);
  });
}
