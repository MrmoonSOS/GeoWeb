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
}