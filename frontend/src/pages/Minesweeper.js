import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';

const DIFFICULTIES = {
  beginner: { rows: 9, cols: 9, mines: 10, name: 'Beginner' },
  intermediate: { rows: 16, cols: 16, mines: 40, name: 'Intermediate' },
  expert: { rows: 16, cols: 30, mines: 99, name: 'Expert' },
};

const NUMBER_COLOURS = {
  1: 'text-blue-500',
  2: 'text-green-600',
  3: 'text-red-500',
  4: 'text-purple-700',
  5: 'text-amber-800',
  6: 'text-cyan-600',
  7: 'text-gray-800',
  8: 'text-gray-600',
};

const Minesweeper = () => {
  const [difficulty, setDifficulty] = useState('beginner');
  const [board, setBoard] = useState([]);
  const [revealed, setRevealed] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [gameState, setGameState] = useState('idle'); // idle, playing, won, lost
  const [minesLeft, setMinesLeft] = useState(10);
  const [timer, setTimer] = useState(0);
  const [firstClick, setFirstClick] = useState(true);
  const { showHelp, toggleHelp } = useHelpVisibility();

  const config = DIFFICULTIES[difficulty];

  // Create empty board
  const createEmptyBoard = useCallback(() => {
    const { rows, cols } = DIFFICULTIES[difficulty];
    return Array(rows).fill(null).map(() => Array(cols).fill(0));
  }, [difficulty]);

  // Initialize game
  const initGame = useCallback(() => {
    const { rows, cols, mines } = DIFFICULTIES[difficulty];
    setBoard(createEmptyBoard());
    setRevealed(Array(rows).fill(null).map(() => Array(cols).fill(false)));
    setFlagged(Array(rows).fill(null).map(() => Array(cols).fill(false)));
    setGameState('idle');
    setMinesLeft(mines);
    setTimer(0);
    setFirstClick(true);
  }, [difficulty, createEmptyBoard]);

  // Place mines (called after first click to ensure first click is safe)
  const placeMines = useCallback((safeRow, safeCol) => {
    const { rows, cols, mines } = DIFFICULTIES[difficulty];
    const newBoard = createEmptyBoard();

    // Generate safe zone (3x3 around first click)
    const safeZone = new Set();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        safeZone.add(`${safeRow + dr},${safeCol + dc}`);
      }
    }

    // Place mines
    let minesPlaced = 0;
    while (minesPlaced < mines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (newBoard[r][c] !== -1 && !safeZone.has(`${r},${c}`)) {
        newBoard[r][c] = -1; // -1 represents mine
        minesPlaced++;
      }
    }

    // Calculate adjacent mine counts
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (newBoard[r][c] === -1) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newBoard[nr][nc] === -1) {
              count++;
            }
          }
        }
        newBoard[r][c] = count;
      }
    }

    return newBoard;
  }, [difficulty, createEmptyBoard]);

  // Reveal a cell
  const revealCell = useCallback((row, col, currentBoard, currentRevealed) => {
    const { rows, cols } = DIFFICULTIES[difficulty];
    const newRevealed = currentRevealed.map(r => [...r]);

    const stack = [[row, col]];
    while (stack.length > 0) {
      const [r, c] = stack.pop();

      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      if (newRevealed[r][c]) continue;
      if (flagged[r][c]) continue;

      newRevealed[r][c] = true;

      // If empty cell, reveal neighbours
      if (currentBoard[r][c] === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr !== 0 || dc !== 0) {
              stack.push([r + dr, c + dc]);
            }
          }
        }
      }
    }

    return newRevealed;
  }, [difficulty, flagged]);

  // Handle cell click
  const handleCellClick = useCallback((row, col) => {
    if (gameState === 'won' || gameState === 'lost') return;
    if (flagged[row][col]) return;
    if (revealed[row][col]) return;

    let currentBoard = board;

    // First click - place mines and start game
    if (firstClick) {
      currentBoard = placeMines(row, col);
      setBoard(currentBoard);
      setFirstClick(false);
      setGameState('playing');
    }

    // Check if mine
    if (currentBoard[row][col] === -1) {
      // Game over - reveal all
      const allRevealed = revealed.map(r => r.map(() => true));
      setRevealed(allRevealed);
      setGameState('lost');
      return;
    }

    // Reveal cell(s)
    const newRevealed = revealCell(row, col, currentBoard, revealed);
    setRevealed(newRevealed);

    // Check win condition
    const { rows, cols, mines } = DIFFICULTIES[difficulty];
    let revealedCount = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (newRevealed[r][c]) revealedCount++;
      }
    }
    if (revealedCount === rows * cols - mines) {
      setGameState('won');
    }
  }, [board, revealed, flagged, gameState, firstClick, placeMines, revealCell, difficulty]);

  // Handle right click (flag)
  const handleRightClick = useCallback((e, row, col) => {
    e.preventDefault();
    if (gameState === 'won' || gameState === 'lost') return;
    if (revealed[row][col]) return;

    const newFlagged = flagged.map(r => [...r]);
    newFlagged[row][col] = !newFlagged[row][col];
    setFlagged(newFlagged);
    setMinesLeft(prev => newFlagged[row][col] ? prev - 1 : prev + 1);
  }, [gameState, revealed, flagged]);

  // Handle chord (reveal neighbours if flags match count)
  const handleChord = useCallback((row, col) => {
    if (!revealed[row][col]) return;
    if (board[row][col] <= 0) return;

    const { rows, cols } = DIFFICULTIES[difficulty];

    // Count adjacent flags
    let flagCount = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && flagged[nr][nc]) {
          flagCount++;
        }
      }
    }

    // If flag count matches cell number, reveal neighbours
    if (flagCount === board[row][col]) {
      let newRevealed = revealed.map(r => [...r]);
      let hitMine = false;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (!revealed[nr][nc] && !flagged[nr][nc]) {
              if (board[nr][nc] === -1) {
                hitMine = true;
              } else {
                newRevealed = revealCell(nr, nc, board, newRevealed);
              }
            }
          }
        }
      }

      if (hitMine) {
        setRevealed(revealed.map(r => r.map(() => true)));
        setGameState('lost');
      } else {
        setRevealed(newRevealed);

        // Check win
        const { mines } = DIFFICULTIES[difficulty];
        let revealedCount = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (newRevealed[r][c]) revealedCount++;
          }
        }
        if (revealedCount === rows * cols - mines) {
          setGameState('won');
        }
      }
    }
  }, [board, revealed, flagged, difficulty, revealCell]);

  // Timer
  useEffect(() => {
    let interval;
    if (gameState === 'playing') {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // Initialize on difficulty change
  useEffect(() => {
    initGame();
  }, [difficulty, initGame]);

  // Render cell content
  const renderCell = (row, col) => {
    const isFlagged = flagged[row][col];
    const isRevealed = revealed[row][col];
    const value = board[row][col];

    if (isFlagged) {
      return <span className="text-red-500">🚩</span>;
    }

    if (!isRevealed) {
      return null;
    }

    if (value === -1) {
      return <span>💣</span>;
    }

    if (value > 0) {
      return (
        <span className={`font-bold ${NUMBER_COLOURS[value]}`}>
          {value}
        </span>
      );
    }

    return null;
  };

  const getCellStyle = (row, col) => {
    const isRevealed = revealed[row][col];
    const isMine = board[row][col] === -1;

    if (isRevealed) {
      if (isMine && gameState === 'lost') {
        return 'bg-red-500';
      }
      return 'bg-gray-300';
    }

    return 'bg-gray-500 hover:bg-gray-400 cursor-pointer shadow-inner';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4 mb-2">
        <h1 className="text-3xl font-bold">Minesweeper</h1>
        <HelpButton onClick={toggleHelp} isActive={showHelp} />
      </div>
      <p className="text-gray-400 mb-4">Find all the mines without detonating them!</p>

      {/* Difficulty selection */}
      <div className="mb-4 flex gap-2 flex-wrap justify-center">
        {Object.entries(DIFFICULTIES).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setDifficulty(key)}
            className={`btn ${difficulty === key ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
          >
            {config.name}
          </button>
        ))}
      </div>

      {/* Status bar */}
      <div className="mb-4 flex gap-6 text-lg bg-gray-800 px-6 py-2 rounded-lg">
        <div className="flex items-center gap-2">
          <span>💣</span>
          <span className="font-mono font-bold text-red-500">{String(minesLeft).padStart(3, '0')}</span>
        </div>
        <button
          onClick={initGame}
          className="text-2xl hover:scale-110 transition-transform"
        >
          {gameState === 'won' ? '😎' : gameState === 'lost' ? '😵' : '🙂'}
        </button>
        <div className="flex items-center gap-2">
          <span>⏱️</span>
          <span className="font-mono font-bold text-blue-500">{String(timer).padStart(3, '0')}</span>
        </div>
      </div>

      {/* Game result message */}
      <AnimatePresence>
        {(gameState === 'won' || gameState === 'lost') && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={`mb-4 p-3 rounded-lg font-bold ${
              gameState === 'won' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {gameState === 'won'
              ? `Congratulations! You won in ${timer} seconds!`
              : 'Game Over! You hit a mine!'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game board */}
      <div className="bg-gray-700 p-2 rounded-lg overflow-auto max-w-full">
        <div
          className="grid gap-px bg-gray-600"
          style={{
            gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`,
          }}
        >
          {board.map((row, rowIdx) =>
            row.map((_, colIdx) => (
              <motion.div
                key={`${rowIdx}-${colIdx}`}
                className={`
                  w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-sm sm:text-base
                  select-none transition-colors
                  ${getCellStyle(rowIdx, colIdx)}
                `}
                onClick={() => handleCellClick(rowIdx, colIdx)}
                onContextMenu={(e) => handleRightClick(e, rowIdx, colIdx)}
                onDoubleClick={() => handleChord(rowIdx, colIdx)}
                whileHover={!revealed[rowIdx][colIdx] ? { scale: 1.05 } : {}}
                whileTap={!revealed[rowIdx][colIdx] ? { scale: 0.95 } : {}}
              >
                {renderCell(rowIdx, colIdx)}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={initGame}
          className="btn bg-green-600 hover:bg-green-500"
        >
          New Game
        </button>
      </div>

      {/* Instructions */}
      {showHelp && (
        <div className="p-4 bg-surface rounded-lg max-w-md text-gray-400 text-sm mt-4">
          <h3 className="text-white font-semibold mb-2">How to Play:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Left click to reveal a cell</li>
            <li>Right click to flag/unflag a potential mine</li>
            <li>Double-click a number to reveal adjacent unflagged cells</li>
            <li>Numbers show how many adjacent mines there are</li>
            <li>Reveal all non-mine cells to win!</li>
          </ul>
        </div>
      )}

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default Minesweeper;
