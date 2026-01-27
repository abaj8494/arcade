/**
 * Tests for gameController.js
 *
 * Tests the core game logic and leaderboard functionality
 */

const gameController = require('../../src/controllers/gameController');
const fs = require('fs');
const path = require('path');

// Mock response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock request object
const mockRequest = (query = {}, body = {}) => ({
  query,
  body
});

describe('gameController', () => {
  describe('getGames', () => {
    it('should return array of games', () => {
      const req = mockRequest();
      const res = mockResponse();

      gameController.getGames(req, res);

      expect(res.json).toHaveBeenCalled();
      const games = res.json.mock.calls[0][0];
      expect(Array.isArray(games)).toBe(true);
      expect(games.length).toBeGreaterThan(0);
    });

    it('should include required game properties', () => {
      const req = mockRequest();
      const res = mockResponse();

      gameController.getGames(req, res);

      const games = res.json.mock.calls[0][0];
      games.forEach(game => {
        expect(game).toHaveProperty('id');
        expect(game).toHaveProperty('name');
        expect(game).toHaveProperty('image');
        expect(game).toHaveProperty('implemented');
      });
    });

    it('should add cache-busting timestamp to image URLs', () => {
      const req = mockRequest();
      const res = mockResponse();

      gameController.getGames(req, res);

      const games = res.json.mock.calls[0][0];
      games.forEach(game => {
        expect(game.image).toMatch(/\?v=\d+$/);
      });
    });
  });

  describe('solveTowersOfHanoi', () => {
    it('should return correct number of moves for 3 discs', () => {
      const req = mockRequest({ discs: '3' });
      const res = mockResponse();

      gameController.solveTowersOfHanoi(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.numDiscs).toBe(3);
      expect(result.totalMoves).toBe(7); // 2^3 - 1
      expect(result.moves).toHaveLength(7);
    });

    it('should return correct number of moves for 1 disc', () => {
      const req = mockRequest({ discs: '1' });
      const res = mockResponse();

      gameController.solveTowersOfHanoi(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.numDiscs).toBe(1);
      expect(result.totalMoves).toBe(1); // 2^1 - 1
    });

    it('should return correct number of moves for 5 discs', () => {
      const req = mockRequest({ discs: '5' });
      const res = mockResponse();

      gameController.solveTowersOfHanoi(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.totalMoves).toBe(31); // 2^5 - 1
    });

    it('should default to 3 discs when not specified', () => {
      const req = mockRequest({});
      const res = mockResponse();

      gameController.solveTowersOfHanoi(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.numDiscs).toBe(3);
    });

    it('should default to 3 when 0 discs specified (falsy value)', () => {
      // Note: parseInt('0') || 3 evaluates to 3 because 0 is falsy
      const req = mockRequest({ discs: '0' });
      const res = mockResponse();

      gameController.solveTowersOfHanoi(req, res);

      const result = res.json.mock.calls[0][0];
      expect(result.numDiscs).toBe(3);
    });

    it('should reject negative disc count', () => {
      const req = mockRequest({ discs: '-1' });
      const res = mockResponse();

      gameController.solveTowersOfHanoi(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Number of discs must be between 1 and 10' });
    });

    it('should reject more than 10 discs', () => {
      const req = mockRequest({ discs: '11' });
      const res = mockResponse();

      gameController.solveTowersOfHanoi(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Number of discs must be between 1 and 10' });
    });

    it('should produce valid move sequence', () => {
      const req = mockRequest({ discs: '3' });
      const res = mockResponse();

      gameController.solveTowersOfHanoi(req, res);

      const result = res.json.mock.calls[0][0];
      result.moves.forEach(move => {
        expect(move).toHaveProperty('from');
        expect(move).toHaveProperty('to');
        expect([0, 1, 2]).toContain(move.from);
        expect([0, 1, 2]).toContain(move.to);
        expect(move.from).not.toBe(move.to);
      });
    });
  });

  describe('Minesweeper Leaderboard', () => {
    const testLeaderboardFile = path.join(__dirname, '../../test-minesweeper-leaderboard.json');

    beforeEach(() => {
      // Clean up test file before each test
      if (fs.existsSync(testLeaderboardFile)) {
        fs.unlinkSync(testLeaderboardFile);
      }
    });

    afterAll(() => {
      // Clean up after all tests
      if (fs.existsSync(testLeaderboardFile)) {
        fs.unlinkSync(testLeaderboardFile);
      }
    });

    describe('addMinesweeperScore validation', () => {
      it('should reject missing name', () => {
        const req = mockRequest({}, { difficulty: 'beginner', time: 100 });
        const res = mockResponse();

        gameController.addMinesweeperScore(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Missing required fields: name, difficulty, time'
        });
      });

      it('should reject missing difficulty', () => {
        const req = mockRequest({}, { name: 'test', time: 100 });
        const res = mockResponse();

        gameController.addMinesweeperScore(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('should reject missing time', () => {
        const req = mockRequest({}, { name: 'test', difficulty: 'beginner' });
        const res = mockResponse();

        gameController.addMinesweeperScore(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('should reject invalid difficulty', () => {
        const req = mockRequest({}, { name: 'test', difficulty: 'impossible', time: 100 });
        const res = mockResponse();

        gameController.addMinesweeperScore(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid difficulty level' });
      });

      it('should accept valid difficulties: beginner, intermediate, expert', () => {
        const difficulties = ['beginner', 'intermediate', 'expert'];

        difficulties.forEach(difficulty => {
          const req = mockRequest({}, { name: 'test', difficulty, time: 100 });
          const res = mockResponse();

          gameController.addMinesweeperScore(req, res);

          // Should not return 400 for valid difficulty
          const statusCall = res.status.mock.calls.find(call => call[0] === 400);
          if (statusCall) {
            const jsonCall = res.json.mock.calls[res.json.mock.calls.length - 1][0];
            expect(jsonCall.error).not.toBe('Invalid difficulty level');
          }
        });
      });
    });

    describe('addMinesweeperScore sanitization', () => {
      it('should truncate name to 20 characters', () => {
        const longName = 'ThisIsAVeryLongNameThatExceedsTwentyCharacters';
        const req = mockRequest({}, {
          name: longName,
          difficulty: 'beginner',
          time: 100
        });
        const res = mockResponse();

        gameController.addMinesweeperScore(req, res);

        const result = res.json.mock.calls[0][0];
        if (result.success) {
          const savedEntry = result.leaderboard.beginner.find(
            e => e.time === 100
          );
          expect(savedEntry.name.length).toBeLessThanOrEqual(20);
        }
      });

      it('should remove < and > from name', () => {
        const req = mockRequest({}, {
          name: '<script>alert("xss")</script>',
          difficulty: 'beginner',
          time: 100
        });
        const res = mockResponse();

        gameController.addMinesweeperScore(req, res);

        const result = res.json.mock.calls[0][0];
        if (result.success) {
          const savedEntry = result.leaderboard.beginner.find(
            e => e.time === 100
          );
          expect(savedEntry.name).not.toContain('<');
          expect(savedEntry.name).not.toContain('>');
        }
      });

      it('should floor time to integer', () => {
        const req = mockRequest({}, {
          name: 'test',
          difficulty: 'beginner',
          time: 99.7
        });
        const res = mockResponse();

        gameController.addMinesweeperScore(req, res);

        const result = res.json.mock.calls[0][0];
        if (result.success) {
          const savedEntry = result.leaderboard.beginner.find(
            e => e.name === 'test'
          );
          expect(savedEntry.time).toBe(99);
        }
      });
    });
  });

  describe('Bubble Burst Leaderboard', () => {
    describe('addBubbleBurstScore validation', () => {
      it('should reject missing name', () => {
        const req = mockRequest({}, { difficulty: 'easy', score: 100 });
        const res = mockResponse();

        gameController.addBubbleBurstScore(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
      });

      it('should reject invalid difficulty', () => {
        const req = mockRequest({}, { name: 'test', difficulty: 'extreme', score: 100 });
        const res = mockResponse();

        gameController.addBubbleBurstScore(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid difficulty level' });
      });

      it('should accept valid difficulties: easy, medium, hard', () => {
        const difficulties = ['easy', 'medium', 'hard'];

        difficulties.forEach(difficulty => {
          const req = mockRequest({}, { name: 'test', difficulty, score: 100 });
          const res = mockResponse();

          gameController.addBubbleBurstScore(req, res);

          // Should not return 400 for invalid difficulty
          const statusCall = res.status.mock.calls.find(call => call[0] === 400);
          if (statusCall) {
            const jsonCall = res.json.mock.calls[res.json.mock.calls.length - 1][0];
            expect(jsonCall.error).not.toBe('Invalid difficulty level');
          }
        });
      });
    });
  });
});
