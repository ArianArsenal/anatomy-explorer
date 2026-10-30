// Downloads the free-exercise-db dataset (public domain, https://github.com/yuhonas/free-exercise-db)
// and writes the fields the app uses to public/data/exercises.json.
// Usage: npm run exercises
import fs from 'node:fs';

const SRC = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const OUT = 'public/data/exercises.json';
const KEEP = ['id', 'name', 'force', 'level', 'mechanic', 'equipment', 'primaryMuscles', 'secondaryMuscles',
  'instructions', 'category', 'images'];

const res = await fetch(SRC);
if (!res.ok) throw new Error(`${SRC}: HTTP ${res.status}`);
const all = await res.json();
const slim = all
  .filter((e) => e.name && e.primaryMuscles?.length)
  .map((e) => Object.fromEntries(KEEP.map((k) => [k, e[k] ?? null])))
  .sort((a, b) => a.name.localeCompare(b.name));

fs.mkdirSync('public/data', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(slim));
console.log(`${slim.length} exercises → ${OUT} (${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB)`);
