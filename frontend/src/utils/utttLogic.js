/**
 * Ultimate Tic Tac Toe Game Logic
 *
 * Pure functions for UTTT game mechanics, extracted for testability.
 */

export const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6]             // diagonals
];

/**
 * Create an empty UTTT board (9 mini boards, each with 9 cells)
 * @returns {Array<Array<null>>} Empty board
 */
export const createEmptyBoard = () => {
  return Array(9).fill(null).map(() => Array(9).fill(null));
};

/**
 * Check for a winner in a single board (mini or meta)
 * @param {Array<string|null>} cells - 9-cell array
 * @returns {{winner: string, line: Array<number>}|null} Winner info or null
 */
export const checkWinner = (cells) => {
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return { winner: cells[a], line: [a, b, c] };
    }
  }
  if (cells.every(cell => cell !== null)) {
    return { winner: 'draw', line: null };
  }
  return null;
};

/**
 * Get all valid moves for current state
 * @param {Array<Array<string|null>>} boards - The game boards
 * @param {Array<string|null>} winners - Board winners
 * @param {number|null} activeBoard - Active board index or null for any
 * @returns {Array<{board: number, cell: number}>} Valid moves
 */
export const getValidMoves = (boards, winners, activeBoard) => {
  const moves = [];
  const boardsToCheck = activeBoard !== null
    ? [activeBoard]
    : Array.from({ length: 9 }, (_, i) => i).filter(i => !winners[i]);

  for (const boardIdx of boardsToCheck) {
    if (winners[boardIdx]) continue;
    for (let cellIdx = 0; cellIdx < 9; cellIdx++) {
      if (!boards[boardIdx][cellIdx]) {
        moves.push({ board: boardIdx, cell: cellIdx });
      }
    }
  }
  return moves;
};

/**
 * Apply a move and return new state
 * @param {Array<Array<string|null>>} boards - The game boards
 * @param {Array<string|null>} winners - Board winners
 * @param {{board: number, cell: number}} move - The move to apply
 * @param {string} player - Player making the move ('X' or 'O')
 * @returns {Object} New game state
 */
export const applyMove = (boards, winners, move, player) => {
  const newBoards = boards.map(b => [...b]);
  newBoards[move.board][move.cell] = player;

  const newWinners = [...winners];
  const boardResult = checkWinner(newBoards[move.board]);
  if (boardResult) {
    newWinners[move.board] = boardResult.winner;
  }

  // Determine next active board
  let nextActive = move.cell;
  if (newWinners[nextActive] || newBoards[nextActive].every(c => c !== null)) {
    nextActive = null;
  }

  const gameResult = checkWinner(newWinners);

  return {
    boards: newBoards,
    winners: newWinners,
    active: nextActive,
    gameOver: gameResult !== null,
    result: gameResult
  };
};

/**
 * Evaluate board position for AI
 * @param {Array<Array<string|null>>} boards - The game boards
 * @param {Array<string|null>} boardWins - Board winners
 * @param {string} player - Player to evaluate for
 * @returns {number} Score (positive = good for player)
 */
export const evaluateBoard = (boards, boardWins, player) => {
  const opponent = player === 'X' ? 'O' : 'X';
  let score = 0;

  // Check for game win/loss
  const gameResult = checkWinner(boardWins);
  if (gameResult) {
    if (gameResult.winner === player) return 100000;
    if (gameResult.winner === opponent) return -100000;
    return 0;
  }

  // Evaluate meta-board lines
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    const line = [boardWins[a], boardWins[b], boardWins[c]];
    const playerCount = line.filter(w => w === player).length;
    const opponentCount = line.filter(w => w === opponent).length;
    const open = line.filter(w => w === null).length;

    if (playerCount === 2 && open === 1) score += 500;
    else if (opponentCount === 2 && open === 1) score -= 500;
    else if (playerCount === 1 && open === 2) score += 50;
    else if (opponentCount === 1 && open === 2) score -= 50;
  }

  // Strategic positions
  if (boardWins[4] === player) score += 200;
  else if (boardWins[4] === opponent) score -= 200;

  for (const c of [0, 2, 6, 8]) {
    if (boardWins[c] === player) score += 80;
    else if (boardWins[c] === opponent) score -= 80;
  }

  // Sub-board evaluation (threats)
  for (let b = 0; b < 9; b++) {
    if (boardWins[b]) continue;
    const board = boards[b];
    for (const [x, y, z] of WINNING_COMBINATIONS) {
      const line = [board[x], board[y], board[z]];
      const playerCount = line.filter(c => c === player).length;
      const opponentCount = line.filter(c => c === opponent).length;
      const empty = line.filter(c => c === null).length;

      if (playerCount === 2 && empty === 1) score += 15;
      else if (opponentCount === 2 && empty === 1) score -= 15;
    }
  }

  return score;
};

/**
 * Minimax with alpha-beta pruning
 * @param {Array<Array<string|null>>} boards - The game boards
 * @param {Array<string|null>} boardWins - Board winners
 * @param {number|null} activeBoard - Active board
 * @param {number} depth - Search depth
 * @param {number} alpha - Alpha for pruning
 * @param {number} beta - Beta for pruning
 * @param {boolean} isMaximizing - Is maximizing player
 * @param {string} player - AI player
 * @param {Object} nodeCounter - Counter object to track nodes
 * @returns {number} Evaluation score
 */
export const minimax = (boards, boardWins, activeBoard, depth, alpha, beta, isMaximizing, player, nodeCounter = { count: 0 }) => {
  nodeCounter.count++;
  if (nodeCounter.count > 50000) return 0;

  const opponent = player === 'X' ? 'O' : 'X';

  const gameResult = checkWinner(boardWins);
  if (gameResult) {
    if (gameResult.winner === player) return 100000 + depth;
    if (gameResult.winner === opponent) return -100000 - depth;
    return 0;
  }

  if (depth === 0) {
    return evaluateBoard(boards, boardWins, player);
  }

  const currentMoves = getValidMoves(boards, boardWins, activeBoard);
  if (currentMoves.length === 0) return 0;

  // Move ordering
  currentMoves.sort((a, b) => {
    let sa = 0, sb = 0;
    if (a.cell === 4) sa += 3;
    if (b.cell === 4) sb += 3;
    if (a.board === 4) sa += 2;
    if (b.board === 4) sb += 2;
    if ([0, 2, 6, 8].includes(a.cell)) sa += 1;
    if ([0, 2, 6, 8].includes(b.cell)) sb += 1;
    return sb - sa;
  });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of currentMoves) {
      const newState = applyMove(boards, boardWins, move, player);
      const evalScore = minimax(newState.boards, newState.winners, newState.active, depth - 1, alpha, beta, false, player, nodeCounter);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of currentMoves) {
      const newState = applyMove(boards, boardWins, move, opponent);
      const evalScore = minimax(newState.boards, newState.winners, newState.active, depth - 1, alpha, beta, true, player, nodeCounter);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

/**
 * Get AI move
 * @param {Array<Array<string|null>>} boards - The game boards
 * @param {Array<string|null>} winners - Board winners
 * @param {number|null} activeBoard - Active board
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @param {string} player - AI player ('X' or 'O')
 * @returns {{board: number, cell: number}|null} Best move or null
 */
export const getAiMove = (boards, winners, activeBoard, difficulty, player = 'O') => {
  const opponent = player === 'X' ? 'O' : 'X';
  const moves = getValidMoves(boards, winners, activeBoard);

  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  const depth = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;

  // Easy mode: random chance
  if (difficulty === 'easy' && Math.random() < 0.4) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Quick check for immediate wins/blocks
  for (const move of moves) {
    const state = applyMove(boards, winners, move, player);
    if (state.result && state.result.winner === player) {
      return move;
    }
  }

  for (const move of moves) {
    const state = applyMove(boards, winners, move, opponent);
    if (state.result && state.result.winner === opponent) {
      return move;
    }
  }

  // Find best move with minimax
  let bestMove = moves[0];
  let bestScore = -Infinity;
  const nodeCounter = { count: 0 };

  for (const move of moves) {
    const newState = applyMove(boards, winners, move, player);
    const score = minimax(newState.boards, newState.winners, newState.active, depth - 1, -Infinity, Infinity, false, player, nodeCounter);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  // Medium mode: occasional suboptimal play
  if (difficulty === 'medium' && Math.random() < 0.15) {
    const randomMoves = moves.filter(m => m.cell === 4 || m.board === 4 || [0, 2, 6, 8].includes(m.cell));
    if (randomMoves.length > 0) {
      return randomMoves[Math.floor(Math.random() * randomMoves.length)];
    }
  }

  return bestMove;
};
