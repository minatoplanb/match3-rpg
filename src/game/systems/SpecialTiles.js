/**
 * SpecialTiles — Match-4/5 power-up logic
 *
 * Match-4 → Line Blast (clears row or column)
 * Match-5 → Color Bomb (eliminates all gems of one color)
 * T/L shape → Bomb (3×3 explosion)
 */
import { BOARD, GEM_COUNT } from '../../config/balance.js';

/**
 * Determine what special tile to create from a match
 * @param {object} match - { gemId, cells, direction, length }
 * @returns {object|null} - { type, r, c, gemId } or null
 */
export function getSpecialFromMatch(match) {
  if (match.length >= 5) {
    const mid = match.cells[Math.floor(match.cells.length / 2)];
    return { type: 'color_bomb', r: mid.r, c: mid.c, gemId: match.gemId };
  }

  if (match.length === 4) {
    const mid = match.cells[Math.floor(match.cells.length / 2)];
    const type = match.direction === 'horizontal' ? 'line_h' : 'line_v';
    return { type, r: mid.r, c: mid.c, gemId: match.gemId };
  }

  return null;
}

/**
 * Get cells affected by detonating a special tile
 * @param {string} type - 'line_h', 'line_v', 'bomb', 'color_bomb'
 * @param {number} r - row of the special tile
 * @param {number} c - col of the special tile
 * @param {number} gemId - gem color (for color_bomb)
 * @param {Array} boardData - 2D board array
 * @returns {Array} - cells to clear: [{ r, c }]
 */
export function getSpecialAffectedCells(type, r, c, gemId, boardData) {
  const { rows, cols } = BOARD;
  const cells = [];

  switch (type) {
    case 'line_h':
      // Clear entire row
      for (let col = 0; col < cols; col++) {
        cells.push({ r, c: col });
      }
      break;

    case 'line_v':
      // Clear entire column
      for (let row = 0; row < rows; row++) {
        cells.push({ r: row, c });
      }
      break;

    case 'bomb':
      // 3×3 explosion centered on cell
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            cells.push({ r: nr, c: nc });
          }
        }
      }
      break;

    case 'color_bomb':
      // Remove all gems of the matched color
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          if (boardData[row][col].gemId === gemId) {
            cells.push({ r: row, c: col });
          }
        }
      }
      break;
  }

  return cells;
}
