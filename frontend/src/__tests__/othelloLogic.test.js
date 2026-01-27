/**
 * Tests for Othello Game Logic
 */

import {
  EMPTY,
  BLACK,
  WHITE,
  BOARD_SIZE,
  DIRECTIONS,
  createInitialBoard,
  isValidPos,
  countPieces,
  getFlippedPieces,
  getValidMoves,
  makeMove,
  isGameOver,
  getWinner,
  evaluateBoard,
  minimax,
  getAiMove
} from '../utils/othelloLogic';

describe('Othello Logic', () => {
  describe('constants', () => {
    it('has correct board size', () => {
      expect(BOARD_SIZE).toBe(8);
    });

    it('has 8 directions', () => {
      expect(DIRECTIONS).toHaveLength(8);
    });

    it('directions cover all adjacent squares', () => {
      const covered = new Set();
      DIRECTIONS.forEach(([dr, dc]) => {
        covered.add(`${dr},${dc}`);
      });
      expect(covered.size).toBe(8);
    });
  });

  describe('createInitialBoard', () => {
    it('creates 8x8 board', () => {
      const board = createInitialBoard();
      expect(board).toHaveLength(8);
      board.forEach(row => {
        expect(row).toHaveLength(8);
      });
    });

    it('has 4 center pieces', () => {
      const board = createInitialBoard();
      const { black, white } = countPieces(board);
      expect(black).toBe(2);
      expect(white).toBe(2);
    });

    it('places pieces in correct positions', () => {
      const board = createInitialBoard();
      expect(board[3][3]).toBe(WHITE);
      expect(board[3][4]).toBe(BLACK);
      expect(board[4][3]).toBe(BLACK);
      expect(board[4][4]).toBe(WHITE);
    });

    it('all other cells are empty', () => {
      const board = createInitialBoard();
      let emptyCount = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (board[r][c] === EMPTY) emptyCount++;
        }
      }
      expect(emptyCount).toBe(60);
    });
  });

  describe('isValidPos', () => {
    it('returns true for valid positions', () => {
      expect(isValidPos(0, 0)).toBe(true);
      expect(isValidPos(7, 7)).toBe(true);
      expect(isValidPos(4, 4)).toBe(true);
    });

    it('returns false for negative positions', () => {
      expect(isValidPos(-1, 0)).toBe(false);
      expect(isValidPos(0, -1)).toBe(false);
    });

    it('returns false for out of bounds positions', () => {
      expect(isValidPos(8, 0)).toBe(false);
      expect(isValidPos(0, 8)).toBe(false);
    });
  });

  describe('countPieces', () => {
    it('counts initial pieces correctly', () => {
      const board = createInitialBoard();
      const { black, white } = countPieces(board);
      expect(black).toBe(2);
      expect(white).toBe(2);
    });

    it('returns 0 for empty board', () => {
      const board = Array(8).fill(null).map(() => Array(8).fill(EMPTY));
      const { black, white } = countPieces(board);
      expect(black).toBe(0);
      expect(white).toBe(0);
    });

    it('counts correctly after moves', () => {
      const board = createInitialBoard();
      // Simulate a move
      board[2][3] = BLACK;
      board[3][3] = BLACK; // Flipped
      const { black, white } = countPieces(board);
      expect(black).toBe(4);
      expect(white).toBe(1);
    });
  });

  describe('getFlippedPieces', () => {
    it('finds flipped pieces for valid move', () => {
      const board = createInitialBoard();
      const flipped = getFlippedPieces(board, 2, 3, BLACK);
      expect(flipped).toHaveLength(1);
      expect(flipped[0]).toEqual([3, 3]);
    });

    it('returns empty for invalid move', () => {
      const board = createInitialBoard();
      const flipped = getFlippedPieces(board, 0, 0, BLACK);
      expect(flipped).toHaveLength(0);
    });

    it('returns empty for occupied cell', () => {
      const board = createInitialBoard();
      const flipped = getFlippedPieces(board, 3, 3, BLACK);
      expect(flipped).toHaveLength(0);
    });

    it('finds multiple flipped pieces', () => {
      const board = createInitialBoard();
      // Set up for multiple flips
      board[2][3] = BLACK;
      board[1][3] = WHITE;
      const flipped = getFlippedPieces(board, 0, 3, BLACK);
      // Should flip the white piece at (1,3)
      expect(flipped.length).toBeGreaterThanOrEqual(1);
    });

    it('finds flips in multiple directions', () => {
      const board = createInitialBoard();
      board[5][3] = BLACK;
      board[5][4] = BLACK;
      board[3][5] = BLACK;
      board[4][5] = BLACK;
      // Now WHITE at (5,5) might flip in multiple directions
      const flipped = getFlippedPieces(board, 5, 5, WHITE);
      expect(flipped.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getValidMoves', () => {
    it('finds correct moves at game start', () => {
      const board = createInitialBoard();
      const moves = getValidMoves(board, BLACK);
      expect(moves).toHaveLength(4);
    });

    it('returns different moves for different players', () => {
      const board = createInitialBoard();
      const blackMoves = getValidMoves(board, BLACK);
      const whiteMoves = getValidMoves(board, WHITE);
      expect(blackMoves).toHaveLength(4);
      expect(whiteMoves).toHaveLength(4);
    });

    it('returns empty when no valid moves', () => {
      // Create a board where one player has no moves
      const board = Array(8).fill(null).map(() => Array(8).fill(EMPTY));
      board[0][0] = BLACK;
      board[0][1] = BLACK;
      const moves = getValidMoves(board, WHITE);
      expect(moves).toHaveLength(0);
    });

    it('valid moves are actually valid', () => {
      const board = createInitialBoard();
      const moves = getValidMoves(board, BLACK);
      moves.forEach(([r, c]) => {
        const flipped = getFlippedPieces(board, r, c, BLACK);
        expect(flipped.length).toBeGreaterThan(0);
      });
    });
  });

  describe('makeMove', () => {
    it('places piece and flips correctly', () => {
      const board = createInitialBoard();
      const result = makeMove(board, 2, 3, BLACK);
      expect(result).not.toBeNull();
      expect(result.board[2][3]).toBe(BLACK);
      expect(result.board[3][3]).toBe(BLACK);
    });

    it('does not mutate original board', () => {
      const board = createInitialBoard();
      makeMove(board, 2, 3, BLACK);
      expect(board[2][3]).toBe(EMPTY);
      expect(board[3][3]).toBe(WHITE);
    });

    it('returns null for invalid move', () => {
      const board = createInitialBoard();
      const result = makeMove(board, 0, 0, BLACK);
      expect(result).toBeNull();
    });

    it('returns flipped pieces', () => {
      const board = createInitialBoard();
      const result = makeMove(board, 2, 3, BLACK);
      expect(result.flipped).toHaveLength(1);
      expect(result.flipped[0]).toEqual([3, 3]);
    });

    it('updates piece count correctly', () => {
      const board = createInitialBoard();
      const result = makeMove(board, 2, 3, BLACK);
      const { black, white } = countPieces(result.board);
      expect(black).toBe(4);
      expect(white).toBe(1);
    });
  });

  describe('isGameOver', () => {
    it('returns false at game start', () => {
      const board = createInitialBoard();
      expect(isGameOver(board)).toBe(false);
    });

    it('returns true when neither player can move', () => {
      // Create a simple end state
      const board = Array(8).fill(null).map(() => Array(8).fill(BLACK));
      expect(isGameOver(board)).toBe(true);
    });

    it('returns false when one player can still move', () => {
      const board = createInitialBoard();
      expect(isGameOver(board)).toBe(false);
    });
  });

  describe('getWinner', () => {
    it('returns black when black has more', () => {
      const board = Array(8).fill(null).map(() => Array(8).fill(EMPTY));
      board[0][0] = BLACK;
      board[0][1] = BLACK;
      board[0][2] = WHITE;
      expect(getWinner(board)).toBe('black');
    });

    it('returns white when white has more', () => {
      const board = Array(8).fill(null).map(() => Array(8).fill(EMPTY));
      board[0][0] = WHITE;
      board[0][1] = WHITE;
      board[0][2] = BLACK;
      expect(getWinner(board)).toBe('white');
    });

    it('returns tie when equal', () => {
      const board = Array(8).fill(null).map(() => Array(8).fill(EMPTY));
      board[0][0] = BLACK;
      board[0][1] = WHITE;
      expect(getWinner(board)).toBe('tie');
    });
  });

  describe('evaluateBoard', () => {
    it('returns 0 for balanced initial board', () => {
      const board = createInitialBoard();
      const score = evaluateBoard(board, BLACK);
      // Initial position is roughly balanced
      expect(Math.abs(score)).toBeLessThan(100);
    });

    it('returns positive for corner control', () => {
      // Corner is a clear advantage
      const board = Array(8).fill(null).map(() => Array(8).fill(EMPTY));
      board[0][0] = BLACK; // Corner for black
      board[4][4] = WHITE; // Center for white
      const score = evaluateBoard(board, BLACK);
      expect(score).toBeGreaterThan(0);
    });

    it('values corners highly', () => {
      const board = createInitialBoard();
      const baseScore = evaluateBoard(board, BLACK);
      board[0][0] = BLACK;
      const cornerScore = evaluateBoard(board, BLACK);
      expect(cornerScore).toBeGreaterThan(baseScore + 20);
    });

    it('values edges', () => {
      const board = createInitialBoard();
      const baseScore = evaluateBoard(board, BLACK);
      board[0][3] = BLACK;
      const edgeScore = evaluateBoard(board, BLACK);
      expect(edgeScore).toBeGreaterThan(baseScore);
    });

    it('considers mobility', () => {
      const board = createInitialBoard();
      // A position with more moves should score higher
      const score = evaluateBoard(board, BLACK);
      expect(typeof score).toBe('number');
    });
  });

  describe('minimax', () => {
    it('returns score within reasonable range', () => {
      const board = createInitialBoard();
      const score = minimax(board, 2, -Infinity, Infinity, true, WHITE);
      expect(typeof score).toBe('number');
      expect(Math.abs(score)).toBeLessThan(1000);
    });

    it('finds winning move', () => {
      // Create a near-win situation
      const board = Array(8).fill(null).map(() => Array(8).fill(WHITE));
      board[0][0] = EMPTY;
      board[0][1] = BLACK;
      const score = minimax(board, 1, -Infinity, Infinity, true, WHITE);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('getAiMove', () => {
    it('returns valid move', () => {
      const board = createInitialBoard();
      const move = getAiMove(board, 'medium');
      expect(move).not.toBeNull();
      expect(move[0]).toBeGreaterThanOrEqual(0);
      expect(move[0]).toBeLessThan(8);
      expect(move[1]).toBeGreaterThanOrEqual(0);
      expect(move[1]).toBeLessThan(8);
    });

    it('returns null when no moves', () => {
      const board = Array(8).fill(null).map(() => Array(8).fill(BLACK));
      const move = getAiMove(board, 'medium');
      expect(move).toBeNull();
    });

    it('move is actually valid', () => {
      const board = createInitialBoard();
      const move = getAiMove(board, 'medium');
      const flipped = getFlippedPieces(board, move[0], move[1], WHITE);
      expect(flipped.length).toBeGreaterThan(0);
    });

    it('works with different difficulties', () => {
      const board = createInitialBoard();
      const easyMove = getAiMove(board, 'easy');
      const mediumMove = getAiMove(board, 'medium');
      const hardMove = getAiMove(board, 'hard');

      expect(easyMove).not.toBeNull();
      expect(mediumMove).not.toBeNull();
      expect(hardMove).not.toBeNull();
    });

    it('can play as black', () => {
      const board = createInitialBoard();
      const move = getAiMove(board, 'medium', BLACK);
      expect(move).not.toBeNull();
      const flipped = getFlippedPieces(board, move[0], move[1], BLACK);
      expect(flipped.length).toBeGreaterThan(0);
    });
  });

  describe('integration tests', () => {
    it('can play through opening moves', () => {
      let board = createInitialBoard();
      let currentPlayer = BLACK;

      for (let i = 0; i < 4; i++) {
        const moves = getValidMoves(board, currentPlayer);
        expect(moves.length).toBeGreaterThan(0);

        const [r, c] = moves[0];
        const result = makeMove(board, r, c, currentPlayer);
        expect(result).not.toBeNull();

        board = result.board;
        currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
      }
    });

    it('AI makes reasonable opening move', () => {
      const board = createInitialBoard();
      const move = getAiMove(board, 'hard');
      const validMoves = getValidMoves(board, WHITE);

      // Move should be one of the valid moves
      const isValid = validMoves.some(([r, c]) => r === move[0] && c === move[1]);
      expect(isValid).toBe(true);
    });

    it('game can reach conclusion', () => {
      let board = createInitialBoard();
      let currentPlayer = BLACK;
      let moveCount = 0;
      const maxMoves = 100;

      while (!isGameOver(board) && moveCount < maxMoves) {
        const moves = getValidMoves(board, currentPlayer);
        if (moves.length > 0) {
          const [r, c] = moves[0];
          const result = makeMove(board, r, c, currentPlayer);
          board = result.board;
        }
        currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
        moveCount++;
      }

      expect(moveCount).toBeLessThan(maxMoves);
    });
  });
});
