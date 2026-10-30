import { describe, displayName } from '../data/structures.js';

export function initSearch(app) {
  const input = document.getElementById('search');
  const list = document.getElementById('search-results');
  let results = [];
  let cursor = -1;

  const choose = (key) => {
    app.reveal(key);
    app.select(key);
    app.focus(key);
  };

  const render = () => {
    list.innerHTML = '';
    const q = input.value.trim().toLowerCase();
    results = [];
    cursor = -1;
    if (!q || !app.body) return;
    const tokens = q.split(/\s+/);
    for (const part of app.body.parts.values()) {
      const s = describe(part.id);
      const name = displayName(part.id, part.side);
      const hay = `${name} ${s?.name ?? ''} ${s?.system ?? ''}`.toLowerCase();
      if (tokens.every((t) => hay.includes(t))) {
        // Rank names that start with the query first.
        const base = name.replace(/^(Left|Right) /, '').toLowerCase();
        const score = base.startsWith(q) ? 0 : name.toLowerCase().includes(q) ? 1 : 2;
        results.push({ key: part.key, name, system: s?.system ?? '', score });
      }
    }
    results.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
    results = results.slice(0, 40);
    if (!results.length) {
      list.innerHTML = '<li class="empty">No matches</li>';
      return;
    }
    for (const r of results) {
      const li = document.createElement('li');
      li.innerHTML = `<span></span><span class="sys"></span>`;
      li.children[0].textContent = r.name;
      li.children[1].textContent = r.system;
      li.addEventListener('click', () => choose(r.key));
      li.addEventListener('mouseenter', () => app.hover(r.key));
      li.addEventListener('mouseleave', () => app.hover(null));
      list.append(li);
    }
  };

  const moveCursor = (d) => {
    if (!results.length) return;
    cursor = (cursor + d + results.length) % results.length;
    [...list.children].forEach((li, i) => li.classList.toggle('kb', i === cursor));
    list.children[cursor].scrollIntoView({ block: 'nearest' });
  };

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moveCursor(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveCursor(-1); }
    else if (e.key === 'Enter' && results.length) choose(results[Math.max(0, cursor)].key);
    else if (e.key === 'Escape') { input.value = ''; render(); }
  });
  app.on('body', render);
}
