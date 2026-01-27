/**
 * Connect4 Game Logic
 *
 * Pure functions for Connect4 game mechanics, extracted for testability.
 */

export const EMPTY = null;
export const PLAYER_1 = 'red';
export const PLAYER_2 = 'yellow';

/**
 * Create an empty game board
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @returns {Array<Array<null>>} Empty board
 */
export const createEmptyBoard = (rows = 6, cols = 7) => {
  return Array(rows).fill(null).map(() => Array(cols).fill(EMPTY));
};

/**
 * Check for a winner on the board
 * @param {Array<Array<string|null>>} board - The game board
 * @returns {{winner: string, cells: Array<[number, number]>}|null} Winner info or null
 */
export const checkWinner = (board) => {
  const numRows = board.length;
  const numCols = board[0]?.length || 0;
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1],  // diagonal down-left
  ];

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const cell = board[row][col];
      if (!cell) continue;

      for (const [dr, dc] of directions) {
        const cells = [[row, col]];
        let r = row + dr;
        let c = col + dc;

        while (
          r >= 0 && r < numRows &&
          c >= 0 && c < numCols &&
          board[r][c] === cell
        ) {
          cells.push([r, c]);
          r += dr;
          c += dc;
        }

        if (cells.length >= 4) {
          return { winner: cell, cells: cells.slice(0, 4) };
        }
      }
    }
  }

  // Check for draw (top row is full)
  if (board[0].every(cell => cell !== EMPTY)) {
    return { winner: 'draw', cells: [] };
  }

  return null;
};

/**
 * Get the lowest empty row in a column
 * @param {Array<Array<string|null>>} board - The game board
 * @param {number} col - Column index
 * @returns {number} Row index or -1 if column is full
 */
export const getLowestEmptyRow = (board, col) => {
  const numRows = board.length;
  for (let row = numRows - 1; row >= 0; row--) {
    if (board[row][col] === EMPTY) {
      return row;
    }
  }
  return -1;
};

/**
 * Check if a move is valid
 * @param {Array<Array<string|null>>} board - The game board
 * @param {number} col - Column index
 * @returns {boolean} Whether the move is valid
 */
export const isValidMove = (board, col) => {
  if (col < 0 || col >= board[0].length) return false;
  return getLowestEmptyRow(board, col) !== -1;
};

/**
 * Make a move on the board (returns new board, doesn't mutate)
 * @param {Array<Array<string|null>>} board - The game board
 * @param {number} col - Column index
 * @param {string} player - Player making the move
 * @returns {{board: Array<Array<string|null>>, row: number}|null} New board and row, or null if invalid
 */
export const makeMove = (board, col, player) => {
  const row = getLowestEmptyRow(board, col);
  if (row === -1) return null;

  const newBoard = board.map(r => [...r]);
  newBoard[row][col] = player;
  return { board: newBoard, row };
};

/**
 * Get all valid columns for the next move
 * @param {Array<Array<string|null>>} board - The game board
 * @returns {number[]} Array of valid column indices
 */
export const getValidColumns = (board) => {
  const cols = board[0]?.length || 0;
  const valid = [];
  for (let col = 0; col < cols; col++) {
    if (board[0][col] === EMPTY) {
      valid.push(col);
    }
  }
  return valid;
};

/**
 * Evaluate board position for AI
 * @param {Array<Array<string|null>>} board - The game board
 * @param {string} player - Player to evaluate for
 * @returns {number} Score (positive = good for player)
 */
export const evaluateBoard = (board, player) => {
  const numRows = board.length;
  const numCols = board[0]?.length || 0;
  const opponent = player === PLAYER_1 ? PLAYER_2 : PLAYER_1;
  let score = 0;

  // Evaluate all windows of 4
  const evaluateWindow = (window) => {
    const playerCount = window.filter(c => c === player).length;
    const opponentCount = window.filter(c => c === opponent).length;
    const emptyCount = window.filter(c => c === EMPTY).length;

    if (playerCount === 4) return 10000;
    if (opponentCount === 4) return -10000;
    if (playerCount === 3 && emptyCount === 1) return 100;
    if (playerCount === 2 && emptyCount === 2) return 10;
    if (opponentCount === 3 && emptyCount === 1) return -80;
    if (opponentCount === 2 && emptyCount === 2) return -5;
    return 0;
  };

  // Horizontal windows
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col <= numCols - 4; col++) {
      const window = [board[row][col], board[row][col+1], board[row][col+2], board[row][col+3]];
      score += evaluateWindow(window);
    }
  }

  // Vertical windows
  for (let row = 0; row <= numRows - 4; row++) {
    for (let col = 0; col < numCols; col++) {
      const window = [board[row][col], board[row+1][col], board[row+2][col], board[row+3][col]];
      score += evaluateWindow(window);
    }
  }

  // Diagonal windows (down-right)
  for (let row = 0; row <= numRows - 4; row++) {
    for (let col = 0; col <= numCols - 4; col++) {
      const window = [board[row][col], board[row+1][col+1], board[row+2][col+2], board[row+3][col+3]];
      score += evaluateWindow(window);
    }
  }

  // Diagonal windows (down-left)
  for (let row = 0; row <= numRows - 4; row++) {
    for (let col = 3; col < numCols; col++) {
      const window = [board[row][col], board[row+1][col-1], board[row+2][col-2], board[row+3][col-3]];
      score += evaluateWindow(window);
    }
  }

  // Center column preference
  const centerCol = Math.floor(numCols / 2);
  const centerCount = board.filter((row) => row[centerCol] === player).length;
  score += centerCount * 3;

  return score;
};
