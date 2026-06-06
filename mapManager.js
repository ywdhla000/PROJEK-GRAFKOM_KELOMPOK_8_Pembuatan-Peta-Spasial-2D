/**
 * mapManager.js — Pembangkit peta (graf node + edge)
 *
 * Tanggung jawab:
 *   1. Buat grid node dengan posisi acak
 *   2. Hubungkan node dengan edge (jalan)
 *   3. Pastikan graf selalu connected dan setiap node punya degree ≥ 2
 *   4. Assign aset bangunan ke setiap node
 *   5. Hitung posisi bangunan (bx, by) — sedikit offset dari node
 *
 * Kompleksitas generateMap():
 *   - O(V²) pada beberapa bagian (connectivity fix, degree fix)
 *   - V = jumlah node (biasanya 20–50), jadi masih sangat cepat
 */

import { state }           from './state.js';
import { W, H, ASSETS }   from './constants.js';
import { r, ri, dist }    from './utils.js';
import { stopAnim }        from './animation.js';
import { computeRoute }    from './logic.js';
import { render }          from './render.js';

export function generateMap() {
  // Hentikan animasi yang mungkin sedang berjalan
  stopAnim();

  // ── Reset state ──────────────────────────────────────────────
  // PENTING: jangan reassign array (state.nodes = []) karena referensi
  // yang sudah diimport di modul lain akan jadi stale.
  // Gunakan .length = 0 untuk mengosongkan array in-place.
  state.nodes.length   = 0;
  state.edges.length   = 0;
  state.routePath      = [];
  state.startN         = null;
  state.endN           = null;

  let id = 0;
  const cols       = ri(5, 8);
  const rows       = ri(4, 6);
  const marginX    = ri(80, 150);
  const marginY    = ri(70, 120);
  const cellW      = (W - marginX * 2) / (cols - 1);
  const cellH      = (H - marginY * 2) / (rows - 1);
  const layoutStyle = ri(0, 3); // 0=grid rapi, 1=offset, 2=organik, 3=radial

  // ── Buat grid node ───────────────────────────────────────────
  const grid = [];
  for (let row = 0; row < rows; row++) {
    grid[row] = [];
    for (let col = 0; col < cols; col++) {

      // 10% peluang node tengah dihapus (membuat peta lebih natural)
      if (Math.random() < 0.1 && row > 0 && row < rows - 1 && col > 0 && col < cols - 1) {
        grid[row][col] = -1; // -1 = tidak ada node di sini
        continue;
      }

      let x, y;

      if (layoutStyle === 1) {
        // Pola offset: baris ganjil digeser ke kanan
        const offsetX = (row % 2 === 1) ? cellW * 0.4 : 0;
        x = marginX + col * cellW + offsetX + (Math.random() - 0.5) * 40;
        y = marginY + row * cellH + (Math.random() - 0.5) * 30;

      } else if (layoutStyle === 2) {
        // Organik: jitter besar
        x = marginX + col * cellW + (Math.random() - 0.5) * cellW * 0.6;
        y = marginY + row * cellH + (Math.random() - 0.5) * cellH * 0.5;

      } else if (layoutStyle === 3) {
        // Radial: node sedikit melingkar ke pusat
        const cx = W / 2, cy = H / 2;
        const baseX = marginX + col * cellW;
        const baseY = marginY + row * cellH;
        const dx = baseX - cx, dy = baseY - cy;
        const angle = Math.atan2(dy, dx);
        const spread = (Math.random() - 0.5) * 60;
        x = baseX + Math.cos(angle + 0.3) * spread + (Math.random() - 0.5) * 30;
        y = baseY + Math.sin(angle + 0.3) * spread + (Math.random() - 0.5) * 30;

      } else {
        // Default: grid dengan jitter kecil
        x = marginX + col * cellW + (Math.random() - 0.5) * 30;
        y = marginY + row * cellH + (Math.random() - 0.5) * 25;
      }

      // Clamp agar tidak keluar batas peta
      x = Math.min(W - 60, Math.max(60, x));
      y = Math.min(H - 60, Math.max(60, y));

      grid[row][col] = id;
      state.nodes.push({ id: id++, x, y, asset: null, gridRow: row, gridCol: col });
    }
  }

  // ── Fungsi tambah edge (dengan dedup via Set) ─────────────────
  const edgeSet = new Set();

  function addEdge(a, b) {
    if (a === b || a < 0 || b < 0) return;
    const key = `${Math.min(a, b)}_${Math.max(a, b)}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    state.edges.push({ a, b });
  }

  // ── Edge horizontal dan vertikal (backbone grid) ──────────────
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col] === -1) continue;

      // Sambung ke tetangga kanan terdekat yang valid
      if (col < cols - 1) {
        for (let c2 = col + 1; c2 < cols; c2++) {
          if (grid[row][c2] !== -1) { addEdge(grid[row][col], grid[row][c2]); break; }
        }
      }

      // Sambung ke tetangga bawah terdekat yang valid
      if (row < rows - 1) {
        for (let r2 = row + 1; r2 < rows; r2++) {
          if (grid[r2][col] !== -1) { addEdge(grid[row][col], grid[r2][col]); break; }
        }
      }
    }
  }

  // ── Edge diagonal (membuat peta lebih bervariasi) ─────────────
  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      if (grid[row][col] === -1) continue;
      if (Math.random() < 0.25 && grid[row + 1][col + 1] !== -1) {
        addEdge(grid[row][col], grid[row + 1][col + 1]);
      }
      if (Math.random() < 0.2 && col > 0 && grid[row + 1][col - 1] !== -1) {
        addEdge(grid[row][col], grid[row + 1][col - 1]);
      }
    }
  }

  // ── Edge tambahan acak (dalam jarak wajar) ────────────────────
  let extraEdges = ri(2, 5);
  for (let attempt = 0; attempt < extraEdges * 5 && extraEdges > 0; attempt++) {
    const a = ri(0, state.nodes.length - 1);
    const b = ri(0, state.nodes.length - 1);
    if (a === b) continue;
    const d = dist(state.nodes[a], state.nodes[b]);
    if (d > cellW * 0.8 && d < cellW * 2.2) {
      const key = `${Math.min(a, b)}_${Math.max(a, b)}`;
      if (!edgeSet.has(key)) { addEdge(a, b); extraEdges--; }
    }
  }

  // ── Hapus sebagian edge (sambil jaga konektivitas & degree ≥ 2) ─
  const removeTarget = Math.floor(state.edges.length * r(0.1, 0.25));
  const removed = new Set();
  const shuffled = state.edges.map((_, i) => i).sort(() => Math.random() - 0.5);

  for (const idx of shuffled) {
    if (removed.size >= removeTarget) break;
    const testEdges = state.edges.filter((_, i) => !removed.has(i) && i !== idx);

    // Cek degree ≥ 2 untuk semua node
    const deg = new Array(state.nodes.length).fill(0);
    for (const e of testEdges) { deg[e.a]++; deg[e.b]++; }
    if (deg.some(d => d < 2)) continue;

    // Cek konektivitas (BFS/DFS sederhana) — O(V + E)
    const adjTest = Array.from({ length: state.nodes.length }, () => []);
    for (const e of testEdges) { adjTest[e.a].push(e.b); adjTest[e.b].push(e.a); }
    const vis = new Array(state.nodes.length).fill(false);
    const st = [0]; vis[0] = true; let cnt = 1;
    while (st.length) {
      const u = st.pop();
      for (const v of adjTest[u]) if (!vis[v]) { vis[v] = true; st.push(v); cnt++; }
    }
    if (cnt === state.nodes.length) removed.add(idx);
  }
  // Filter in-place: timpa array tanpa reassign
  const kept = state.edges.filter((_, i) => !removed.has(i));
  state.edges.length = 0;
  for (const e of kept) state.edges.push(e);

  // ── Pastikan degree ≥ 2 setelah penghapusan ───────────────────
  _ensureMinDegree(edgeSet, addEdge);

  // ── Pastikan semua node terhubung (connected graph) ───────────
  _ensureConnectivity(addEdge);

  // ── Pastikan degree ≥ 2 sekali lagi setelah konektivitas ──────
  _ensureMinDegree(edgeSet, addEdge);

  // ── Assign aset bangunan ke setiap node ──────────────────────
  const cnt = {};
  for (let i = 0; i < state.nodes.length; i++) {
    let a;
    let attempts = 0;
    // Batasi jumlah tiap tipe agar tidak semua jadi rumah
    do {
      a = ASSETS[ri(0, ASSETS.length - 1)];
      attempts++;
    } while (
      attempts < 30 &&
      (cnt[a.type] || 0) >= (
        a.type === 'house'    ? 14 :
        a.type === 'park'     ?  2 :
        a.type === 'cafe'     ?  2 : 3
      )
    );
    cnt[a.type] = (cnt[a.type] || 0) + 1;
    state.nodes[i].asset = a;
  }

  // ── Hitung posisi bangunan (offset dari node ke "luar" jalan) ─
  for (let i = 0; i < state.nodes.length; i++) {
    const n = state.nodes[i];
    let avgDx = 0, avgDy = 0;

    for (const e of state.edges) {
      if (e.a === i) { avgDx += state.nodes[e.b].x - n.x; avgDy += state.nodes[e.b].y - n.y; }
      if (e.b === i) { avgDx += state.nodes[e.a].x - n.x; avgDy += state.nodes[e.a].y - n.y; }
    }

    const len = Math.hypot(avgDx, avgDy);
    if (len > 0) {
      // Offset ke arah berlawanan dari rata-rata tetangga
      n.bx = n.x - (avgDx / len) * 35;
      n.by = n.y - (avgDy / len) * 35;
    } else {
      n.bx = n.x + 30;
      n.by = n.y + 30;
    }

    n.bx = Math.min(W - 40, Math.max(40, n.bx));
    n.by = Math.min(H - 40, Math.max(40, n.by));
  }

  // Pilih titik awal dan akhir rute, lalu render
  randomizePoints(true);
  render();
}

/** Pilih dua node acak sebagai start dan finish, lalu hitung rute */
export function randomizePoints(skipRender = false) {
  if (state.nodes.length < 2) return;

  let a, b;
  do {
    a = ri(0, state.nodes.length - 1);
    b = ri(0, state.nodes.length - 1);
  } while (a === b);

  state.startN = a;
  state.endN   = b;

  computeRoute();

  if (!skipRender) render();

  // Update status bar
  const sn = state.nodes[state.startN];
  const en = state.nodes[state.endN];
  document.getElementById('status').innerHTML =
    `<span><span class="route-label start-label">Start:</span> ${sn.asset.label}</span>` +
    `<span><span class="route-label finish-label">Finish:</span> ${en.asset.label}</span>` +
    `<span style="color:#888;font-size:11px">(${state.routePath.length > 1 ? state.routePath.length - 1 + ' ruas' : 'langsung'})</span>`;
}

// ── Private helpers ───────────────────────────────────────────

/** Tambah edge ke node yang degree-nya masih < 2 */
function _ensureMinDegree(edgeSet, addEdge) {
  const finalDeg = new Array(state.nodes.length).fill(0);
  for (const e of state.edges) { finalDeg[e.a]++; finalDeg[e.b]++; }

  for (let i = 0; i < state.nodes.length; i++) {
    if (finalDeg[i] >= 2) continue;

    // Cari kandidat terdekat yang belum terhubung
    const candidates = [];
    for (let j = 0; j < state.nodes.length; j++) {
      if (i === j) continue;
      const key = `${Math.min(i, j)}_${Math.max(i, j)}`;
      if (edgeSet.has(key)) continue;
      candidates.push({ j, d: dist(state.nodes[i], state.nodes[j]) });
    }
    candidates.sort((a, b) => a.d - b.d);

    const needed = 2 - finalDeg[i];
    for (let k = 0; k < Math.min(needed, candidates.length); k++) {
      addEdge(i, candidates[k].j);
      finalDeg[i]++;
      finalDeg[candidates[k].j]++;
    }
  }
}

/** Sambungkan node yang terisolasi ke komponen utama */
function _ensureConnectivity(addEdge) {
  const adj = Array.from({ length: state.nodes.length }, () => []);
  for (const e of state.edges) { adj[e.a].push(e.b); adj[e.b].push(e.a); }

  const visited = new Array(state.nodes.length).fill(false);
  const stack = [0]; visited[0] = true;
  while (stack.length) {
    const u = stack.pop();
    for (const v of adj[u]) if (!visited[v]) { visited[v] = true; stack.push(v); }
  }

  // Node yang belum dikunjungi = terpisah dari komponen utama
  for (let i = 0; i < state.nodes.length; i++) {
    if (visited[i]) continue;

    // Sambungkan ke node visited terdekat
    let nearest = -1, nd = Infinity;
    for (let j = 0; j < state.nodes.length; j++) {
      if (!visited[j]) continue;
      const d = dist(state.nodes[i], state.nodes[j]);
      if (d < nd) { nd = d; nearest = j; }
    }
    if (nearest !== -1) {
      addEdge(i, nearest);
      visited[i] = true; // tandai sebagai terhubung
    }
  }
}
