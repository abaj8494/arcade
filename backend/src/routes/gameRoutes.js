const express = require('express');
const router = express.Router();

// Import controllers
const gameController = require('../controllers/gameController');

// Game list endpoint
router.get('/', gameController.getGames);

// Tower of Hanoi endpoints
router.get('/towers-of-hanoi/solve', gameController.solveTowersOfHanoi);

// Other game endpoints will be added later

module.exports = router; 