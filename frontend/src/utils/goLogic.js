/**
 * Go Game Logic
 *
 * Pure functions for Go (Weiqi/Baduk) game mechanics, extracted for testability.
 */

export const EMPTY = null;
export const BLACK = 'black';
export const WHITE = 'white';

/**
 * Create empty Go board
 * @param {number} size - Board size (9, 13, or 19)
 * @returns {Array<Array<string|null>>} Empty board
 */
export const createEmptyBoard = (size = 9) => {
  return Array(size).fill(null).map(() => Array(size).fill(EMPTY));
};

/**
 * Get all adjacent points (neighbors)
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} size - Board size
 * @returns {Array<[number, number]>} Array of neighbor coordinates
 */
export const getNeighbors = (row, col, size) => {
  const neighbors = [];
  if (row > 0) neighbors.push([row - 1, col]);
  if (row < size - 1) neighbors.push([row + 1, col]);
  if (col > 0) neighbors.push([row, col - 1]);
  if (col < size - 1) neighbors.push([row, col + 1]);
  return neighbors;
};

/**
 * Find all stones in a group and count liberties
 * @param {Array<Array<string|null>>} board - Game board
 * @param {number} row - Starting row
 * @param {number} col - Starting column
 * @returns {{group: Array<[number, number]>, liberties: number}} Group and liberty count
 */
export const getGroupAndLiberties = (board, row, col) => {
  const size = board.length;
  const color = board[row][col];
  if (!color) return { group: [], liberties: 0 };

  const group = [];
  const visited = new Set();
  const libertySet = new Set();

  const stack = [[row, col]];
  while (stack.length > 0) {
    const [r, c] = stack.pop();
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (board[r][c] === color) {
      group.push([r, c]);
      for (const [nr, nc] of getNeighbors(r, c, size)) {
        const nkey = `${nr},${nc}`;
        if (!visited.has(nkey)) {
          if (board[nr][nc] === EMPTY) {
            libertySet.add(nkey);
          } else if (board[nr][nc] === color) {
            stack.push([nr, nc]);
          }
        }
      }
    }
  }

  return { group, liberties: libertySet.size };
};

/**
 * Check if a move is valid
 * @param {Array<Array<string|null>>} board - Game board
 * @param {number} row - Move row
 * @param {number} col - Move column
 * @param {string} player - Player making move
 * @param {[number, number]|null} koPoint - Current ko point
 * @returns {boolean} True if move is valid
 */
export const isValidMove = (board, row, col, player, koPoint = null) => {
  if (board[row][col] !== EMPTY) return false;

  // Check ko rule
  if (koPoint && koPoint[0] === row && koPoint[1] === col) {
    return false;
  }

  const size = board.length;
  const opponent = player === BLACK ? WHITE : BLACK;

  // Simulate the move
  const newBoard = board.map(r => [...r]);
  newBoard[row][col] = player;

  // Check if any opponent groups are captured
  let captures = false;
  for (const [nr, nc] of getNeighbors(row, col, size)) {
    if (newBoard[nr][nc] === opponent) {
      const { liberties } = getGroupAndLiberties(newBoard, nr, nc);
      if (liberties === 0) {
        captures = true;
        break;
      }
    }
  }

  // If we capture something, move is valid
  if (captures) return true;

  // Check if our own group has liberties (suicide rule)
  const { liberties } = getGroupAndLiberties(newBoard, row, col);
  return liberties > 0;
};

/**
 * Get all valid moves for a player
 * @param {Array<Array<string|null>>} board - Game board
 * @param {string} player - Player to check
 * @param {[number, number]|null} koPoint - Current ko point
 * @returns {Array<[number, number]>} Valid move positions
 */
export const getValidMoves = (board, player, koPoint = null) => {
  const size = board.length;
  const moves = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isValidMove(board, r, c, player, koPoint)) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
};

/**
 * Make a move on the board (returns new board and captured count)
 * @param {Array<Array<string|null>>} board - Game board
 * @param {number} row - Move row
 * @param {number} col - Move column
 * @param {string} player - Player making move
 * @param {[number, number]|null} koPoint - Current ko point
 * @returns {{board: Array<Array<string|null>>, captured: number, newKoPoint: [number, number]|null}|null}
 */
export const makeMove = (board, row, col, player, koPoint = null) => {
  if (!isValidMove(board, row, col, player, koPoint)) return null;

  const size = board.length;
  const opponent = player === BLACK ? WHITE : BLACK;
  const newBoard = board.map(r => [...r]);
  newBoard[row][col] = player;

  let capturedCount = 0;
  let capturedSingle = null;

  // Remove captured opponent groups
  for (const [nr, nc] of getNeighbors(row, col, size)) {
    if (newBoard[nr][nc] === opponent) {
      const { group, liberties } = getGroupAndLiberties(newBoard, nr, nc);
      if (liberties === 0) {
        if (group.length === 1) {
          capturedSingle = group[0];
        }
        capturedCount += group.length;
        for (const [gr, gc] of group) {
          newBoard[gr][gc] = EMPTY;
        }
      }
    }
  }

  // Calculate new ko point
  let newKoPoint = null;
  if (capturedCount === 1 && capturedSingle) {
    // Check if replaying at captured point would capture the stone just played
    const testBoard = newBoard.map(r => [...r]);
    testBoard[capturedSingle[0]][capturedSingle[1]] = opponent;
    const { group, liberties } = getGroupAndLiberties(testBoard, row, col);
    if (liberties === 0 && group.length === 1) {
      newKoPoint = capturedSingle;
    }
  }

  return { board: newBoard, captured: capturedCount, newKoPoint };
};

/**
 * Count stones on the board
 * @param {Array<Array<string|null>>} board - Game board
 * @returns {{black: number, white: number}} Stone counts
 */
export const countStones = (board) => {
  const size = board.length;
  let black = 0, white = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === BLACK) black++;
      else if (board[r][c] === WHITE) white++;
    }
  }
  return { black, white };
};

/**
 * Calculate territory (empty regions surrounded by one color)
 * @param {Array<Array<string|null>>} board - Game board
 * @returns {{black: number, white: number}} Territory counts
 */
export const calculateTerritory = (board) => {
  const size = board.length;
  const visited = new Set();
  let blackTerritory = 0;
  let whiteTerritory = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === EMPTY && !visited.has(`${r},${c}`)) {
        // Flood fill to find connected empty region
        const region = [];
        const stack = [[r, c]];
        let touchesBlack = false;
        let touchesWhite = false;

        while (stack.length > 0) {
          const [cr, cc] = stack.pop();
          const key = `${cr},${cc}`;
          if (visited.has(key)) continue;
          visited.add(key);

          if (board[cr][cc] === EMPTY) {
            region.push([cr, cc]);
            for (const [nr, nc] of getNeighbors(cr, cc, size)) {
              if (!visited.has(`${nr},${nc}`)) {
                if (board[nr][nc] === EMPTY) {
                  stack.push([nr, nc]);
                } else if (board[nr][nc] === BLACK) {
                  touchesBlack = true;
                } else if (board[nr][nc] === WHITE) {
                  touchesWhite = true;
                }
              }
            }
          }
        }

        // Assign territory
        if (touchesBlack && !touchesWhite) {
          blackTerritory += region.length;
        } else if (touchesWhite && !touchesBlack) {
          whiteTerritory += region.length;
        }
      }
    }
  }

  return { black: blackTerritory, white: whiteTerritory };
};

/**
 * Calculate final score
 * @param {Array<Array<string|null>>} board - Game board
 * @param {{black: number, white: number}} captures - Captured stones
 * @param {number} komi - Komi (compensation for white)
 * @returns {{black: number, white: number}} Final scores
 */
export const calculateScore = (board, captures = { black: 0, white: 0 }, komi = 6.5) => {
  const stones = countStones(board);
  const territory = calculateTerritory(board);

  return {
    black: stones.black + territory.black + captures.black,
    white: stones.white + territory.white + captures.white + komi
  };
};

/**
 * Get the winner based on score
 * @param {{black: number, white: number}} score - Final scores
 * @returns {string} 'black', 'white', or 'tie'
 */
export const getWinner = (score) => {
  if (score.black > score.white) return 'black';
  if (score.white > score.black) return 'white';
  return 'tie';
};

/**
 * Check if a point is a star point (hoshi)
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @param {number} size - Board size
 * @returns {boolean} True if star point
 */
export const isStarPoint = (row, col, size) => {
  if (size === 9) {
    const stars = [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]];
    return stars.some(([r, c]) => r === row && c === col);
  } else if (size === 13) {
    const stars = [[3, 3], [3, 9], [6, 6], [9, 3], [9, 9]];
    return stars.some(([r, c]) => r === row && c === col);
  } else if (size === 19) {
    const stars = [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]];
    return stars.some(([r, c]) => r === row && c === col);
  }
  return false;
};

/**
 * Find groups in atari (one liberty)
 * @param {Array<Array<string|null>>} board - Game board
 * @returns {Set<string>} Set of position keys for stones in atari
 */
export const getAtariGroups = (board) => {
  const size = board.length;
  const atariPoints = new Set();
  const checkedGroups = new Set();

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] && !checkedGroups.has(`${r},${c}`)) {
        const { group, liberties } = getGroupAndLiberties(board, r, c);
        group.forEach(([gr, gc]) => checkedGroups.add(`${gr},${gc}`));
        if (liberties === 1) {
          group.forEach(([gr, gc]) => atariPoints.add(`${gr},${gc}`));
        }
      }
    }
  }

  return atariPoints;
};

/**
 * Evaluate board position for AI
 * @param {Array<Array<string|null>>} board - Game board
 * @param {string} player - Player to evaluate for
 * @returns {number} Score (positive = good for player)
 */
export const evaluateBoard = (board, player) => {
  const size = board.length;
  const opponent = player === BLACK ? WHITE : BLACK;
  let score = 0;

  // Count stones and liberties
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === player) {
        score += 10;
        const { liberties } = getGroupAndLiberties(board, r, c);
        score += liberties * 2;
      } else if (board[r][c] === opponent) {
        score -= 10;
        const { liberties } = getGroupAndLiberties(board, r, c);
        score -= liberties * 2;
      }
    }
  }

  // Corner bonus
  const cornerBonus = 5;
  const corners = [[0, 0], [0, size - 1], [size - 1, 0], [size - 1, size - 1]];
  for (const [r, c] of corners) {
    if (board[r][c] === player) score += cornerBonus;
    else if (board[r][c] === opponent) score -= cornerBonus;
  }

  return score;
};

/**
 * Get AI move
 * @param {Array<Array<string|null>>} board - Game board
 * @param {string} player - AI player
 * @param {[number, number]|null} koPoint - Current ko point
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @returns {[number, number]|null} Best move or null
 */
export const getAiMove = (board, player, koPoint = null, difficulty = 'medium') => {
  const size = board.length;
  const opponent = player === BLACK ? WHITE : BLACK;
  const validMoves = getValidMoves(board, player, koPoint);

  if (validMoves.length === 0) return null;

  // Easy: mostly random
  if (difficulty === 'easy' && Math.random() < 0.7) {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  let bestMove = validMoves[0];
  let bestScore = -Infinity;

  for (const [r, c] of validMoves) {
    const result = makeMove(board, r, c, player, koPoint);
    if (!result) continue;

    let score = evaluateBoard(result.board, player);

    // Bonus for capturing
    score += result.captured * 20;

    // Bonus for saving own groups in atari
    for (const [nr, nc] of getNeighbors(r, c, size)) {
      if (board[nr][nc] === player) {
        const { liberties: oldLib } = getGroupAndLiberties(board, nr, nc);
        const { liberties: newLib } = getGroupAndLiberties(result.board, r, c);
        if (oldLib === 1 && newLib > 1) {
          score += 30;
        }
      }
    }

    // Bonus for putting opponent in atari
    for (const [nr, nc] of getNeighbors(r, c, size)) {
      if (result.board[nr][nc] === opponent) {
        const { liberties } = getGroupAndLiberties(result.board, nr, nc);
        if (liberties === 1) {
          score += 15;
        }
      }
    }

    // Add randomness for variety
    score += Math.random() * 3;

    if (score > bestScore) {
      bestScore = score;
      bestMove = [r, c];
    }
  }

  return bestMove;
};
