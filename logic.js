import { state } from './state.js';
import { dist }  from './utils.js';


export function computeRoute() {
  const n   = state.nodes.length;
  const adj = Array.from({ length: n }, () => []);

  // Bangun adjacency list berbobot (bobot = jarak Euclidean antar node)
  for (const e of state.edges) {
    const d = dist(state.nodes[e.a], state.nodes[e.b]);
    adj[e.a].push({ v: e.b, d });
    adj[e.b].push({ v: e.a, d });
  }

  // distArr[i] = jarak terpendek yang diketahui dari startN ke node i
  const distArr = new Array(n).fill(Infinity);
  // prev[i] = node sebelumnya dalam jalur terpendek ke i
  const prev    = new Array(n).fill(-1);

  distArr[state.startN] = 0;

  // Priority Queue sederhana (array, di-sort setiap iterasi)
  // Format: { v: index node, d: jarak dari startN }
  const pq = [{ v: state.startN, d: 0 }];

  while (pq.length) {
    // Ambil node dengan jarak terkecil — O(V log V) karena sort
    pq.sort((x, y) => x.d - y.d);
    const { v, d } = pq.shift();

    // Lazy deletion: skip jika entry ini sudah outdated
    if (d > distArr[v]) continue;

    // Relaksasi semua tetangga node v
    for (const { v: u, d: w } of adj[v]) {
      const nd = d + w; // jarak baru ke u melalui v
      if (nd < distArr[u]) {
        distArr[u] = nd;
        prev[u]    = v;
        pq.push({ v: u, d: nd });
      }
    }
  }

  // Rekonstruksi jalur: telusuri prev[] dari endN ke startN
  state.routePath = [];
  let cur = state.endN;
  while (cur !== -1) {
    state.routePath.unshift(cur);
    cur = prev[cur];
  }

  // Validasi: jika startN tidak ada di routePath[0], berarti tidak ada jalur
  if (state.routePath[0] !== state.startN) {
    state.routePath = [];
  }

  // Reset progress animasi ke awal
  state.pathProgress = 0;
}
