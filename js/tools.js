/**
 * tools.js — GeoWeb
 * Herramientas interactivas sobre el board JSXGraph.
 */

import * as boardMod from './board.js';
import * as calc from './calculations.js';
import { actualizarPanel } from './ui.js';

// Acceso vivo al board (clearBoard lo reasigna)
const liveBoard = () => boardMod.board;

// ── Estilos compartidos ──────────────────────────────────
export const STYLES = {
  punto:    { strokeColor: '#4fffb0', fillColor: '#4fffb0', size: 4, label: { strokeColor: '#8892aa' } },
  puntoTmp: { strokeColor: '#5a6380', fillColor: '#5a6380', size: 3, label: { strokeColor: '#5a6380' }, fixed: false },
  linea:    { strokeColor: '#7b8cff', strokeWidth: 2 },
  poligono: { fillColor: '#7b8cff', fillOpacity: 0.08, borders: { strokeColor: '#7b8cff', strokeWidth: 1.5 } },
  circulo:  { strokeColor: '#4fffb0', strokeWidth: 2, fillColor: '#4fffb0', fillOpacity: 0.04 },
  curva:    { strokeColor: '#ff9f43', strokeWidth: 2 },
};

let herramientaActiva = null;
let puntosEnCurso = [];
let clickHandler = null;
const objetos = []; // historial de objetos creados (para snapshots simples)

// ── Coordenadas desde un evento del DOM ──────────────────
function coordsFromEvent(e, b) {
  const cPos = b.getMousePosition(e, 0);
  const c = new JXG.Coords(JXG.COORDS_BY_SCREEN, cPos, b);
  return { x: c.usrCoords[1], y: c.usrCoords[2] };
}

// Si el click cae sobre un punto existente, retorna ese punto JSX
function findExistingPoint(coords, b, tol = 0.3) {
  for (const el of Object.values(b.objects)) {
    if (el.elType === 'point') {
      const dx = el.X() - coords.x;
      const dy = el.Y() - coords.y;
      if (Math.hypot(dx, dy) < tol) return el;
    }
  }
  return null;
}

function asPlain(p) {
  return { x: p.X(), y: p.Y() };
}

// ── Limpia el estado en curso (puntos temporales sin uso) ──
function limpiarEnCurso() {
  const b = liveBoard();
  if (!b) { puntosEnCurso = []; return; }
  for (const p of puntosEnCurso) {
    if (p._isTemp) b.removeObject(p);
  }
  puntosEnCurso = [];
}

// ── Handlers de actualización del panel ──────────────────
function bindSegmentoUpdate(pA, pB) {
  const update = () => {
    actualizarPanel({ segmento: { distancia: calc.distancia(asPlain(pA), asPlain(pB)) } });
  };
  pA.on('drag', update);
  pB.on('drag', update);
  update();
}

function bindTrianguloUpdate(pA, pB, pC) {
  const update = () => {
    const a = asPlain(pA), b = asPlain(pB), c = asPlain(pC);
    actualizarPanel({
      triangulo: {
        area: calc.areaTriangulo(a, b, c),
        perimetro: calc.perimetroTriangulo(a, b, c),
        angulos: calc.angulosTriangulo(a, b, c),
      }
    });
  };
  pA.on('drag', update);
  pB.on('drag', update);
  pC.on('drag', update);
  update();
}

function bindCirculoUpdate(centro, borde) {
  const update = () => {
    actualizarPanel({ circulo: calc.datosCirculo(asPlain(centro), asPlain(borde)) });
  };
  centro.on('drag', update);
  borde.on('drag', update);
  update();
}

// ── Creación de puntos ───────────────────────────────────
function crearPunto(b, x, y, opts = {}) {
  return b.create('point', [x, y], { ...STYLES.punto, ...opts });
}

// ── Manejo principal del click según herramienta ─────────
function onBoardClick(e) {
  const b = liveBoard();
  if (!b || !herramientaActiva) return;
  const coords = coordsFromEvent(e, b);

  // Reutilizar puntos existentes
  const existente = findExistingPoint(coords, b);

  switch (herramientaActiva) {
    case 'punto': {
      if (!existente) crearPunto(b, coords.x, coords.y);
      break;
    }
    case 'segmento': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        const [A, B] = puntosEnCurso;
        b.create('segment', [A, B], STYLES.linea);
        bindSegmentoUpdate(A, B);
        puntosEnCurso = [];
      }
      break;
    }
    case 'triangulo': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 3) {
        const [A, B, C] = puntosEnCurso;
        b.create('polygon', [A, B, C], STYLES.poligono);
        bindTrianguloUpdate(A, B, C);
        puntosEnCurso = [];
      }
      break;
    }
    case 'circulo': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        const [C, R] = puntosEnCurso;
        b.create('circle', [C, R], STYLES.circulo);
        bindCirculoUpdate(C, R);
        puntosEnCurso = [];
      }
      break;
    }
    case 'recta': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        b.create('line', puntosEnCurso, STYLES.linea);
        puntosEnCurso = [];
      }
      break;
    }
    case 'rayo': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        b.create('line', puntosEnCurso, { ...STYLES.linea, straightFirst: false });
        puntosEnCurso = [];
      }
      break;
    }
    case 'elipse':
    case 'hiperbola': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 3) {
        const [F1, F2, P] = puntosEnCurso.map(asPlain);
        const d1 = calc.distancia(F1, P);
        const d2 = calc.distancia(F2, P);
        const a = herramientaActiva === 'elipse' ? (d1 + d2) / 2 : Math.abs(d1 - d2) / 2;
        const pts = herramientaActiva === 'elipse'
          ? calc.puntosElipse(F1, F2, a)
          : calc.puntosHiperbola(F1, F2, a);
        b.create('curve', [pts.map(q => q.x), pts.map(q => q.y)], STYLES.curva);
        puntosEnCurso = [];
      }
      break;
    }
    case 'parabola': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        const F = asPlain(puntosEnCurso[0]);
        const dY = puntosEnCurso[1].Y();
        const pts = calc.puntosParabola(F, dY, [b.getBoundingBox()[0], b.getBoundingBox()[2]]);
        b.create('curve', [pts.map(q => q.x), pts.map(q => q.y)], STYLES.curva);
        puntosEnCurso = [];
      }
      break;
    }
    case 'mediatriz': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        const [A, B] = puntosEnCurso.map(asPlain);
        const r = calc.mediatriz(A, B);
        const a = crearPunto(b, r.p1.x, r.p1.y, { visible: false });
        const c = crearPunto(b, r.p2.x, r.p2.y, { visible: false });
        b.create('line', [a, c], STYLES.linea);
        puntosEnCurso = [];
      }
      break;
    }
    case 'bisectriz': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 3) {
        const [A, V, B2] = puntosEnCurso.map(asPlain);
        const r = calc.bisectriz(A, V, B2);
        const a = crearPunto(b, r.p1.x, r.p1.y, { visible: false });
        const c = crearPunto(b, r.p2.x, r.p2.y, { visible: false });
        b.create('line', [a, c], STYLES.linea);
        puntosEnCurso = [];
      }
      break;
    }
    default:
      break;
  }
}

// ── API pública ──────────────────────────────────────────
export function activarHerramienta(nombre) {
  desactivarTodo();
  herramientaActiva = nombre;

  const b = liveBoard();
  if (!b) return;

  clickHandler = onBoardClick;
  b.on('down', clickHandler);
}

export function desactivarTodo() {
  const b = liveBoard();
  if (b && clickHandler) b.off('down', clickHandler);
  clickHandler = null;
  herramientaActiva = null;
  limpiarEnCurso();
}

export function getHerramientaActiva() {
  return herramientaActiva;
}
