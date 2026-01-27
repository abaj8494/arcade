/**
 * Peg Solitaire Game Logic
 *
 * Pure functions for Peg Solitaire game mechanics, extracted for testability.
 */

// Board layouts - null = invalid, 0 = empty, 1 = peg
export const BOARDS = {
  british: {
    name: 'British (English)',
    layout: [
      [null, null, 1, 1, 1, null, null],
      [null, null, 1, 1, 1, null, null],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 1, 1, 1], // Centre empty
      [1, 1, 1, 1, 1, 1, 1],
      [null, null, 1, 1, 1, null, null],
      [null, null, 1, 1, 1, null, null],
    ],
    totalPegs: 32,
  },
  european: {
    name: 'European',
    layout: [
      [null, null, 1, 1, 1, null, null],
      [null, 1, 1, 1, 1, 1, null],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [null, 1, 1, 1, 1, 1, null],
      [null, null, 1, 1, 1, null, null],
    ],
    totalPegs: 36,
  },
};

export const DIRECTIONS = [
  [-2, 0], // up
  [2, 0],  // down
  [0, -2], // left
  [0, 2],  // right
];

/**
 * Clone a board
 * @param {Array<Array<number|null>>} layout - Board layout
 * @returns {Array<Array<number|null>>} Cloned board
 */
export const cloneBoard = (layout) => {
  return layout.map(row => [...row]);
};

/**
 * Count pegs on the board
 * @param {Array<Array<number|null>>} board - Game board
 * @returns {number} Number of pegs
 */
export const countPegs = (board) => {
  let count = 0;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (board[r][c] === 1) count++;
    }
  }
  return count;
};

/**
 * Find valid moves for a specific peg
 * @param {Array<Array<number|null>>} board - Game board
 * @param {number} row - Peg row
 * @param {number} col - Peg column
 * @returns {Array<{endRow: number, endCol: number, midRow: number, midCol: number}>} Valid moves
 */
export const findValidMovesForPeg = (board, row, col) => {
  const moves = [];
  for (const [dr, dc] of DIRECTIONS) {
    const midRow = row + dr / 2;
    const midCol = col + dc / 2;
    const endRow = row + dr;
    const endCol = col + dc;

    if (
      endRow >= 0 && endRow < 7 &&
      endCol >= 0 && endCol < 7 &&
      board[midRow]?.[midCol] === 1 && // Peg to jump over
      board[endRow]?.[endCol] === 0    // Empty destination
    ) {
      moves.push({ endRow, endCol, midRow, midCol });
    }
  }
  return moves;
};

/**
 * Find all valid moves on the board
 * @param {Array<Array<number|null>>} board - Game board
 * @returns {Array<{startRow: number, startCol: number, endRow: number, endCol: number, midRow: number, midCol: number}>} All valid moves
 */
export const findAllValidMoves = (board) => {
  const moves = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (board[r][c] === 1) {
        const pegMoves = findValidMovesForPeg(board, r, c);
        moves.push(...pegMoves.map(m => ({ startRow: r, startCol: c, ...m })));
      }
    }
  }
  return moves;
};

/**
 * Make a move on the board (returns new board)
 * @param {Array<Array<number|null>>} board - Game board
 * @param {number} startRow - Starting row
 * @param {number} startCol - Starting column
 * @param {{endRow: number, endCol: number, midRow: number, midCol: number}} move - Move to make
 * @returns {Array<Array<number|null>>} New board
 */
export const makeMove = (board, startRow, startCol, move) => {
  const newBoard = cloneBoard(board);
  newBoard[startRow][startCol] = 0;
  newBoard[move.midRow][move.midCol] = 0;
  newBoard[move.endRow][move.endCol] = 1;
  return newBoard;
};

/**
 * Undo a move on the board (returns new board)
 * @param {Array<Array<number|null>>} board - Game board
 * @param {number} startRow - Original starting row
 * @param {number} startCol - Original starting column
 * @param {{endRow: number, endCol: number, midRow: number, midCol: number}} move - Move to undo
 * @returns {Array<Array<number|null>>} New board
 */
export const undoMove = (board, startRow, startCol, move) => {
  const newBoard = cloneBoard(board);
  newBoard[startRow][startCol] = 1;
  newBoard[move.midRow][move.midCol] = 1;
  newBoard[move.endRow][move.endCol] = 0;
  return newBoard;
};

/**
 * Check if puzzle is solved
 * @param {Array<Array<number|null>>} board - Game board
 * @param {string} boardType - 'british' or 'european'
 * @returns {boolean} True if solved
 */
export const isSolved = (board, boardType) => {
  const pegs = countPegs(board);
  if (pegs !== 1) return false;
  if (boardType === 'british') return board[3][3] === 1;
  return true;
};

/**
 * Check if game is over (no moves left)
 * @param {Array<Array<number|null>>} board - Game board
 * @returns {boolean} True if no moves available
 */
export const isGameOver = (board) => {
  return findAllValidMoves(board).length === 0;
};

/**
 * Encode board state as string for visited set
 * @param {Array<Array<number|null>>} board - Game board
 * @returns {string} Board key
 */
export const encodeBoard = (board) => {
  let key = '';
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (board[r][c] !== null) {
        key += board[r][c];
      }
    }
  }
  return key;
};

/**
 * Detect board type based on layout
 * @param {Array<Array<number|null>>} board - Game board
 * @returns {string} 'british' or 'european'
 */
export const detectBoardType = (board) => {
  let numPositions = 0;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (board[r][c] !== null) numPositions++;
    }
  }
  return numPositions === 33 ? 'british' : 'european';
};

/**
 * Solve the puzzle using DFS with memoization
 * @param {Array<Array<number|null>>} startBoard - Starting board state
 * @param {number} maxExpansions - Maximum state expansions
 * @returns {Array<{from: [number, number], to: [number, number]}>|null} Solution moves or null
 */
export const solvePuzzle = (startBoard, maxExpansions = 100000) => {
  const boardType = detectBoardType(startBoard);
  const visited = new Set();
  let expanded = 0;

  const checkSolved = (board) => {
    const pegs = countPegs(board);
    if (pegs !== 1) return false;
    if (boardType === 'british') return board[3][3] === 1;
    return true;
  };

  const getValidMoves = (board) => {
    const moves = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (board[r][c] !== 1) continue;
        // up
        if (r > 1 && board[r-1][c] === 1 && board[r-2][c] === 0)
          moves.push({ from: [r, c], to: [r-2, c], over: [r-1, c] });
        // left
        if (c > 1 && board[r][c-1] === 1 && board[r][c-2] === 0)
          moves.push({ from: [r, c], to: [r, c-2], over: [r, c-1] });
        // down
        if (r < 5 && board[r+1][c] === 1 && board[r+2][c] === 0)
          moves.push({ from: [r, c], to: [r+2, c], over: [r+1, c] });
        // right
        if (c < 5 && board[r][c+1] === 1 && board[r][c+2] === 0)
          moves.push({ from: [r, c], to: [r, c+2], over: [r, c+1] });
      }
    }
    return moves;
  };

  const applyMove = (board, move) => {
    board[move.from[0]][move.from[1]] = 0;
    board[move.over[0]][move.over[1]] = 0;
    board[move.to[0]][move.to[1]] = 1;
  };

  const revertMove = (board, move) => {
    board[move.from[0]][move.from[1]] = 1;
    board[move.over[0]][move.over[1]] = 1;
    board[move.to[0]][move.to[1]] = 0;
  };

  const board = startBoard.map(row => [...row]);
  const solutionMoves = [];

  visited.add(encodeBoard(board));
  expanded++;

  if (checkSolved(board)) {
    return [];
  }

  const stack = [{ moves: getValidMoves(board), moveIdx: 0 }];

  while (stack.length > 0 && expanded < maxExpansions) {
    const frame = stack[stack.length - 1];
    let foundMove = false;

    while (frame.moveIdx < frame.moves.length) {
      const move = frame.moves[frame.moveIdx];
      frame.moveIdx++;

      applyMove(board, move);
      const stateKey = encodeBoard(board);

      if (!visited.has(stateKey)) {
        visited.add(stateKey);
        expanded++;

        if (checkSolved(board)) {
          solutionMoves.push(move);
          return solutionMoves.map(m => ({ from: m.from, to: m.to }));
        }

        solutionMoves.push(move);
        stack.push({ moves: getValidMoves(board), moveIdx: 0 });
        foundMove = true;
        break;
      } else {
        revertMove(board, move);
      }
    }

    if (!foundMove) {
      stack.pop();
      if (solutionMoves.length > 0) {
        revertMove(board, solutionMoves.pop());
      }
    }
  }

  return null;
};
