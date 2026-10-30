import * as THREE from 'three';
import { LAYERS } from '../body/loadBody.js';
import { describe, displayName } from '../data/structures.js';
import { partsForMuscle, groupsForPart } from '../data/exerciseMuscles.js';
import { loadExercises, IMG_URL } from '../data/exercises.js';
import { PRESETS } from './layers.js';

const GOOD = 0x34c77b;
const BAD = 0xff5a5f;
const HINT = 0xf5c542;
const MAX_TRIES = 3;

const list = (words) => (words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words[0]);

/**
 * Two quizzes sharing one bar: "Find the ___" (click the named structure among the visible layers)
 * and "Which muscle does ___ mainly work?" (click a primary muscle of an exercise).
 */
export function initQuiz(app) {
  const bar = document.getElementById('quizbar');
  const targetEl = document.getElementById('quiz-target');
  const preEl = document.getElementById('quiz-pre');
  const postEl = document.getElementById('quiz-post');
  const imgEl = document.getElementById('quiz-img');
  const feedback = document.getElementById('quiz-feedback');
  const scoreEl = document.getElementById('quiz-score');
  const streakEl = document.getElementById('quiz-streak');
  const scope = document.getElementById('quiz-scope');
  const startBtn = document.getElementById('quiz-start');

  scope.innerHTML = '<option value="visible">All visible layers</option>' +
    LAYERS.map((l) => `<option value="${l.id}">${l.name}</option>`).join('') +
    '<option value="exercise">Exercises: target muscle</option>';

  // target: a part key ("Find the") or an exercise ("Which muscle").
  const quiz = { active: false, mode: 'structure', target: null, correct: 0, asked: 0, streak: 0, tries: 0, history: [] };
  app.quiz = quiz;
  let nextTimer = null;
  let exercises = [];

  const say = (text, cls = '') => {
    feedback.textContent = text;
    feedback.className = `quiz-feedback ${cls}`;
  };
  const renderStats = () => {
    scoreEl.textContent = `Score ${quiz.correct} / ${quiz.asked}`;
    streakEl.textContent = quiz.streak >= 2 ? `🔥 ${quiz.streak}` : '';
  };
  const ask = (pre, target, post = '', img = null) => {
    preEl.textContent = pre;
    targetEl.textContent = target;
    postEl.textContent = post;
    imgEl.hidden = !img;
    if (img) imgEl.src = img;
  };

  // ---------- "Find the ___" ----------
  const candidates = () => {
    if (!app.body) return [];
    // Only parts with a curated description: the model has ~2,500 parts, many very obscure.
    const parts = [...app.body.parts.values()].filter((p) => describe(p.id));
    if (scope.value !== 'visible') return parts.filter((p) => p.layer === scope.value);
    return parts.filter((p) => app.isPickablePart(p));
  };

  const nextStructure = () => {
    if (scope.value !== 'visible') {
      // Make sure the quizzed layer can actually be clicked.
      const L = app.layers[scope.value];
      if (!L.visible || L.opacity < 0.5) app.setLayer(scope.value, { visible: true, opacity: 1 });
    }
    const pool = candidates().filter((p) => !quiz.history.includes(p.key));
    const all = pool.length ? pool : candidates();
    if (!all.length) {
      say('Turn on a layer to quiz yourself.', 'bad');
      ask('Find the', '…');
      quiz.target = null;
      return;
    }
    const p = all[Math.floor(Math.random() * all.length)];
    quiz.target = p.key;
    quiz.history = [...quiz.history.slice(-12), p.key];
    ask('Find the', displayName(p.id, p.side));
  };

  // ---------- "Which muscle does ___ mainly work?" ----------
  const nextExercise = () => {
    // Pick a muscle group first so the questions aren't mostly quads and chest.
    const byGroup = new Map();
    for (const e of exercises) {
      const g = e.primaryMuscles[0];
      if (quiz.history.includes(e.id) || !partsForMuscle(g, app.body).length) continue;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(e);
    }
    const groups = [...byGroup.keys()];
    if (!groups.length) {
      quiz.history = [];
      return nextExercise();
    }
    const pool = byGroup.get(groups[Math.floor(Math.random() * groups.length)]);
    const e = pool[Math.floor(Math.random() * pool.length)];
    quiz.target = e;
    quiz.history = [...quiz.history.slice(-30), e.id];
    ask('Which muscle does', e.name, ' mainly work?', IMG_URL + e.images[0]);
  };

  const targetKeys = (e) => e.primaryMuscles.flatMap((g) => partsForMuscle(g, app.body));

  const next = () => {
    clearTimeout(nextTimer);
    quiz.tries = 0;
    say('');
    if (quiz.mode === 'exercise') nextExercise();
    else nextStructure();
  };

  const flashTarget = (color, ms) => {
    if (quiz.mode === 'structure') {
      app.reveal(quiz.target);
      app.flash(quiz.target, color, ms);
      return;
    }
    for (const k of targetKeys(quiz.target)) app.flash(k, color, ms);
  };

  const reveal = () => {
    flashTarget(HINT, 1800);
    if (quiz.mode === 'structure') {
      app.focus(quiz.target);
      return;
    }
    const box = new THREE.Box3();
    for (const k of targetKeys(quiz.target)) box.union(app.partBox(k));
    if (!box.isEmpty()) app.view.focusBox(box);
  };

  const start = async () => {
    clearTimeout(nextTimer);
    Object.assign(quiz, {
      active: true, mode: scope.value === 'exercise' ? 'exercise' : 'structure',
      target: null, correct: 0, asked: 0, streak: 0, history: [],
    });
    app.select(null);
    app.isolate(null);
    bar.hidden = false;
    startBtn.textContent = 'Restart quiz';
    renderStats();
    say('');
    if (quiz.mode === 'exercise') {
      ask('Loading exercises…', '');
      try {
        exercises = await loadExercises();
      } catch {
        say('Could not load exercises.', 'bad');
        return;
      }
      app.setAllLayers(PRESETS.Muscles);
      app.view.setView('front');
    }
    next();
  };

  const end = () => {
    clearTimeout(nextTimer);
    quiz.active = false;
    quiz.target = null;
    bar.hidden = true;
    startBtn.textContent = 'Start quiz';
  };

  /** Name of what was clicked: its exercise muscle group in exercise mode, else the part. */
  const nameOf = (key) => {
    if (quiz.mode === 'exercise') {
      const groups = groupsForPart(key, app.body);
      if (groups.length) return list(groups);
    }
    const part = app.part(key);
    const name = displayName(part.id, part.side);
    return name.charAt(0).toLowerCase() + name.slice(1);
  };

  const isCorrect = (key) => (quiz.mode === 'exercise'
    ? groupsForPart(key, app.body).some((g) => quiz.target.primaryMuscles.includes(g))
    : key === quiz.target);

  const answer = () => `It mainly works the ${list(quiz.target.primaryMuscles)}.`;

  app.on('pick', (hit) => {
    if (!quiz.active || !quiz.target || !hit) return;
    if (isCorrect(hit.key)) {
      quiz.asked++;
      quiz.correct++;
      quiz.streak++;
      const praise = quiz.tries ? 'Got it!' : 'Correct!';
      if (quiz.mode === 'exercise') {
        flashTarget(GOOD, 1100);
        say(`${praise} ${answer()}`, 'good');
      } else {
        app.flash(hit.key, GOOD, 900);
        say(praise, 'good');
      }
      quiz.target = null;
      renderStats();
      nextTimer = setTimeout(next, quiz.mode === 'exercise' ? 1800 : 1000);
      return;
    }
    if (quiz.mode === 'exercise' && !groupsForPart(hit.key, app.body).length) {
      // Thin sheets and ligaments (platysma, inguinal ligament…) sit over the muscles; don't count them.
      say(`That's the ${nameOf(hit.key)}, not one of the exercise muscles. Try again.`);
      return;
    }
    quiz.tries++;
    quiz.streak = 0;
    app.flash(hit.key, BAD, 700);
    if (quiz.tries >= MAX_TRIES) {
      quiz.asked++;
      say(`That was the ${nameOf(hit.key)}. ${quiz.mode === 'exercise' ? answer() : 'Here’s the answer.'}`, 'bad');
      reveal();
      quiz.target = null;
      renderStats();
      nextTimer = setTimeout(next, 2400);
    } else {
      say(`No, that's the ${nameOf(hit.key)} (${MAX_TRIES - quiz.tries} left)`, 'bad');
      renderStats();
    }
  });

  startBtn.addEventListener('click', start);
  scope.addEventListener('change', () => quiz.active && start());
  document.getElementById('quiz-end').addEventListener('click', end);
  document.getElementById('quiz-hint').addEventListener('click', () => {
    if (!quiz.target) return;
    flashTarget(HINT, 1500);
    quiz.tries = Math.max(quiz.tries, MAX_TRIES - 1);
    say(`Look for the glowing ${quiz.mode === 'exercise' ? 'muscle' : 'part'}. This is your last try.`);
  });
  document.getElementById('quiz-skip').addEventListener('click', () => {
    if (!quiz.target) return;
    quiz.asked++;
    quiz.streak = 0;
    if (quiz.mode === 'exercise') say(answer());
    reveal();
    quiz.target = null;
    renderStats();
    nextTimer = setTimeout(next, quiz.mode === 'exercise' ? 2200 : 1600);
  });

  // A reloaded body may not contain the current target.
  app.on('body', () => {
    if (quiz.active && quiz.mode === 'structure' && quiz.target && !app.part(quiz.target)) next();
  });
}
