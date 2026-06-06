
import { state } from './state.js';
let _renderFn = null;

export function setRenderFn(fn) {
  _renderFn = fn;
}

export function toggleAnim() {
  if (state.animOn) {
    stopAnim();
  } else {
    if (state.routePath.length < 2) {
      alert('Klik "Acak Rute" dulu untuk menentukan tujuan.');
      return;
    }
    state.animOn = true;
    const btn = document.getElementById('anim-btn');
    btn.innerHTML = '⏸ Hentikan';
    btn.classList.add('active');
    animLoop();
  }
}

export function stopAnim() {
  state.animOn = false;
  if (state.animFrame) {
    cancelAnimationFrame(state.animFrame);
    state.animFrame = null;
  }
  const btn = document.getElementById('anim-btn');
  if (btn) {
    btn.innerHTML = '🚗 Start';
    btn.classList.remove('active');
  }
}

function animLoop() {
  if (!state.animOn) return;
  state.pathProgress += state.carSpeed;
  if (_renderFn) _renderFn();
  state.animFrame = requestAnimationFrame(animLoop);
}

export function getVehiclePos() {
  if (!state.routeSvgPath || state.routePath.length < 2) return null;

  const totalLen = state.routeSvgPath.getTotalLength();
  const travel   = (state.pathProgress % 1) * totalLen;

  const pt  = state.routeSvgPath.getPointAtLength(travel);
  const pt2 = state.routeSvgPath.getPointAtLength(Math.min(travel + 2, totalLen));
  const angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;

  return { x: pt.x, y: pt.y, angle };
}

export function syncSpeed(val) {
  val = Math.max(1, Math.min(100, parseInt(val) || 1));
  state.carSpeed = 0.002 * val;
  document.getElementById('speed-slider').value = Math.min(val, 50);
  document.getElementById('speed-input').value  = val;
}
