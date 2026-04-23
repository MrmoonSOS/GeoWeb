// tools.js — Manejo de herramientas y modo activo

import { crearPunto, crearSegmento, crearTriangulo, crearCirculo } from './board.js';

let herramientaActiva = 'punto';
let puntosTemp = []; // puntos seleccionados esperando completar una figura

// Cambia la herramienta activa
export function setHerramienta(nombre) {
  herramientaActiva = nombre;
  puntosTemp = [];
}

export function getHerramienta() {
  return herramientaActiva;
}

// Maneja el click en el canvas según la herramienta activa
export function handleClick(x, y) {
  switch (herramientaActiva) {
    case 'punto':
      crearPunto(x, y, `P${Date.now() % 1000}`);
      break;

    case 'segmento':
      _acumular(x, y, 2, (pts) => {
        crearSegmento(pts[0], pts[1]);
      });
      break;

    case 'triangulo':
      _acumular(x, y, 3, (pts) => {
        crearTriangulo(pts[0], pts[1], pts[2]);
      });
      break;

    case 'circulo':
      _acumular(x, y, 2, (pts) => {
        crearCirculo(pts[0], pts[1]);
      });
      break;
  }
}

// Acumula puntos hasta llegar al total necesario, luego ejecuta el callback
function _acumular(x, y, total, onComplete) {
  const nuevo = crearPunto(x, y, `P${Date.now() % 1000}`);
  puntosTemp.push(nuevo);
  if (puntosTemp.length === total) {
    onComplete([...puntosTemp]);
    puntosTemp = [];
  }
}