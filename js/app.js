/**
 * app.js — GeoWeb
 * Punto de entrada: inicializa tablero, conecta UI y herramientas.
 */

import { initBoard, clearBoard } from './board.js';
import { activarHerramienta, desactivarTodo } from './tools.js';
import { actualizarPanel } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  initBoard();

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
      actualizarPanel(null);
      document.querySelectorAll('[data-herramienta].activo').forEach(b => b.classList.remove('activo'));
    });
  }
});
