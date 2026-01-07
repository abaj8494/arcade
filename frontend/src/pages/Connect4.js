import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const ROWS = 6;
const COLS = 7;
const EMPTY = null;
const PLAYER_1 = 'red';
const PLAYER_2 = 'yellow';

const Connect4 = () => {
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState(PLAYER_1);
  const [winner, setWinner] = useState(null);
  const [winningCells, setWinningCells] = useState([]);
  const [scores, setScores] = useState({ red: 0, yellow: 0, draws: 0 });
  const [gameMode, setGameMode] = useState('2player'); // '2player' or 'ai'
  const [aiDifficulty, setAiDifficulty] = useState('medium'); // 'easy', 'medium', 'hard'
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [hoverCol, setHoverCol] = useState(null);
  const aiTimeoutRef = useRef(null);

  function createEmptyBoard() {
    return Array(ROWS).fill(null).map(() => Array(COLS).fill(EMPTY));
  }

  const checkWinner = useCallback((board) => {
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal down-right
      [1, -1],  // diagonal down-left
    ];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cell = board[row][col];
        if (!cell) continue;

        for (const [dr, dc] of directions) {
          const cells = [[row, col]];
          let r = row + dr;
          let c = col + dc;

          while (
            r >= 0 && r < ROWS &&
            c >= 0 && c < COLS &&
            board[r][c] === cell
          ) {
            cells.push([r, c]);
            r += dr;
            c += dc;
          }

          if (cells.length >= 4) {
            return { winner: cell, cells: cells.slice(0, 4) };
          }
        }
      }
    }

    // Check for draw
    if (board[0].every(cell => cell !== EMPTY)) {
      return { winner: 'draw', cells: [] };
    }

    return null;
  }, []);

  const getLowestEmptyRow = useCallback((board, col) => {
    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row][col] === EMPTY) {
        return row;
      }
    }
    return -1;
  }, []);

  const makeMove = useCallback((col, player) => {
    const row = getLowestEmptyRow(board, col);
    if (row === -1 || winner) return false;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = player;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result) {
      setWinner(result.winner);
      setWinningCells(result.cells);
      if (result.winner === 'draw') {
        setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
      } else {
        setScores(prev => ({ ...prev, [result.winner]: prev[result.winner] + 1 }));
      }
    } else {
      setCurrentPlayer(player === PLAYER_1 ? PLAYER_2 : PLAYER_1);
    }

    return true;
  }, [board, winner, getLowestEmptyRow, checkWinner]);

  const handleColumnClick = useCallback((col) => {
    if (winner || isAiThinking) return;
    if (gameMode === 'ai' && currentPlayer === PLAYER_2) return;

    makeMove(col, currentPlayer);
  }, [winner, isAiThinking, gameMode, currentPlayer, makeMove]);

  // AI Logic with Minimax
  const evaluateBoard = useCallback((board, player) => {
    const opponent = player === PLAYER_1 ? PLAYER_2 : PLAYER_1;
    let score = 0;

    // Check all possible windows of 4
    const evaluateWindow = (window) => {
      const playerCount = window.filter(c => c === player).length;
      const opponentCount = window.filter(c => c === opponent).length;
      const emptyCount = window.filter(c => c === EMPTY).length;

      if (playerCount === 4) return 10000;
      if (opponentCount === 4) return -10000;
      if (playerCount === 3 && emptyCount === 1) return 100;
      if (playerCount === 2 && emptyCount === 2) return 10;
      if (opponentCount === 3 && emptyCount === 1) return -80;
      if (opponentCount === 2 && emptyCount === 2) return -5;
      return 0;
    };

    // Horizontal windows
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col <= COLS - 4; col++) {
        const window = [board[row][col], board[row][col+1], board[row][col+2], board[row][col+3]];
        score += evaluateWindow(window);
      }
    }

    // Vertical windows
    for (let row = 0; row <= ROWS - 4; row++) {
      for (let col = 0; col < COLS; col++) {
        const window = [board[row][col], board[row+1][col], board[row+2][col], board[row+3][col]];
        score += evaluateWindow(window);
      }
    }

    // Diagonal windows (down-right)
    for (let row = 0; row <= ROWS - 4; row++) {
      for (let col = 0; col <= COLS - 4; col++) {
        const window = [board[row][col], board[row+1][col+1], board[row+2][col+2], board[row+3][col+3]];
        score += evaluateWindow(window);
      }
    }

    // Diagonal windows (down-left)
    for (let row = 0; row <= ROWS - 4; row++) {
      for (let col = 3; col < COLS; col++) {
        const window = [board[row][col], board[row+1][col-1], board[row+2][col-2], board[row+3][col-3]];
        score += evaluateWindow(window);
      }
    }

    // Centre column preference
    const centreCol = Math.floor(COLS / 2);
    const centreCount = board.filter((row) => row[centreCol] === player).length;
    score += centreCount * 3;

    return score;
  }, []);

  const minimax = useCallback((board, depth, alpha, beta, isMaximizing, player) => {
    const result = checkWinner(board);
    if (result) {
      if (result.winner === PLAYER_2) return 1000 - depth;
      if (result.winner === PLAYER_1) return -1000 + depth;
      return 0;
    }
    if (depth === 0) {
      return evaluateBoard(board, PLAYER_2);
    }

    const validCols = [];
    for (let col = 0; col < COLS; col++) {
      if (board[0][col] === EMPTY) validCols.push(col);
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const col of validCols) {
        const row = getLowestEmptyRow(board, col);
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = player;
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, PLAYER_1);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const col of validCols) {
        const row = getLowestEmptyRow(board, col);
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = player;
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, PLAYER_2);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }, [checkWinner, evaluateBoard, getLowestEmptyRow]);

  // Check if a move wins for a player
  const checkWinningMove = useCallback((board, col, player) => {
    const row = getLowestEmptyRow(board, col);
    if (row === -1) return false;
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = player;
    const result = checkWinner(newBoard);
    return result && result.winner === player;
  }, [getLowestEmptyRow, checkWinner]);

  const getAiMove = useCallback(() => {
    const depths = { easy: 2, medium: 5, hard: 7 };
    const depth = depths[aiDifficulty];

    const validCols = [];
    for (let col = 0; col < COLS; col++) {
      if (board[0][col] === EMPTY) validCols.push(col);
    }

    // Easy mode: sometimes make random moves
    if (aiDifficulty === 'easy' && Math.random() < 0.4) {
      return validCols[Math.floor(Math.random() * validCols.length)];
    }

    // CRITICAL: First check for immediate winning move
    for (const col of validCols) {
      if (checkWinningMove(board, col, PLAYER_2)) {
        return col; // Take the win!
      }
    }

    // CRITICAL: Then check if opponent can win next turn and block
    for (const col of validCols) {
      if (checkWinningMove(board, col, PLAYER_1)) {
        return col; // Block the win!
      }
    }

    // Use minimax for strategic move
    let bestCol = validCols[Math.floor(validCols.length / 2)]; // Prefer centre
    let bestScore = -Infinity;

    // Order columns to check centre first (better pruning)
    const orderedCols = [...validCols].sort((a, b) =>
      Math.abs(a - 3) - Math.abs(b - 3)
    );

    for (const col of orderedCols) {
      const row = getLowestEmptyRow(board, col);
      const newBoard = board.map(r => [...r]);
      newBoard[row][col] = PLAYER_2;
      const score = minimax(newBoard, depth - 1, -Infinity, Infinity, false, PLAYER_1);
      if (score > bestScore) {
        bestScore = score;
        bestCol = col;
      }
    }

    return bestCol;
  }, [board, aiDifficulty, getLowestEmptyRow, minimax, checkWinningMove]);

  // AI turn effect
  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === PLAYER_2 && !winner) {
      setIsAiThinking(true);
      aiTimeoutRef.current = setTimeout(() => {
        const col = getAiMove();
        makeMove(col, PLAYER_2);
        setIsAiThinking(false);
      }, 500);
    }

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [gameMode, currentPlayer, winner, getAiMove, makeMove]);

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setCurrentPlayer(PLAYER_1);
    setWinner(null);
    setWinningCells([]);
    setIsAiThinking(false);
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
  };

  const resetScores = () => {
    setScores({ red: 0, yellow: 0, draws: 0 });
    resetGame();
  };

  const getStatusText = () => {
    if (winner === 'draw') return "It's a draw!";
    if (winner) return `${winner === PLAYER_1 ? 'Red' : 'Yellow'} wins!`;
    if (isAiThinking) return 'AI is thinking...';
    return `${currentPlayer === PLAYER_1 ? 'Red' : 'Yellow'}'s turn`;
  };

  const isWinningCell = (row, col) => {
    return winningCells.some(([r, c]) => r === row && c === col);
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">Connect 4</h1>

      {/* Game Mode Selection */}
      <div className="mb-4 flex gap-4">
        <button
          onClick={() => { setGameMode('2player'); resetGame(); }}
          className={`btn ${gameMode === '2player' ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          2 Player
        </button>
        <button
          onClick={() => { setGameMode('ai'); resetGame(); }}
          className={`btn ${gameMode === 'ai' ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          vs AI
        </button>
      </div>

      {/* AI Difficulty */}
      {gameMode === 'ai' && (
        <div className="mb-4 flex gap-2">
          {['easy', 'medium', 'hard'].map((diff) => (
            <button
              key={diff}
              onClick={() => { setAiDifficulty(diff); resetGame(); }}
              className={`btn text-sm ${aiDifficulty === diff ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              {diff.charAt(0).toUpperCase() + diff.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Score Board */}
      <div className="mb-4 p-4 bg-surface rounded-lg">
        <div className="flex gap-8 text-center">
          <div>
            <div className="text-red-500 text-xl font-bold">Red</div>
            <div className="text-xl">{scores.red}</div>
          </div>
          <div>
            <div className="text-gray-400 text-lg">Draws</div>
            <div className="text-xl">{scores.draws}</div>
          </div>
          <div>
            <div className="text-yellow-400 text-xl font-bold">Yellow</div>
            <div className="text-xl">{scores.yellow}</div>
          </div>
        </div>
      </div>

      {/* Status */}
      <motion.div
        key={getStatusText()}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-xl mb-4 font-semibold ${
          winner === PLAYER_1 ? 'text-red-500' :
          winner === PLAYER_2 ? 'text-yellow-400' :
          winner === 'draw' ? 'text-gray-400' :
          currentPlayer === PLAYER_1 ? 'text-red-500' : 'text-yellow-400'
        }`}
      >
        {getStatusText()}
      </motion.div>

      {/* Game Board */}
      <div className="relative bg-blue-600 p-2 rounded-lg shadow-xl">
        {/* Column hover indicators */}
        <div className="flex gap-1 mb-1">
          {Array(COLS).fill(null).map((_, col) => (
            <div
              key={col}
              className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center"
              onMouseEnter={() => setHoverCol(col)}
              onMouseLeave={() => setHoverCol(null)}
              onClick={() => handleColumnClick(col)}
            >
              {hoverCol === col && !winner && !isAiThinking && board[0][col] === EMPTY && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 0.5, y: 0 }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${
                    currentPlayer === PLAYER_1 ? 'bg-red-500' : 'bg-yellow-400'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Board grid */}
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-700 rounded-full flex items-center justify-center cursor-pointer relative overflow-hidden"
                onClick={() => handleColumnClick(colIndex)}
                onMouseEnter={() => setHoverCol(colIndex)}
                onMouseLeave={() => setHoverCol(null)}
              >
                {cell && (
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${
                      cell === PLAYER_1 ? 'bg-red-500' : 'bg-yellow-400'
                    } ${isWinningCell(rowIndex, colIndex) ? 'ring-4 ring-white animate-pulse' : ''}`}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={resetGame}
          className="btn bg-primary hover:bg-indigo-600 text-white"
        >
          New Game
        </button>
        <button
          onClick={resetScores}
          className="btn bg-red-500 hover:bg-red-600 text-white"
        >
          Reset Scores
        </button>
      </div>

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default Connect4;
