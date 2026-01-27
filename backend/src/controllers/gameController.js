// Game controller with endpoints for game data and logic
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Persistent storage path for leaderboards
const LEADERBOARD_FILE = path.join(__dirname, '../../../data/minesweeper-leaderboard.json');
const BUBBLE_BURST_LEADERBOARD_FILE = path.join(__dirname, '../../../data/bubble-burst-leaderboard.json');
const SNAKE_LEADERBOARD_FILE = path.join(__dirname, '../../../data/snake-leaderboard.json');
const TETRIS_LEADERBOARD_FILE = path.join(__dirname, '../../../data/tetris-leaderboard.json');

// List of available games (alphabetically sorted)
const games = [
  { id: 'battleships', name: 'Battleships', image: '/images/battleships.svg', implemented: true },
  { id: 'brick-breaker', name: 'Brick Breaker', image: '/images/brick-breaker.svg', implemented: true },
  { id: 'bubble-burst', name: 'Bubble Burst', image: '/images/bubble-burst.svg', implemented: true },
  { id: 'chess', name: 'Chess', image: '/images/chess.svg', implemented: true },
  { id: 'connect4', name: 'Connect 4', image: '/images/connect4.png', implemented: true },
  { id: 'game-of-life', name: 'Game of Life', image: '/images/game-of-life.svg', implemented: true },
  { id: 'go', name: 'Go', image: '/images/go.svg', implemented: true },
  { id: 'hashiwokakero', name: 'Hashiwokakero', image: '/images/hashi.png', implemented: true },
  { id: 'knights-tour', name: "Knight's Tour", image: '/images/knights-tour.svg', implemented: true },
  { id: 'minesweeper', name: 'Minesweeper', image: '/images/minesweeper.svg', implemented: true },
  { id: 'n-queens', name: 'N-Queens', image: '/images/n-queens.svg', implemented: true },
  { id: 'othello', name: 'Othello', image: '/images/othello.svg', implemented: true },
  { id: 'peg-solitaire', name: 'Peg Solitaire', image: '/images/peg-solitaire.svg', implemented: true },
  { id: 'pong', name: 'Pong', image: '/images/pong.png', implemented: true },
  { id: 'rock-paper-scissors', name: 'Rock Paper Scissors', image: '/images/rps.svg', implemented: true },
  { id: 'snake', name: 'Snake', image: '/images/snake.png', implemented: true },
  { id: 'sudoku', name: 'Sudoku', image: '/images/sudoku.svg', implemented: true },
  { id: 'sydney-train-game', name: 'Sydney Train Game', image: '/images/train-game.svg', implemented: true },
  { id: 'tetris', name: 'Tetris', image: '/images/tetris.png', implemented: true },
  { id: 'tic-tac-toe', name: 'Tic Tac Toe', image: '/images/tictactoe.svg', implemented: true },
  { id: 'towers-of-hanoi', name: 'Towers of Hanoi', image: '/images/hanoi.png', implemented: true },
  { id: 'ultimate-tic-tac-toe', name: 'Ultimate Tic Tac Toe', image: '/images/uttt.svg', implemented: true },
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

// Helper to ensure data directory and leaderboard file exist
const ensureLeaderboardFile = () => {
  const dataDir = path.dirname(LEADERBOARD_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(LEADERBOARD_FILE)) {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify({
      beginner: [],
      intermediate: [],
      expert: []
    }, null, 2));
  }
};

// Get Minesweeper leaderboard
exports.getMinesweeperLeaderboard = (req, res) => {
  try {
    ensureLeaderboardFile();
    const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error('Error reading leaderboard:', err);
    res.status(500).json({ error: 'Failed to read leaderboard' });
  }
};

// Add score to Minesweeper leaderboard
exports.addMinesweeperScore = (req, res) => {
  try {
    const { name, difficulty, time } = req.body;

    // Validate input
    if (!name || !difficulty || typeof time !== 'number') {
      return res.status(400).json({ error: 'Missing required fields: name, difficulty, time' });
    }

    if (!['beginner', 'intermediate', 'expert'].includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty level' });
    }

    // Sanitize name (limit length, remove special chars)
    const sanitizedName = name.slice(0, 20).replace(/[<>]/g, '');

    ensureLeaderboardFile();
    const data = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));

    // Add new score
    data[difficulty].push({
      name: sanitizedName,
      time: Math.floor(time),
      date: new Date().toISOString()
    });

    // Sort by time (ascending) and keep top 10
    data[difficulty].sort((a, b) => a.time - b.time);
    data[difficulty] = data[difficulty].slice(0, 10);

    // Write back to file
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2));

    // Return the rank (1-indexed, or null if not in top 10)
    const rank = data[difficulty].findIndex(s => s.name === sanitizedName && s.time === Math.floor(time));

    res.json({
      success: true,
      rank: rank !== -1 ? rank + 1 : null,
      leaderboard: data
    });
  } catch (err) {
    console.error('Error adding score:', err);
    res.status(500).json({ error: 'Failed to add score' });
  }
};

// Helper to ensure Bubble Burst leaderboard file exists
const ensureBubbleBurstLeaderboardFile = () => {
  const dataDir = path.dirname(BUBBLE_BURST_LEADERBOARD_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(BUBBLE_BURST_LEADERBOARD_FILE)) {
    fs.writeFileSync(BUBBLE_BURST_LEADERBOARD_FILE, JSON.stringify({
      easy: [],
      medium: [],
      hard: []
    }, null, 2));
  }
};

// Get Bubble Burst leaderboard
exports.getBubbleBurstLeaderboard = (req, res) => {
  try {
    ensureBubbleBurstLeaderboardFile();
    const data = fs.readFileSync(BUBBLE_BURST_LEADERBOARD_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error('Error reading Bubble Burst leaderboard:', err);
    res.status(500).json({ error: 'Failed to read leaderboard' });
  }
};

// Add score to Bubble Burst leaderboard
exports.addBubbleBurstScore = (req, res) => {
  try {
    const { name, difficulty, score } = req.body;

    // Validate input
    if (!name || !difficulty || typeof score !== 'number') {
      return res.status(400).json({ error: 'Missing required fields: name, difficulty, score' });
    }

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty level' });
    }

    // Sanitize name
    const sanitizedName = name.slice(0, 20).replace(/[<>]/g, '');

    ensureBubbleBurstLeaderboardFile();
    const data = JSON.parse(fs.readFileSync(BUBBLE_BURST_LEADERBOARD_FILE, 'utf8'));

    // Add new score
    data[difficulty].push({
      name: sanitizedName,
      score: Math.floor(score),
      date: new Date().toISOString()
    });

    // Sort by score (descending) and keep top 10
    data[difficulty].sort((a, b) => b.score - a.score);
    data[difficulty] = data[difficulty].slice(0, 10);

    // Write back to file
    fs.writeFileSync(BUBBLE_BURST_LEADERBOARD_FILE, JSON.stringify(data, null, 2));

    // Return the rank
    const rank = data[difficulty].findIndex(s => s.name === sanitizedName && s.score === Math.floor(score));

    res.json({
      success: true,
      rank: rank !== -1 ? rank + 1 : null,
      leaderboard: data
    });
  } catch (err) {
    console.error('Error adding Bubble Burst score:', err);
    res.status(500).json({ error: 'Failed to add score' });
  }
};

// Helper to ensure Snake leaderboard file exists
const ensureSnakeLeaderboardFile = () => {
  const dataDir = path.dirname(SNAKE_LEADERBOARD_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(SNAKE_LEADERBOARD_FILE)) {
    fs.writeFileSync(SNAKE_LEADERBOARD_FILE, JSON.stringify({
      classic: []
    }, null, 2));
  }
};

// Get Snake leaderboard
exports.getSnakeLeaderboard = (req, res) => {
  try {
    ensureSnakeLeaderboardFile();
    const data = fs.readFileSync(SNAKE_LEADERBOARD_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error('Error reading Snake leaderboard:', err);
    res.status(500).json({ error: 'Failed to read leaderboard' });
  }
};

// Add score to Snake leaderboard
exports.addSnakeScore = (req, res) => {
  try {
    const { name, difficulty, score } = req.body;

    // Validate input
    if (!name || !difficulty || typeof score !== 'number') {
      return res.status(400).json({ error: 'Missing required fields: name, difficulty, score' });
    }

    if (!['classic'].includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty level' });
    }

    // Sanitize name
    const sanitizedName = name.slice(0, 20).replace(/[<>]/g, '');

    ensureSnakeLeaderboardFile();
    const data = JSON.parse(fs.readFileSync(SNAKE_LEADERBOARD_FILE, 'utf8'));

    // Add new score
    data[difficulty].push({
      name: sanitizedName,
      score: Math.floor(score),
      date: new Date().toISOString()
    });

    // Sort by score (descending) and keep top 10
    data[difficulty].sort((a, b) => b.score - a.score);
    data[difficulty] = data[difficulty].slice(0, 10);

    // Write back to file
    fs.writeFileSync(SNAKE_LEADERBOARD_FILE, JSON.stringify(data, null, 2));

    // Return the rank
    const rank = data[difficulty].findIndex(s => s.name === sanitizedName && s.score === Math.floor(score));

    res.json({
      success: true,
      rank: rank !== -1 ? rank + 1 : null,
      leaderboard: data
    });
  } catch (err) {
    console.error('Error adding Snake score:', err);
    res.status(500).json({ error: 'Failed to add score' });
  }
};

// Helper to ensure Tetris leaderboard file exists
const ensureTetrisLeaderboardFile = () => {
  const dataDir = path.dirname(TETRIS_LEADERBOARD_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(TETRIS_LEADERBOARD_FILE)) {
    fs.writeFileSync(TETRIS_LEADERBOARD_FILE, JSON.stringify({
      classic: []
    }, null, 2));
  }
};

// Get Tetris leaderboard
exports.getTetrisLeaderboard = (req, res) => {
  try {
    ensureTetrisLeaderboardFile();
    const data = fs.readFileSync(TETRIS_LEADERBOARD_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    console.error('Error reading Tetris leaderboard:', err);
    res.status(500).json({ error: 'Failed to read leaderboard' });
  }
};

// Add score to Tetris leaderboard
exports.addTetrisScore = (req, res) => {
  try {
    const { name, difficulty, score } = req.body;

    // Validate input
    if (!name || !difficulty || typeof score !== 'number') {
      return res.status(400).json({ error: 'Missing required fields: name, difficulty, score' });
    }

    if (!['classic'].includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty level' });
    }

    // Sanitize name
    const sanitizedName = name.slice(0, 20).replace(/[<>]/g, '');

    ensureTetrisLeaderboardFile();
    const data = JSON.parse(fs.readFileSync(TETRIS_LEADERBOARD_FILE, 'utf8'));

    // Add new score
    data[difficulty].push({
      name: sanitizedName,
      score: Math.floor(score),
      date: new Date().toISOString()
    });

    // Sort by score (descending) and keep top 10
    data[difficulty].sort((a, b) => b.score - a.score);
    data[difficulty] = data[difficulty].slice(0, 10);

    // Write back to file
    fs.writeFileSync(TETRIS_LEADERBOARD_FILE, JSON.stringify(data, null, 2));

    // Return the rank
    const rank = data[difficulty].findIndex(s => s.name === sanitizedName && s.score === Math.floor(score));

    res.json({
      success: true,
      rank: rank !== -1 ? rank + 1 : null,
      leaderboard: data
    });
  } catch (err) {
    console.error('Error adding Tetris score:', err);
    res.status(500).json({ error: 'Failed to add score' });
  }
};