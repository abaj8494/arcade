/**
 * Integration tests for game routes
 *
 * Uses supertest to test actual HTTP requests
 */

const request = require('supertest');
const app = require('../../src/app');

describe('Game Routes', () => {
  describe('GET /api/games', () => {
    it('should return 200 and array of games', async () => {
      const response = await request(app)
        .get('/api/games')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should include known games', async () => {
      const response = await request(app)
        .get('/api/games')
        .expect(200);

      const gameIds = response.body.map(g => g.id);
      expect(gameIds).toContain('chess');
      expect(gameIds).toContain('connect4');
      expect(gameIds).toContain('minesweeper');
      expect(gameIds).toContain('othello');
      expect(gameIds).toContain('bubble-burst');
    });
  });

  describe('GET /api/games/towers-of-hanoi/solve', () => {
    it('should return solution for default 3 discs', async () => {
      const response = await request(app)
        .get('/api/games/towers-of-hanoi/solve')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.numDiscs).toBe(3);
      expect(response.body.totalMoves).toBe(7);
      expect(response.body.moves).toHaveLength(7);
    });

    it('should return solution for specified disc count', async () => {
      const response = await request(app)
        .get('/api/games/towers-of-hanoi/solve?discs=4')
        .expect(200);

      expect(response.body.numDiscs).toBe(4);
      expect(response.body.totalMoves).toBe(15); // 2^4 - 1
    });

    it('should reject invalid disc count', async () => {
      const response = await request(app)
        .get('/api/games/towers-of-hanoi/solve?discs=15')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/games/minesweeper/leaderboard', () => {
    it('should return leaderboard object with difficulty levels', async () => {
      const response = await request(app)
        .get('/api/games/minesweeper/leaderboard')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('beginner');
      expect(response.body).toHaveProperty('intermediate');
      expect(response.body).toHaveProperty('expert');
      expect(Array.isArray(response.body.beginner)).toBe(true);
    });
  });

  describe('POST /api/games/minesweeper/leaderboard', () => {
    it('should accept valid score submission', async () => {
      const response = await request(app)
        .post('/api/games/minesweeper/leaderboard')
        .send({
          name: 'TestPlayer',
          difficulty: 'beginner',
          time: 999
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.leaderboard).toBeDefined();
    });

    it('should reject missing fields', async () => {
      const response = await request(app)
        .post('/api/games/minesweeper/leaderboard')
        .send({ name: 'Test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid difficulty', async () => {
      const response = await request(app)
        .post('/api/games/minesweeper/leaderboard')
        .send({
          name: 'Test',
          difficulty: 'nightmare',
          time: 100
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid difficulty');
    });
  });

  describe('GET /api/games/bubble-burst/leaderboard', () => {
    it('should return leaderboard object with difficulty levels', async () => {
      const response = await request(app)
        .get('/api/games/bubble-burst/leaderboard')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('easy');
      expect(response.body).toHaveProperty('medium');
      expect(response.body).toHaveProperty('hard');
    });
  });

  describe('POST /api/games/bubble-burst/leaderboard', () => {
    it('should accept valid score submission', async () => {
      const response = await request(app)
        .post('/api/games/bubble-burst/leaderboard')
        .send({
          name: 'TestPlayer',
          difficulty: 'medium',
          score: 500
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid difficulty', async () => {
      const response = await request(app)
        .post('/api/games/bubble-burst/leaderboard')
        .send({
          name: 'Test',
          difficulty: 'extreme',
          score: 100
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid difficulty');
    });
  });
});
