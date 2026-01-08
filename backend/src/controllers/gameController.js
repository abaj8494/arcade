// Game controller with endpoints for game data and logic
const { execSync } = require('child_process');
const path = require('path');

// List of available games
const games = [
  { id: 'towers-of-hanoi', name: 'Towers of Hanoi', image: '/images/hanoi.png', implemented: true },
  { id: 'tic-tac-toe', name: 'Tic Tac Toe', image: '/images/tictactoe.svg', implemented: true },
  { id: 'connect4', name: 'Connect 4', image: '/images/connect4.png', implemented: true },
  { id: 'sudoku', name: 'Sudoku', image: '/images/sudoku.svg', implemented: true },
  { id: 'ultimate-tic-tac-toe', name: 'Ultimate Tic Tac Toe', image: '/images/uttt.svg', implemented: true },
  { id: 'banagrams-solver', name: 'Banagrams Solver', image: '/images/banagrams.svg', implemented: false },
  { id: 'chess', name: 'Chess', image: '/images/chess.svg', implemented: true },
  { id: 'tetris', name: 'Tetris', image: '/images/tetris.png', implemented: true },
  { id: 'snake', name: 'Snake', image: '/images/snake.png', implemented: true },
  { id: 'pong', name: 'Pong', image: '/images/pong.png', implemented: true },
  { id: 'hashiwokakero', name: 'Hashiwokakero', image: '/images/hashi.png', implemented: true },
  { id: 'knights-tour', name: "Knight's Tour", image: '/images/knights-tour.svg', implemented: true },
  { id: 'game-of-life', name: 'Game of Life', image: '/images/game-of-life.svg', implemented: true },
  { id: 'rock-paper-scissors', name: 'Rock Paper Scissors', image: '/images/rps.svg', implemented: true },
  { id: 'sydney-train-game', name: 'Sydney Train Game', image: '/images/train-game.svg', implemented: true },
  { id: 'peg-solitaire', name: 'Peg Solitaire', image: '/images/peg-solitaire.svg', implemented: true },
  { id: 'brick-breaker', name: 'Brick Breaker', image: '/images/brick-breaker.svg', implemented: true },
  { id: 'n-queens', name: 'N-Queens', image: '/images/n-queens.svg', implemented: true },
  { id: 'minesweeper', name: 'Minesweeper', image: '/images/minesweeper.svg', implemented: true },
  { id: 'battleships', name: 'Battleships', image: '/images/battleships.svg', implemented: true }
];

// Get all games
exports.getGames = (req, res) => {
  // Add cache-busting timestamp to image URLs
  const timestamp = Date.now();
  const gamesWithCacheBust = games.map(game => ({
    ...game,
    image: `${game.image}?v=${timestamp}`
  }));
  res.json(gamesWithCacheBust);
};

// Towers of Hanoi solver
exports.solveTowersOfHanoi = (req, res) => {
  const numDiscs = parseInt(req.query.discs) || 3;
  
  if (numDiscs < 1 || numDiscs > 10) {
    return res.status(400).json({ error: 'Number of discs must be between 1 and 10' });
  }
  
  const moves = [];
  
  // Recursive function to solve Tower of Hanoi
  const solve = (n, source, auxiliary, target) => {
    if (n === 1) {
      moves.push({ from: source, to: target });
      return;
    }
    
    solve(n - 1, source, target, auxiliary);
    moves.push({ from: source, to: target });
    solve(n - 1, auxiliary, source, target);
  };
  
  // Call solve function with the starting parameters
  solve(numDiscs, 0, 1, 2);
  
  res.json({
    numDiscs,
    totalMoves: moves.length,
    moves
  });
};

// Hashiwokakero puzzle generator
exports.generateHashiPuzzle = (req, res) => {
  const difficulty = req.query.difficulty || 'easy';

  // Map difficulty to grid size
  const sizeMap = {
    easy: 7,
    medium: 9,
    hard: 11
  };

  const size = sizeMap[difficulty] || 7;
  const bridgenPath = path.join(__dirname, '../../../references/hashiwokakero/bridgen');

  try {
    // Execute the bridgen binary to generate a puzzle
    const output = execSync(`${bridgenPath} ${size}`, {
      encoding: 'utf8',
      timeout: 5000
    });

    // Parse the output into islands
    const lines = output.trim().split('\n');
    const islands = [];

    for (let y = 0; y < lines.length; y++) {
      for (let x = 0; x < lines[y].length; x++) {
        const ch = lines[y][x];
        if (ch !== '.') {
          // Parse bridge count: 1-9 are numeric, a-c are 10-12
          let bridges;
          if (ch >= '1' && ch <= '9') {
            bridges = parseInt(ch);
          } else if (ch >= 'a' && ch <= 'c') {
            bridges = 10 + (ch.charCodeAt(0) - 'a'.charCodeAt(0));
          } else {
            continue;
          }

          islands.push({ x, y, bridges });
        }
      }
    }

    res.json({
      size: lines.length,
      islands
    });
  } catch (err) {
    console.error('Error generating Hashi puzzle:', err);
    res.status(500).json({ error: 'Failed to generate puzzle' });
  }
}; 