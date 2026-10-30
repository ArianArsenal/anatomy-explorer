import { describe, displayName } from '../data/structures.js';
import { LAYERS } from '../body/loadBody.js';

const LAYER_NAMES = Object.fromEntries(LAYERS.map((l) => [l.id, l.name]));

export function initInfoPanel(app) {
  const el = document.getElementById('info');
  const name = document.getElementById('info-name');
  const sys = document.getElementById('info-system');
  const sub = document.getElementById('info-sub');
  const desc = document.getElementById('info-desc');
  const isoBtn = document.getElementById('info-isolate');

  // Clicking outside quiz mode selects (or clears) a part.
  app.on('pick', (hit) => {
    if (app.quiz?.active) return;
    app.select(hit ? hit.key : null);
  });

  app.on('select', (part) => {
    if (!part) {
      el.hidden = true;
      return;
    }
    const s = describe(part.id);
    name.textContent = displayName(part.id, part.side);
    sys.textContent = s?.system ?? LAYER_NAMES[part.layer];
    sub.textContent = `${LAYER_NAMES[part.layer]} layer`;
    desc.textContent = s?.description ?? '';
    desc.hidden = !s;
    el.hidden = false;
    renderIso();
  });

  const renderIso = () => {
    const on = app.isolateKey && app.isolateKey === app.selectedKey;
    isoBtn.textContent = on ? 'Show all' : 'Isolate';
    isoBtn.classList.toggle('active', !!on);
  };
  app.on('isolate', renderIso);

  document.getElementById('info-close').addEventListener('click', () => app.select(null));
  document.getElementById('info-focus').addEventListener('click', () => app.focus(app.selectedKey));
  isoBtn.addEventListener('click', () => {
    if (app.isolateKey === app.selectedKey) app.isolate(null);
    else {
      app.isolate(app.selectedKey);
      app.focus(app.selectedKey);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    if (e.key === 'Escape') {
      if (app.isolateKey) app.isolate(null);
      else app.select(null);
    } else if (e.key === 'f' || e.key === 'F') {
      app.focus(app.selectedKey);
    }
  });
}
