import './style.css';
import { createScene } from './scene.js';
import { createApp } from './app.js';
import { initLayers, PRESETS } from './ui/layers.js';
import { initPicking } from './ui/picking.js';
import { initInfoPanel } from './ui/infoPanel.js';
import { initSearch } from './ui/search.js';
import { initQuiz } from './ui/quiz.js';

const view = createScene(document.getElementById('view'));
const app = createApp(view);

initLayers(app);
initPicking(app);
initInfoPanel(app);
initSearch(app);
initQuiz(app);

for (const b of document.querySelectorAll('[data-view]')) {
  b.addEventListener('click', () => view.setView(b.dataset.view));
}
const root = document.getElementById('app');
document.getElementById('sidebar-toggle').addEventListener('click', () => root.classList.toggle('collapsed'));
if (window.innerWidth < 760) root.classList.add('collapsed');

const loading = document.getElementById('loading');
app.setAllLayers(PRESETS['All layers']);
app.loadBody((f) => { loading.textContent = `Loading anatomy model… ${Math.round(f * 100)}%`; })
  .then(() => {
    view.setView('reset');
    loading.classList.add('done');
  })
  .catch((err) => {
    console.error(err);
    loading.textContent = 'Could not load the anatomy model.';
  });

window.anatomy = app; // handy for poking around in devtools
