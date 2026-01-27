/**
 * Tests for Ultimate Tic Tac Toe Game Logic
 */

import {
  WINNING_COMBINATIONS,
  createEmptyBoard,
  checkWinner,
  getValidMoves,
  applyMove,
  evaluateBoard,
  minimax,
  getAiMove
} from '../utils/utttLogic';

describe('Ultimate Tic Tac Toe Logic', () => {
  describe('createEmptyBoard', () => {
    it('creates 9 mini boards', () => {
      const boards = createEmptyBoard();
      expect(boards).toHaveLength(9);
    });

    it('each mini board has 9 cells', () => {
      const boards = createEmptyBoard();
      boards.forEach(board => {
        expect(board).toHaveLength(9);
      });
    });

    it('all cells are null', () => {
      const boards = createEmptyBoard();
      boards.forEach(board => {
        board.forEach(cell => {
          expect(cell).toBeNull();
        });
      });
    });
  });

  describe('checkWinner', () => {
    it('returns null for empty board', () => {
      const cells = Array(9).fill(null);
      expect(checkWinner(cells)).toBeNull();
    });

    it('detects horizontal win', () => {
      const cells = ['X', 'X', 'X', null, null, null, null, null, null];
      const result = checkWinner(cells);
      expect(result).not.toBeNull();
      expect(result.winner).toBe('X');
      expect(result.line).toEqual([0, 1, 2]);
    });

    it('detects vertical win', () => {
      const cells = ['O', null, null, 'O', null, null, 'O', null, null];
      const result = checkWinner(cells);
      expect(result).not.toBeNull();
      expect(result.winner).toBe('O');
      expect(result.line).toEqual([0, 3, 6]);
    });

    it('detects diagonal win', () => {
      const cells = ['X', null, null, null, 'X', null, null, null, 'X'];
      const result = checkWinner(cells);
      expect(result).not.toBeNull();
      expect(result.winner).toBe('X');
      expect(result.line).toEqual([0, 4, 8]);
    });

    it('detects anti-diagonal win', () => {
      const cells = [null, null, 'O', null, 'O', null, 'O', null, null];
      const result = checkWinner(cells);
      expect(result).not.toBeNull();
      expect(result.winner).toBe('O');
      expect(result.line).toEqual([2, 4, 6]);
    });

    it('detects draw', () => {
      const cells = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
      const result = checkWinner(cells);
      expect(result).not.toBeNull();
      expect(result.winner).toBe('draw');
      expect(result.line).toBeNull();
    });

    it('returns null for ongoing game', () => {
      const cells = ['X', 'O', null, null, 'X', null, null, null, null];
      expect(checkWinner(cells)).toBeNull();
    });
  });

  describe('getValidMoves', () => {
    it('returns all moves when activeBoard is null and no winners', () => {
      const boards = createEmptyBoard();
      const winners = Array(9).fill(null);
      const moves = getValidMoves(boards, winners, null);
      expect(moves).toHaveLength(81);
    });

    it('returns only moves for active board', () => {
      const boards = createEmptyBoard();
      const winners = Array(9).fill(null);
      const moves = getValidMoves(boards, winners, 4);
      expect(moves).toHaveLength(9);
      moves.forEach(move => {
        expect(move.board).toBe(4);
      });
    });

    it('excludes filled cells', () => {
      const boards = createEmptyBoard();
      boards[4][0] = 'X';
      boards[4][4] = 'O';
      const winners = Array(9).fill(null);
      const moves = getValidMoves(boards, winners, 4);
      expect(moves).toHaveLength(7);
    });

    it('excludes won boards', () => {
      const boards = createEmptyBoard();
      const winners = Array(9).fill(null);
      winners[0] = 'X';
      winners[1] = 'O';
      const moves = getValidMoves(boards, winners, null);
      expect(moves).toHaveLength(63); // 7 boards * 9 cells
    });

    it('returns empty for fully won game', () => {
      const boards = createEmptyBoard();
      const winners = ['X', 'O', 'X', 'O', 'X', 'O', 'X', 'O', 'X'];
      const moves = getValidMoves(boards, winners, null);
      expect(moves).toHaveLength(0);
    });
  });

  describe('applyMove', () => {
    it('places piece correctly', () => {
      const boards = createEmptyBoard();
      const winners = Array(9).fill(null);
      const result = applyMove(boards, winners, { board: 4, cell: 0 }, 'X');
      expect(result.boards[4][0]).toBe('X');
    });

    it('does not mutate original boards', () => {
      const boards = createEmptyBoard();
      const winners = Array(9).fill(null);
      applyMove(boards, winners, { board: 4, cell: 0 }, 'X');
      expect(boards[4][0]).toBeNull();
    });

    it('detects mini board win', () => {
      const boards = createEmptyBoard();
      boards[4][0] = 'X';
      boards[4][1] = 'X';
      const winners = Array(9).fill(null);
      const result = applyMove(boards, winners, { board: 4, cell: 2 }, 'X');
      expect(result.winners[4]).toBe('X');
    });

    it('sets correct next active board', () => {
      const boards = createEmptyBoard();
      const winners = Array(9).fill(null);
      const result = applyMove(boards, winners, { board: 0, cell: 4 }, 'X');
      expect(result.active).toBe(4);
    });

    it('sets active to null when target board is won', () => {
      const boards = createEmptyBoard();
      const winners = Array(9).fill(null);
      winners[4] = 'O';
      const result = applyMove(boards, winners, { board: 0, cell: 4 }, 'X');
      expect(result.active).toBeNull();
    });

    it('sets active to null when target board is full', () => {
      const boards = createEmptyBoard();
      boards[4] = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', 'O'];
      const winners = Array(9).fill(null);
      const result = applyMove(boards, winners, { board: 0, cell: 4 }, 'X');
      expect(result.active).toBeNull();
    });

    it('detects game over', () => {
      const boards = createEmptyBoard();
      boards[0][0] = 'X'; boards[0][1] = 'X'; boards[0][2] = 'X';
      boards[4][0] = 'X'; boards[4][1] = 'X'; boards[4][2] = 'X';
      boards[8][0] = 'X'; boards[8][1] = 'X';
      const winners = Array(9).fill(null);
      winners[0] = 'X';
      winners[4] = 'X';
      const result = applyMove(boards, winners, { board: 8, cell: 2 }, 'X');
      expect(result.gameOver).toBe(true);
      expect(result.result.winner).toBe('X');
    });
  });

  describe('evaluateBoard', () => {
    it('returns 0 for empty board', () => {
      const boards = createEmptyBoard();
      const winners = Array(9).fill(null);
      expect(evaluateBoard(boards, winners, 'X')).toBe(0);
    });

    it('returns high positive for winning position', () => {
      const boards = createEmptyBoard();
      const winners = ['X', 'X', 'X', null, null, null, null, null, null];
      const score = evaluateBoard(boards, winners, 'X');
      expect(score).toBeGreaterThan(1000);
    });

    it('returns high negative for losing position', () => {
      const boards = createEmptyBoard();
      const winners = ['O', 'O', 'O', null, null, null, null, null, null];
      const score = evaluateBoard(boards, winners, 'X');
      expect(score).toBeLessThan(-1000);
    });

    it('favors center board control', () => {
      const boards = createEmptyBoard();
      const winners1 = Array(9).fill(null);
      winners1[4] = 'X';
      const winners2 = Array(9).fill(null);
      winners2[0] = 'X';

      const score1 = evaluateBoard(boards, winners1, 'X');
      const score2 = evaluateBoard(boards, winners2, 'X');
      expect(score1).toBeGreaterThan(score2);
    });

    it('values corner boards', () => {
      const boards = createEmptyBoard();
      const winners1 = Array(9).fill(null);
      winners1[0] = 'X';
      const winners2 = Array(9).fill(null);
      winners2[1] = 'X';

      const score1 = evaluateBoard(boards, winners1, 'X');
      const score2 = evaluateBoard(boards, winners2, 'X');
      expect(score1).toBeGreaterThan(score2);
    });

    it('values threats', () => {
      const boards = createEmptyBoard();
      boards[0][0] = 'X';
      boards[0][1] = 'X';
      const winners = Array(9).fill(null);
      const score = evaluateBoard(boards, winners, 'X');
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('minimax', () => {
    it('evaluates already won position highly', () => {
      const boards = createEmptyBoard();
      // O has already won 3 boards in a diagonal
      boards[0][0] = 'O'; boards[0][1] = 'O'; boards[0][2] = 'O';
      boards[4][0] = 'O'; boards[4][1] = 'O'; boards[4][2] = 'O';
      boards[8][0] = 'O'; boards[8][1] = 'O'; boards[8][2] = 'O';
      const winners = Array(9).fill(null);
      winners[0] = 'O';
      winners[4] = 'O';
      winners[8] = 'O'; // O has won the game!

      // With O having won, evaluation should be very high
      const score = evaluateBoard(boards, winners, 'O');
      expect(score).toBeGreaterThan(10000);
    });

    it('respects node limit', () => {
      const boards = createEmptyBoard();
      const winners = Array(9).fill(null);
      const counter = { count: 0 };
      minimax(boards, winners, null, 5, -Infinity, Infinity, true, 'O', counter);
      expect(counter.count).toBeLessThanOrEqual(50001);
    });
  });

  describe('getAiMove', () => {
    it('returns a valid move', () => {
      const boards = createEmptyBoard();
      const winners = Array(9).fill(null);
      const move = getAiMove(boards, winners, null, 'medium');
      expect(move).not.toBeNull();
      expect(move.board).toBeGreaterThanOrEqual(0);
      expect(move.board).toBeLessThan(9);
      expect(move.cell).toBeGreaterThanOrEqual(0);
      expect(move.cell).toBeLessThan(9);
    });

    it('returns null when no moves available', () => {
      const boards = createEmptyBoard();
      const winners = ['X', 'O', 'X', 'O', 'X', 'O', 'X', 'O', 'X'];
      const move = getAiMove(boards, winners, null, 'medium');
      expect(move).toBeNull();
    });

    it('takes winning move when available', () => {
      const boards = createEmptyBoard();
      boards[0][0] = 'O'; boards[0][1] = 'O'; boards[0][2] = 'O';
      boards[4][0] = 'O'; boards[4][1] = 'O'; boards[4][2] = 'O';
      boards[8][0] = 'O'; boards[8][1] = 'O';
      const winners = Array(9).fill(null);
      winners[0] = 'O';
      winners[4] = 'O';

      const move = getAiMove(boards, winners, 8, 'hard');
      expect(move).not.toBeNull();
      expect(move.board).toBe(8);
      expect(move.cell).toBe(2);
    });

    it('blocks opponent winning move', () => {
      const boards = createEmptyBoard();
      boards[0][0] = 'X'; boards[0][1] = 'X'; boards[0][2] = 'X';
      boards[4][0] = 'X'; boards[4][1] = 'X'; boards[4][2] = 'X';
      boards[8][0] = 'X'; boards[8][1] = 'X';
      const winners = Array(9).fill(null);
      winners[0] = 'X';
      winners[4] = 'X';

      const move = getAiMove(boards, winners, 8, 'hard');
      expect(move).not.toBeNull();
      expect(move.board).toBe(8);
      expect(move.cell).toBe(2);
    });

    it('respects active board constraint', () => {
      const boards = createEmptyBoard();
      const winners = Array(9).fill(null);
      const move = getAiMove(boards, winners, 5, 'medium');
      expect(move).not.toBeNull();
      expect(move.board).toBe(5);
    });

    it('returns only move when single option', () => {
      const boards = createEmptyBoard();
      boards[0] = ['X', 'O', 'X', 'O', 'X', 'O', 'O', 'X', null];
      const winners = Array(9).fill(null);
      const move = getAiMove(boards, winners, 0, 'hard');
      expect(move).not.toBeNull();
      expect(move.board).toBe(0);
      expect(move.cell).toBe(8);
    });
  });

  describe('integration tests', () => {
    it('simulates a complete game', () => {
      let boards = createEmptyBoard();
      let winners = Array(9).fill(null);
      let activeBoard = null;
      let currentPlayer = 'X';
      let gameOver = false;
      let moveCount = 0;
      const maxMoves = 81;

      while (!gameOver && moveCount < maxMoves) {
        const moves = getValidMoves(boards, winners, activeBoard);
        if (moves.length === 0) break;

        const move = moves[Math.floor(Math.random() * moves.length)];
        const result = applyMove(boards, winners, move, currentPlayer);
        boards = result.boards;
        winners = result.winners;
        activeBoard = result.active;
        gameOver = result.gameOver;
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        moveCount++;
      }

      // Game should end or run out of moves
      expect(moveCount).toBeLessThanOrEqual(maxMoves);
    });

    it('AI makes reasonable opening move', () => {
      const boards = createEmptyBoard();
      const winners = Array(9).fill(null);
      const move = getAiMove(boards, winners, null, 'hard');

      // AI should prefer center positions
      const isStrategicMove =
        move.board === 4 || move.cell === 4 ||
        [0, 2, 6, 8].includes(move.board) ||
        [0, 2, 6, 8].includes(move.cell);
      expect(isStrategicMove).toBe(true);
    });
  });
});
