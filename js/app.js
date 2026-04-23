// app.js — Punto de entrada, conecta board, tools y ui

import { initBoard, onUpdate, limpiarTablero } from './board.js';
import { setHerramienta } from './tools.js';
import { actualizarPanel } from './ui.js';

// Inicializar tablero
initBoard('box');

// Suscribir el panel lateral a los cambios del motor
onUpdate((data) => {
  actualizarPanel(data);
});

// Conectar botones de la toolbar a las herramientas
document.querySelectorAll('[data-herramienta]').forEach((btn) => {
  btn.addEventListener('click', () => {
    // Quitar estado activo de todos los botones
    document.querySelectorAll('[data-herramienta]').forEach(b => b.classList.remove('activo'));
    // Activar el botón clickeado
    btn.classList.add('activo');
    // Cambiar herramienta
    setHerramienta(btn.dataset.herramienta);
  });
});

// Botón limpiar
document.getElementById('btn-limpiar')?.addEventListener('click', () => {
  limpiarTablero();
});