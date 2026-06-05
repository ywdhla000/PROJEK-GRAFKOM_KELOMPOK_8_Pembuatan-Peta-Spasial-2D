

import { generateMap, randomizePoints }  from './mapManager.js';
import { toggleAnim, syncSpeed,
         setRenderFn }                    from './animation.js';
import { render, zoom, resetView }        from './render.js';

setRenderFn(render);

// ── Event listeners ───────────────────────────────────────────
document.getElementById('btn-generate')
  .addEventListener('click', () => generateMap());

document.getElementById('btn-randomize')
  .addEventListener('click', () => randomizePoints());

document.getElementById('anim-btn')
  .addEventListener('click', toggleAnim);

document.getElementById('speed-slider')
  .addEventListener('input', e => syncSpeed(e.target.value));

document.getElementById('speed-input')
  .addEventListener('change', e => syncSpeed(e.target.value));

document.getElementById('btn-zoom-in')
  .addEventListener('click', () => zoom(1.25));

document.getElementById('btn-zoom-out')
  .addEventListener('click', () => zoom(0.8));

document.getElementById('btn-reset-view')
  .addEventListener('click', resetView);

// ── Inisialisasi awal ─────────────────────────────────────────
generateMap();
