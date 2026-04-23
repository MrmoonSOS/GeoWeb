// calculations.js — Funciones matemáticas puras

// Distancia entre dos puntos
export function distancia(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Área de un triángulo dados tres puntos (fórmula del determinante)
export function areaTriangulo(p1, p2, p3) {
  return Math.abs(
    (p1.x * (p2.y - p3.y) +
     p2.x * (p3.y - p1.y) +
     p3.x * (p1.y - p2.y)) / 2
  );
}

// Perímetro de un triángulo
export function perimetroTriangulo(p1, p2, p3) {
  return distancia(p1, p2) + distancia(p2, p3) + distancia(p3, p1);
}

// Ángulo en un vértice dado (en grados)
export function angulo(p1, vertice, p2) {
  const ax = p1.x - vertice.x, ay = p1.y - vertice.y;
  const bx = p2.x - vertice.x, by = p2.y - vertice.y;
  const dot = ax * bx + ay * by;
  const mag = Math.sqrt(ax * ax + ay * ay) * Math.sqrt(bx * bx + by * by);
  if (mag === 0) return 0;
  return Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180 / Math.PI;
}

// Radio de un círculo dados centro y un punto del borde
export function radioCirculo(centro, punto) {
  return distancia(centro, punto);
}

// Área de un círculo
export function areaCirculo(radio) {
  return Math.PI * radio * radio;
}

// Circunferencia de un círculo
export function circunferenciaCirculo(radio) {
  return 2 * Math.PI * radio;
}