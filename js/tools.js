/**
 * tools.js — GeoWeb
 * Herramientas interactivas sobre el board JSXGraph.
 */

import * as boardMod from './board.js';
import * as calc from './calculations.js';
import { actualizarPanel, setHint, setCoordsDisplay, HINTS } from './ui.js';

// Acceso vivo al board (clearBoard lo reasigna)
const liveBoard = () => boardMod.board;

// ── Estilos compartidos ──────────────────────────────────
export const STYLES = {
  punto:     { strokeColor: '#4fffb0', fillColor: '#4fffb0', size: 4, label: { strokeColor: '#8892aa' } },
  puntoTmp:  { strokeColor: '#5a6380', fillColor: '#5a6380', size: 3, label: { visible: false } },
  puntoAux:  { strokeColor: '#ff9f43', fillColor: '#ff9f43', size: 4, label: { strokeColor: '#ff9f43' } },
  linea:     { strokeColor: '#7b8cff', strokeWidth: 2 },
  lineaDash: { strokeColor: '#7b8cff', strokeWidth: 1.5, dash: 2 },
  poligono:  { fillColor: '#7b8cff', fillOpacity: 0.08, borders: { strokeColor: '#7b8cff', strokeWidth: 1.5 } },
  circulo:   { strokeColor: '#4fffb0', strokeWidth: 2, fillColor: '#4fffb0', fillOpacity: 0.04 },
  curva:     { strokeColor: '#ff9f43', strokeWidth: 2 },
  angulo:    { radius: 0.7, fillColor: '#ff9f43', fillOpacity: 0.2, strokeColor: '#ff9f43', name: '', label: { strokeColor: '#ff9f43' } },
};

let herramientaActiva = null;
let puntosEnCurso = [];
let clickHandler = null;
let moveHandler = null;
let dblClickTimer = 0;
const DBL_CLICK_MS = 300;

// ── Coordenadas desde un evento del DOM ──────────────────
function coordsFromEvent(e, b) {
  const cPos = b.getMousePosition(e, 0);
  const c = new JXG.Coords(JXG.COORDS_BY_SCREEN, cPos, b);
  return { x: c.usrCoords[1], y: c.usrCoords[2] };
}

function findExistingPoint(coords, b, tol = 0.3) {
  for (const el of Object.values(b.objects)) {
    if (el.elType === 'point' && el.visProp.visible !== false) {
      const dx = el.X() - coords.x;
      const dy = el.Y() - coords.y;
      if (Math.hypot(dx, dy) < tol) return el;
    }
  }
  return null;
}

// Detecta el objeto más cercano de tipos dados al punto coords
function findNearestObject(coords, b, tipos = ['line', 'segment', 'circle']) {
  let nearest = null, minDist = Infinity;
  const tol = 0.5;
  for (const el of Object.values(b.objects)) {
    if (!tipos.includes(el.elType)) continue;
    let d = Infinity;
    if (el.elType === 'circle') {
      const cx = el.center.X(), cy = el.center.Y();
      const r = el.Radius();
      d = Math.abs(Math.hypot(coords.x - cx, coords.y - cy) - r);
    } else if (el.elType === 'line' || el.elType === 'segment') {
      const p1 = { x: el.point1.X(), y: el.point1.Y() };
      const p2 = { x: el.point2.X(), y: el.point2.Y() };
      d = distanciaPuntoRecta(coords, p1, p2);
    }
    if (d < minDist && d < tol) { minDist = d; nearest = el; }
  }
  return nearest;
}

function distanciaPuntoRecta(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const num = Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x);
  return num / Math.sqrt(len2);
}

function asPlain(p) {
  return { x: p.X(), y: p.Y() };
}

function limpiarEnCurso() {
  const b = liveBoard();
  if (!b) { puntosEnCurso = []; return; }
  for (const p of puntosEnCurso) {
    if (p._isTemp) b.removeObject(p);
  }
  puntosEnCurso = [];
}

// ── Eventos personalizados (para historial / undo) ───────
function emitirCreado(tipo, datos = {}) {
  document.dispatchEvent(new CustomEvent('geoweb:objeto-creado', { detail: { tipo, ...datos } }));
}

// ── Bindings de actualización del panel ──────────────────
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

function bindRectaUpdate(p1, p2) {
  const update = () => {
    const a = asPlain(p1), b = asPlain(p2);
    const dx = b.x - a.x;
    let pend = null;
    let ec = '';
    if (Math.abs(dx) < 1e-9) {
      ec = `x = ${a.x.toFixed(2)}`;
    } else {
      pend = (b.y - a.y) / dx;
      const c = a.y - pend * a.x;
      const signo = c >= 0 ? '+' : '−';
      ec = `y = ${pend.toFixed(2)}x ${signo} ${Math.abs(c).toFixed(2)}`;
    }
    actualizarPanel({ recta: { pendiente: pend, ecuacion: ec } });
  };
  p1.on('drag', update);
  p2.on('drag', update);
  update();
}

function bindAnguloUpdate(pA, pV, pB) {
  const update = () => {
    actualizarPanel({ angulo: { valor: calc.anguloPuntos(asPlain(pA), asPlain(pV), asPlain(pB)) } });
  };
  pA.on('drag', update);
  pV.on('drag', update);
  pB.on('drag', update);
  update();
}

function bindConicaUpdate(tipo, a, b, c) {
  const e = tipo === 'Parábola' ? 1 : (a > 0 ? c / a : 0);
  actualizarPanel({ conica: { tipo, a, b, c, e } });
}

// ── Creación de puntos ───────────────────────────────────
function crearPunto(b, x, y, opts = {}) {
  return b.create('point', [x, y], { ...STYLES.punto, ...opts });
}

// ── Manejo principal del click según herramienta ─────────
function onBoardClick(e) {
  const b = liveBoard();
  if (!b || !herramientaActiva) return;

  // Detectar doble click (para polígono)
  const ahora = Date.now();
  const esDobleClick = (ahora - dblClickTimer) < DBL_CLICK_MS;
  dblClickTimer = ahora;

  const coords = coordsFromEvent(e, b);
  const existente = findExistingPoint(coords, b);

  switch (herramientaActiva) {
    case 'punto': {
      if (!existente) {
        crearPunto(b, coords.x, coords.y);
        emitirCreado('punto', { x: coords.x, y: coords.y });
      }
      break;
    }

    case 'segmento': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        const [A, B] = puntosEnCurso;
        b.create('segment', [A, B], STYLES.linea);
        bindSegmentoUpdate(A, B);
        emitirCreado('segmento');
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
        emitirCreado('triangulo');
        puntosEnCurso = [];
      }
      break;
    }

    case 'poligono': {
      if (esDobleClick && puntosEnCurso.length >= 3) {
        // Quitar el último punto duplicado por el doble-click
        const last = puntosEnCurso[puntosEnCurso.length - 1];
        const prev = puntosEnCurso[puntosEnCurso.length - 2];
        if (last && prev && Math.hypot(last.X() - prev.X(), last.Y() - prev.Y()) < 0.05) {
          b.removeObject(last);
          puntosEnCurso.pop();
        }
        const poly = b.create('polygon', puntosEnCurso, STYLES.poligono);
        const vertices = puntosEnCurso.slice();
        const update = () => {
          const pts = vertices.map(asPlain);
          actualizarPanel({
            triangulo: {
              area: calc.areaPoligono(pts),
              perimetro: calc.perimetroPoligono(pts),
              angulos: { A: 0, B: 0, C: 0 },
            }
          });
        };
        vertices.forEach(v => v.on('drag', update));
        update();
        emitirCreado('poligono');
        puntosEnCurso = [];
      } else {
        const p = existente || crearPunto(b, coords.x, coords.y);
        puntosEnCurso.push(p);
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
        emitirCreado('circulo');
        puntosEnCurso = [];
      }
      break;
    }

    case 'recta': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        b.create('line', puntosEnCurso, STYLES.linea);
        bindRectaUpdate(puntosEnCurso[0], puntosEnCurso[1]);
        emitirCreado('recta');
        puntosEnCurso = [];
      }
      break;
    }

    case 'rayo': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        b.create('line', puntosEnCurso, { ...STYLES.linea, straightFirst: false });
        emitirCreado('rayo');
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
        const aVal = herramientaActiva === 'elipse' ? (d1 + d2) / 2 : Math.abs(d1 - d2) / 2;
        const c = calc.distancia(F1, F2) / 2;
        const bVal = Math.sqrt(Math.abs(aVal * aVal - c * c));
        const pts = herramientaActiva === 'elipse'
          ? calc.puntosElipse(F1, F2, aVal)
          : calc.puntosHiperbola(F1, F2, aVal);
        b.create('curve', [pts.map(q => q.x), pts.map(q => q.y)], STYLES.curva);
        bindConicaUpdate(herramientaActiva === 'elipse' ? 'Elipse' : 'Hipérbola', aVal, bVal, c);
        emitirCreado(herramientaActiva);
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
        const bb = b.getBoundingBox();
        const pts = calc.puntosParabola(F, dY, [bb[0], bb[2]]);
        b.create('curve', [pts.map(q => q.x), pts.map(q => q.y)], STYLES.curva);
        // Dibujar directriz como referencia
        b.create('line', [[bb[0], dY], [bb[2], dY]], { ...STYLES.lineaDash, fixed: true });
        const pVal = Math.abs(F.y - dY) / 2;
        bindConicaUpdate('Parábola', pVal, 0, pVal);
        emitirCreado('parabola');
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
        const a = crearPunto(b, r.p1.x, r.p1.y, { visible: false, withLabel: false });
        const c = crearPunto(b, r.p2.x, r.p2.y, { visible: false, withLabel: false });
        b.create('line', [a, c], STYLES.linea);
        emitirCreado('mediatriz');
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
        const a = crearPunto(b, r.p1.x, r.p1.y, { visible: false, withLabel: false });
        const c = crearPunto(b, r.p2.x, r.p2.y, { visible: false, withLabel: false });
        b.create('line', [a, c], STYLES.linea);
        emitirCreado('bisectriz');
        puntosEnCurso = [];
      }
      break;
    }

    case 'perpendicular': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        const [base, ref] = puntosEnCurso.map(asPlain);
        const r = calc.rectaPerpendicular(base, ref, base);
        const a = crearPunto(b, r.p1.x, r.p1.y, { visible: false, withLabel: false });
        const c = crearPunto(b, r.p2.x, r.p2.y, { visible: false, withLabel: false });
        b.create('line', [a, c], STYLES.linea);
        emitirCreado('perpendicular');
        puntosEnCurso = [];
      }
      break;
    }

    case 'puntomedio': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        const [A, B] = puntosEnCurso.map(asPlain);
        const m = calc.puntoMedio(A, B);
        b.create('point', [m.x, m.y], STYLES.puntoAux);
        emitirCreado('puntomedio');
        puntosEnCurso = [];
      }
      break;
    }

    case 'angulo': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 3) {
        const [A, V, B2] = puntosEnCurso;
        b.create('angle', [A, V, B2], STYLES.angulo);
        bindAnguloUpdate(A, V, B2);
        emitirCreado('angulo');
        puntosEnCurso = [];
      }
      break;
    }

    case 'distancia_label': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        const [A, B] = puntosEnCurso;
        const seg = b.create('segment', [A, B], STYLES.lineaDash);
        const mid = b.create('midpoint', [A, B], { visible: false, withLabel: false });
        b.create('text', [
          () => mid.X(),
          () => mid.Y() + 0.3,
          () => calc.distancia(asPlain(A), asPlain(B)).toFixed(2) + ' u',
        ], { fontSize: 12, anchorX: 'middle', cssStyle: 'color: #ff9f43;' });
        bindSegmentoUpdate(A, B);
        emitirCreado('distancia_label');
        puntosEnCurso = [];
      }
      break;
    }

    case 'interseccion': {
      const obj = findNearestObject(coords, b);
      if (!obj) {
        setHint('No se encontró ningún objeto cerca del click');
        return;
      }
      puntosEnCurso.push(obj);
      if (puntosEnCurso.length === 2) {
        const [o1, o2] = puntosEnCurso;
        let pts = [];
        const isLineLike = (o) => o.elType === 'line' || o.elType === 'segment';
        if (isLineLike(o1) && isLineLike(o2)) {
          const pt = calc.interseccionRectaRecta(
            asPlain(o1.point1), asPlain(o1.point2),
            asPlain(o2.point1), asPlain(o2.point2)
          );
          if (pt) pts = [pt];
        } else if (isLineLike(o1) && o2.elType === 'circle') {
          pts = calc.interseccionRectaCirculo(asPlain(o1.point1), asPlain(o1.point2), asPlain(o2.center), o2.Radius());
        } else if (o1.elType === 'circle' && isLineLike(o2)) {
          pts = calc.interseccionRectaCirculo(asPlain(o2.point1), asPlain(o2.point2), asPlain(o1.center), o1.Radius());
        } else if (o1.elType === 'circle' && o2.elType === 'circle') {
          pts = calc.interseccionCirculoCirculo(asPlain(o1.center), o1.Radius(), asPlain(o2.center), o2.Radius());
        }
        if (pts.length === 0) {
          setHint('Los objetos no se intersectan');
        } else {
          pts.forEach(pt => b.create('point', [pt.x, pt.y], STYLES.puntoAux));
          emitirCreado('interseccion');
        }
        puntosEnCurso = [];
      }
      break;
    }

    case 'mover':
    default:
      break;
  }
}

// ── API pública ──────────────────────────────────────────
export function activarHerramienta(nombre) {
  desactivarTodo();
  herramientaActiva = nombre;
  setHint(HINTS[nombre] || HINTS.default);

  const b = liveBoard();
  if (!b) return;

  // Coordenadas en tiempo real
  moveHandler = (e) => {
    const c = coordsFromEvent(e, b);
    setCoordsDisplay(c.x, c.y);
  };
  b.on('move', moveHandler);

  // La herramienta 'mover' no registra click handler — JSXGraph permite arrastrar puntos
  if (nombre === 'mover' || nombre === null) return;

  clickHandler = onBoardClick;
  b.on('down', clickHandler);
}

export function desactivarTodo() {
  const b = liveBoard();
  if (b) {
    if (clickHandler) b.off('down', clickHandler);
    if (moveHandler) b.off('move', moveHandler);
  }
  clickHandler = null;
  moveHandler = null;
  herramientaActiva = null;
  setCoordsDisplay(null, null);
  limpiarEnCurso();
}

export function getHerramientaActiva() {
  return herramientaActiva;
}
