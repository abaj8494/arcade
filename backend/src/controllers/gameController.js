// Game controller with endpoints for game data and logic

// List of available games
const games = [
  { id: 'towers-of-hanoi', name: 'Towers of Hanoi', image: '/images/hanoi.png', implemented: true },
  { id: 'tic-tac-toe', name: 'Tic Tac Toe', image: '/images/tictactoe.svg', implemented: true },
  { id: 'connect4', name: 'Connect 4', image: '/images/connect4.png', implemented: true },
  { id: 'sudoku', name: 'Sudoku', image: '/images/sudoku.png', implemented: true },
  { id: 'ultimate-tic-tac-toe', name: 'Ultimate Tic Tac Toe', image: '/images/uttt.png', implemented: false },
  { id: 'banagrams-solver', name: 'Banagrams Solver', image: '/images/banagrams.png', implemented: false },
  { id: 'chess', name: 'Chess', image: '/images/chess.png', implemented: false },
  { id: 'tetris', name: 'Tetris', image: '/images/tetris.png', implemented: false },
  { id: 'snake', name: 'Snake', image: '/images/snake.png', implemented: false },
  { id: 'pong', name: 'Pong', image: '/images/pong.png', implemented: false },
  { id: 'hashiwokakero', name: 'Hashiwokakero', image: '/images/hashi.png', implemented: false }
];

// Get all games
exports.getGames = (req, res) => {
  res.json(games);
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