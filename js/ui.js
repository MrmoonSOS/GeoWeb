/**
 * ui.js — GeoWeb
 * Responsable: Simon
 *
 * Exporta:
 *   - actualizarPanel(data)  ← requerido por app.js
 *
 * También gestiona:
 *   - Estado visual activo de los botones de herramienta
 *   - Flash de actualización en los valores del panel
 */

// ── Marcar herramienta activa ──────────────────────────────
const toolButtons = document.querySelectorAll('[data-herramienta]');

toolButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    toolButtons.forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
  });
});

// ── Flash visual al actualizar un valor ───────────────────
function flashValue(el) {
  el.classList.remove('updated');
  // forzar reflow para reiniciar la clase
  void el.offsetWidth;
  el.classList.add('updated');
  setTimeout(() => el.classList.remove('updated'), 300);
}

function setVal(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  flashValue(el);
}

function clearVal(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '—';
}

// ── IDs a limpiar al hacer reset ──────────────────────────
const ALL_IDS = [
  'val-distancia',
  'val-area', 'val-perimetro',
  'val-angulo-a', 'val-angulo-b', 'val-angulo-c',
  'val-radio', 'val-diametro', 'val-area-circulo', 'val-circunferencia',
  'val-pendiente', 'val-ecuacion-recta',
  'val-angulo',
  'val-semieje-a', 'val-semieje-b', 'val-dist-focal', 'val-excentricidad',
];

// ── Exportación requerida por app.js ──────────────────────
/**
 * actualizarPanel(data)
 *
 * @param {object|null} data — objeto con las propiedades calculadas,
 *        o null/undefined para limpiar el panel completo.
 *
 * Estructura esperada de data:
 * {
 *   segmento?: { distancia: number },
 *   triangulo?: { area: number, perimetro: number, angulos: { A, B, C } },
 *   circulo?:   { radio: number, diametro: number, area: number, circunferencia: number }
 * }
 */
export function actualizarPanel(data) {
  if (!data) {
    ALL_IDS.forEach(clearVal);
    return;
  }

  if (data.segmento) {
    setVal('val-distancia', data.segmento.distancia.toFixed(2) + ' u');
  }

  if (data.triangulo) {
    setVal('val-area',      data.triangulo.area.toFixed(2)          + ' u²');
    setVal('val-perimetro', data.triangulo.perimetro.toFixed(2)     + ' u');
    setVal('val-angulo-a',  data.triangulo.angulos.A.toFixed(1)     + '°');
    setVal('val-angulo-b',  data.triangulo.angulos.B.toFixed(1)     + '°');
    setVal('val-angulo-c',  data.triangulo.angulos.C.toFixed(1)     + '°');
  }

  if (data.circulo) {
    setVal('val-radio',          data.circulo.radio.toFixed(2)          + ' u');
    setVal('val-diametro',       data.circulo.diametro.toFixed(2)       + ' u');
    setVal('val-area-circulo',   data.circulo.area.toFixed(2)           + ' u²');
    setVal('val-circunferencia', data.circulo.circunferencia.toFixed(2) + ' u');
  }

  if (data.recta) {
    const pend = data.recta.pendiente;
    setVal('val-pendiente', pend === null || pend === undefined
      ? '∞'
      : Number(pend).toFixed(3));
    setVal('val-ecuacion-recta', data.recta.ecuacion);
  }

  if (data.angulo) {
    setVal('val-angulo', data.angulo.valor.toFixed(1) + '°');
  }

  if (data.conica) {
    const t = document.getElementById('titulo-conica');
    if (t && data.conica.tipo) t.textContent = data.conica.tipo;
    setVal('val-semieje-a',    Number(data.conica.a).toFixed(2));
    setVal('val-semieje-b',    Number(data.conica.b).toFixed(2));
    setVal('val-dist-focal',   Number(data.conica.c).toFixed(2));
    setVal('val-excentricidad', Number(data.conica.e).toFixed(3));
  }
}

// ── Barra de estado ──────────────────────────────────────
export function setHint(texto) {
  const el = document.getElementById('status-hint');
  if (el) el.textContent = texto;
}

export function setCoordsDisplay(x, y) {
  const el = document.getElementById('status-coords');
  if (!el) return;
  if (x === null || y === null || x === undefined || y === undefined) {
    el.textContent = '';
    return;
  }
  el.textContent = `(${x.toFixed(2)}, ${y.toFixed(2)})`;
}

export const HINTS = {
  punto:           'Haz click en el tablero para crear un punto',
  segmento:        '1er click: punto A — 2do click: punto B',
  recta:           '1er click: punto A — 2do click: punto B (recta infinita)',
  rayo:            '1er click: origen — 2do click: dirección',
  triangulo:       'Haz click en 3 puntos para formar el triángulo',
  poligono:        'Clicks sucesivos para los vértices — doble click para cerrar',
  circulo:         '1er click: centro — 2do click: punto en el borde',
  elipse:          '1er click: foco F1 — 2do click: foco F2 — 3er click: punto en la elipse',
  hiperbola:       '1er click: foco F1 — 2do click: foco F2 — 3er click: punto en la hipérbola',
  parabola:        '1er click: foco — 2do click: punto en la directriz',
  mediatriz:       '1er click: punto A — 2do click: punto B',
  bisectriz:       '1er click: punto A — 2do click: vértice — 3er click: punto B',
  perpendicular:   '1er click: punto base — 2do click: punto en la recta de referencia',
  puntomedio:      '1er click: punto A — 2do click: punto B',
  interseccion:    'Haz click cerca de la intersección de dos objetos',
  angulo:          '1er click: punto A — 2do click: vértice — 3er click: punto B',
  distancia_label: '1er click: punto A — 2do click: punto B',
  mover:           'Arrastra puntos para moverlos',
  default:         'Selecciona una herramienta para comenzar',
};