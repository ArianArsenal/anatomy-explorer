import { LAYERS } from '../body/loadBody.js';
import { describe, displayName } from '../data/structures.js';

const GOOD = 0x34c77b;
const BAD = 0xff5a5f;
const HINT = 0xf5c542;
const MAX_TRIES = 3;

/** "Find the ___" quiz: click the named structure among the currently visible layers. */
export function initQuiz(app) {
  const bar = document.getElementById('quizbar');
  const targetEl = document.getElementById('quiz-target');
  const feedback = document.getElementById('quiz-feedback');
  const scoreEl = document.getElementById('quiz-score');
  const streakEl = document.getElementById('quiz-streak');
  const scope = document.getElementById('quiz-scope');
  const startBtn = document.getElementById('quiz-start');

  scope.innerHTML = '<option value="visible">All visible layers</option>' +
    LAYERS.map((l) => `<option value="${l.id}">${l.name}</option>`).join('');

  const quiz = { active: false, target: null, correct: 0, asked: 0, streak: 0, tries: 0, history: [] };
  app.quiz = quiz;
  let nextTimer = null;

  const say = (text, cls = '') => {
    feedback.textContent = text;
    feedback.className = `quiz-feedback ${cls}`;
  };
  const renderStats = () => {
    scoreEl.textContent = `Score ${quiz.correct} / ${quiz.asked}`;
    streakEl.textContent = quiz.streak >= 2 ? `🔥 ${quiz.streak}` : '';
  };

  const candidates = () => {
    if (!app.body) return [];
    // Only parts with a curated description: the model has ~2,500 parts, many very obscure.
    const parts = [...app.body.parts.values()].filter((p) => describe(p.id));
    if (scope.value !== 'visible') return parts.filter((p) => p.layer === scope.value);
    return parts.filter((p) => app.isPickablePart(p));
  };

  const next = () => {
    clearTimeout(nextTimer);
    if (scope.value !== 'visible') {
      // Make sure the quizzed layer can actually be clicked.
      const L = app.layers[scope.value];
      if (!L.visible || L.opacity < 0.5) app.setLayer(scope.value, { visible: true, opacity: 1 });
    }
    const pool = candidates().filter((p) => !quiz.history.includes(p.key));
    const all = pool.length ? pool : candidates();
    if (!all.length) {
      say('Turn on a layer to quiz yourself.', 'bad');
      targetEl.textContent = '…';
      quiz.target = null;
      return;
    }
    const p = all[Math.floor(Math.random() * all.length)];
    quiz.target = p.key;
    quiz.tries = 0;
    quiz.history = [...quiz.history.slice(-12), p.key];
    targetEl.textContent = displayName(p.id, p.side);
    say('');
  };

  const reveal = () => {
    app.reveal(quiz.target);
    app.flash(quiz.target, HINT, 1800);
    app.focus(quiz.target);
  };

  const start = () => {
    Object.assign(quiz, { active: true, correct: 0, asked: 0, streak: 0, history: [] });
    app.select(null);
    app.isolate(null);
    bar.hidden = false;
    startBtn.textContent = 'Restart quiz';
    renderStats();
    next();
  };

  const end = () => {
    clearTimeout(nextTimer);
    quiz.active = false;
    quiz.target = null;
    bar.hidden = true;
    startBtn.textContent = 'Start quiz';
  };

  app.on('pick', (hit) => {
    if (!quiz.active || !quiz.target || !hit) return;
    if (hit.key === quiz.target) {
      quiz.asked++;
      quiz.correct++;
      quiz.streak++;
      app.flash(hit.key, GOOD, 900);
      say(quiz.tries ? 'Got it!' : 'Correct!', 'good');
      quiz.target = null;
      renderStats();
      nextTimer = setTimeout(next, 1000);
      return;
    }
    const part = app.part(hit.key);
    quiz.tries++;
    quiz.streak = 0;
    app.flash(hit.key, BAD, 700);
    if (quiz.tries >= MAX_TRIES) {
      quiz.asked++;
      say(`That was the ${displayName(part.id, part.side)}. Here's the answer.`, 'bad');
      reveal();
      quiz.target = null;
      renderStats();
      nextTimer = setTimeout(next, 2200);
    } else {
      say(`No, that's the ${displayName(part.id, part.side)} (${MAX_TRIES - quiz.tries} left)`, 'bad');
      renderStats();
    }
  });

  startBtn.addEventListener('click', start);
  document.getElementById('quiz-end').addEventListener('click', end);
  document.getElementById('quiz-hint').addEventListener('click', () => {
    if (!quiz.target) return;
    app.reveal(quiz.target);
    app.flash(quiz.target, HINT, 1500);
    quiz.tries = Math.max(quiz.tries, MAX_TRIES - 1);
    say('Look for the glowing part. This is your last try.');
  });
  document.getElementById('quiz-skip').addEventListener('click', () => {
    if (!quiz.target) return;
    quiz.asked++;
    quiz.streak = 0;
    reveal();
    quiz.target = null;
    renderStats();
    nextTimer = setTimeout(next, 1600);
  });

  // A reloaded body may not contain the current target.
  app.on('body', () => {
    if (quiz.active && quiz.target && !app.part(quiz.target)) next();
  });
}
