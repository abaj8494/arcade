const express = require('express');
const router = express.Router();

// Import controllers
const gameController = require('../controllers/gameController');

// Game list endpoint
router.get('/', gameController.getGames);

// Tower of Hanoi endpoints
router.get('/towers-of-hanoi/solve', gameController.solveTowersOfHanoi);

// Hashiwokakero endpoints
router.get('/hashiwokakero/generate', gameController.generateHashiPuzzle);

// Minesweeper leaderboard endpoints
router.get('/minesweeper/leaderboard', gameController.getMinesweeperLeaderboard);
router.post('/minesweeper/leaderboard', gameController.addMinesweeperScore);

// Bubble Burst leaderboard endpoints
router.get('/bubble-burst/leaderboard', gameController.getBubbleBurstLeaderboard);
router.post('/bubble-burst/leaderboard', gameController.addBubbleBurstScore);

// Snake leaderboard endpoints
router.get('/snake/leaderboard', gameController.getSnakeLeaderboard);
router.post('/snake/leaderboard', gameController.addSnakeScore);

// Tetris leaderboard endpoints
router.get('/tetris/leaderboard', gameController.getTetrisLeaderboard);
router.post('/tetris/leaderboard', gameController.addTetrisScore);

// Other game endpoints will be added later

module.exports = router; 