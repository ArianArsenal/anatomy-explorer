import * as THREE from 'three';
import { LAYERS } from '../body/loadBody.js';

const AXES = ['coronal', 'sagittal', 'axial'];
const r3 = (n) => +n.toFixed(3);
const clamp01 = (n) => Math.min(1, Math.max(0, n));

/**
 * Keeps the address bar in sync with what is on screen, so any view can be shared as a link:
 * camera, layers, selection, isolation, exercise or workout, slice and explode.
 *
 * Hash format (fields use only characters that URLs leave unescaped):
 *   #v=1&c=px_py_pz_tx_ty_tz&l=22.40h.100…&sel=key&iso=key&s=coronal_0.5_f&x=60&ex=id&wo=id*3.id*4&won=name
 * Layer opacities are percentages in LAYERS order; a trailing "h" marks a hidden layer.
 */
export function initShare(app) {
  const { camera, controls } = app.view;
  const toast = document.getElementById('toast');
  let ready = false; // nothing is written until the link we were opened with has been applied
  let timer = 0;
  let toastTimer = 0;

  function encode() {
    const q = new URLSearchParams();
    q.set('v', '1');
    q.set('c', [...camera.position.toArray(), ...controls.target.toArray()].map(r3).join('_'));
    q.set('l', LAYERS.map((l) => {
      const L = app.layers[l.id];
      return `${Math.round(L.opacity * 100)}${L.visible ? '' : 'h'}`;
    }).join('.'));
    if (app.selectedKey) q.set('sel', app.selectedKey);
    if (app.isolateKey) q.set('iso', app.isolateKey);
    const { axis, pos, flip } = app.slice;
    if (axis) q.set('s', [axis, r3(pos), ...(flip ? ['f'] : [])].join('_'));
    if (app.explode) q.set('x', String(Math.round(app.explode * 100)));
    const shared = app.exercises?.shareState() ?? {};
    if (shared.ex) q.set('ex', shared.ex);
    if (shared.wo) {
      q.set('wo', shared.wo.items.map((it) => `${it.id}*${it.sets}`).join('.'));
      if (shared.wo.name) q.set('won', shared.wo.name);
    }
    return `#${q}`;
  }

  function write() {
    clearTimeout(timer);
    if (!ready) return;
    const hash = encode();
    if (hash !== location.hash) history.replaceState(null, '', hash);
  }
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(write, 500);
  };
  for (const evt of ['select', 'layers', 'isolate', 'muscle-tint', 'slice', 'explode']) app.on(evt, schedule);
  app.view.onCameraIdle(schedule);

  async function apply(hash) {
    const q = new URLSearchParams(hash.replace(/^#/, ''));
    if (q.get('v') !== '1') return;

    // The exercise or workout goes first: it switches layers and camera, which the link then overrides.
    const ex = q.get('ex');
    const wo = q.get('wo');
    if ((ex || wo) && app.exercises) {
      const items = wo?.split('.').map((s) => {
        const [id, sets] = s.split('*');
        return { id, sets: Number(sets) };
      });
      try {
        await app.exercises.applyShareState({ ex, wo: items && { name: q.get('won'), items } });
      } catch {
        // Exercise data unavailable (offline): keep the rest of the view.
      }
    } else {
      app.exercises?.clear();
    }

    const l = q.get('l')?.split('.');
    if (l?.length === LAYERS.length) {
      const map = {};
      LAYERS.forEach((L, i) => {
        const m = l[i].match(/^(\d{1,3})(h?)$/);
        if (m) map[L.id] = { opacity: Math.min(100, Number(m[1])) / 100, visible: !m[2] };
      });
      app.setAllLayers(map);
    }
    app.isolate(app.part(q.get('iso')) ? q.get('iso') : null);
    app.select(app.part(q.get('sel')) ? q.get('sel') : null);

    const s = q.get('s')?.split('_');
    if (s && AXES.includes(s[0])) app.setSlice({ axis: s[0], pos: clamp01(Number(s[1]) || 0.5), flip: s[2] === 'f' });
    else app.setSlice({ axis: null });
    const x = clamp01(Number(q.get('x')) / 100 || 0);
    if (x !== app.explode) app.setExplode(x);

    const c = q.get('c')?.split('_').map(Number);
    if (c?.length === 6 && c.every(Number.isFinite)) {
      app.view.setCamera(new THREE.Vector3(c[0], c[1], c[2]), new THREE.Vector3(c[3], c[4], c[5]));
    }
  }

  // Someone pastes another link into this tab (replaceState never fires this).
  window.addEventListener('hashchange', async () => {
    ready = false;
    await apply(location.hash);
    ready = true;
    write();
  });

  const showToast = (text) => {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 1800);
  };

  async function copyLink() {
    write();
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API blocked (e.g. not a secure context): fall back to a temporary text field.
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      if (!ok) {
        showToast('Copy the link from the address bar');
        return;
      }
    }
    showToast('Link copied');
  }
  document.getElementById('share-copy').addEventListener('click', copyLink);

  return {
    /** Apply the link the page was opened with (once the body has loaded), then start tracking. */
    async start() {
      if (location.hash) await apply(location.hash);
      ready = true;
      write();
    },
  };
}
