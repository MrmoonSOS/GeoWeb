/**
 * calculations.js — GeoWeb
 * Motor matemático puro (sin dependencia de JSXGraph).
 * Convenciones: puntos = { x, y }
 */

const RAD2DEG = 180 / Math.PI;

// ── BÁSICOS ──────────────────────────────────────────────

export function distancia(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

export function anguloPuntos(pA, pB, pC) {
  // Ángulo en pB formado por BA y BC
  const v1x = pA.x - pB.x, v1y = pA.y - pB.y;
  const v2x = pC.x - pB.x, v2y = pC.y - pB.y;
  const dot = v1x * v2x + v1y * v2y;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);
  if (m1 === 0 || m2 === 0) return 0;
  let cos = dot / (m1 * m2);
  cos = Math.max(-1, Math.min(1, cos));
  return Math.acos(cos) * RAD2DEG;
}

export function angulosTriangulo(pA, pB, pC) {
  return {
    A: anguloPuntos(pB, pA, pC),
    B: anguloPuntos(pA, pB, pC),
    C: anguloPuntos(pA, pC, pB),
  };
}

export function areaTriangulo(pA, pB, pC) {
  // Shoelace
  return Math.abs(
    (pA.x * (pB.y - pC.y) +
     pB.x * (pC.y - pA.y) +
     pC.x * (pA.y - pB.y)) / 2
  );
}

export function perimetroTriangulo(pA, pB, pC) {
  return distancia(pA, pB) + distancia(pB, pC) + distancia(pC, pA);
}

export function datosCirculo(centro, puntoEnBorde) {
  const radio = distancia(centro, puntoEnBorde);
  const diametro = 2 * radio;
  const area = Math.PI * radio * radio;
  const circunferencia = 2 * Math.PI * radio;
  return { radio, diametro, area, circunferencia };
}

// ── CÓNICAS ──────────────────────────────────────────────

export function puntosElipse(foco1, foco2, a, numPuntos = 200) {
  const cx = (foco1.x + foco2.x) / 2;
  const cy = (foco1.y + foco2.y) / 2;
  const c = distancia(foco1, foco2) / 2;
  const b2 = a * a - c * c;
  if (b2 < 0) return [];
  const b = Math.sqrt(b2);
  const theta = Math.atan2(foco2.y - foco1.y, foco2.x - foco1.x);
  const cosT = Math.cos(theta), sinT = Math.sin(theta);

  const pts = [];
  for (let i = 0; i <= numPuntos; i++) {
    const t = (i / numPuntos) * 2 * Math.PI;
    const xL = a * Math.cos(t);
    const yL = b * Math.sin(t);
    pts.push({ x: cx + xL * cosT - yL * sinT, y: cy + xL * sinT + yL * cosT });
  }
  return pts;
}

export function puntosHiperbola(foco1, foco2, a, numPuntos = 200) {
  const cx = (foco1.x + foco2.x) / 2;
  const cy = (foco1.y + foco2.y) / 2;
  const c = distancia(foco1, foco2) / 2;
  const b2 = c * c - a * a;
  if (b2 < 0) return [];
  const b = Math.sqrt(b2);
  const theta = Math.atan2(foco2.y - foco1.y, foco2.x - foco1.x);
  const cosT = Math.cos(theta), sinT = Math.sin(theta);

  const ramaDer = [];
  const ramaIzq = [];
  const lim = 2.5;
  for (let i = 0; i <= numPuntos; i++) {
    const t = -lim + (i / numPuntos) * 2 * lim;
    const xL = a * Math.cosh(t);
    const yL = b * Math.sinh(t);
    ramaDer.push({ x: cx + xL * cosT - yL * sinT, y: cy + xL * sinT + yL * cosT });
    ramaIzq.push({ x: cx + (-xL) * cosT - yL * sinT, y: cy + (-xL) * sinT + yL * cosT });
  }
  // Separa ramas con un NaN para curvas JSX
  return [...ramaDer, { x: NaN, y: NaN }, ...ramaIzq];
}

export function puntosParabola(foco, directrizY, rango = [-10, 10], numPuntos = 200) {
  // Parábola con directriz horizontal y = directrizY
  // Vértice en ((foco.x), (foco.y + directrizY)/2)
  const vy = (foco.y + directrizY) / 2;
  const p = (foco.y - directrizY) / 2; // distancia foco-vértice
  const pts = [];
  if (p === 0) return pts;
  for (let i = 0; i <= numPuntos; i++) {
    const x = rango[0] + (i / numPuntos) * (rango[1] - rango[0]);
    const y = vy + ((x - foco.x) * (x - foco.x)) / (4 * p);
    pts.push({ x, y });
  }
  return pts;
}

// ── INTERSECCIONES ───────────────────────────────────────

export function interseccionRectaRecta(p1, p2, p3, p4) {
  const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y, x4 = p4.x, y4 = p4.y;
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-12) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
}

export function interseccionRectaCirculo(p1, p2, centro, radio) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const fx = p1.x - centro.x;
  const fy = p1.y - centro.y;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - radio * radio;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  if (Math.abs(disc) < 1e-12) {
    const t = -b / (2 * a);
    return [{ x: p1.x + t * dx, y: p1.y + t * dy }];
  }
  const sq = Math.sqrt(disc);
  const t1 = (-b + sq) / (2 * a);
  const t2 = (-b - sq) / (2 * a);
  return [
    { x: p1.x + t1 * dx, y: p1.y + t1 * dy },
    { x: p1.x + t2 * dx, y: p1.y + t2 * dy },
  ];
}

export function interseccionCirculoCirculo(c1, r1, c2, r2) {
  const d = distancia(c1, c2);
  if (d > r1 + r2 || d < Math.abs(r1 - r2) || d === 0) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h2 = r1 * r1 - a * a;
  if (h2 < 0) return [];
  const h = Math.sqrt(h2);
  const px = c1.x + (a * (c2.x - c1.x)) / d;
  const py = c1.y + (a * (c2.y - c1.y)) / d;
  if (h < 1e-12) return [{ x: px, y: py }];
  const rx = -(c2.y - c1.y) * (h / d);
  const ry = (c2.x - c1.x) * (h / d);
  return [
    { x: px + rx, y: py + ry },
    { x: px - rx, y: py - ry },
  ];
}

// ── CONSTRUCCIONES ───────────────────────────────────────

export function puntoMedio(p1, p2) {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

export function rectaPerpendicular(p1, p2, punto) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  // Vector perpendicular: (-dy, dx)
  return {
    p1: punto,
    p2: { x: punto.x - dy, y: punto.y + dx },
  };
}

export function mediatriz(p1, p2) {
  const m = puntoMedio(p1, p2);
  return rectaPerpendicular(p1, p2, m);
}

export function bisectriz(pA, pVertice, pB) {
  const v1x = pA.x - pVertice.x, v1y = pA.y - pVertice.y;
  const v2x = pB.x - pVertice.x, v2y = pB.y - pVertice.y;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);
  if (m1 === 0 || m2 === 0) return { p1: pVertice, p2: pVertice };
  const bx = v1x / m1 + v2x / m2;
  const by = v1y / m1 + v2y / m2;
  return {
    p1: pVertice,
    p2: { x: pVertice.x + bx, y: pVertice.y + by },
  };
}
