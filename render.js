
import { state }          from './state.js';
import { W, H }           from './constants.js';
import { el, txt, buildRouteSVGPath } from './utils.js';
import { getVehiclePos }  from './animation.js';

// Referensi elemen SVG utama
const svg = document.getElementById('map-svg');
svg.setAttribute('width',  W);
svg.setAttribute('height', H);

// ── Viewport / Pan / Zoom ─────────────────────────────────────
let vx = 0, vy = 0, scale = 1;
let isDrag = false;
let ds = { x: 0, y: 0 };
let vs = { x: 0, y: 0 };

const mw = document.getElementById('map-wrap');

mw.addEventListener('mousedown', e => {
  isDrag = true;
  ds = { x: e.clientX, y: e.clientY };
  vs = { x: vx, y: vy };
});
window.addEventListener('mousemove', e => {
  if (!isDrag) return;
  vx = vs.x + (e.clientX - ds.x);
  vy = vs.y + (e.clientY - ds.y);
  applyT();
});
window.addEventListener('mouseup', () => isDrag = false);

mw.addEventListener('touchstart', e => {
  const t = e.touches[0];
  isDrag = true;
  ds = { x: t.clientX, y: t.clientY };
  vs = { x: vx, y: vy };
}, { passive: true });
mw.addEventListener('touchmove', e => {
  if (!isDrag) return;
  const t = e.touches[0];
  vx = vs.x + (t.clientX - ds.x);
  vy = vs.y + (t.clientY - ds.y);
  applyT();
}, { passive: true });
mw.addEventListener('touchend', () => isDrag = false);

mw.addEventListener('wheel', e => {
  e.preventDefault();
  zoom(e.deltaY < 0 ? 1.1 : 0.9);
}, { passive: false });

export function applyT() {
  svg.style.transform = `translate(${vx}px, ${vy}px) scale(${scale})`;
  document.getElementById('zoominfo').innerHTML = `Zoom: ${Math.round(scale * 100)}%`;
}

export function zoom(f) {
  const cx = mw.clientWidth / 2;
  const cy = mw.clientHeight / 2;
  const sx = (cx - vx) / scale;
  const sy = (cy - vy) / scale;
  scale = Math.max(0.2, Math.min(10, scale * f));
  vx = cx - sx * scale;
  vy = cy - sy * scale;
  applyT();
}

export function resetView() {
  vx = 0; vy = 0; scale = 1;
  applyT();
}

// ── Fungsi render utama ────

export function render() {
  svg.innerHTML = '';

  _drawDefs();
  _drawBackground();
  _drawRoads();
  _drawBuildings();
  _drawCar();
  _updateLegend();
  applyT();
}

// ── Private: definisi SVG (gradient, pattern, filter) ────────

function _drawDefs() {
  const defs = el('defs', {}, svg);

  // Filter noise (tekstur)
  const turb = el('filter', { id: 'noiseF', x: '0%', y: '0%', width: '100%', height: '100%' }, defs);
  el('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.65', numOctaves: '3', stitchTiles: 'stitch', result: 'noise' }, turb);
  el('feColorMatrix', { type: 'saturate', values: '0', in: 'noise', result: 'grayNoise' }, turb);
  el('feBlend', { in: 'SourceGraphic', in2: 'grayNoise', mode: 'multiply' }, turb);

  // Pattern rumput
  const grassP = el('pattern', { id: 'grass', width: 12, height: 12, patternUnits: 'userSpaceOnUse' }, defs);
  el('rect',   { x: 0, y: 0, width: 12, height: 12, fill: '#3d6b2e' }, grassP);
  el('circle', { cx: 2,  cy: 3,  r: 1,   fill: '#4a7a3a', opacity: 0.7 }, grassP);
  el('circle', { cx: 7,  cy: 1,  r: 0.8, fill: '#2e5a20', opacity: 0.5 }, grassP);
  el('circle', { cx: 10, cy: 6,  r: 1.2, fill: '#5a8a4a', opacity: 0.6 }, grassP);
  el('circle', { cx: 4,  cy: 9,  r: 0.6, fill: '#3a6a2a', opacity: 0.4 }, grassP);
  el('circle', { cx: 9,  cy: 10, r: 0.9, fill: '#4e7e3e', opacity: 0.5 }, grassP);
  el('line', { x1: 1, y1: 7, x2: 1.5, y2: 5, stroke: '#5a8a4a', 'stroke-width': 0.4, opacity: 0.3 }, grassP);
  el('line', { x1: 6, y1: 11, x2: 6.3, y2: 9, stroke: '#4a7a3a', 'stroke-width': 0.3, opacity: 0.3 }, grassP);

  // Pattern air
  const waterP = el('pattern', { id: 'water', width: 20, height: 10, patternUnits: 'userSpaceOnUse' }, defs);
  el('rect', { x: 0, y: 0, width: 20, height: 10, fill: '#2a5a7a' }, waterP);
  el('path', { d: 'M0 5 Q5 3 10 5 Q15 7 20 5', fill: 'none', stroke: '#3a7a9a', 'stroke-width': 0.6, opacity: 0.5 }, waterP);
  el('path', { d: 'M0 8 Q5 6 10 8 Q15 10 20 8', fill: 'none', stroke: '#4a8aaa', 'stroke-width': 0.4, opacity: 0.3 }, waterP);

  // Gradient pohon
  const treeGrads = [
    { id: 'treeG1', cx: '40%', cy: '40%', c0: '#4a8a3a', c1: '#1a4a1a' },
    { id: 'treeG2', cx: '45%', cy: '35%', c0: '#3a7a2a', c1: '#1a3a10' },
    { id: 'treeG3', cx: '50%', cy: '40%', c0: '#5a9a4a', c1: '#2a5a1a' },
  ];
  for (const g of treeGrads) {
    const grad = el('radialGradient', { id: g.id, cx: g.cx, cy: g.cy }, defs);
    el('stop', { offset: '0%',   'stop-color': g.c0 }, grad);
    el('stop', { offset: '100%', 'stop-color': g.c1 }, grad);
  }
}

// ── Private: background ────

function _drawBackground() {
  el('rect', { x: 0, y: 0, width: W, height: H, fill: '#3a5a2a' }, svg);
  el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#grass)' }, svg);

  // Seeded random untuk latar konsisten tiap render
  let seed = state.nodes.length + 42;
  function sr() {
    seed = (seed * 16807) % 2147483647;
    return (seed & 0x7fffffff) / 0x7fffffff;
  }

  // Terrain patches
  for (let i = 0; i < 12; i++) {
    const px = sr() * W, py = sr() * H;
    const pw = 80 + sr() * 200, ph = 60 + sr() * 150;
    const shade = sr();
    const col = shade < 0.4 ? '#3d6b2e' : shade < 0.7 ? '#4a7a3a' : '#2e5a20';
    el('ellipse', { cx: px + pw / 2, cy: py + ph / 2, rx: pw / 2, ry: ph / 2, fill: col, opacity: 0.3 + sr() * 0.3 }, svg);
  }

  // Kolam / danau kecil
  const ponds = 1 + Math.floor(sr() * 2);
  for (let i = 0; i < ponds; i++) {
    const px = 100 + sr() * (W - 200), py = 100 + sr() * (H - 200);
    const prx = 20 + sr() * 35, pry = 15 + sr() * 25;
    el('ellipse', { cx: px, cy: py, rx: prx + 4, ry: pry + 3, fill: '#5a4a35', opacity: 0.4 }, svg);
    el('ellipse', { cx: px, cy: py, rx: prx + 2, ry: pry + 1, fill: '#3a6a2a', opacity: 0.5 }, svg);
    el('ellipse', { cx: px, cy: py, rx: prx,     ry: pry,     fill: 'url(#water)', opacity: 0.8 }, svg);
    el('ellipse', { cx: px - prx * 0.2, cy: py - pry * 0.2, rx: prx * 0.4, ry: pry * 0.25, fill: '#5aaacc', opacity: 0.15 }, svg);
  }

  // Bangunan latar belakang (samar)
  const bgCount = 15 + Math.floor(sr() * 20);
  for (let i = 0; i < bgCount; i++) {
    const bx = sr() * W, by = sr() * H;
    const bw = 15 + sr() * 40, bh = 12 + sr() * 30;
    el('rect', { x: bx, y: by, width: bw, height: bh, rx: 1, fill: '#2e3e2e', opacity: 0.25 + sr() * 0.15 }, svg);
    if (sr() > 0.5) {
      for (let wy = by + 4; wy < by + bh - 3; wy += 6) {
        for (let wx = bx + 4; wx < bx + bw - 3; wx += 6) {
          if (sr() > 0.4)
            el('rect', { x: wx, y: wy, width: 2, height: 2, fill: '#f1c40f', opacity: 0.08 + sr() * 0.12 }, svg);
        }
      }
    }
  }

  // Pohon
  function drawTree(tx, ty, size, variant) {
    const grad = ['url(#treeG1)', 'url(#treeG2)', 'url(#treeG3)'][variant % 3];
    el('ellipse', { cx: tx + size * 0.3, cy: ty + size * 0.4, rx: size * 0.8, ry: size * 0.35, fill: '#0a1a0a', opacity: 0.15 }, svg);
    el('rect', { x: tx - size * 0.1, y: ty - size * 0.1, width: size * 0.2, height: size * 0.5, fill: '#4a3520', rx: 1 }, svg);
    if (variant === 0) {
      el('circle', { cx: tx, cy: ty - size * 0.3, r: size * 0.7, fill: grad }, svg);
      el('circle', { cx: tx - size * 0.3, cy: ty - size * 0.1, r: size * 0.45, fill: grad, opacity: 0.8 }, svg);
      el('circle', { cx: tx + size * 0.35, cy: ty - size * 0.15, r: size * 0.4, fill: grad, opacity: 0.7 }, svg);
    } else if (variant === 1) {
      el('ellipse', { cx: tx, cy: ty - size * 0.2, rx: size * 0.5, ry: size * 0.8, fill: grad }, svg);
      el('ellipse', { cx: tx, cy: ty - size * 0.5, rx: size * 0.3, ry: size * 0.5, fill: grad, opacity: 0.8 }, svg);
    } else {
      el('circle', { cx: tx, cy: ty - size * 0.2,  r: size * 0.6,  fill: grad }, svg);
      el('circle', { cx: tx - size * 0.25, cy: ty - size * 0.4,  r: size * 0.4,  fill: grad, opacity: 0.85 }, svg);
      el('circle', { cx: tx + size * 0.3,  cy: ty - size * 0.35, r: size * 0.35, fill: grad, opacity: 0.75 }, svg);
      el('circle', { cx: tx, cy: ty - size * 0.55, r: size * 0.3,  fill: grad, opacity: 0.7  }, svg);
    }
  }

  for (let i = 0; i < 80; i++) {
    drawTree(20 + sr() * (W - 40), 20 + sr() * (H - 40), 5 + sr() * 10, Math.floor(sr() * 3));
  }

  // Semak-semak
  for (let i = 0; i < 40; i++) {
    const bx = sr() * W, by = sr() * H, bs = 2 + sr() * 4;
    const col = sr() < 0.5 ? '#2d6a4f' : '#3a7a3a';
    el('ellipse', { cx: bx, cy: by, rx: bs * 1.3, ry: bs * 0.8, fill: col, opacity: 0.3 + sr() * 0.3 }, svg);
    if (sr() > 0.5)
      el('ellipse', { cx: bx + bs * 0.5, cy: by - bs * 0.2, rx: bs * 0.8, ry: bs * 0.5, fill: col, opacity: 0.25 }, svg);
  }

  // Bunga
  const flowerColors = ['#e74c3c', '#f39c12', '#9b59b6', '#e91e63', '#ff6b6b'];
  for (let i = 0; i < 25; i++) {
    const fx = sr() * W, fy = sr() * H;
    const fc = flowerColors[Math.floor(sr() * flowerColors.length)];
    el('circle', { cx: fx,     cy: fy,     r: 1 + sr() * 1.5, fill: fc, opacity: 0.25 + sr() * 0.2 }, svg);
    el('circle', { cx: fx + 2, cy: fy - 1, r: 0.8 + sr(),     fill: fc, opacity: 0.2 }, svg);
  }
}

// ── Private: jalan ────

function _drawRoads() {
  const { nodes, edges, routePath } = state;

  // Bangun adjacency list untuk cek tetangga
  const adj = Array.from({ length: nodes.length }, () => []);
  for (const e of edges) { adj[e.a].push(e.b); adj[e.b].push(e.a); }

  // Set edge yang termasuk rute — untuk pewarnaan berbeda
  const routeSet = new Set();
  if (routePath.length > 1) {
    for (let i = 0; i < routePath.length - 1; i++) {
      routeSet.add(`${Math.min(routePath[i], routePath[i + 1])}_${Math.max(routePath[i], routePath[i + 1])}`);
    }
  }

  // Step 1: lingkaran aspal di setiap persimpangan
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (adj[i].length < 1) continue;
    el('circle', { cx: n.x, cy: n.y, r: 9, fill: '#2c2a24', opacity: 0.3 }, svg);
    const isRoute = adj[i].some(nb => routeSet.has(`${Math.min(i, nb)}_${Math.max(i, nb)}`));
    el('circle', { cx: n.x, cy: n.y, r: 6, fill: isRoute ? '#d4922a' : '#4a4640' }, svg);
  }

  // Step 2: badan jalan (shadow + aspal)
  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    const key = `${Math.min(e.a, e.b)}_${Math.max(e.a, e.b)}`;
    const isRoute = routeSet.has(key);
    const d = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    el('path', { d, fill: 'none', stroke: '#2c2a24', 'stroke-width': 18, 'stroke-linecap': 'round', opacity: 0.3 }, svg);
    el('path', { d, fill: 'none', stroke: isRoute ? '#d4922a' : '#4a4640', 'stroke-width': 12, 'stroke-linecap': 'round' }, svg);
  }

  // Step 3: trotoar (garis tipis di sisi jalan)
  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len * 7, ny = dx / len * 7;
    el('line', { x1: a.x + nx, y1: a.y + ny, x2: b.x + nx, y2: b.y + ny, stroke: '#6a6a5a', 'stroke-width': 1.5, opacity: 0.4 }, svg);
    el('line', { x1: a.x - nx, y1: a.y - ny, x2: b.x - nx, y2: b.y - ny, stroke: '#6a6a5a', 'stroke-width': 1.5, opacity: 0.4 }, svg);
  }

  // Step 4: garis tengah putus-putus
  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    const key = `${Math.min(e.a, e.b)}_${Math.max(e.a, e.b)}`;
    const isRoute = routeSet.has(key);
    el('path', {
      d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
      fill: 'none',
      stroke: isRoute ? '#fff5cc' : 'rgba(255,245,200,0.5)',
      'stroke-width': 1.5,
      'stroke-dasharray': '10 12',
      'stroke-linecap': 'round',
    }, svg);
  }

  // Step 5: zebra cross di persimpangan ramai
  let seed2 = state.nodes.length + 42;
  function sr2() { seed2 = (seed2 * 16807) % 2147483647; return (seed2 & 0x7fffffff) / 0x7fffffff; }
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (adj[i].length >= 3 && sr2() < 0.7) {
      const nb = nodes[adj[i][0]];
      const dx = nb.x - n.x, dy = nb.y - n.y;
      const len = Math.hypot(dx, dy);
      const t = 18 / len;
      const cx = n.x + dx * t, cy = n.y + dy * t;
      const perpX = -dy / len * 6, perpY = dx / len * 6;
      _drawCrosswalk(cx - perpX, cy - perpY, cx + perpX, cy + perpY);
    }
  }

  // Step 6: lampu merah di persimpangan
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (adj[i].length >= 3) {
      const nb = nodes[adj[i][1] || adj[i][0]];
      const dx = nb.x - n.x, dy = nb.y - n.y;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const perpX = -dy / len * 10, perpY = dx / len * 10;
      _drawTrafficLight(n.x + perpX, n.y + perpY, angle);
    }
  }

  // Step 7: lahan parkir
  let seed3 = state.nodes.length + 99;
  function sr3() { seed3 = (seed3 * 16807) % 2147483647; return (seed3 & 0x7fffffff) / 0x7fffffff; }
  let parkingCount = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const needsParking = ['mall', 'hotel', 'hospital', 'gas'].includes(n.asset.type);
    if (needsParking && parkingCount < 6) {
      const px = n.bx + (sr3() - 0.5) * 20;
      const py = n.by + 28 + sr3() * 10;
      if (py < H - 20 && px > 20 && px < W - 20) {
        _drawParkingLot(px, py, 30 + sr3() * 15, 16 + sr3() * 8);
        parkingCount++;
      }
    }
  }

  // Step 8: lampu jalan di sepanjang jalan
  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len * 10, ny = dx / len * 10;
    const lampCount = Math.floor(d / 80);
    for (let j = 1; j <= lampCount; j++) {
      const t = j / (lampCount + 1);
      _drawStreetLamp(a.x + dx * t + nx, a.y + dy * t + ny);
    }
  }

  // Step 9: manhole di beberapa ruas
  let seed4 = state.nodes.length + 7;
  function sr4() { seed4 = (seed4 * 16807) % 2147483647; return (seed4 & 0x7fffffff) / 0x7fffffff; }
  for (const e of edges) {
    if (sr4() < 0.3) {
      const a = nodes[e.a], b = nodes[e.b];
      const t = 0.3 + sr4() * 0.4;
      _drawManhole(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    }
  }

  // SVG path rute (invisible, hanya untuk getPointAtLength animasi)
  state.routeSvgPath = null;
  if (state.routePath.length >= 2) {
    const pathStr = buildRouteSVGPath(state.routePath, state.nodes);
    state.routeSvgPath = el('path', { d: pathStr, fill: 'none', stroke: 'none' }, svg);
  }
}

// ── Private: bangunan ─────

function _drawBuildings() {
  for (const n of state.nodes) {
    const g = el('g', {}, svg);
    _drawBuilding(g, n.bx || n.x, n.by || n.y, n.asset, n.id === state.startN, n.id === state.endN);
  }
}

function _drawBuilding(g, cx, cy, asset, isStart, isEnd) {
  const { type, color: wallColor, roof: roofColor } = asset;

  // Bayangan bangunan
  el('rect', { x: cx - 16, y: cy - 10, width: 36, height: 28, rx: 2, fill: 'rgba(0,0,0,0.25)' }, g);

  // Gambar tipe bangunan
  switch (type) {
    case 'house': {
      const s = 18;
      el('rect', { x: cx-s, y: cy-s*0.6, width: s*1.5, height: s*1.2, rx: 1, fill: wallColor, stroke: '#5a3a2a', 'stroke-width': 1 }, g);
      el('rect', { x: cx+s*0.5-4, y: cy-s*0.3, width: s*0.7, height: s*0.9, rx: 1, fill: wallColor, stroke: '#5a3a2a', 'stroke-width': 1 }, g);
      el('rect', { x: cx-s, y: cy-s*0.6, width: s*1.5, height: s*1.2, rx: 1, fill: roofColor, stroke: '#4a2a1a', 'stroke-width': 1.2 }, g);
      el('line', { x1: cx-s*0.25, y1: cy-s*0.6, x2: cx-s*0.25, y2: cy+s*0.6, stroke: '#3a1a0a', 'stroke-width': 1.5 }, g);
      el('rect', { x: cx-s+3, y: cy-s*0.3, width: 5, height: 5, rx: 0.5, fill: '#87CEEB', stroke: '#666', 'stroke-width': 0.5 }, g);
      el('rect', { x: cx-s+3, y: cy+1, width: 5, height: 5, rx: 0.5, fill: '#87CEEB', stroke: '#666', 'stroke-width': 0.5 }, g);
      el('rect', { x: cx+2, y: cy+s*0.2, width: 4, height: 6, rx: 0.5, fill: '#5a3520', stroke: '#3a1a0a', 'stroke-width': 0.5 }, g);
      el('rect', { x: cx+s*0.2, y: cy-s*0.6-3, width: 4, height: 6, fill: '#888', stroke: '#666', 'stroke-width': 0.5 }, g);
      break;
    }
    case 'mosque': {
      const s = 22;
      el('rect',   { x: cx-s, y: cy-s*0.7, width: s*2, height: s*1.4, rx: 3, fill: wallColor, stroke: '#1a4d6f', 'stroke-width': 1.2 }, g);
      el('circle', { cx, cy, r: s*0.5, fill: roofColor, stroke: '#1a4d6f', 'stroke-width': 1.5 }, g);
      el('circle', { cx, cy, r: s*0.25, fill: 'rgba(255,255,255,0.12)' }, g);
      el('circle', { cx: cx+2, cy: cy-1, r: 3.5, fill: '#f1c40f' }, g);
      for (const [dx, dy] of [[-s+4,-s*0.7+4],[s-4,-s*0.7+4],[-s+4,s*0.7-4],[s-4,s*0.7-4]]) {
        el('circle', { cx: cx+dx, cy: cy+dy, r: dx < 0 ? (dy < 0 ? 4 : 3) : (dy < 0 ? 4 : 3), fill: roofColor, stroke: '#1a4d6f', 'stroke-width': 0.8 }, g);
      }
      break;
    }
    case 'school': {
      const sw = 24, sh = 16;
      el('rect', { x: cx-sw, y: cy-sh, width: sw*2, height: sh*2, rx: 2, fill: roofColor, stroke: '#b87c0a', 'stroke-width': 1.2 }, g);
      el('rect', { x: cx-sw, y: cy-sh, width: 8, height: sh*2, rx: 1, fill: wallColor, stroke: '#b87c0a', 'stroke-width': 0.8 }, g);
      el('rect', { x: cx+sw-8, y: cy-sh, width: 8, height: sh*2, rx: 1, fill: wallColor, stroke: '#b87c0a', 'stroke-width': 0.8 }, g);
      for (let wx = cx-sw+2; wx < cx+sw-2; wx += 7)
        el('rect', { x: wx, y: cy-sh+2, width: 3, height: 3, fill: '#87CEEB', stroke: '#666', 'stroke-width': 0.3 }, g);
      el('line', { x1: cx, y1: cy-sh-2, x2: cx, y2: cy-sh+5, stroke: '#666', 'stroke-width': 1 }, g);
      el('rect', { x: cx, y: cy-sh-2, width: 6, height: 4, fill: '#e74c3c' }, g);
      break;
    }
    case 'hospital': {
      const s = 20;
      el('rect',   { x: cx-s, y: cy-s*0.5, width: s*2, height: s, rx: 2, fill: roofColor, stroke: '#aaa', 'stroke-width': 1.2 }, g);
      el('rect',   { x: cx-s*0.5, y: cy-s, width: s, height: s*2, rx: 2, fill: roofColor, stroke: '#aaa', 'stroke-width': 1.2 }, g);
      el('rect',   { x: cx-2.5, y: cy-8, width: 5, height: 16, rx: 1, fill: '#e74c3c' }, g);
      el('rect',   { x: cx-8, y: cy-2.5, width: 16, height: 5, rx: 1, fill: '#e74c3c' }, g);
      el('circle', { cx: cx+s-6, cy: cy-s*0.5+6, r: 5, fill: 'none', stroke: '#e74c3c', 'stroke-width': 0.8 }, g);
      txt('H', { x: cx+s-6, y: cy-s*0.5+6, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 6, fill: '#e74c3c', 'font-weight': 'bold' }, g);
      break;
    }
    case 'cafe': {
      const s = 15;
      el('rect', { x: cx-s, y: cy-s, width: s*2, height: s*2, rx: 3, fill: roofColor, stroke: '#5a3a2a', 'stroke-width': 1 }, g);
      for (let i = 0; i < 4; i++)
        el('rect', { x: cx-s+i*s*0.5, y: cy-s, width: s*0.5, height: 4, fill: i%2===0 ? '#c0392b' : '#ecf0f1' }, g);
      el('circle', { cx: cx-6, cy: cy-3, r: 4, fill: '#f1c40f', stroke: '#c09a0a', 'stroke-width': 0.8 }, g);
      el('circle', { cx: cx+6, cy: cy+4, r: 4, fill: '#e74c3c', stroke: '#c0392b', 'stroke-width': 0.8 }, g);
      el('circle', { cx: cx+5, cy: cy-5, r: 3.5, fill: '#3498db', stroke: '#2980b9', 'stroke-width': 0.8 }, g);
      break;
    }
    case 'gas': {
      const sw = 22, sh = 14;
      el('rect', { x: cx-sw, y: cy-sh, width: sw*2, height: sh*2, rx: 2, fill: '#ddd', stroke: '#4a5a5c', 'stroke-width': 1.2 }, g);
      el('rect', { x: cx-8, y: cy-5, width: 5, height: 10, rx: 1, fill: '#e74c3c', stroke: '#c0392b', 'stroke-width': 0.5 }, g);
      el('rect', { x: cx+3, y: cy-5, width: 5, height: 10, rx: 1, fill: '#27ae60', stroke: '#1a8a4a', 'stroke-width': 0.5 }, g);
      el('rect', { x: cx-sw+2, y: cy+2, width: 10, height: sh-4, rx: 1, fill: '#f39c12', stroke: '#c07a0a', 'stroke-width': 0.5 }, g);
      break;
    }
    case 'pharmacy': {
      const s = 16;
      el('rect', { x: cx-s, y: cy-s*0.7, width: s*2, height: s*1.4, rx: 2, fill: roofColor, stroke: '#1a6a40', 'stroke-width': 1.2 }, g);
      el('rect', { x: cx-3, y: cy-7, width: 6, height: 14, rx: 1, fill: '#fff' }, g);
      el('rect', { x: cx-7, y: cy-3, width: 14, height: 6, rx: 1, fill: '#fff' }, g);
      break;
    }
    case 'park': {
      el('ellipse', { cx, cy, rx: 24, ry: 18, fill: '#6abf69', stroke: '#2d6a4f', 'stroke-width': 1.2 }, g);
      for (const [dx, dy, r] of [[-10,-7,6],[9,4,7],[-4,7,5],[12,-8,4.5],[-14,2,4]])
        el('circle', { cx: cx+dx, cy: cy+dy, r, fill: '#2d6a4f' }, g);
      el('path', { d: `M ${cx-18} ${cy} Q ${cx-5} ${cy-5} ${cx+5} ${cy+2} Q ${cx+12} ${cy+5} ${cx+18} ${cy-2}`, fill: 'none', stroke: '#c4a86a', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, g);
      break;
    }
    case 'mall': {
      const sw = 24, sh = 17;
      el('rect', { x: cx-sw, y: cy-sh, width: sw*2, height: sh*2, rx: 3, fill: roofColor, stroke: '#b85e0a', 'stroke-width': 1.2 }, g);
      el('rect', { x: cx-10, y: cy-7, width: 20, height: 14, rx: 2, fill: '#87CEEB', opacity: 0.5, stroke: '#666', 'stroke-width': 0.8 }, g);
      el('line', { x1: cx, y1: cy-7, x2: cx, y2: cy+7, stroke: '#666', 'stroke-width': 0.5 }, g);
      el('line', { x1: cx-10, y1: cy, x2: cx+10, y2: cy, stroke: '#666', 'stroke-width': 0.5 }, g);
      break;
    }
    case 'hotel': {
      const sw = 20, sh = 16;
      el('rect', { x: cx-sw, y: cy-sh, width: sw*2, height: sh*2, rx: 2, fill: roofColor, stroke: '#c09a0a', 'stroke-width': 1.2 }, g);
      for (let wy = cy-sh+4; wy < cy+sh-4; wy += 6)
        for (let wx = cx-sw+4; wx < cx+sw-4; wx += 6)
          el('rect', { x: wx, y: wy, width: 3, height: 3, fill: '#87CEEB', stroke: '#aaa', 'stroke-width': 0.3 }, g);
      el('ellipse', { cx: cx+sw-8, cy, rx: 6, ry: 4, fill: '#5aaacc', stroke: '#3a8aaa', 'stroke-width': 0.5 }, g);
      break;
    }
    case 'bank': {
      const s = 18;
      el('rect', { x: cx-s, y: cy-s*0.7, width: s*2, height: s*1.4, rx: 1, fill: roofColor, stroke: '#1a8a4a', 'stroke-width': 1.2 }, g);
      for (let i = -s+4; i <= s-4; i += 6)
        el('line', { x1: cx+i, y1: cy-s*0.7, x2: cx+i, y2: cy+s*0.7, stroke: '#ddd', 'stroke-width': 2, opacity: 0.5 }, g);
      el('circle', { cx, cy, r: 8, fill: 'rgba(0,0,0,0.3)', stroke: '#ccc', 'stroke-width': 1 }, g);
      txt('$', { x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 12, 'font-weight': 'bold', fill: '#f1c40f' }, g);
      break;
    }
    case 'church': {
      const s = 17;
      el('rect',   { x: cx-s*0.6, y: cy-s*0.8, width: s*1.2, height: s*1.6, rx: 1, fill: roofColor, stroke: '#8a9aaa', 'stroke-width': 1.2 }, g);
      el('rect',   { x: cx-s, y: cy-s*0.25, width: s*2, height: s*0.5, rx: 1, fill: roofColor, stroke: '#8a9aaa', 'stroke-width': 1 }, g);
      el('rect',   { x: cx-1.5, y: cy-s*0.8-6, width: 3, height: 10, fill: '#f1c40f' }, g);
      el('rect',   { x: cx-4, y: cy-s*0.8-4, width: 8, height: 3, fill: '#f1c40f' }, g);
      el('circle', { cx, cy: cy-s*0.8, r: 5, fill: roofColor, stroke: '#8a9aaa', 'stroke-width': 1 }, g);
      break;
    }
    default: {
      const s = 16;
      el('rect', { x: cx-s, y: cy-s*0.8, width: s*2, height: s*1.6, rx: 2, fill: roofColor, stroke: '#3e2a1f', 'stroke-width': 1 }, g);
    }
  }

  // Label nama bangunan
  el('rect', { x: cx-16, y: cy+15, width: 32, height: 12, rx: 2, fill: 'rgba(0,0,0,0.75)' }, g);
  txt(asset.label, { x: cx, y: cy+20.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 8, fill: '#eee' }, g);

  // Marker START / FINISH
  if (isStart || isEnd) {
    const col = isStart ? '#2b8c4a' : '#c23b22';
    el('circle', { cx, cy, r: 10, fill: col, stroke: 'white', 'stroke-width': 1.5, opacity: 0.85 }, g);
    el('circle', { cx, cy, r: 5, fill: 'none', stroke: 'rgba(255,255,255,0.6)', 'stroke-width': 1 }, g);
    txt(isStart ? 'S' : 'F', { x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 5, 'font-weight': 'bold', fill: 'white' }, g);
  }
}

// ── Private: kendaraan ──────

function _drawCar() {
  if (state.routePath.length < 2) return;
  const car = getVehiclePos();
  if (!car) return;

  const g = el('g', { transform: `translate(${car.x},${car.y}) rotate(${car.angle})` }, svg);
  el('rect',   { x: -12, y: -7, width: 24, height: 14, rx: 3, fill: '#e74c3c', stroke: '#c0392b', 'stroke-width': 1.5 }, g);
  el('rect',   { x: -7, y: -11, width: 14, height: 6, rx: 2, fill: '#2c3e50' }, g);
  el('rect',   { x: -5, y: -10, width: 10, height: 3, rx: 1, fill: '#87CEEB', opacity: 0.8 }, g);
  el('circle', { cx: -7, cy: 8, r: 4, fill: '#1a1a1a', stroke: '#333', 'stroke-width': 1 }, g);
  el('circle', { cx:  7, cy: 8, r: 4, fill: '#1a1a1a', stroke: '#333', 'stroke-width': 1 }, g);
  el('circle', { cx: -7, cy: 8, r: 1.5, fill: '#888' }, g);
  el('circle', { cx:  7, cy: 8, r: 1.5, fill: '#888' }, g);
  el('circle', { cx: 12, cy: -3, r: 2, fill: '#f1c40f' }, g); // headlight
  el('circle', { cx: -12, cy: -3, r: 2, fill: '#e74c3c'  }, g); // taillight
}

// ── Private: elemen urban ──────

function _drawCrosswalk(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;
  const stripes = 4, stripeW = 2, gap = 3;
  const totalW = stripes * stripeW + (stripes - 1) * gap;
  for (let i = 0; i < stripes; i++) {
    const offset = -totalW / 2 + i * (stripeW + gap);
    el('line', {
      x1: x1 + nx * offset, y1: y1 + ny * offset,
      x2: x2 + nx * offset, y2: y2 + ny * offset,
      stroke: '#fff', 'stroke-width': stripeW, opacity: 0.7,
    }, svg);
  }
}

function _drawTrafficLight(x, y, angle) {
  const g = el('g', { transform: `translate(${x},${y}) rotate(${angle || 0})` }, svg);
  el('rect',   { x: -1.5, y: -2, width: 3, height: 14, rx: 0.5, fill: '#555', stroke: '#333', 'stroke-width': 0.5 }, g);
  el('rect',   { x: -4, y: -12, width: 8, height: 12, rx: 2, fill: '#222', stroke: '#444', 'stroke-width': 0.8 }, g);
  el('circle', { cx: 0, cy: -9,   r: 2.2, fill: '#e74c3c' }, g);
  el('circle', { cx: 0, cy: -9,   r: 1.2, fill: '#ff6b6b', opacity: 0.6 }, g);
  el('circle', { cx: 0, cy: -5.5, r: 2.2, fill: '#f39c12' }, g);
  el('circle', { cx: 0, cy: -2,   r: 2.2, fill: '#27ae60' }, g);
}

function _drawParkingLot(x, y, w, h) {
  const g = el('g', { transform: `translate(${x},${y})` }, svg);
  el('rect', { x: -w/2, y: -h/2, width: w, height: h, rx: 2, fill: '#3a3a3a', stroke: '#555', 'stroke-width': 0.8 }, g);
  const slots = Math.floor(w / 8);
  for (let i = 0; i <= slots; i++) {
    const lx = -w/2 + 3 + i * ((w-6)/slots);
    el('line', { x1: lx, y1: -h/2+2, x2: lx, y2: h/2-2, stroke: '#fff', 'stroke-width': 0.6, opacity: 0.5 }, g);
  }
  el('circle', { cx: 0, cy: 0, r: 5, fill: '#2980b9', opacity: 0.7 }, g);
  txt('P', { x: 0, y: 0, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 7, 'font-weight': 'bold', fill: '#fff' }, g);
}

function _drawStreetLamp(x, y) {
  el('line',   { x1: x, y1: y, x2: x, y2: y-8, stroke: '#666', 'stroke-width': 1.5 }, svg);
  el('line',   { x1: x, y1: y-7, x2: x+4, y2: y-8, stroke: '#666', 'stroke-width': 1 }, svg);
  el('circle', { cx: x+4, cy: y-8, r: 5, fill: '#f1c40f', opacity: 0.08 }, svg);
  el('circle', { cx: x+4, cy: y-8, r: 2, fill: '#f1c40f', opacity: 0.15 }, svg);
  el('circle', { cx: x+4, cy: y-8, r: 1, fill: '#fff5cc',  opacity: 0.3  }, svg);
}

function _drawManhole(x, y) {
  el('circle', { cx: x, cy: y, r: 3, fill: '#3a3a3a', stroke: '#555', 'stroke-width': 0.5 }, svg);
  el('line',   { x1: x-2, y1: y, x2: x+2, y2: y, stroke: '#555', 'stroke-width': 0.4 }, svg);
  el('line',   { x1: x, y1: y-2, x2: x, y2: y+2, stroke: '#555', 'stroke-width': 0.4 }, svg);
}

// ── Update legenda ───────

function _updateLegend() {
  const leg = document.getElementById('legend');
  const seen = new Set(), items = [];
  for (const n of state.nodes) {
    if (n.asset && !seen.has(n.asset.type)) {
      seen.add(n.asset.type);
      items.push(n.asset);
    }
  }
  leg.innerHTML =
    '<span style="font-weight:600;">🏙️ Legenda:</span>' +
    items.map(a => `<span class="leg-item"><span class="leg-dot" style="background:${a.color}"></span>${a.label}</span>`).join('') +
    '<span class="leg-item"><span class="leg-dot" style="background:#2b8c4a"></span>🚩 START</span>' +
    '<span class="leg-item"><span class="leg-dot" style="background:#c23b22"></span>🏁 FINISH</span>' +
    '<span class="leg-item"><span class="leg-dot" style="background:#d4922a"></span>✨ RUTE</span>' +
    '<span class="leg-item"><span class="leg-dot" style="background:#e74c3c"></span>🚗 MOBIL</span>' +
    '<span class="leg-item"><span class="leg-dot" style="background:#222"></span>🚦 Lampu Merah</span>' +
    '<span class="leg-item"><span class="leg-dot" style="background:#3a3a3a"></span>🅿️ Parkiran</span>';
}