import { LAYERS } from '../body/loadBody.js';

const ON = (opacity = 1) => ({ visible: true, opacity });

export const PRESETS = {
  'All layers': { skin: ON(0.22), muscles: ON(0.4), arteries: ON(), veins: ON(), nerves: ON(), organs: ON(), skeleton: ON() },
  Skin: { skin: ON(), organs: ON() }, // organs supply the eyes
  Muscles: { muscles: ON(), skeleton: ON() },
  Skeleton: { skeleton: ON() },
  Circulation: { arteries: ON(), veins: ON(), organs: ON(0.35), skeleton: ON(0.25) },
  Nervous: { nerves: ON(), skeleton: ON(0.25) },
  Organs: { organs: ON(), skeleton: ON(0.35) },
  'X-ray': { skin: ON(0.15), muscles: ON(0.12), organs: ON(0.5), skeleton: ON() },
};

export function initLayers(app) {
  const list = document.getElementById('layer-list');
  const presets = document.getElementById('presets');

  for (const name of Object.keys(PRESETS)) {
    const b = document.createElement('button');
    b.textContent = name;
    b.addEventListener('click', () => {
      app.isolate(null);
      app.setAllLayers(PRESETS[name]);
    });
    presets.append(b);
  }

  const rows = {};
  for (const l of LAYERS) {
    const li = document.createElement('li');
    li.className = 'layer';
    li.innerHTML = `
      <button class="swatch" style="background:${l.swatch}" aria-label="Toggle ${l.name}" title="Show / hide"></button>
      <span class="name" title="Double-click to show only this layer">${l.name}</span>
      <input type="range" min="0" max="100" step="1" aria-label="${l.name} opacity" />
      <span class="pct"></span>`;
    const [swatch, name, range, pct] = li.children;
    swatch.addEventListener('click', () => app.setLayer(l.id, { visible: !app.layers[l.id].visible }));
    name.addEventListener('click', () => app.setLayer(l.id, { visible: !app.layers[l.id].visible }));
    name.addEventListener('dblclick', () => app.setAllLayers({ [l.id]: ON() }));
    range.addEventListener('input', () => app.setLayer(l.id, { opacity: range.value / 100, visible: true }));
    rows[l.id] = { li, range, pct };
    list.append(li);
  }

  const render = () => {
    for (const l of LAYERS) {
      const st = app.layers[l.id];
      const r = rows[l.id];
      r.li.classList.toggle('off', !st.visible);
      r.range.value = Math.round(st.opacity * 100);
      r.pct.textContent = `${Math.round(st.opacity * 100)}%`;
    }
  };
  app.on('layers', render);
  render();
}
