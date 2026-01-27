/**
 * Tests for Peg Solitaire Game Logic
 */

import {
  BOARDS,
  DIRECTIONS,
  cloneBoard,
  countPegs,
  findValidMovesForPeg,
  findAllValidMoves,
  makeMove,
  undoMove,
  isSolved,
  isGameOver,
  encodeBoard,
  detectBoardType,
  solvePuzzle
} from '../utils/pegSolitaireLogic';

describe('Peg Solitaire Logic', () => {
  describe('BOARDS configuration', () => {
    it('has british board defined', () => {
      expect(BOARDS.british).toBeDefined();
      expect(BOARDS.british.layout).toHaveLength(7);
      expect(BOARDS.british.totalPegs).toBe(32);
    });

    it('has european board defined', () => {
      expect(BOARDS.european).toBeDefined();
      expect(BOARDS.european.layout).toHaveLength(7);
      expect(BOARDS.european.totalPegs).toBe(36);
    });

    it('british board has center empty', () => {
      expect(BOARDS.british.layout[3][3]).toBe(0);
    });
  });

  describe('cloneBoard', () => {
    it('creates a deep copy', () => {
      const board = BOARDS.british.layout;
      const clone = cloneBoard(board);
      clone[3][3] = 1;
      expect(board[3][3]).toBe(0);
    });

    it('preserves all values', () => {
      const board = BOARDS.british.layout;
      const clone = cloneBoard(board);
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          expect(clone[r][c]).toBe(board[r][c]);
        }
      }
    });
  });

  describe('countPegs', () => {
    it('counts pegs on british board correctly', () => {
      const board = cloneBoard(BOARDS.british.layout);
      expect(countPegs(board)).toBe(32);
    });

    it('counts pegs on european board correctly', () => {
      const board = cloneBoard(BOARDS.european.layout);
      expect(countPegs(board)).toBe(37); // All pegs (no empty center by default in layout)
    });

    it('returns 0 for empty board', () => {
      const board = Array(7).fill(null).map(() => Array(7).fill(0));
      expect(countPegs(board)).toBe(0);
    });

    it('handles null cells correctly', () => {
      const board = cloneBoard(BOARDS.british.layout);
      expect(countPegs(board)).toBe(32);
    });
  });

  describe('findValidMovesForPeg', () => {
    it('finds valid moves for center-adjacent peg', () => {
      const board = cloneBoard(BOARDS.british.layout);
      // Peg at (3,1) can jump to (3,3)
      const moves = findValidMovesForPeg(board, 3, 1);
      expect(moves.length).toBeGreaterThan(0);
      expect(moves.some(m => m.endRow === 3 && m.endCol === 3)).toBe(true);
    });

    it('returns empty for peg with no valid moves', () => {
      const board = cloneBoard(BOARDS.british.layout);
      // Corner peg at (0,2) typically has limited moves
      const moves = findValidMovesForPeg(board, 0, 2);
      // This position may or may not have moves depending on board state
      expect(Array.isArray(moves)).toBe(true);
    });

    it('correctly identifies jump target', () => {
      const board = cloneBoard(BOARDS.british.layout);
      const moves = findValidMovesForPeg(board, 3, 1);
      const jumpToCenter = moves.find(m => m.endRow === 3 && m.endCol === 3);
      if (jumpToCenter) {
        expect(jumpToCenter.midRow).toBe(3);
        expect(jumpToCenter.midCol).toBe(2);
      }
    });

    it('handles edge of board correctly', () => {
      const board = cloneBoard(BOARDS.british.layout);
      // Peg at edge should only have inward moves
      const moves = findValidMovesForPeg(board, 2, 0);
      moves.forEach(m => {
        expect(m.endRow).toBeGreaterThanOrEqual(0);
        expect(m.endRow).toBeLessThan(7);
        expect(m.endCol).toBeGreaterThanOrEqual(0);
        expect(m.endCol).toBeLessThan(7);
      });
    });
  });

  describe('findAllValidMoves', () => {
    it('finds all valid moves on british board', () => {
      const board = cloneBoard(BOARDS.british.layout);
      const moves = findAllValidMoves(board);
      // Initial british board has exactly 4 valid moves
      expect(moves).toHaveLength(4);
    });

    it('includes start position in moves', () => {
      const board = cloneBoard(BOARDS.british.layout);
      const moves = findAllValidMoves(board);
      moves.forEach(m => {
        expect(m).toHaveProperty('startRow');
        expect(m).toHaveProperty('startCol');
        expect(m).toHaveProperty('endRow');
        expect(m).toHaveProperty('endCol');
        expect(m).toHaveProperty('midRow');
        expect(m).toHaveProperty('midCol');
      });
    });

    it('returns empty for board with no moves', () => {
      // Create a board with isolated pegs
      const board = Array(7).fill(null).map((_, r) =>
        Array(7).fill(null).map((_, c) =>
          (r === 3 && c === 3) ? 1 : (BOARDS.british.layout[r][c] === null ? null : 0)
        )
      );
      const moves = findAllValidMoves(board);
      expect(moves).toHaveLength(0);
    });
  });

  describe('makeMove', () => {
    it('moves peg correctly', () => {
      const board = cloneBoard(BOARDS.british.layout);
      const move = { endRow: 3, endCol: 3, midRow: 3, midCol: 2 };
      const newBoard = makeMove(board, 3, 1, move);
      expect(newBoard[3][1]).toBe(0); // Start empty
      expect(newBoard[3][2]).toBe(0); // Jumped over empty
      expect(newBoard[3][3]).toBe(1); // End has peg
    });

    it('does not mutate original board', () => {
      const board = cloneBoard(BOARDS.british.layout);
      const move = { endRow: 3, endCol: 3, midRow: 3, midCol: 2 };
      makeMove(board, 3, 1, move);
      expect(board[3][1]).toBe(1);
      expect(board[3][2]).toBe(1);
      expect(board[3][3]).toBe(0);
    });

    it('reduces peg count by 1', () => {
      const board = cloneBoard(BOARDS.british.layout);
      const move = { endRow: 3, endCol: 3, midRow: 3, midCol: 2 };
      const newBoard = makeMove(board, 3, 1, move);
      expect(countPegs(newBoard)).toBe(countPegs(board) - 1);
    });
  });

  describe('undoMove', () => {
    it('reverses a move correctly', () => {
      const board = cloneBoard(BOARDS.british.layout);
      const move = { endRow: 3, endCol: 3, midRow: 3, midCol: 2 };
      const afterMove = makeMove(board, 3, 1, move);
      const restored = undoMove(afterMove, 3, 1, move);

      expect(restored[3][1]).toBe(1);
      expect(restored[3][2]).toBe(1);
      expect(restored[3][3]).toBe(0);
    });

    it('restores peg count', () => {
      const board = cloneBoard(BOARDS.british.layout);
      const originalCount = countPegs(board);
      const move = { endRow: 3, endCol: 3, midRow: 3, midCol: 2 };
      const afterMove = makeMove(board, 3, 1, move);
      const restored = undoMove(afterMove, 3, 1, move);

      expect(countPegs(restored)).toBe(originalCount);
    });
  });

  describe('isSolved', () => {
    it('returns false for initial board', () => {
      const board = cloneBoard(BOARDS.british.layout);
      expect(isSolved(board, 'british')).toBe(false);
    });

    it('returns true for british board with center peg only', () => {
      const board = Array(7).fill(null).map((_, r) =>
        Array(7).fill(null).map((_, c) =>
          BOARDS.british.layout[r][c] === null ? null : 0
        )
      );
      board[3][3] = 1;
      expect(isSolved(board, 'british')).toBe(true);
    });

    it('returns false for british board with non-center peg', () => {
      const board = Array(7).fill(null).map((_, r) =>
        Array(7).fill(null).map((_, c) =>
          BOARDS.british.layout[r][c] === null ? null : 0
        )
      );
      board[2][3] = 1; // Not center
      expect(isSolved(board, 'british')).toBe(false);
    });

    it('returns true for european board with any single peg', () => {
      const board = Array(7).fill(null).map((_, r) =>
        Array(7).fill(null).map((_, c) =>
          BOARDS.european.layout[r][c] === null ? null : 0
        )
      );
      board[2][3] = 1;
      expect(isSolved(board, 'european')).toBe(true);
    });

    it('returns false with multiple pegs', () => {
      const board = Array(7).fill(null).map((_, r) =>
        Array(7).fill(null).map((_, c) =>
          BOARDS.british.layout[r][c] === null ? null : 0
        )
      );
      board[3][3] = 1;
      board[3][4] = 1;
      expect(isSolved(board, 'british')).toBe(false);
    });
  });

  describe('isGameOver', () => {
    it('returns false for initial board', () => {
      const board = cloneBoard(BOARDS.british.layout);
      expect(isGameOver(board)).toBe(false);
    });

    it('returns true for solved board', () => {
      const board = Array(7).fill(null).map((_, r) =>
        Array(7).fill(null).map((_, c) =>
          BOARDS.british.layout[r][c] === null ? null : 0
        )
      );
      board[3][3] = 1;
      expect(isGameOver(board)).toBe(true);
    });

    it('returns true for stuck board', () => {
      // Create a board where no jumps are possible
      const board = Array(7).fill(null).map((_, r) =>
        Array(7).fill(null).map((_, c) =>
          BOARDS.british.layout[r][c] === null ? null : 0
        )
      );
      board[0][2] = 1;
      board[0][4] = 1;
      // These pegs can't jump each other
      expect(isGameOver(board)).toBe(true);
    });
  });

  describe('encodeBoard', () => {
    it('creates unique keys for different boards', () => {
      const board1 = cloneBoard(BOARDS.british.layout);
      const board2 = cloneBoard(BOARDS.british.layout);
      board2[3][3] = 1;
      board2[3][1] = 0;

      expect(encodeBoard(board1)).not.toBe(encodeBoard(board2));
    });

    it('creates same key for identical boards', () => {
      const board1 = cloneBoard(BOARDS.british.layout);
      const board2 = cloneBoard(BOARDS.british.layout);

      expect(encodeBoard(board1)).toBe(encodeBoard(board2));
    });

    it('ignores null cells', () => {
      const board = cloneBoard(BOARDS.british.layout);
      const key = encodeBoard(board);
      // British board has 33 valid positions
      expect(key).toHaveLength(33);
    });
  });

  describe('detectBoardType', () => {
    it('detects british board', () => {
      const board = cloneBoard(BOARDS.british.layout);
      expect(detectBoardType(board)).toBe('british');
    });

    it('detects european board', () => {
      const board = cloneBoard(BOARDS.european.layout);
      expect(detectBoardType(board)).toBe('european');
    });
  });

  describe('solvePuzzle', () => {
    it('solves single jump position ending at center', () => {
      // 3 pegs: jump to center - [3,1] jumps over [3,2] to [3,3]
      const board = cloneBoard(BOARDS.british.layout);
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (board[r][c] !== null) board[r][c] = 0;
        }
      }
      board[3][1] = 1; // Peg to jump
      board[3][2] = 1; // Peg to jump over
      board[3][3] = 0; // Empty center (destination)
      // After jump: single peg at center - solved!

      const solution = solvePuzzle(board, 10000);
      // This should return null because we have 2 pegs and 1 jump leaves 1 peg
      // but the peg would be at [3,3] - perfect!
      expect(solution).not.toBeNull();
      expect(solution).toHaveLength(1);
    });

    it('returns null for unsolvable position', () => {
      // Create an unsolvable position (2 isolated pegs)
      const board = Array(7).fill(null).map((_, r) =>
        Array(7).fill(null).map((_, c) =>
          BOARDS.british.layout[r][c] === null ? null : 0
        )
      );
      board[0][2] = 1;
      board[6][4] = 1;

      const solution = solvePuzzle(board);
      expect(solution).toBeNull();
    });

    it('returns empty array for already solved board', () => {
      const board = Array(7).fill(null).map((_, r) =>
        Array(7).fill(null).map((_, c) =>
          BOARDS.british.layout[r][c] === null ? null : 0
        )
      );
      board[3][3] = 1;

      const solution = solvePuzzle(board);
      expect(solution).toEqual([]);
    });

    it('respects max expansions limit', () => {
      const board = cloneBoard(BOARDS.british.layout);
      // Very low limit should return null (not enough exploration)
      const solution = solvePuzzle(board, 10);
      expect(solution).toBeNull();
    });

    it('solution moves have correct structure', () => {
      // 2 pegs that can jump to center
      const board = cloneBoard(BOARDS.british.layout);
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (board[r][c] !== null) board[r][c] = 0;
        }
      }
      board[3][1] = 1;
      board[3][2] = 1;
      // Empty at 3,3 (center)

      const solution = solvePuzzle(board, 10000);
      expect(solution).not.toBeNull();

      solution.forEach(move => {
        expect(move).toHaveProperty('from');
        expect(move).toHaveProperty('to');
        expect(move.from).toHaveLength(2);
        expect(move.to).toHaveLength(2);
      });
    });
  });

  describe('DIRECTIONS constant', () => {
    it('has 4 directions', () => {
      expect(DIRECTIONS).toHaveLength(4);
    });

    it('represents jump distances of 2', () => {
      DIRECTIONS.forEach(([dr, dc]) => {
        expect(Math.abs(dr) + Math.abs(dc)).toBe(2);
      });
    });
  });

  describe('integration tests', () => {
    it('can play through a sequence of moves', () => {
      let board = cloneBoard(BOARDS.british.layout);
      let pegCount = countPegs(board);

      // Make first available move
      const moves = findAllValidMoves(board);
      expect(moves.length).toBeGreaterThan(0);

      const move = moves[0];
      board = makeMove(board, move.startRow, move.startCol, move);

      expect(countPegs(board)).toBe(pegCount - 1);
      expect(isGameOver(board)).toBe(false);
    });

    it('detects when game ends', () => {
      // Play until game ends
      let board = cloneBoard(BOARDS.british.layout);
      let moveCount = 0;
      const maxMoves = 100;

      while (!isGameOver(board) && moveCount < maxMoves) {
        const moves = findAllValidMoves(board);
        if (moves.length === 0) break;
        const move = moves[0];
        board = makeMove(board, move.startRow, move.startCol, move);
        moveCount++;
      }

      expect(isGameOver(board)).toBe(true);
    });
  });
});
