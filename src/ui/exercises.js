import * as THREE from 'three';
import { PRESETS } from './layers.js';
import { MUSCLE_GROUPS, REGIONS, partsForMuscle, coverForMuscle } from '../data/exerciseMuscles.js';
import { loadExercises, getExercise, IMG_URL } from '../data/exercises.js';

const PAGE = 60;
const RECENT_MAX = 12;
const MAX_SETS = 20;

/** Sections of the detail view the user can hide (saved per browser). */
const SETTINGS = [
  ['photos', 'Photos'],
  ['animate', 'Animate photos'],
  ['tags', 'Level & type tags'],
  ['muscles', 'Muscle list'],
  ['instructions', 'Instructions'],
  ['thumbs', 'List thumbnails'],
];
const STORE = {
  settings: 'anatomy.exerciseSettings',
  favourites: 'anatomy.favourites',
  recent: 'anatomy.recent',
  workouts: 'anatomy.workouts',
};

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked (private mode): nothing persists.
  }
}

// Workout heatmap: light → heavy load runs yellow → orange → deep red; untrained groups turn cool blue.
const HEAT = [new THREE.Color(0xffd23d), new THREE.Color(0xff7a1a), new THREE.Color(0xc4100c)];
const MISSED = { color: new THREE.Color(0x5b7bb0), amount: 0.75 };
const heatTint = (t) => ({
  color: t < 0.5 ? HEAT[0].clone().lerp(HEAT[1], t * 2) : HEAT[1].clone().lerp(HEAT[2], (t - 0.5) * 2),
  amount: 0.88,
});

/** Weighted sets per muscle group: a primary target counts fully, a secondary one half. */
function groupLoads(items) {
  const loads = new Map();
  for (const { id, sets } of items) {
    const e = getExercise(id);
    if (!e) continue;
    for (const g of e.secondaryMuscles) loads.set(g, (loads.get(g) ?? 0) + sets * 0.5);
    for (const g of e.primaryMuscles) loads.set(g, (loads.get(g) ?? 0) + sets);
  }
  return loads;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (n) => (n % 1 ? n.toFixed(1) : String(n));

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function thumb(e, cls = 'ex-thumb') {
  const img = el('img', cls);
  img.loading = 'lazy';
  img.alt = '';
  img.src = IMG_URL + e.images[0];
  img.onerror = () => img.classList.add('broken');
  return img;
}

/**
 * Right-hand exercise library: search, filter, favourites, workouts, and highlighting the muscles an
 * exercise (or a whole workout) works. Returns an API, also stored as `app.exercises`.
 */
export function initExercises(app) {
  const $ = (id) => document.getElementById(id);
  const root = $('app');
  const panel = $('exercise-panel');
  const search = $('ex-search');
  const regionsEl = $('ex-regions');
  const equipmentEl = $('ex-equipment');
  const countEl = $('ex-count');
  const list = $('ex-list');
  const browse = $('ex-browse');
  const detail = $('ex-detail');
  const activeEl = $('ex-active');
  const tabsEl = $('ex-tabs');
  const recentEl = $('ex-recent');
  const muscleChip = $('ex-muscle-filter');
  const workoutEl = $('ex-workout');
  const settingsBtn = $('ex-settings-btn');
  const settingsEl = $('ex-settings');

  const state = {
    data: null,
    tab: 'library',
    region: 'All',
    muscle: null, // muscle group the library is filtered to
    results: [],
    shown: 0,
    grouping: null, // 'region' | 'role' | null
    current: null, // exercise open in the detail view
    active: null, // what tints the body: { type: 'exercise', e } | { type: 'workout' }
  };
  const settings = { ...Object.fromEntries(SETTINGS.map(([k]) => [k, true])), ...load(STORE.settings, {}) };
  const favourites = new Set(load(STORE.favourites, []));
  let recent = load(STORE.recent, []);
  const workouts = loadWorkouts();
  let photoTimer = 0;
  let ready = null;

  function ensureData() {
    ready ??= loadExercises()
      .then((data) => {
        state.data = data;
        const equipment = [...new Set(data.map((e) => e.equipment).filter(Boolean))].sort();
        equipmentEl.innerHTML = '<option value="">All equipment</option>' +
          equipment.map((q) => `<option value="${q}">${cap(q)}</option>`).join('');
        renderTabs();
        refreshView();
        return data;
      })
      .catch((err) => {
        console.error(err);
        countEl.textContent = 'Could not load exercises.';
        ready = null;
        throw err;
      });
    return ready;
  }

  // ---------- Open / close ----------
  const setOpen = (open) => {
    root.classList.toggle('ex-open', open);
    if (open) ensureData().catch(() => {});
    if (open && state.tab !== 'workout' && detail.hidden) search.focus({ preventScroll: true });
  };
  $('exercise-toggle').addEventListener('click', () => setOpen(!root.classList.contains('ex-open')));
  $('ex-close').addEventListener('click', () => setOpen(false));
  if (window.innerWidth >= 1100) setOpen(true);

  // ---------- Tabs ----------
  const TABS = [['library', 'Library'], ['favourites', 'Favourites'], ['workout', 'Workout']];
  const tabBtns = {};
  for (const [id, label] of TABS) {
    const b = el('button', '', label);
    b.addEventListener('click', () => setTab(id));
    tabBtns[id] = b;
    tabsEl.append(b);
  }

  function renderTabs() {
    const counts = { favourites: favourites.size, workout: currentWorkout().items.length };
    for (const [id, label] of TABS) {
      const b = tabBtns[id];
      b.classList.toggle('active', id === state.tab);
      b.textContent = label;
      if (counts[id]) b.append(el('span', 'ex-badge', String(counts[id])));
    }
  }

  function setTab(tab) {
    state.tab = tab;
    renderTabs();
    closeDetail();
  }

  /** Show the current tab's list (or workout) instead of the detail view. */
  function closeDetail() {
    clearInterval(photoTimer);
    state.current = null;
    detail.hidden = true;
    browse.hidden = state.tab === 'workout';
    workoutEl.hidden = state.tab !== 'workout';
    refreshView();
  }

  function refreshView() {
    if (!state.data) return;
    if (state.tab === 'workout') renderWorkout();
    else render();
  }

  // ---------- Filters ----------
  const setRegion = (r) => {
    state.region = r;
    for (const x of regionsEl.children) x.classList.toggle('active', x.textContent === r);
  };
  for (const r of ['All', ...REGIONS]) {
    const b = el('button', r === 'All' ? 'active' : '', r);
    b.addEventListener('click', () => {
      setRegion(r);
      render();
    });
    regionsEl.append(b);
  }
  search.addEventListener('input', () => render());
  equipmentEl.addEventListener('change', () => render());
  muscleChip.addEventListener('click', () => {
    state.muscle = null;
    render();
  });

  /** Add a word to the search box (from a clicked tag) and go back to the list. */
  const addToSearch = (word) => {
    const words = search.value.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.includes(word.toLowerCase())) search.value = [...words, word.toLowerCase()].join(' ');
    if (state.tab === 'workout') setTab('library');
    else closeDetail();
  };

  // ---------- List (library and favourites) ----------
  const ROLE_LABEL = { primary: 'Main target', secondary: 'Also works it' };

  function render() {
    if (!state.data || state.tab === 'workout') return;
    const favs = state.tab === 'favourites';
    const tokens = search.value.toLowerCase().split(/\s+/).filter(Boolean);
    const q = tokens.join(' ');
    const equipment = equipmentEl.value;
    const g = state.muscle;
    const results = [];
    for (const e of state.data) {
      if (favs && !favourites.has(e.id)) continue;
      if (state.region !== 'All' && e.region !== state.region) continue;
      if (equipment && e.equipment !== equipment) continue;
      if (!tokens.every((t) => e.hay.includes(t))) continue;
      let role = null;
      if (g) {
        role = e.primaryMuscles.includes(g) ? 'primary' : e.secondaryMuscles.includes(g) ? 'secondary' : null;
        if (!role) continue;
      }
      // Rank: words in the name beat tags/primary muscles, which beat secondary-muscle-only matches.
      let score = e.lname.startsWith(q) ? -1 : 0;
      for (const t of tokens) score += e.lname.includes(t) ? 0 : e.main.includes(t) ? 1 : 3;
      results.push({ e, score, role });
    }
    // A muscle filter lists main targets first; without a query, the library is grouped by body part.
    const regionIdx = (r) => (REGIONS.indexOf(r) + 1) || 99;
    state.grouping = g ? 'role' : q ? null : 'region';
    results.sort((a, b) =>
      (g ? (a.role === 'secondary') - (b.role === 'secondary') : 0) ||
      a.score - b.score ||
      (state.grouping === 'region' ? regionIdx(a.e.region) - regionIdx(b.e.region) : 0) ||
      a.e.name.localeCompare(b.e.name));
    state.results = results;
    state.shown = 0;
    list.innerHTML = '';
    list.scrollTop = 0;
    const n = results.length;
    countEl.textContent = `${n} ${favs ? 'starred' : 'exercise'}${n === 1 || favs ? '' : 's'}`;
    if (!n) {
      list.append(el('li', 'ex-empty', favs && !favourites.size
        ? 'Star exercises with ☆ to keep them here.'
        : 'No exercises match. Try fewer words or another filter.'));
    }
    muscleChip.hidden = !g;
    if (g) muscleChip.textContent = `Muscle: ${cap(g)} ×`;
    renderRecent(!favs && !q && !g);
    more();
  }

  function more() {
    const end = Math.min(state.results.length, state.shown + PAGE);
    const label = (r) => (state.grouping === 'region' ? r.e.region : state.grouping === 'role' ? ROLE_LABEL[r.role] : null);
    let prev = state.shown ? label(state.results[state.shown - 1]) : null;
    for (let i = state.shown; i < end; i++) {
      const r = state.results[i];
      const l = label(r);
      if (l && l !== prev) list.append(el('li', 'ex-group', l));
      prev = l;
      list.append(itemFor(r));
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

  function itemFor({ e, role }) {
    const li = el('li', 'ex-item');
    li.dataset.id = e.id;
    if (state.active?.e?.id === e.id) li.classList.add('current');
    const body = el('div', 'ex-item-body');
    body.append(el('div', 'ex-name', e.name));
    const tags = el('div', 'ex-tags');
    if (role === 'secondary') tags.append(el('span', 'ex-tag ex-role', 'secondary'));
    if (e.equipment) tags.append(tag(e.equipment));
    tags.append(tag(e.primaryMuscles[0]), tag(e.level));
    body.append(tags);
    const actions = el('div', 'ex-item-actions');
    actions.append(favButton(e), addButton(e));
    li.append(thumb(e), body, actions);
    li.addEventListener('click', () => select(e));
    return li;
  }

  /** Thumbnails of recently opened exercises, above the library list. */
  function renderRecent(show) {
    const items = recent.map(getExercise).filter(Boolean);
    recentEl.hidden = !show || !items.length;
    if (recentEl.hidden) return;
    recentEl.innerHTML = '';
    recentEl.append(el('div', 'ex-recent-title', 'Recent'));
    const row = el('div', 'ex-recent-row');
    for (const e of items) {
      const b = el('button', 'ex-recent-item');
      b.title = e.name;
      b.append(thumb(e, 'ex-recent-img'), el('span', '', e.name));
      b.addEventListener('click', () => select(e));
      row.append(b);
    }
    recentEl.append(row);
  }

  function pushRecent(id) {
    recent = [id, ...recent.filter((x) => x !== id)].slice(0, RECENT_MAX);
    save(STORE.recent, recent);
  }

  // ---------- Favourite / workout buttons (kept in sync wherever they appear) ----------
  function paintFav(b, on) {
    b.classList.toggle('on', on);
    b.textContent = on ? '★' : '☆';
    b.title = on ? 'Remove from favourites' : 'Add to favourites';
    b.setAttribute('aria-pressed', String(on));
  }

  function paintAdd(b, on) {
    b.classList.toggle('on', on);
    b.textContent = b.dataset.big ? (on ? '✓ In workout' : '+ Add to workout') : (on ? '✓' : '+');
    b.title = on ? 'In the current workout (click to remove)' : 'Add to the current workout';
  }

  function favButton(e) {
    const b = el('button', 'ex-fav');
    b.dataset.id = e.id;
    paintFav(b, favourites.has(e.id));
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (favourites.has(e.id)) favourites.delete(e.id);
      else favourites.add(e.id);
      save(STORE.favourites, [...favourites]);
      syncButtons();
      renderTabs();
      if (state.tab === 'favourites' && detail.hidden) render();
    });
    return b;
  }

  function addButton(e, big = false) {
    const b = el('button', 'ex-add');
    b.dataset.id = e.id;
    if (big) b.dataset.big = '1';
    paintAdd(b, inWorkout(e.id));
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleInWorkout(e.id);
    });
    return b;
  }

  function syncButtons() {
    for (const b of panel.querySelectorAll('.ex-fav')) paintFav(b, favourites.has(b.dataset.id));
    for (const b of panel.querySelectorAll('.ex-add')) paintAdd(b, inWorkout(b.dataset.id));
  }

  // ---------- Workouts ----------
  function loadWorkouts() {
    const w = load(STORE.workouts, null);
    if (w?.list?.length && w.list.every((x) => x.id && Array.isArray(x.items))) return w;
    return { current: 'w1', list: [{ id: 'w1', name: 'My workout', items: [] }] };
  }
  const newWorkoutId = () => `w${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

  function currentWorkout() {
    return workouts.list.find((w) => w.id === workouts.current) ?? workouts.list[0];
  }

  const inWorkout = (id) => currentWorkout().items.some((it) => it.id === id);

  function toggleInWorkout(id) {
    const w = currentWorkout();
    const i = w.items.findIndex((it) => it.id === id);
    if (i >= 0) w.items.splice(i, 1);
    else w.items.push({ id, sets: 3 });
    workoutChanged();
  }

  function workoutChanged() {
    save(STORE.workouts, workouts);
    syncButtons();
    renderTabs();
    if (state.tab === 'workout' && detail.hidden) renderWorkout();
    if (state.active?.type === 'workout') showHeatmap();
  }

  function renderWorkout() {
    if (!state.data) return;
    const w = currentWorkout();
    workoutEl.innerHTML = '';

    // Saved workouts: pick, create, duplicate, delete.
    const bar = el('div', 'wo-bar');
    const picker = el('select', 'wo-select');
    picker.setAttribute('aria-label', 'Saved workouts');
    for (const x of workouts.list) {
      const o = el('option', '', x.name || 'Untitled workout');
      o.value = x.id;
      o.selected = x.id === w.id;
      picker.append(o);
    }
    picker.addEventListener('change', () => {
      workouts.current = picker.value;
      workoutChanged();
    });
    const iconBtn = (text, title, fn) => {
      const b = el('button', 'icon-btn', text);
      b.title = title;
      b.setAttribute('aria-label', title);
      b.addEventListener('click', fn);
      return b;
    };
    bar.append(
      picker,
      iconBtn('＋', 'New workout', () => {
        const id = newWorkoutId();
        workouts.list.push({ id, name: `Workout ${workouts.list.length + 1}`, items: [] });
        workouts.current = id;
        workoutChanged();
      }),
      iconBtn('⧉', 'Duplicate workout', () => {
        const id = newWorkoutId();
        workouts.list.push({ id, name: `${w.name} (copy)`, items: w.items.map((it) => ({ ...it })) });
        workouts.current = id;
        workoutChanged();
      }),
      iconBtn('🗑', 'Delete workout', () => {
        workouts.list = workouts.list.filter((x) => x !== w);
        if (!workouts.list.length) workouts.list.push({ id: newWorkoutId(), name: 'My workout', items: [] });
        workouts.current = workouts.list[0].id;
        workoutChanged();
      }),
    );
    workoutEl.append(bar);

    const name = el('input', 'wo-name');
    name.value = w.name;
    name.placeholder = 'Workout name';
    name.maxLength = 60;
    name.setAttribute('aria-label', 'Workout name');
    name.addEventListener('input', () => {
      w.name = name.value;
      picker.selectedOptions[0].textContent = w.name || 'Untitled workout';
      save(STORE.workouts, workouts);
      renderActive();
    });
    workoutEl.append(name);

    const items = w.items.filter((it) => getExercise(it.id));
    if (!items.length) {
      workoutEl.append(el('p', 'ex-empty', 'Empty workout. Add exercises with the + button in the library.'));
      return;
    }
    const totalSets = items.reduce((s, it) => s + it.sets, 0);
    workoutEl.append(el('div', 'ex-count wo-total', `${items.length} exercise${items.length === 1 ? '' : 's'} · ${totalSets} sets`));

    // Exercises: reorder by dragging, change sets, remove.
    const ul = el('ul', 'wo-list');
    let dragFrom = -1;
    for (const [i, it] of w.items.entries()) {
      const e = getExercise(it.id);
      if (!e) continue;
      const li = el('li', 'wo-item');
      li.draggable = true;
      li.addEventListener('dragstart', (ev) => {
        dragFrom = i;
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', String(i));
        li.classList.add('dragging');
      });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      li.addEventListener('dragover', (ev) => {
        ev.preventDefault();
        li.classList.add('drag-over');
      });
      li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
      li.addEventListener('drop', (ev) => {
        ev.preventDefault();
        if (dragFrom < 0 || dragFrom === i) return;
        const [moved] = w.items.splice(dragFrom, 1);
        w.items.splice(i, 0, moved);
        dragFrom = -1;
        workoutChanged();
      });

      const open = el('button', 'wo-open');
      open.title = 'Show details';
      open.append(thumb(e, 'wo-thumb'), el('span', 'wo-name-text', e.name));
      open.addEventListener('click', () => select(e));

      const sets = el('div', 'wo-sets');
      const step = (d, text, title) => {
        const b = el('button', '', text);
        b.title = title;
        b.disabled = it.sets + d < 1 || it.sets + d > MAX_SETS;
        b.addEventListener('click', () => {
          it.sets = Math.min(MAX_SETS, Math.max(1, it.sets + d));
          workoutChanged();
        });
        return b;
      };
      sets.append(step(-1, '−', 'Fewer sets'), el('span', '', `${it.sets} sets`), step(1, '+', 'More sets'));

      const remove = el('button', 'wo-remove', '×');
      remove.title = 'Remove from workout';
      remove.addEventListener('click', () => {
        w.items.splice(i, 1);
        workoutChanged();
      });
      li.append(el('span', 'wo-handle', '⋮⋮'), open, sets, remove);
      ul.append(li);
    }
    workoutEl.append(ul);

    const heatOn = state.active?.type === 'workout';
    const heatBtn = el('button', heatOn ? 'wo-heat active' : 'wo-heat primary', heatOn ? 'Hide heatmap' : '🔥 Show heatmap on the body');
    heatBtn.addEventListener('click', () => (heatOn ? clearHighlight() : showHeatmap()));
    workoutEl.append(heatBtn);

    // How hard each muscle group is worked, and which ones the workout misses.
    const loads = groupLoads(w.items);
    const max = Math.max(...loads.values());
    const sum = el('div', 'wo-summary');
    sum.append(el('h4', '', 'Muscles worked'));
    const legend = el('div', 'wo-legend');
    legend.append(el('span', '', 'light'), el('i', 'wo-ramp'), el('span', '', 'heavy'), el('i', 'dot missed'), el('span', '', 'not trained'));
    sum.append(legend);
    for (const [g, v] of [...loads].sort((a, b) => b[1] - a[1])) {
      const row = el('button', 'wo-group');
      row.title = 'Show on the body';
      const barEl = el('i', 'wo-bar-fill');
      barEl.style.width = `${(v / max) * 100}%`;
      barEl.style.background = `#${heatTint(v / max).color.getHexString()}`;
      const track = el('span', 'wo-bar-track');
      track.append(barEl);
      row.append(el('span', 'wo-group-name', cap(g)), track, el('span', 'wo-group-sets', `${fmt(v)} sets`));
      row.addEventListener('click', () => focusGroups([g]));
      sum.append(row);
    }
    const missed = Object.keys(MUSCLE_GROUPS).filter((g) => !loads.has(g));
    if (missed.length) {
      sum.append(el('h4', '', 'Not trained'));
      const chips = el('div', 'ex-chips');
      for (const g of missed) {
        const c = el('button', 'ex-muscle missed', cap(g));
        c.title = `Find exercises for the ${g}`;
        c.addEventListener('click', () => showForMuscle(g));
        chips.append(c);
      }
      sum.append(chips);
    }
    sum.append(el('p', 'ex-note', 'Secondary muscles count as half a set.'));
    workoutEl.append(sum);
  }

  // ---------- Detail ----------
  function select(e) {
    state.current = e;
    highlight(e);
    pushRecent(e.id);
    renderDetail(e);
    browse.hidden = true;
    workoutEl.hidden = true;
    detail.hidden = false;
    detail.scrollTop = 0;
  }

  function renderDetail(e) {
    clearInterval(photoTimer);
    detail.innerHTML = '';
    const head = el('div', 'ex-detail-head');
    const back = el('button', 'ex-back', state.tab === 'workout' ? '← Workout' : '← All exercises');
    back.addEventListener('click', closeDetail);
    head.append(back, el('span', 'ex-spacer'), favButton(e), addButton(e, true));
    detail.append(head, el('h3', 'ex-title', e.name));

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
    for (const g of groups) for (const k of partsForMuscle(g, app.body)) box.union(app.partBox(k));
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
    app.setMuscleTint(map, hidden);
    app.view.setView(MUSCLE_GROUPS[e.primaryMuscles[0]]?.back ? 'back' : 'front');
    state.active = { type: 'exercise', e };
    renderActive();
  }

  /** Colour every muscle group by how much the current workout works it. */
  function showHeatmap() {
    const loads = groupLoads(currentWorkout().items);
    if (!app.body || !loads.size) {
      if (state.active?.type === 'workout') clearHighlight();
      return;
    }
    const max = Math.max(...loads.values());
    const keyLoad = new Map();
    for (const g of Object.keys(MUSCLE_GROUPS)) {
      const v = loads.get(g) ?? 0;
      for (const k of partsForMuscle(g, app.body)) keyLoad.set(k, Math.max(keyLoad.get(k) ?? 0, v));
    }
    const tint = new Map([...keyLoad].map(([k, v]) => [k, v ? heatTint(v / max) : MISSED]));
    // Show heavily worked deep groups by hiding untrained muscles on top of them.
    const hidden = [...loads]
      .filter(([g, v]) => v >= max * 0.5 && MUSCLE_GROUPS[g]?.cover)
      .flatMap(([g]) => coverForMuscle(g, app.body))
      .filter((k) => !keyLoad.get(k));
    app.isolate(null);
    if (state.active?.type !== 'workout') app.setAllLayers(PRESETS.Muscles);
    app.setMuscleTint(tint, hidden);
    state.active = { type: 'workout' };
    renderActive();
    if (state.tab === 'workout' && detail.hidden) renderWorkout();
  }

  function clearHighlight() {
    const wasWorkout = state.active?.type === 'workout';
    state.active = null;
    app.setMuscleTint(null);
    renderActive();
    if (wasWorkout && state.tab === 'workout' && detail.hidden) renderWorkout();
  }

  function renderActive() {
    for (const li of list.querySelectorAll('.ex-item')) li.classList.toggle('current', li.dataset.id === state.active?.e?.id);
    activeEl.hidden = !state.active;
    if (!state.active) return;
    activeEl.innerHTML = '';
    const label = el('button', 'ex-active-name');
    if (state.active.type === 'workout') {
      label.classList.add('heat');
      label.append(el('i', 'wo-ramp small'), document.createTextNode(` ${currentWorkout().name || 'Workout'}`));
      label.title = 'Show the workout';
      label.addEventListener('click', () => setTab('workout'));
    } else {
      label.append(el('span', 'dot primary'), document.createTextNode(` ${state.active.e.name}`));
      label.title = 'Show details';
      label.addEventListener('click', () => select(state.active.e));
    }
    const clear = el('button', 'ex-clear', 'Clear');
    clear.title = 'Remove the muscle highlight';
    clear.addEventListener('click', clearHighlight);
    activeEl.append(label, clear);
  }

  // The quiz would be trivial with the answer glowing.
  $('quiz-start').addEventListener('click', () => state.active && clearHighlight());

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
      save(STORE.settings, settings);
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
  renderTabs();

  // ---------- API for other modules ----------
  async function showForMuscle(group) {
    setOpen(true);
    await ensureData();
    state.muscle = group;
    search.value = '';
    equipmentEl.value = '';
    setRegion('All');
    setTab('library');
  }

  const api = {
    open: () => setOpen(true),
    showForMuscle,
    /** Number of exercises whose primary or secondary muscles include a group (null until loaded). */
    countForMuscle: (group) => state.data?.filter((e) => e.primaryMuscles.includes(group) || e.secondaryMuscles.includes(group)).length ?? null,
    ready: ensureData,

    /** What the body currently shows, for share links. */
    shareState() {
      if (state.active?.type === 'exercise') return { ex: state.active.e.id };
      if (state.active?.type === 'workout') {
        const w = currentWorkout();
        return { wo: { name: w.name, items: w.items.map(({ id, sets }) => ({ id, sets })) } };
      }
      return {};
    },

    /** Restore a shared exercise or workout (a workout is saved as a new one unless it already exists). */
    async applyShareState({ ex, wo }) {
      await ensureData();
      if (ex && getExercise(ex)) {
        setOpen(true);
        select(getExercise(ex));
      } else if (wo?.items?.length) {
        const items = wo.items
          .filter((it) => getExercise(it.id))
          .map((it) => ({ id: it.id, sets: Math.min(MAX_SETS, Math.max(1, Math.round(+it.sets) || 3)) }));
        if (!items.length) return;
        const same = (w) => w.items.length === items.length && w.items.every((it, i) => it.id === items[i].id && it.sets === items[i].sets);
        let w = workouts.list.find(same);
        if (!w) {
          w = { id: newWorkoutId(), name: String(wo.name ?? 'Shared workout').slice(0, 60), items };
          workouts.list.push(w);
        }
        workouts.current = w.id;
        save(STORE.workouts, workouts);
        syncButtons();
        setOpen(true);
        setTab('workout');
        showHeatmap();
      }
    },
  };
  app.exercises = api;
  return api;
}
