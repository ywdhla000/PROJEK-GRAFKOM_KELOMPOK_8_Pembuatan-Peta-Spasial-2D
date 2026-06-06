
export const state = {
  // Data graf
  nodes: [],      // Array of { id, x, y, bx, by, asset, gridRow, gridCol }
  edges: [],      // Array of { a, b }  (index node)

  // Navigasi
  routePath: [],  // Array of node index — hasil Dijkstra
  startN: null,   // Index node awal
  endN: null,     // Index node tujuan

  // Animasi
  animOn: false,
  animFrame: null,
  pathProgress: 0,
  carSpeed: 0.002 * 3,

  // SVG path elemen untuk animasi mobil (diisi saat render)
  routeSvgPath: null,
};
