/**
 * board.js — GeoWeb
 * Inicialización y control del tablero JSXGraph.
 */

export let board = null;

const BOARD_OPTS = {
  boundingbox: [-10, 10, 10, -10],
  keepaspectratio: true,
  axis: true,
  grid: true,
  showCopyright: false,
  showNavigation: false,
  pan: { enabled: true, needTwoFingers: false },
  zoom: { enabled: true, wheel: true, needShift: false },
  defaultAxes: {
    x: {
      strokeColor: '#2e3549',
      ticks: { strokeColor: '#2e3549', label: { strokeColor: '#5a6380' } }
    },
    y: {
      strokeColor: '#2e3549',
      ticks: { strokeColor: '#2e3549', label: { strokeColor: '#5a6380' } }
    }
  }
};

export function initBoard() {
  board = JXG.JSXGraph.initBoard('box', BOARD_OPTS);

  const container = document.getElementById('box');
  window.addEventListener('resize', () => {
    if (!board || !container) return;
    board.resizeContainer(container.clientWidth, container.clientHeight, true);
  });

  return board;
}

export function clearBoard() {
  if (!board) return;
  JXG.JSXGraph.freeBoard(board);
  board = JXG.JSXGraph.initBoard('box', BOARD_OPTS);
  return board;
}
