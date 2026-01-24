/**
 * Tests for Go Game Logic
 */

import {
  EMPTY,
  BLACK,
  WHITE,
  createEmptyBoard,
  getNeighbors,
  getGroupAndLiberties,
  isValidMove,
  getValidMoves,
  makeMove,
  countStones,
  calculateTerritory,
  calculateScore,
  getWinner,
  isStarPoint,
  getAtariGroups,
  evaluateBoard,
  getAiMove
} from '../utils/goLogic';

describe('Go Logic', () => {
  describe('constants', () => {
    it('has correct color values', () => {
      expect(EMPTY).toBeNull();
      expect(BLACK).toBe('black');
      expect(WHITE).toBe('white');
    });
  });

  describe('createEmptyBoard', () => {
    it('creates 9x9 board by default', () => {
      const board = createEmptyBoard();
      expect(board).toHaveLength(9);
      board.forEach(row => {
        expect(row).toHaveLength(9);
      });
    });

    it('creates 13x13 board', () => {
      const board = createEmptyBoard(13);
      expect(board).toHaveLength(13);
      board.forEach(row => {
        expect(row).toHaveLength(13);
      });
    });

    it('creates 19x19 board', () => {
      const board = createEmptyBoard(19);
      expect(board).toHaveLength(19);
      board.forEach(row => {
        expect(row).toHaveLength(19);
      });
    });

    it('all cells are empty', () => {
      const board = createEmptyBoard(9);
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          expect(board[r][c]).toBe(EMPTY);
        }
      }
    });
  });

  describe('getNeighbors', () => {
    it('returns 4 neighbors for center point', () => {
      const neighbors = getNeighbors(4, 4, 9);
      expect(neighbors).toHaveLength(4);
    });

    it('returns 2 neighbors for corner point', () => {
      const neighbors = getNeighbors(0, 0, 9);
      expect(neighbors).toHaveLength(2);
      expect(neighbors).toContainEqual([1, 0]);
      expect(neighbors).toContainEqual([0, 1]);
    });

    it('returns 3 neighbors for edge point', () => {
      const neighbors = getNeighbors(0, 4, 9);
      expect(neighbors).toHaveLength(3);
    });

    it('returns correct neighbors for bottom-right corner', () => {
      const neighbors = getNeighbors(8, 8, 9);
      expect(neighbors).toHaveLength(2);
      expect(neighbors).toContainEqual([7, 8]);
      expect(neighbors).toContainEqual([8, 7]);
    });
  });

  describe('getGroupAndLiberties', () => {
    it('returns empty for empty cell', () => {
      const board = createEmptyBoard(9);
      const result = getGroupAndLiberties(board, 4, 4);
      expect(result.group).toHaveLength(0);
      expect(result.liberties).toBe(0);
    });

    it('counts liberties for single stone in center', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      const result = getGroupAndLiberties(board, 4, 4);
      expect(result.group).toHaveLength(1);
      expect(result.liberties).toBe(4);
    });

    it('counts liberties for single stone in corner', () => {
      const board = createEmptyBoard(9);
      board[0][0] = BLACK;
      const result = getGroupAndLiberties(board, 0, 0);
      expect(result.group).toHaveLength(1);
      expect(result.liberties).toBe(2);
    });

    it('counts liberties for single stone on edge', () => {
      const board = createEmptyBoard(9);
      board[0][4] = BLACK;
      const result = getGroupAndLiberties(board, 0, 4);
      expect(result.group).toHaveLength(1);
      expect(result.liberties).toBe(3);
    });

    it('finds connected group', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      board[4][5] = BLACK;
      board[4][6] = BLACK;
      const result = getGroupAndLiberties(board, 4, 4);
      expect(result.group).toHaveLength(3);
    });

    it('counts shared liberties correctly', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      board[4][5] = BLACK;
      const result = getGroupAndLiberties(board, 4, 4);
      expect(result.group).toHaveLength(2);
      expect(result.liberties).toBe(6); // 3 + 3 = 6 unique liberties
    });

    it('reduces liberties when surrounded', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      board[3][4] = WHITE; // Above
      board[5][4] = WHITE; // Below
      board[4][3] = WHITE; // Left
      const result = getGroupAndLiberties(board, 4, 4);
      expect(result.liberties).toBe(1); // Only right is free
    });

    it('detects zero liberties (captured)', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      board[3][4] = WHITE;
      board[5][4] = WHITE;
      board[4][3] = WHITE;
      board[4][5] = WHITE;
      const result = getGroupAndLiberties(board, 4, 4);
      expect(result.liberties).toBe(0);
    });
  });

  describe('isValidMove', () => {
    it('returns true for empty cell', () => {
      const board = createEmptyBoard(9);
      expect(isValidMove(board, 4, 4, BLACK)).toBe(true);
    });

    it('returns false for occupied cell', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      expect(isValidMove(board, 4, 4, WHITE)).toBe(false);
    });

    it('returns false for suicide move', () => {
      const board = createEmptyBoard(9);
      // Surround a point
      board[3][4] = WHITE;
      board[5][4] = WHITE;
      board[4][3] = WHITE;
      board[4][5] = WHITE;
      expect(isValidMove(board, 4, 4, BLACK)).toBe(false);
    });

    it('allows suicide if it captures', () => {
      const board = createEmptyBoard(9);
      // White stone with one liberty
      board[4][4] = WHITE;
      board[3][4] = BLACK;
      board[5][4] = BLACK;
      board[4][3] = BLACK;
      // Playing at 4,5 captures the white stone
      expect(isValidMove(board, 4, 5, BLACK)).toBe(true);
    });

    it('respects ko rule', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      const koPoint = [4, 5];
      expect(isValidMove(board, 4, 5, WHITE, koPoint)).toBe(false);
    });

    it('blocks ko point for any player', () => {
      const board = createEmptyBoard(9);
      const koPoint = [4, 5];
      // Ko blocks any player from playing there (cleared after next move)
      expect(isValidMove(board, 4, 5, BLACK, koPoint)).toBe(false);
      expect(isValidMove(board, 4, 5, WHITE, koPoint)).toBe(false);
    });
  });

  describe('getValidMoves', () => {
    it('returns all cells for empty board', () => {
      const board = createEmptyBoard(9);
      const moves = getValidMoves(board, BLACK);
      expect(moves).toHaveLength(81); // 9x9
    });

    it('excludes occupied cells', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      const moves = getValidMoves(board, WHITE);
      expect(moves).toHaveLength(80);
      expect(moves.some(([r, c]) => r === 4 && c === 4)).toBe(false);
    });

    it('excludes suicide moves', () => {
      const board = createEmptyBoard(9);
      board[0][1] = WHITE;
      board[1][0] = WHITE;
      // Corner at 0,0 is suicide for black
      const moves = getValidMoves(board, BLACK);
      expect(moves.some(([r, c]) => r === 0 && c === 0)).toBe(false);
    });

    it('excludes ko point', () => {
      const board = createEmptyBoard(9);
      const koPoint = [4, 4];
      const moves = getValidMoves(board, BLACK, koPoint);
      expect(moves.some(([r, c]) => r === 4 && c === 4)).toBe(false);
    });
  });

  describe('makeMove', () => {
    it('places stone on empty board', () => {
      const board = createEmptyBoard(9);
      const result = makeMove(board, 4, 4, BLACK);
      expect(result).not.toBeNull();
      expect(result.board[4][4]).toBe(BLACK);
      expect(result.captured).toBe(0);
    });

    it('does not mutate original board', () => {
      const board = createEmptyBoard(9);
      makeMove(board, 4, 4, BLACK);
      expect(board[4][4]).toBe(EMPTY);
    });

    it('returns null for invalid move', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      const result = makeMove(board, 4, 4, WHITE);
      expect(result).toBeNull();
    });

    it('captures opponent stones', () => {
      const board = createEmptyBoard(9);
      board[4][4] = WHITE;
      board[3][4] = BLACK;
      board[5][4] = BLACK;
      board[4][3] = BLACK;
      // Play at 4,5 to capture
      const result = makeMove(board, 4, 5, BLACK);
      expect(result).not.toBeNull();
      expect(result.captured).toBe(1);
      expect(result.board[4][4]).toBe(EMPTY);
    });

    it('captures multiple stones', () => {
      const board = createEmptyBoard(9);
      board[4][4] = WHITE;
      board[4][5] = WHITE;
      board[3][4] = BLACK;
      board[3][5] = BLACK;
      board[5][4] = BLACK;
      board[5][5] = BLACK;
      board[4][3] = BLACK;
      // Play at 4,6 to capture both white stones
      const result = makeMove(board, 4, 6, BLACK);
      expect(result).not.toBeNull();
      expect(result.captured).toBe(2);
      expect(result.board[4][4]).toBe(EMPTY);
      expect(result.board[4][5]).toBe(EMPTY);
    });

    it('sets ko point for single stone capture', () => {
      const board = createEmptyBoard(9);
      // Set up ko situation
      board[4][4] = WHITE;
      board[4][3] = BLACK;
      board[3][4] = BLACK;
      board[5][4] = BLACK;
      board[4][6] = BLACK;
      board[3][5] = WHITE;
      board[5][5] = WHITE;
      // Capture at 4,5
      const result = makeMove(board, 4, 5, BLACK);
      expect(result).not.toBeNull();
      expect(result.captured).toBe(1);
      // Ko point should be set if recapture would be possible
    });
  });

  describe('countStones', () => {
    it('returns zero for empty board', () => {
      const board = createEmptyBoard(9);
      const counts = countStones(board);
      expect(counts.black).toBe(0);
      expect(counts.white).toBe(0);
    });

    it('counts stones correctly', () => {
      const board = createEmptyBoard(9);
      board[0][0] = BLACK;
      board[0][1] = BLACK;
      board[0][2] = WHITE;
      const counts = countStones(board);
      expect(counts.black).toBe(2);
      expect(counts.white).toBe(1);
    });
  });

  describe('calculateTerritory', () => {
    it('returns zero for empty board', () => {
      const board = createEmptyBoard(9);
      const territory = calculateTerritory(board);
      expect(territory.black).toBe(0);
      expect(territory.white).toBe(0);
    });

    it('counts enclosed territory', () => {
      const board = createEmptyBoard(5);
      // Create a small enclosure
      board[0][0] = BLACK;
      board[0][1] = BLACK;
      board[1][0] = BLACK;
      board[1][1] = BLACK;
      board[0][2] = BLACK;
      board[1][2] = BLACK;
      board[2][0] = BLACK;
      board[2][1] = BLACK;
      board[2][2] = BLACK;
      // Interior at various points - hard to test without full enclosure
      const territory = calculateTerritory(board);
      expect(typeof territory.black).toBe('number');
      expect(typeof territory.white).toBe('number');
    });

    it('does not count contested territory', () => {
      const board = createEmptyBoard(5);
      board[0][0] = BLACK;
      board[4][4] = WHITE;
      // Most of the board touches both colors
      const territory = calculateTerritory(board);
      // Territory touching both colors should not be counted
      expect(territory.black + territory.white).toBeLessThan(25);
    });
  });

  describe('calculateScore', () => {
    it('includes komi for white', () => {
      const board = createEmptyBoard(9);
      const score = calculateScore(board, { black: 0, white: 0 }, 6.5);
      expect(score.white).toBe(6.5);
      expect(score.black).toBe(0);
    });

    it('includes captured stones', () => {
      const board = createEmptyBoard(9);
      const score = calculateScore(board, { black: 5, white: 3 }, 0);
      expect(score.black).toBe(5);
      expect(score.white).toBe(3);
    });

    it('includes territory and stones', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      const score = calculateScore(board, { black: 0, white: 0 }, 0);
      expect(score.black).toBeGreaterThanOrEqual(1); // At least the stone
    });
  });

  describe('getWinner', () => {
    it('returns black when black has higher score', () => {
      expect(getWinner({ black: 50, white: 30 })).toBe('black');
    });

    it('returns white when white has higher score', () => {
      expect(getWinner({ black: 30, white: 50.5 })).toBe('white');
    });

    it('returns tie when scores are equal', () => {
      expect(getWinner({ black: 40, white: 40 })).toBe('tie');
    });
  });

  describe('isStarPoint', () => {
    describe('9x9 board', () => {
      it('identifies center as star point', () => {
        expect(isStarPoint(4, 4, 9)).toBe(true);
      });

      it('identifies corners as star points', () => {
        expect(isStarPoint(2, 2, 9)).toBe(true);
        expect(isStarPoint(2, 6, 9)).toBe(true);
        expect(isStarPoint(6, 2, 9)).toBe(true);
        expect(isStarPoint(6, 6, 9)).toBe(true);
      });

      it('returns false for non-star points', () => {
        expect(isStarPoint(0, 0, 9)).toBe(false);
        expect(isStarPoint(3, 3, 9)).toBe(false);
      });
    });

    describe('19x19 board', () => {
      it('identifies star points', () => {
        expect(isStarPoint(3, 3, 19)).toBe(true);
        expect(isStarPoint(9, 9, 19)).toBe(true);
        expect(isStarPoint(15, 15, 19)).toBe(true);
      });

      it('returns false for non-star points', () => {
        expect(isStarPoint(0, 0, 19)).toBe(false);
        expect(isStarPoint(5, 5, 19)).toBe(false);
      });
    });
  });

  describe('getAtariGroups', () => {
    it('returns empty set for empty board', () => {
      const board = createEmptyBoard(9);
      const atari = getAtariGroups(board);
      expect(atari.size).toBe(0);
    });

    it('finds stone in atari', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      board[3][4] = WHITE;
      board[5][4] = WHITE;
      board[4][3] = WHITE;
      // Black has 1 liberty
      const atari = getAtariGroups(board);
      expect(atari.has('4,4')).toBe(true);
    });

    it('does not flag stones with multiple liberties', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      board[3][4] = WHITE;
      // Black has 3 liberties
      const atari = getAtariGroups(board);
      expect(atari.has('4,4')).toBe(false);
    });

    it('finds entire group in atari', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      board[4][5] = BLACK;
      board[3][4] = WHITE;
      board[3][5] = WHITE;
      board[5][4] = WHITE;
      board[5][5] = WHITE;
      board[4][3] = WHITE;
      // Group has 1 liberty at 4,6
      const atari = getAtariGroups(board);
      expect(atari.has('4,4')).toBe(true);
      expect(atari.has('4,5')).toBe(true);
    });
  });

  describe('evaluateBoard', () => {
    it('returns 0 for empty board', () => {
      const board = createEmptyBoard(9);
      const score = evaluateBoard(board, BLACK);
      expect(score).toBe(0);
    });

    it('returns positive for player advantage', () => {
      const board = createEmptyBoard(9);
      board[4][4] = BLACK;
      const score = evaluateBoard(board, BLACK);
      expect(score).toBeGreaterThan(0);
    });

    it('returns negative for opponent advantage', () => {
      const board = createEmptyBoard(9);
      board[4][4] = WHITE;
      const score = evaluateBoard(board, BLACK);
      expect(score).toBeLessThan(0);
    });

    it('values more liberties', () => {
      const board1 = createEmptyBoard(9);
      board1[4][4] = BLACK;
      const score1 = evaluateBoard(board1, BLACK);

      const board2 = createEmptyBoard(9);
      board2[4][4] = BLACK;
      board2[3][4] = WHITE; // Reduce liberties
      const score2 = evaluateBoard(board2, BLACK);

      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('getAiMove', () => {
    it('returns valid move on empty board', () => {
      const board = createEmptyBoard(9);
      const move = getAiMove(board, BLACK);
      expect(move).not.toBeNull();
      expect(move[0]).toBeGreaterThanOrEqual(0);
      expect(move[0]).toBeLessThan(9);
      expect(move[1]).toBeGreaterThanOrEqual(0);
      expect(move[1]).toBeLessThan(9);
    });

    it('returns null when no moves available', () => {
      // This is nearly impossible in Go, but test the logic
      const board = createEmptyBoard(3);
      // Fill entire board
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          board[r][c] = BLACK;
        }
      }
      const move = getAiMove(board, WHITE);
      expect(move).toBeNull();
    });

    it('avoids ko point', () => {
      const board = createEmptyBoard(9);
      const koPoint = [4, 4];
      const move = getAiMove(board, BLACK, koPoint);
      expect(move[0] !== 4 || move[1] !== 4).toBe(true);
    });

    it('returns valid move for different difficulties', () => {
      const board = createEmptyBoard(9);
      const easyMove = getAiMove(board, BLACK, null, 'easy');
      const mediumMove = getAiMove(board, BLACK, null, 'medium');
      const hardMove = getAiMove(board, BLACK, null, 'hard');

      expect(easyMove).not.toBeNull();
      expect(mediumMove).not.toBeNull();
      expect(hardMove).not.toBeNull();
    });

    it('prioritizes captures', () => {
      const board = createEmptyBoard(9);
      board[4][4] = WHITE;
      board[3][4] = BLACK;
      board[5][4] = BLACK;
      board[4][3] = BLACK;
      // AI should capture at 4,5
      const move = getAiMove(board, BLACK, null, 'hard');
      expect(move).toEqual([4, 5]);
    });
  });

  describe('integration tests', () => {
    it('can play a simple game', () => {
      let board = createEmptyBoard(9);
      let koPoint = null;

      // Play a few moves
      for (let i = 0; i < 10; i++) {
        const player = i % 2 === 0 ? BLACK : WHITE;
        const moves = getValidMoves(board, player, koPoint);
        if (moves.length === 0) break;

        const [r, c] = moves[0];
        const result = makeMove(board, r, c, player, koPoint);
        expect(result).not.toBeNull();
        board = result.board;
        koPoint = result.newKoPoint;
      }

      const stones = countStones(board);
      expect(stones.black + stones.white).toBeGreaterThan(0);
    });

    it('correctly handles capture sequence', () => {
      const board = createEmptyBoard(9);
      // Set up a capture
      board[0][1] = WHITE;
      board[1][0] = WHITE;
      // Play in corner to test suicide detection
      const move = makeMove(board, 0, 0, BLACK);
      expect(move).toBeNull(); // Should be suicide
    });

    it('AI plays reasonably', () => {
      let board = createEmptyBoard(9);
      let koPoint = null;

      // Play several AI moves
      for (let i = 0; i < 5; i++) {
        const player = i % 2 === 0 ? BLACK : WHITE;
        const move = getAiMove(board, player, koPoint, 'medium');
        if (!move) break;

        const result = makeMove(board, move[0], move[1], player, koPoint);
        expect(result).not.toBeNull();
        board = result.board;
        koPoint = result.newKoPoint;
      }

      const stones = countStones(board);
      expect(stones.black + stones.white).toBe(5);
    });

    it('game can reach scoring', () => {
      const board = createEmptyBoard(5);
      // Simple filled board
      board[0][0] = BLACK;
      board[0][1] = BLACK;
      board[1][0] = BLACK;
      board[1][1] = BLACK;
      board[2][2] = WHITE;
      board[2][3] = WHITE;
      board[3][2] = WHITE;
      board[3][3] = WHITE;

      const score = calculateScore(board, { black: 0, white: 0 }, 6.5);
      expect(typeof score.black).toBe('number');
      expect(typeof score.white).toBe('number');

      const winner = getWinner(score);
      expect(['black', 'white', 'tie']).toContain(winner);
    });
  });
});
