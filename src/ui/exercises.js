import * as THREE from 'three';
import { PRESETS } from './layers.js';
import { MUSCLE_GROUPS, REGIONS, regionOf, partsForMuscle, coverForMuscle } from '../data/exerciseMuscles.js';

const DATA_URL = `${import.meta.env.BASE_URL}data/exercises.json`;
const IMG_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const PAGE = 60;

/** Sections of the detail view the user can hide (saved per browser). */
const SETTINGS = [
  ['photos', 'Photos'],
  ['animate', 'Animate photos'],
  ['tags', 'Level & type tags'],
  ['muscles', 'Muscle list'],
  ['instructions', 'Instructions'],
  ['thumbs', 'List thumbnails'],
];
const SETTINGS_KEY = 'anatomy.exerciseSettings';

function loadSettings() {
  const defaults = Object.fromEntries(SETTINGS.map(([k]) => [k, true]));
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return defaults;
  }
}

function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Storage blocked (private mode): settings just won't persist.
  }
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

/** Right-hand exercise library: search, filter, and highlight the muscles an exercise works. */
export function initExercises(app) {
  const root = document.getElementById('app');
  const panel = document.getElementById('exercise-panel');
  const toggle = document.getElementById('exercise-toggle');
  const search = document.getElementById('ex-search');
  const regionsEl = document.getElementById('ex-regions');
  const equipmentEl = document.getElementById('ex-equipment');
  const countEl = document.getElementById('ex-count');
  const list = document.getElementById('ex-list');
  const browse = document.getElementById('ex-browse');
  const detail = document.getElementById('ex-detail');
  const activeEl = document.getElementById('ex-active');
  const settingsBtn = document.getElementById('ex-settings-btn');
  const settingsEl = document.getElementById('ex-settings');

  const state = { data: null, region: 'All', results: [], shown: 0, current: null, active: null };
  const settings = loadSettings();
  let photoTimer = 0;

  // ---------- Open / close ----------
  const setOpen = (open) => {
    root.classList.toggle('ex-open', open);
    if (open && !state.data) load();
    if (open) search.focus({ preventScroll: true });
  };
  toggle.addEventListener('click', () => setOpen(!root.classList.contains('ex-open')));
  document.getElementById('ex-close').addEventListener('click', () => setOpen(false));
  if (window.innerWidth >= 1100) setOpen(true);

  async function load() {
    countEl.textContent = 'Loading…';
    try {
      const res = await fetch(DATA_URL);
      state.data = (await res.json()).map((e) => {
        const main = [e.equipment, e.category, e.level, e.force, e.mechanic, regionOf(e), ...e.primaryMuscles]
          .filter(Boolean).join(' ').toLowerCase();
        const lname = e.name.toLowerCase();
        return { ...e, region: regionOf(e), lname, main, hay: `${lname} ${main} ${e.secondaryMuscles.join(' ')}` };
      });
    } catch (err) {
      console.error(err);
      countEl.textContent = 'Could not load exercises.';
      return;
    }
    const equipment = [...new Set(state.data.map((e) => e.equipment).filter(Boolean))].sort();
    equipmentEl.innerHTML = '<option value="">All equipment</option>' +
      equipment.map((q) => `<option value="${q}">${cap(q)}</option>`).join('');
    render();
  }

  // ---------- Filters ----------
  for (const r of ['All', ...REGIONS]) {
    const b = el('button', r === 'All' ? 'active' : '', r);
    b.addEventListener('click', () => {
      state.region = r;
      for (const x of regionsEl.children) x.classList.toggle('active', x === b);
      render();
    });
    regionsEl.append(b);
  }
  search.addEventListener('input', () => render());
  equipmentEl.addEventListener('change', () => render());

  /** Add a word to the search box (from a clicked tag) and go back to the list. */
  const addToSearch = (word) => {
    const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.includes(word.toLowerCase())) search.value = [...words, word.toLowerCase()].join(' ');
    showList();
    render();
  };

  // ---------- List ----------
  function render() {
    if (!state.data) return;
    const tokens = search.value.toLowerCase().split(/\s+/).filter(Boolean);
    const q = tokens.join(' ');
    const equipment = equipmentEl.value;
    const results = [];
    for (const e of state.data) {
      if (state.region !== 'All' && e.region !== state.region) continue;
      if (equipment && e.equipment !== equipment) continue;
      if (!tokens.every((t) => e.hay.includes(t))) continue;
      // Rank: words in the name beat tags/primary muscles, which beat secondary-muscle-only matches.
      let score = e.lname.startsWith(q) ? -1 : 0;
      for (const t of tokens) score += e.lname.includes(t) ? 0 : e.main.includes(t) ? 1 : 3;
      results.push({ e, score });
    }
    // Without a query, group by body part; with one, best matches first.
    const regionIdx = (r) => (REGIONS.indexOf(r) + 1) || 99;
    results.sort((a, b) => a.score - b.score ||
      (q ? 0 : regionIdx(a.e.region) - regionIdx(b.e.region)) || a.e.name.localeCompare(b.e.name));
    state.results = results.map((r) => r.e);
    state.shown = 0;
    state.grouped = !q;
    list.innerHTML = '';
    list.scrollTop = 0;
    countEl.textContent = `${state.results.length} exercise${state.results.length === 1 ? '' : 's'}`;
    if (!state.results.length) list.append(el('li', 'ex-empty', 'No exercises match. Try fewer words.'));
    more();
  }

  function more() {
    const end = Math.min(state.results.length, state.shown + PAGE);
    let prevRegion = state.shown ? state.results[state.shown - 1].region : null;
    for (let i = state.shown; i < end; i++) {
      const e = state.results[i];
      if (state.grouped && e.region !== prevRegion) list.append(el('li', 'ex-group', e.region));
      prevRegion = e.region;
      list.append(itemFor(e));
    }
    state.shown = end;
  }
  list.addEventListener('scroll', () => {
    if (list.scrollTop + list.clientHeight > list.scrollHeight - 300 && state.shown < state.results.length) more();
  });

  const tag = (text, word = text) => {
    const t = el('button', 'ex-tag', text);
    t.title = `Search “${word}”`;
    t.addEventListener('click', (ev) => {
      ev.stopPropagation();
      addToSearch(word);
    });
    return t;
  };

  function itemFor(e) {
    const li = el('li', 'ex-item');
    if (state.active?.id === e.id) li.classList.add('current');
    const img = el('img', 'ex-thumb');
    img.loading = 'lazy';
    img.alt = '';
    img.src = IMG_URL + e.images[0];
    img.onerror = () => img.classList.add('broken');
    const body = el('div', 'ex-item-body');
    body.append(el('div', 'ex-name', e.name));
    const tags = el('div', 'ex-tags');
    if (e.equipment) tags.append(tag(e.equipment));
    tags.append(tag(e.primaryMuscles[0]), tag(e.level));
    body.append(tags);
    li.append(img, body);
    li.addEventListener('click', () => select(e));
    return li;
  }

  // ---------- Detail ----------
  function showList() {
    clearInterval(photoTimer);
    detail.hidden = true;
    browse.hidden = false;
    state.current = null;
  }

  function select(e) {
    state.current = e;
    highlight(e);
    renderDetail(e);
    browse.hidden = true;
    detail.hidden = false;
    detail.scrollTop = 0;
  }

  function renderDetail(e) {
    clearInterval(photoTimer);
    detail.innerHTML = '';
    const back = el('button', 'ex-back', '← All exercises');
    back.addEventListener('click', () => {
      showList();
      for (const li of list.querySelectorAll('.ex-item')) li.classList.remove('current');
    });
    detail.append(back, el('h3', 'ex-title', e.name));

    // Photos: start and end position, cross-fading like a two-frame animation.
    const photos = el('div', 'ex-photos ex-sec-photos');
    for (const [i, src] of e.images.slice(0, 2).entries()) {
      const img = el('img', i === 0 ? 'show' : '');
      img.src = IMG_URL + src;
      img.alt = `${e.name}: ${i === 0 ? 'start' : 'end'} position`;
      img.onerror = () => img.classList.add('broken');
      photos.append(img);
    }
    detail.append(photos);
    if (settings.animate && e.images.length > 1) {
      photoTimer = setInterval(() => {
        for (const img of photos.children) img.classList.toggle('show');
      }, 1400);
    }

    const tags = el('div', 'ex-tags ex-sec-tags');
    for (const t of [e.level, e.force, e.mechanic, e.equipment, e.category]) if (t) tags.append(tag(cap(t), t));
    detail.append(tags);

    const muscles = el('div', 'ex-muscles ex-sec-muscles');
    const group = (title, groups, role) => {
      if (!groups.length) return;
      muscles.append(el('h4', '', title));
      const row = el('div', 'ex-chips');
      for (const g of groups) {
        const c = el('button', `ex-muscle ${role}`, cap(g));
        c.title = 'Show on the body';
        c.addEventListener('click', () => focusGroups([g]));
        row.append(c);
      }
      muscles.append(row);
    };
    group('Primary muscles', e.primaryMuscles, 'primary');
    group('Secondary muscles', e.secondaryMuscles, 'secondary');
    const legend = el('div', 'ex-legend');
    legend.innerHTML = '<span><i class="dot primary"></i>Primary</span><span><i class="dot secondary"></i>Secondary</span>';
    muscles.append(legend);
    const covered = e.primaryMuscles.filter((g) => MUSCLE_GROUPS[g]?.cover);
    if (covered.length) {
      muscles.append(el('p', 'ex-note',
        `The ${covered.join(' and ')} lie${covered.length > 1 ? '' : 's'} under other muscles, which are hidden so ${covered.length > 1 ? 'they' : 'it'} can be seen.`));
    }
    detail.append(muscles);

    if (e.instructions?.length) {
      const sec = el('div', 'ex-sec-instructions');
      sec.append(el('h4', '', 'How to do it'));
      const ol = el('ol', 'ex-steps');
      for (const step of e.instructions) ol.append(el('li', '', step));
      sec.append(ol);
      detail.append(sec);
    }
  }

  // ---------- Highlight on the body ----------
  function focusGroups(groups) {
    if (!app.body) return;
    const box = new THREE.Box3();
    for (const g of groups) for (const k of partsForMuscle(g, app.body)) box.union(app.part(k).box);
    if (!box.isEmpty()) app.view.focusBox(box);
  }

  function highlight(e) {
    if (!app.body) return;
    const map = new Map();
    for (const g of e.secondaryMuscles) for (const k of partsForMuscle(g, app.body)) map.set(k, 'secondary');
    for (const g of e.primaryMuscles) for (const k of partsForMuscle(g, app.body)) map.set(k, 'primary');
    // Deep targets (e.g. the erector spinae under the lats) would be invisible: hide what covers them.
    const hidden = e.primaryMuscles.flatMap((g) => coverForMuscle(g, app.body)).filter((k) => map.get(k) !== 'primary');
    app.isolate(null);
    app.setAllLayers(PRESETS.Muscles);
    app.setExerciseHighlight(map, hidden);
    app.view.setView(MUSCLE_GROUPS[e.primaryMuscles[0]]?.back ? 'back' : 'front');
    state.active = e;
    renderActive();
  }

  function clearHighlight() {
    state.active = null;
    app.setExerciseHighlight(null);
    renderActive();
    for (const li of list.querySelectorAll('.ex-item.current')) li.classList.remove('current');
  }

  function renderActive() {
    activeEl.hidden = !state.active;
    if (!state.active) return;
    activeEl.innerHTML = '';
    const label = el('button', 'ex-active-name');
    label.append(el('span', 'dot primary'), document.createTextNode(` ${state.active.name}`));
    label.title = 'Show details';
    label.addEventListener('click', () => select(state.active));
    const clear = el('button', 'ex-clear', 'Clear');
    clear.title = 'Remove the muscle highlight';
    clear.addEventListener('click', clearHighlight);
    activeEl.append(label, clear);
  }

  // The quiz would be trivial with the answer glowing.
  document.getElementById('quiz-start').addEventListener('click', () => state.active && clearHighlight());

  // ---------- Settings ----------
  const applySettings = () => {
    for (const [k] of SETTINGS) panel.classList.toggle(`hide-${k}`, !settings[k]);
    if (state.current) renderDetail(state.current);
  };
  settingsEl.append(el('div', 'ex-settings-title', 'Show in exercise details'));
  for (const [k, label] of SETTINGS) {
    const row = el('label', 'ex-setting');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = settings[k];
    cb.addEventListener('change', () => {
      settings[k] = cb.checked;
      saveSettings(settings);
      applySettings();
    });
    row.append(cb, document.createTextNode(` ${label}`));
    settingsEl.append(row);
  }
  settingsBtn.addEventListener('click', () => {
    settingsEl.hidden = !settingsEl.hidden;
    settingsBtn.setAttribute('aria-expanded', String(!settingsEl.hidden));
    settingsBtn.classList.toggle('active', !settingsEl.hidden);
  });
  applySettings();
}
