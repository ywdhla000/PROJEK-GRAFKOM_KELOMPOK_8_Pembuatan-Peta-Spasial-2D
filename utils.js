import { FILLET } from './constants.js';

export function r(a, b) {
  return a + Math.random() * (b - a);
}

/** Random integer antara a dan b (inklusif) */
export function ri(a, b) {
  return Math.floor(r(a, b + 1));
}

/** Jarak Euclidean antara dua titik {x, y} */
export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ─── SVG Helper ───────────────────────────────────────────────

/**
 * Buat elemen SVG dengan atribut sekaligus, lalu tambahkan ke parent.
 * @param {string} tag   
 * @param {object} attrs -
 * @param {SVGElement} parent 
 * @returns {SVGElement}
 */
export function el(tag, attrs, parent) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) {
    e.setAttribute(k, v);
  }
  if (parent) parent.appendChild(e);
  return e;
}

/**
 * Buat elemen SVG <text> dengan konten teks.
 */
export function txt(content, attrs, parent) {
  const t = el('text', attrs, parent);
  t.textContent = content;
  return t;
}

// ─── Geometri Jalan ───────────────────────────────────────────

/**
 * @param {{ x: number, y: number }} node  - titik asal
 * @param {{ x: number, y: number }} other - titik tujuan
 * @returns {{ x: number, y: number }}
 */
export function filletPoint(node, other) {
  const d = dist(node, other);
  const t = Math.min(FILLET / d, 0.35);
  return {
    x: node.x + (other.x - node.x) * t,
    y: node.y + (other.y - node.y) * t,
  };
}

/**
 *
 *
 * @param {number[]} rp     - array index node dari startN sampai endN
 * @param {object[]} nodes  - array semua node
 * @returns {string} SVG path string
 */
export function buildRouteSVGPath(rp, nodes) {
  if (rp.length < 2) return '';

  // Hanya 2 node: cukup garis lurus
  if (rp.length === 2) {
    const a = nodes[rp[0]], b = nodes[rp[1]];
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }

  const parts = [];
  const n0 = nodes[rp[0]], n1 = nodes[rp[1]];
  const fp0 = filletPoint(n1, n0);

  // Mulai dari node pertama, lurus ke titik fillet sebelum persimpangan
  parts.push(`M ${n0.x} ${n0.y} L ${fp0.x} ${fp0.y}`);

  for (let i = 1; i < rp.length - 1; i++) {
    const prev = nodes[rp[i - 1]];
    const cur  = nodes[rp[i]];
    const next = nodes[rp[i + 1]];

    // pIn  = titik masuk ke persimpangan (dari arah prev)
    // pOut = titik keluar persimpangan (ke arah next)
    const pOut = filletPoint(cur, next);

    // Quadratic Bezier: control point = titik persimpangan (cur)
    parts.push(`Q ${cur.x} ${cur.y} ${pOut.x} ${pOut.y}`);

    // Lurus ke titik fillet berikutnya (kecuali node terakhir)
    if (i < rp.length - 2) {
      const nextNode = nodes[rp[i + 1]];
      const fpNext = filletPoint(nextNode, cur);
      parts.push(`L ${fpNext.x} ${fpNext.y}`);
    }
  }

  // Lurus ke node terakhir
  const nLast = nodes[rp[rp.length - 1]];
  parts.push(`L ${nLast.x} ${nLast.y}`);

  return parts.join(' ');
}
