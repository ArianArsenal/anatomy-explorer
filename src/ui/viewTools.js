// Camera side that looks at the cut face of each slice (and of its flipped half).
const SLICE_VIEW = {
  coronal: ['front', 'back'],
  sagittal: ['right', 'left'],
  axial: ['top', 'reset'],
};
const SLICE_START = { coronal: 0.5, sagittal: 0.5, axial: 0.74 };

/** Sidebar tools: cross-section slicer and exploded view. */
export function initViewTools(app) {
  const axisBtns = [...document.querySelectorAll('#slice-axis button')];
  const pos = document.getElementById('slice-pos');
  const flip = document.getElementById('slice-flip');
  const explode = document.getElementById('explode');
  const explodePct = document.getElementById('explode-pct');

  const faceCut = () => {
    const { axis, pos: p, flip: f } = app.slice;
    if (!axis || !app.body) return;
    if (axis === 'axial' && !f) {
      // Look down onto the cut from just above it.
      const { min, max } = app.body.bounds;
      app.view.setView('top', { y: min.y + (max.y - min.y) * p, dist: app.body.P.H * 1.2 });
    } else {
      app.view.setView(SLICE_VIEW[axis][f ? 1 : 0]);
    }
  };

  for (const b of axisBtns) {
    b.addEventListener('click', () => {
      const axis = b.dataset.axis || null;
      app.setSlice({ axis, pos: SLICE_START[axis] ?? 0.5, flip: false });
      faceCut();
    });
  }
  pos.addEventListener('input', () => app.setSlice({ pos: pos.value / 1000 }));
  flip.addEventListener('click', () => {
    app.setSlice({ flip: !app.slice.flip });
    faceCut();
  });
  explode.addEventListener('input', () => app.setExplode(explode.value / 100));

  app.on('slice', ({ axis, pos: p }) => {
    for (const b of axisBtns) b.classList.toggle('active', (b.dataset.axis || null) === axis);
    pos.hidden = !axis;
    flip.hidden = !axis;
    pos.value = Math.round(p * 1000);
  });
  app.on('explode', (f) => {
    explode.value = Math.round(f * 100);
    explodePct.textContent = `${Math.round(f * 100)}%`;
  });
}
