// board.js — Motor geométrico con JSXGraph

import { distancia, areaTriangulo, perimetroTriangulo, angulo, radioCirculo, areaCirculo, circunferenciaCirculo } from './calculations.js';

let board = null;
let updateCallback = null;

// Inicializa el tablero JSXGraph
export function initBoard(containerId = 'box') {
  board = JXG.JSXGraph.initBoard(containerId, {
    boundingbox: [-10, 10, 10, -10],
    axis: true,
    showNavigation: true,
    showCopyright: false,
    keepaspectratio: true,
    pan: { enabled: true, needTwoFingers: false },
    zoom: { enabled: true, wheel: true }
  });
}

// Crea un punto arrastrable en el tablero
export function crearPunto(x, y, nombre, color = '#185FA5') {
  const punto = board.create('point', [x, y], {
    name: nombre,
    size: 5,
    fillColor: color,
    strokeColor: color,
    label: { fontSize: 13, fontWeight: 'bold', color, offset: [8, 8] }
  });
  punto.on('drag', () => dispararUpdate());
  return punto;
}

// Crea un segmento entre dos puntos
export function crearSegmento(p1, p2, color = '#185FA5') {
  return board.create('segment', [p1, p2], {
    strokeColor: color,
    strokeWidth: 2
  });
}

// Crea un triángulo entre tres puntos con ángulos visuales
export function crearTriangulo(p1, p2, p3) {
  board.create('polygon', [p1, p2, p3], {
    fillColor: '#7F77DD',
    fillOpacity: 0.08,
    strokeColor: 'none',
    borders: { strokeColor: 'none' }
  });
  board.create('angle', [p2, p1, p3], { radius: 0.6, fillColor: '#185FA5', fillOpacity: 0.15, strokeColor: '#185FA5', name: '' });
  board.create('angle', [p1, p2, p3], { radius: 0.6, fillColor: '#3B6D11', fillOpacity: 0.15, strokeColor: '#3B6D11', name: '' });
  board.create('angle', [p1, p3, p2], { radius: 0.6, fillColor: '#993C1D', fillOpacity: 0.15, strokeColor: '#993C1D', name: '' });
}

// Crea un círculo dado centro y punto del borde
export function crearCirculo(centro, borde, color = '#7F77DD') {
  return board.create('circle', [centro, borde], {
    strokeColor: color,
    strokeWidth: 2,
    fillColor: color,
    fillOpacity: 0.06
  });
}

// Limpia todos los objetos del tablero
export function limpiarTablero() {
  board.suspendUpdate();
  board.removeObject(board.objectsList.filter(o => o.elType !== 'axis'));
  board.unsuspendUpdate();
  if (updateCallback) updateCallback(null);
}

// Suscribirse a cambios en tiempo real
export function onUpdate(callback) {
  updateCallback = callback;
}

// Genera el snapshot de datos y lo manda al callback
function dispararUpdate(p1, p2, p3, centro, borde) {
  if (!updateCallback) return;

  const snap = {};

  if (p1 && p2) {
    snap.segmento = {
      distancia: distancia(
        { x: p1.X(), y: p1.Y() },
        { x: p2.X(), y: p2.Y() }
      )
    };
  }

  if (p1 && p2 && p3) {
    const A = { x: p1.X(), y: p1.Y() };
    const B = { x: p2.X(), y: p2.Y() };
    const C = { x: p3.X(), y: p3.Y() };
    snap.triangulo = {
      area: areaTriangulo(A, B, C),
      perimetro: perimetroTriangulo(A, B, C),
      angulos: {
        A: angulo(B, A, C),
        B: angulo(A, B, C),
        C: angulo(A, C, B)
      }
    };
  }

  if (centro && borde) {
    const r = radioCirculo(
      { x: centro.X(), y: centro.Y() },
      { x: borde.X(), y: borde.Y() }
    );
    snap.circulo = {
      radio: r,
      diametro: r * 2,
      area: areaCirculo(r),
      circunferencia: circunferenciaCirculo(r)
    };
  }

  updateCallback(snap);
}