import * as THREE from 'three';
import { displayName } from '../data/structures.js';

/** Hover tooltip + click-to-pick. Emits 'pick' with { key, mesh } (or null on empty space). */
export function initPicking(app) {
  const { camera, renderer } = app.view;
  const canvas = renderer.domElement;
  const tooltip = document.getElementById('tooltip');
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pending = null;
  let down = null;
  let dragging = false;

  const hit = (clientX, clientY) => {
    if (!app.body) return null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const targets = [];
    for (const part of app.body.parts.values()) {
      for (const m of part.meshes) if (app.isPickable(m)) targets.push(m);
    }
    const hits = raycaster.intersectObjects(targets, false);
    return hits.length ? hits[0].object : null;
  };

  const labelFor = (mesh) => {
    const { id, side, label } = mesh.userData;
    return label ? `${displayName(id, side)} · ${label}` : displayName(id, side);
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
      const m = hit(e.clientX, e.clientY);
      app.hover(m ? m.userData.key : null);
      canvas.style.cursor = m ? 'pointer' : '';
      if (m && !app.quiz?.active) {
        tooltip.textContent = labelFor(m);
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
    const m = hit(e.clientX, e.clientY);
    app.emit('pick', m ? { key: m.userData.key, mesh: m } : null);
  });

  canvas.addEventListener('dblclick', () => {
    if (app.selectedKey) app.focus(app.selectedKey);
  });
}
