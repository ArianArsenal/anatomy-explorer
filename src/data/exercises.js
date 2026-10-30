import { regionOf } from './exerciseMuscles.js';

const DATA_URL = `${import.meta.env.BASE_URL}data/exercises.json`;
export const IMG_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

let pending = null;
let byId = new Map();

/**
 * The free-exercise-db library, fetched once and shared by the panel, quiz and links.
 * Each exercise gets `region` plus lower-case search text: `lname` (name), `main` (tags and
 * primary muscles) and `hay` (everything, including secondary muscles).
 */
export function loadExercises() {
  pending ??= fetch(DATA_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`${DATA_URL}: HTTP ${res.status}`);
      return res.json();
    })
    .then((all) => {
      const data = all.map((e) => {
        const main = [e.equipment, e.category, e.level, e.force, e.mechanic, regionOf(e), ...e.primaryMuscles]
          .filter(Boolean).join(' ').toLowerCase();
        const lname = e.name.toLowerCase();
        return { ...e, region: regionOf(e), lname, main, hay: `${lname} ${main} ${e.secondaryMuscles.join(' ')}` };
      });
      byId = new Map(data.map((e) => [e.id, e]));
      return data;
    })
    .catch((err) => {
      pending = null; // allow a retry
      throw err;
    });
  return pending;
}

/** An exercise by id, once `loadExercises()` has resolved. */
export const getExercise = (id) => byId.get(id) ?? null;
