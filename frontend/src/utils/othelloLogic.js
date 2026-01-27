/**
 * Othello Game Logic
 *
 * Pure functions for Othello game mechanics, extracted for testability.
 */

export const EMPTY = null;
export const BLACK = 'black';
export const WHITE = 'white';
export const BOARD_SIZE = 8;

export const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],          [0, 1],
  [1, -1],  [1, 0], [1, 1]
];

/**
 * Create initial Othello board
 * @returns {Array<Array<string|null>>} Initial board with 4 center pieces
 */
export const createInitialBoard = () => {
  const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
  board[3][3] = WHITE;
  board[3][4] = BLACK;
  board[4][3] = BLACK;
  board[4][4] = WHITE;
  return board;
};

/**
 * Check if position is within board bounds
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {boolean} True if valid position
 */
export const isValidPos = (row, col) => row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

/**
 * Count pieces on the board
 * @param {Array<Array<string|null>>} board - Game board
 * @returns {{black: number, white: number}} Piece counts
 */
export const countPieces = (board) => {
  let black = 0, white = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === BLACK) black++;
      else if (board[r][c] === WHITE) white++;
    }
  }
  return { black, white };
};

/**
 * Get pieces that would be flipped by a move
 * @param {Array<Array<string|null>>} board - Game board
 * @param {number} row - Move row
 * @param {number} col - Move column
 * @param {string} player - Player making move
 * @returns {Array<[number, number]>} Positions of flipped pieces
 */
export const getFlippedPieces = (board, row, col, player) => {
  if (board[row][col] !== EMPTY) return [];

  const opponent = player === BLACK ? WHITE : BLACK;
  const allFlipped = [];

  for (const [dr, dc] of DIRECTIONS) {
    const flipped = [];
    let r = row + dr;
    let c = col + dc;

    // Collect opponent pieces in this direction
    while (isValidPos(r, c) && board[r][c] === opponent) {
      flipped.push([r, c]);
      r += dr;
      c += dc;
    }

    // Check if we end with our own piece
    if (flipped.length > 0 && isValidPos(r, c) && board[r][c] === player) {
      allFlipped.push(...flipped);
    }
  }

  return allFlipped;
};

/**
 * Get all valid moves for a player
 * @param {Array<Array<string|null>>} board - Game board
 * @param {string} player - Player to check
 * @returns {Array<[number, number]>} Valid move positions
 */
export const getValidMoves = (board, player) => {
  const moves = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (getFlippedPieces(board, r, c, player).length > 0) {
        moves.push([r, c]);
      }
    }
  }
  return moves;
};

/**
 * Make a move on the board (returns new board)
 * @param {Array<Array<string|null>>} board - Game board
 * @param {number} row - Move row
 * @param {number} col - Move column
 * @param {string} player - Player making move
 * @returns {{board: Array<Array<string|null>>, flipped: Array<[number, number]>}|null} New board and flipped pieces, or null if invalid
 */
export const makeMove = (board, row, col, player) => {
  const flipped = getFlippedPieces(board, row, col, player);
  if (flipped.length === 0) return null;

  const newBoard = board.map(r => [...r]);
  newBoard[row][col] = player;
  for (const [fr, fc] of flipped) {
    newBoard[fr][fc] = player;
  }

  return { board: newBoard, flipped };
};

/**
 * Check if game is over
 * @param {Array<Array<string|null>>} board - Game board
 * @returns {boolean} True if neither player can move
 */
export const isGameOver = (board) => {
  return getValidMoves(board, BLACK).length === 0 && getValidMoves(board, WHITE).length === 0;
};

/**
 * Get the winner of a finished game
 * @param {Array<Array<string|null>>} board - Game board
 * @returns {string} 'black', 'white', or 'tie'
 */
export const getWinner = (board) => {
  const { black, white } = countPieces(board);
  if (black > white) return 'black';
  if (white > black) return 'white';
  return 'tie';
};

/**
 * Evaluate board position for AI
 * @param {Array<Array<string|null>>} board - Game board
 * @param {string} player - Player to evaluate for
 * @returns {number} Score (positive = good for player)
 */
export const evaluateBoard = (board, player) => {
  const opponent = player === BLACK ? WHITE : BLACK;
  let score = 0;

  // Piece count
  const counts = countPieces(board);
  const playerCount = player === BLACK ? counts.black : counts.white;
  const opponentCount = player === BLACK ? counts.white : counts.black;
  score += (playerCount - opponentCount) * 1;

  // Corner bonus (corners are very valuable)
  const corners = [[0, 0], [0, 7], [7, 0], [7, 7]];
  for (const [r, c] of corners) {
    if (board[r][c] === player) score += 25;
    else if (board[r][c] === opponent) score -= 25;
  }

  // Edge bonus
  for (let i = 0; i < BOARD_SIZE; i++) {
    // Top/bottom edges
    if (board[0][i] === player) score += 5;
    else if (board[0][i] === opponent) score -= 5;
    if (board[7][i] === player) score += 5;
    else if (board[7][i] === opponent) score -= 5;
    // Left/right edges
    if (board[i][0] === player) score += 5;
    else if (board[i][0] === opponent) score -= 5;
    if (board[i][7] === player) score += 5;
    else if (board[i][7] === opponent) score -= 5;
  }

  // Mobility (number of valid moves)
  const playerMoves = getValidMoves(board, player).length;
  const opponentMoves = getValidMoves(board, opponent).length;
  score += (playerMoves - opponentMoves) * 2;

  return score;
};

/**
 * Minimax with alpha-beta pruning
 * @param {Array<Array<string|null>>} board - Game board
 * @param {number} depth - Search depth
 * @param {number} alpha - Alpha for pruning
 * @param {number} beta - Beta for pruning
 * @param {boolean} isMaximizing - Is maximizing player
 * @param {string} player - AI player
 * @returns {number} Evaluation score
 */
export const minimax = (board, depth, alpha, beta, isMaximizing, player) => {
  const opponent = player === BLACK ? WHITE : BLACK;
  const currentPlayer = isMaximizing ? player : opponent;
  const moves = getValidMoves(board, currentPlayer);

  if (depth === 0 || moves.length === 0) {
    return evaluateBoard(board, player);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const [r, c] of moves) {
      const result = makeMove(board, r, c, player);
      if (result) {
        const evalScore = minimax(result.board, depth - 1, alpha, beta, false, player);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const [r, c] of moves) {
      const result = makeMove(board, r, c, opponent);
      if (result) {
        const evalScore = minimax(result.board, depth - 1, alpha, beta, true, player);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
    }
    return minEval;
  }
};

/**
 * Get AI move
 * @param {Array<Array<string|null>>} board - Game board
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @param {string} player - AI player (default WHITE)
 * @returns {[number, number]|null} Best move or null
 */
export const getAiMove = (board, difficulty, player = WHITE) => {
  const depths = { easy: 2, medium: 4, hard: 6 };
  const depth = depths[difficulty];
  const moves = getValidMoves(board, player);

  if (moves.length === 0) return null;

  // Easy mode: sometimes random
  if (difficulty === 'easy' && Math.random() < 0.3) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const [r, c] of moves) {
    const result = makeMove(board, r, c, player);
    if (result) {
      const score = minimax(result.board, depth - 1, -Infinity, Infinity, false, player);
      if (score > bestScore) {
        bestScore = score;
        bestMove = [r, c];
      }
    }
  }

  return bestMove;
};
