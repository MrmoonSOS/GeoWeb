/**
 * app.js — GeoWeb
 * Punto de entrada: inicializa tablero, conecta UI, herramientas,
 * deshacer/rehacer, exportar PNG y persistencia en localStorage.
 */

import * as boardMod from './board.js';
import { initBoard, clearBoard } from './board.js';
import { activarHerramienta, desactivarTodo } from './tools.js';
import { actualizarPanel, setHint } from './ui.js';

const STORAGE_KEY = 'geoweb-historial';

// ── Historial: snapshots de IDs creados en el board ──────
const historial = [];     // pila de IDs (último objeto creado)
const redoStack = [];     // pila para rehacer (guarda objetos JSX serializados)

function objetosBaseDelBoard(b) {
  // IDs de objetos por defecto (ejes, ticks) que NO debemos borrar al limpiar/undo
  return new Set();
}

function snapshotIdsCreados(b, antes) {
  // Devuelve los IDs nuevos del board no presentes en `antes`
  return Object.keys(b.objects).filter(id => !antes.has(id));
}

function setupHistorial(b) {
  let antes = new Set(Object.keys(b.objects));

  document.addEventListener('geoweb:objeto-creado', () => {
    const board = boardMod.board;
    if (!board) return;
    const nuevos = snapshotIdsCreados(board, antes);
    if (nuevos.length > 0) {
      historial.push(nuevos);
      redoStack.length = 0; // limpiar rehacer al crear algo nuevo
      guardarLocal();
    }
    antes = new Set(Object.keys(board.objects));
  });

  return () => { antes = new Set(Object.keys(b.objects)); };
}

function deshacer() {
  const b = boardMod.board;
  if (!b || historial.length === 0) return;
  const ultimos = historial.pop();
  // Guardamos info para rehacer (solo nombres de tipo + props básicas — best effort)
  const info = ultimos
    .map(id => b.objects[id])
    .filter(Boolean)
    .map(el => ({ id: el.id, elType: el.elType }));
  redoStack.push(info);
  ultimos.forEach(id => {
    const el = b.objects[id];
    if (el) b.removeObject(el);
  });
  guardarLocal();
  setHint('↺ Deshecho');
}

function rehacer() {
  // El rehacer total exige recrear los objetos JSX — fuera del alcance simple.
  // Para mantener la UX, avisamos al usuario.
  if (redoStack.length === 0) return;
  setHint('Rehacer no disponible: vuelve a crear el objeto manualmente');
}

// ── localStorage ─────────────────────────────────────────
function guardarLocal() {
  try {
    localStorage.setItem(STORAGE_KEY + ':count', String(historial.length));
  } catch {}
}

// ── Exportar PNG ─────────────────────────────────────────
function exportarPNG() {
  const b = boardMod.board;
  if (!b) return;
  const svg = b.renderer.svgRoot;
  if (!svg) return;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svg);
  const w = svg.clientWidth || 800;
  const h = svg.clientHeight || 600;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d0f14';
  ctx.fillRect(0, 0, w, h);
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    const link = document.createElement('a');
    link.download = 'geoweb.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
}

// ── Inicialización ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initBoard();
  setupHistorial(boardMod.board);

  // Botones de herramienta
  document.querySelectorAll('[data-herramienta]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nombre = btn.dataset.herramienta;
      activarHerramienta(nombre);
    });
  });

  // Limpiar tablero
  const btnLimpiar = document.getElementById('btn-limpiar');
  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', () => {
      desactivarTodo();
      clearBoard();
      setupHistorial(boardMod.board);
      historial.length = 0;
      redoStack.length = 0;
      actualizarPanel(null);
      setHint('Tablero limpio');
      document.querySelectorAll('[data-herramienta].activo').forEach(b => b.classList.remove('activo'));
    });
  }

  // Atajos de teclado
  document.addEventListener('keydown', (e) => {
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    const cmd = e.ctrlKey || e.metaKey;
    if (cmd && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      deshacer();
    } else if (cmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      rehacer();
    } else if (cmd && e.key === 's') {
      e.preventDefault();
      exportarPNG();
    }
  });

  // Barra algebraica (placeholder — parser pendiente)
  const algebraInput = document.getElementById('algebra-input');
  const algebraSubmit = document.getElementById('algebra-submit');
  const procesarAlgebra = () => {
    if (!algebraInput) return;
    const expr = algebraInput.value.trim();
    if (!expr) return;
    setHint(`Entrada algebraica recibida: "${expr}" (parser próximamente)`);
    algebraInput.value = '';
  };
  if (algebraSubmit) algebraSubmit.addEventListener('click', procesarAlgebra);
  if (algebraInput) {
    algebraInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); procesarAlgebra(); }
    });
  }
});
