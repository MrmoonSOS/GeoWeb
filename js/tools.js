/**
 * tools.js — GeoWeb
 * Herramientas interactivas sobre el board JSXGraph.
 */

import * as boardMod from './board.js';
import * as calc from './calculations.js';
import { actualizarPanel, setHint, setCoordsDisplay, HINTS } from './ui.js';

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
  preview:   { strokeColor: '#4fffb0', strokeWidth: 1, dash: 2, strokeOpacity: 0.4, fixed: true, highlight: false },
};

let herramientaActiva = null;
let puntosEnCurso = [];
let clickHandler = null;
let moveHandler = null;
let dblClickHandler = null;
let previewLine = null;

const PREVIEW_TOOLS = [
  'segmento', 'recta', 'rayo', 'triangulo', 'poligono',
  'circulo', 'mediatriz', 'bisectriz', 'perpendicular',
  'angulo', 'distancia_label'
];

// ── Utilidades ───────────────────────────────────────────
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

function removeSafe(b, obj) {
  if (!b || !obj) return;
  try { b.removeObject(obj); } catch {}
}

function removePreview() {
  if (previewLine) {
    removeSafe(liveBoard(), previewLine);
    previewLine = null;
  }
}

function limpiarEnCurso() {
  const b = liveBoard();
  removePreview();
  if (!b) { puntosEnCurso = []; return; }
  for (const p of puntosEnCurso) {
    if (p._isTemp) removeSafe(b, p);
  }
  puntosEnCurso = [];
}

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

// ── Cierre del polígono (compartido entre dblclick y handler) ─
function cerrarPoligono() {
  const b = liveBoard();
  if (!b || puntosEnCurso.length < 3) return;

  // El doble-click crea un punto extra muy cercano al anterior — lo eliminamos
  const last = puntosEnCurso[puntosEnCurso.length - 1];
  const prev = puntosEnCurso[puntosEnCurso.length - 2];
  if (last && prev) {
    const dx = last.X() - prev.X(), dy = last.Y() - prev.Y();
    if (Math.hypot(dx, dy) < 0.15) {
      removeSafe(b, last);
      puntosEnCurso.pop();
    }
  }
  if (puntosEnCurso.length < 3) return;

  b.create('polygon', puntosEnCurso, STYLES.poligono);
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
}

// ── Click principal ──────────────────────────────────────
function onBoardClick(e) {
  const b = liveBoard();
  if (!b || !herramientaActiva) return;

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
        removePreview();
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
        removePreview();
      }
      break;
    }

    case 'poligono': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
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
        removePreview();
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
        removePreview();
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
        removePreview();
      }
      break;
    }

    case 'elipse':
    case 'hiperbola': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 3) {
        crearConicaDinamica(b, puntosEnCurso, herramientaActiva);
        emitirCreado(herramientaActiva);
        puntosEnCurso = [];
        removePreview();
      }
      break;
    }

    case 'parabola': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        crearParabolaDinamica(b, puntosEnCurso[0], puntosEnCurso[1]);
        emitirCreado('parabola');
        puntosEnCurso = [];
        removePreview();
      }
      break;
    }

    case 'mediatriz': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        const [A, B] = puntosEnCurso;
        b.create('perpendicularbisector', [A, B], STYLES.linea);
        emitirCreado('mediatriz');
        puntosEnCurso = [];
        removePreview();
      }
      break;
    }

    case 'bisectriz': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 3) {
        const [pA, pV, pB2] = puntosEnCurso;
        const pBisDir = b.create('point', [
          () => calc.bisectriz(asPlain(pA), asPlain(pV), asPlain(pB2)).p2.x,
          () => calc.bisectriz(asPlain(pA), asPlain(pV), asPlain(pB2)).p2.y,
        ], { visible: false, withLabel: false, fixed: true });
        b.create('line', [pV, pBisDir], STYLES.linea);
        emitirCreado('bisectriz');
        puntosEnCurso = [];
        removePreview();
      }
      break;
    }

    case 'perpendicular': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        const [base, ref] = puntosEnCurso;
        const pPerpDir = b.create('point', [
          () => calc.rectaPerpendicular(asPlain(base), asPlain(ref), asPlain(base)).p2.x,
          () => calc.rectaPerpendicular(asPlain(base), asPlain(ref), asPlain(base)).p2.y,
        ], { visible: false, withLabel: false, fixed: true });
        b.create('line', [base, pPerpDir], STYLES.linea);
        emitirCreado('perpendicular');
        puntosEnCurso = [];
        removePreview();
      }
      break;
    }

    case 'puntomedio': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        const [A, B] = puntosEnCurso;
        b.create('midpoint', [A, B], STYLES.puntoAux);
        emitirCreado('puntomedio');
        puntosEnCurso = [];
        removePreview();
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
        removePreview();
      }
      break;
    }

    case 'distancia_label': {
      const p = existente || crearPunto(b, coords.x, coords.y);
      puntosEnCurso.push(p);
      if (puntosEnCurso.length === 2) {
        const [A, B] = puntosEnCurso;
        b.create('segment', [A, B], STYLES.lineaDash);
        const mid = b.create('midpoint', [A, B], { visible: false, withLabel: false });
        b.create('text', [
          () => mid.X(),
          () => mid.Y() + 0.3,
          () => calc.distancia(asPlain(A), asPlain(B)).toFixed(2) + ' u',
        ], { fontSize: 12, anchorX: 'middle', cssStyle: 'color: #ff9f43;' });
        bindSegmentoUpdate(A, B);
        emitirCreado('distancia_label');
        puntosEnCurso = [];
        removePreview();
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

// ── Cónicas dinámicas ────────────────────────────────────
function crearConicaDinamica(b, [F1jsx, F2jsx, Pjsx], tipo) {
  // Recalcula parámetros geométricos en cada llamada
  const params = () => {
    const F1 = asPlain(F1jsx), F2 = asPlain(F2jsx), P = asPlain(Pjsx);
    const d1 = calc.distancia(F1, P);
    const d2 = calc.distancia(F2, P);
    const a = tipo === 'elipse' ? (d1 + d2) / 2 : Math.abs(d1 - d2) / 2;
    const c = calc.distancia(F1, F2) / 2;
    const bVal = Math.sqrt(Math.abs(a * a - c * c));
    const cx = (F1.x + F2.x) / 2, cy = (F1.y + F2.y) / 2;
    const theta = Math.atan2(F2.y - F1.y, F2.x - F1.x);
    return { a, b: bVal, c, cx, cy, theta };
  };

  if (tipo === 'elipse') {
    b.create('curve', [
      (t) => {
        const { a, b: bV, cx, theta } = params();
        const xL = a * Math.cos(t), yL = bV * Math.sin(t);
        return cx + xL * Math.cos(theta) - yL * Math.sin(theta);
      },
      (t) => {
        const { a, b: bV, cy, theta } = params();
        const xL = a * Math.cos(t), yL = bV * Math.sin(t);
        return cy + xL * Math.sin(theta) + yL * Math.cos(theta);
      },
      0, 2 * Math.PI
    ], STYLES.curva);
  } else {
    // Hipérbola: dos curvas independientes (rama derecha y rama izquierda)
    const lim = 2.5;
    for (const sign of [1, -1]) {
      b.create('curve', [
        (t) => {
          const { a, b: bV, cx, theta } = params();
          const xL = sign * a * Math.cosh(t);
          const yL = bV * Math.sinh(t);
          return cx + xL * Math.cos(theta) - yL * Math.sin(theta);
        },
        (t) => {
          const { a, b: bV, cy, theta } = params();
          const xL = sign * a * Math.cosh(t);
          const yL = bV * Math.sinh(t);
          return cy + xL * Math.sin(theta) + yL * Math.cos(theta);
        },
        -lim, lim
      ], STYLES.curva);
    }
  }

  const updatePanel = () => {
    const { a, b: bV, c } = params();
    bindConicaUpdate(tipo === 'elipse' ? 'Elipse' : 'Hipérbola', a, bV, c);
  };
  F1jsx.on('drag', updatePanel);
  F2jsx.on('drag', updatePanel);
  Pjsx.on('drag', updatePanel);
  updatePanel();
}

function crearParabolaDinamica(b, Fjsx, Djsx) {
  const params = () => {
    const F = asPlain(Fjsx);
    const dY = Djsx.Y();
    return { F, dY, p: (F.y - dY) / 2 };
  };
  // Curva: y = (x - Fx)^2 / (4p) + (Fy + dY)/2
  b.create('curve', [
    (t) => t,
    (t) => {
      const { F, dY, p } = params();
      if (p === 0) return F.y;
      const vy = (F.y + dY) / 2;
      return vy + ((t - F.x) * (t - F.x)) / (4 * p);
    },
    () => b.getBoundingBox()[0],
    () => b.getBoundingBox()[2],
  ], STYLES.curva);

  // Directriz dinámica
  b.create('line', [
    [() => b.getBoundingBox()[0], () => Djsx.Y()],
    [() => b.getBoundingBox()[2], () => Djsx.Y()],
  ], { ...STYLES.lineaDash, fixed: true });

  const updatePanel = () => {
    const { p } = params();
    const pAbs = Math.abs(p);
    bindConicaUpdate('Parábola', pAbs, 0, pAbs);
  };
  Fjsx.on('drag', updatePanel);
  Djsx.on('drag', updatePanel);
  updatePanel();
}

// ── Preview (línea fantasma desde el último punto al cursor) ─
function actualizarPreview(coords) {
  const b = liveBoard();
  if (!b) return;
  removePreview();
  if (!PREVIEW_TOOLS.includes(herramientaActiva)) return;
  if (puntosEnCurso.length === 0) return;
  const ultimo = puntosEnCurso[puntosEnCurso.length - 1];
  if (!ultimo || typeof ultimo.X !== 'function') return;

  try {
    const pTemp = b.create('point', [coords.x, coords.y], {
      visible: false, withLabel: false, fixed: true
    });
    pTemp._isPreview = true;
    previewLine = b.create('segment', [ultimo, pTemp], STYLES.preview);
    previewLine._isPreview = true;
  } catch {}
}

// ── API pública ──────────────────────────────────────────
export function activarHerramienta(nombre) {
  desactivarTodo();
  herramientaActiva = nombre;
  setHint(HINTS[nombre] || HINTS.default);

  const b = liveBoard();
  if (!b) return;

  // Coordenadas + preview en tiempo real
  moveHandler = (e) => {
    const c = coordsFromEvent(e, b);
    setCoordsDisplay(c.x, c.y);
    actualizarPreview(c);
  };
  b.on('move', moveHandler);

  if (nombre === 'mover' || nombre === null) return;

  clickHandler = onBoardClick;
  b.on('down', clickHandler);

  // Doble-click nativo para cerrar polígono
  if (nombre === 'poligono') {
    const boxEl = document.getElementById('box');
    if (boxEl) {
      dblClickHandler = (ev) => {
        ev.preventDefault();
        if (herramientaActiva === 'poligono') cerrarPoligono();
      };
      boxEl.addEventListener('dblclick', dblClickHandler);
    }
  }
}

export function desactivarTodo() {
  const b = liveBoard();
  if (b) {
    if (clickHandler) b.off('down', clickHandler);
    if (moveHandler) b.off('move', moveHandler);
  }
  if (dblClickHandler) {
    document.getElementById('box')?.removeEventListener('dblclick', dblClickHandler);
    dblClickHandler = null;
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
