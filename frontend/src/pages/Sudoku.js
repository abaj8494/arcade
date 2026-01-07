import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Sudoku = () => {
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [initialBoard, setInitialBoard] = useState(() => createEmptyBoard());
  const [selectedCell, setSelectedCell] = useState(null);
  const [errors, setErrors] = useState(new Set());
  const [solved, setSolved] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [notes, setNotes] = useState(() => createEmptyNotes());
  const [notesMode, setNotesMode] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  function createEmptyBoard() {
    return Array(9).fill(null).map(() => Array(9).fill(0));
  }

  function createEmptyNotes() {
    return Array(9).fill(null).map(() =>
      Array(9).fill(null).map(() => new Set())
    );
  }

  // Timer effect
  useEffect(() => {
    let interval;
    if (isRunning && !solved) {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, solved]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if a number is valid at a position
  const isValid = useCallback((board, row, col, num) => {
    // Check row
    for (let c = 0; c < 9; c++) {
      if (c !== col && board[row][c] === num) return false;
    }
    // Check column
    for (let r = 0; r < 9; r++) {
      if (r !== row && board[r][col] === num) return false;
    }
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if ((r !== row || c !== col) && board[r][c] === num) return false;
      }
    }
    return true;
  }, []);

  // Solve the board using backtracking
  const solveSudoku = useCallback((board) => {
    const newBoard = board.map(row => [...row]);

    const findEmpty = () => {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (newBoard[r][c] === 0) return [r, c];
        }
      }
      return null;
    };

    const solve = () => {
      const empty = findEmpty();
      if (!empty) return true;

      const [row, col] = empty;
      for (let num = 1; num <= 9; num++) {
        if (isValid(newBoard, row, col, num)) {
          newBoard[row][col] = num;
          if (solve()) return true;
          newBoard[row][col] = 0;
        }
      }
      return false;
    };

    solve();
    return newBoard;
  }, [isValid]);

  // Generate a new puzzle
  const generatePuzzle = useCallback((diff) => {
    // Start with an empty board and fill it
    const solvedBoard = createEmptyBoard();

    // Fill diagonal 3x3 boxes first (they're independent)
    for (let box = 0; box < 3; box++) {
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
      }
      let idx = 0;
      for (let r = box * 3; r < box * 3 + 3; r++) {
        for (let c = box * 3; c < box * 3 + 3; c++) {
          solvedBoard[r][c] = nums[idx++];
        }
      }
    }

    // Solve the rest
    const fullBoard = solveSudoku(solvedBoard);

    // Remove numbers based on difficulty
    const cellsToRemove = {
      easy: 35,
      medium: 45,
      hard: 55,
      expert: 60
    }[diff] || 45;

    const puzzle = fullBoard.map(row => [...row]);
    const cells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        cells.push([r, c]);
      }
    }

    // Shuffle cells
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    // Remove cells
    let removed = 0;
    for (const [r, c] of cells) {
      if (removed >= cellsToRemove) break;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;

      // Verify unique solution (simplified check)
      const testBoard = puzzle.map(row => [...row]);
      const solved = solveSudoku(testBoard);
      if (solved) {
        removed++;
      } else {
        puzzle[r][c] = backup;
      }
    }

    return puzzle;
  }, [solveSudoku]);

  // Start a new game
  const startNewGame = useCallback((diff = difficulty) => {
    const puzzle = generatePuzzle(diff);
    setBoard(puzzle.map(row => [...row]));
    setInitialBoard(puzzle.map(row => [...row]));
    setSelectedCell(null);
    setErrors(new Set());
    setSolved(false);
    setNotes(createEmptyNotes());
    setHintsUsed(0);
    setTimer(0);
    setIsRunning(true);
    setDifficulty(diff);
  }, [difficulty, generatePuzzle]);

  // Initialize game on mount
  useEffect(() => {
    startNewGame('medium');
  }, []);

  // Handle cell selection
  const handleCellClick = (row, col) => {
    if (initialBoard[row][col] === 0) {
      setSelectedCell([row, col]);
    }
  };

  // Handle number input
  const handleNumberInput = (num) => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    if (initialBoard[row][col] !== 0) return;

    if (notesMode) {
      const newNotes = notes.map(r => r.map(c => new Set(c)));
      if (newNotes[row][col].has(num)) {
        newNotes[row][col].delete(num);
      } else {
        newNotes[row][col].add(num);
      }
      setNotes(newNotes);
    } else {
      const newBoard = board.map(r => [...r]);
      newBoard[row][col] = newBoard[row][col] === num ? 0 : num;
      setBoard(newBoard);

      // Clear notes for this cell
      const newNotes = notes.map(r => r.map(c => new Set(c)));
      newNotes[row][col].clear();
      setNotes(newNotes);

      // Check for errors
      const newErrors = new Set();
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (newBoard[r][c] !== 0 && !isValid(newBoard, r, c, newBoard[r][c])) {
            newErrors.add(`${r}-${c}`);
          }
        }
      }
      setErrors(newErrors);

      // Check if solved
      if (newErrors.size === 0 && newBoard.every(row => row.every(cell => cell !== 0))) {
        setSolved(true);
        setIsRunning(false);
      }
    }
  };

  // Clear selected cell
  const handleClear = () => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    if (initialBoard[row][col] !== 0) return;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = 0;
    setBoard(newBoard);

    const newNotes = notes.map(r => r.map(c => new Set(c)));
    newNotes[row][col].clear();
    setNotes(newNotes);

    // Recalculate errors
    const newErrors = new Set();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (newBoard[r][c] !== 0 && !isValid(newBoard, r, c, newBoard[r][c])) {
          newErrors.add(`${r}-${c}`);
        }
      }
    }
    setErrors(newErrors);
  };

  // Provide a hint
  const handleHint = () => {
    const solvedBoard = solveSudoku(board);

    // Find an empty cell
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const newBoard = board.map(row => [...row]);
          newBoard[r][c] = solvedBoard[r][c];
          setBoard(newBoard);
          setHintsUsed(h => h + 1);
          setSelectedCell([r, c]);

          // Recalculate errors
          const newErrors = new Set();
          for (let rr = 0; rr < 9; rr++) {
            for (let cc = 0; cc < 9; cc++) {
              if (newBoard[rr][cc] !== 0 && !isValid(newBoard, rr, cc, newBoard[rr][cc])) {
                newErrors.add(`${rr}-${cc}`);
              }
            }
          }
          setErrors(newErrors);

          // Check if solved
          if (newErrors.size === 0 && newBoard.every(row => row.every(cell => cell !== 0))) {
            setSolved(true);
            setIsRunning(false);
          }
          return;
        }
      }
    }
  };

  // Solve the entire puzzle
  const handleSolve = () => {
    const solvedBoard = solveSudoku(initialBoard);
    setBoard(solvedBoard);
    setErrors(new Set());
    setSolved(true);
    setIsRunning(false);
  };

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedCell) return;

      const [row, col] = selectedCell;

      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        handleClear();
      } else if (e.key === 'ArrowUp' && row > 0) {
        setSelectedCell([row - 1, col]);
      } else if (e.key === 'ArrowDown' && row < 8) {
        setSelectedCell([row + 1, col]);
      } else if (e.key === 'ArrowLeft' && col > 0) {
        setSelectedCell([row, col - 1]);
      } else if (e.key === 'ArrowRight' && col < 8) {
        setSelectedCell([row, col + 1]);
      } else if (e.key === 'n' || e.key === 'N') {
        setNotesMode(!notesMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, notesMode, handleNumberInput, handleClear]);

  const getCellClass = (row, col) => {
    const isSelected = selectedCell && selectedCell[0] === row && selectedCell[1] === col;
    const isInitial = initialBoard[row][col] !== 0;
    const hasError = errors.has(`${row}-${col}`);
    const isSameNumber = selectedCell && board[row][col] !== 0 &&
      board[row][col] === board[selectedCell[0]][selectedCell[1]];
    const isRelated = selectedCell && (
      row === selectedCell[0] ||
      col === selectedCell[1] ||
      (Math.floor(row / 3) === Math.floor(selectedCell[0] / 3) &&
       Math.floor(col / 3) === Math.floor(selectedCell[1] / 3))
    );

    let classes = 'w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center text-lg sm:text-xl font-semibold transition-colors cursor-pointer ';

    if (isSelected) {
      classes += 'bg-blue-500 text-white ';
    } else if (hasError) {
      classes += 'bg-red-500/30 text-red-400 ';
    } else if (isSameNumber) {
      classes += 'bg-blue-500/30 text-blue-300 ';
    } else if (isRelated) {
      classes += 'bg-gray-600/50 ';
    } else {
      classes += 'bg-surface hover:bg-gray-600 ';
    }

    if (isInitial) {
      classes += 'text-white font-bold ';
    } else {
      classes += 'text-blue-300 ';
    }

    // Border styling for 3x3 boxes
    if (col % 3 === 0 && col !== 0) classes += 'border-l-2 border-l-gray-400 ';
    if (row % 3 === 0 && row !== 0) classes += 'border-t-2 border-t-gray-400 ';

    return classes;
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">Sudoku</h1>

      {/* Difficulty Selection */}
      <div className="mb-4 flex gap-2 flex-wrap justify-center">
        {['easy', 'medium', 'hard', 'expert'].map((diff) => (
          <button
            key={diff}
            onClick={() => startNewGame(diff)}
            className={`btn text-sm ${difficulty === diff && !solved ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
          >
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </button>
        ))}
      </div>

      {/* Timer and Stats */}
      <div className="mb-4 flex gap-6 text-lg">
        <div className="text-gray-300">
          Time: <span className="font-mono text-white">{formatTime(timer)}</span>
        </div>
        <div className="text-gray-300">
          Hints: <span className="text-yellow-400">{hintsUsed}</span>
        </div>
      </div>

      {/* Solved Message */}
      {solved && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-4 p-4 bg-green-600 rounded-lg text-xl font-bold"
        >
          Puzzle Solved! Time: {formatTime(timer)}
        </motion.div>
      )}

      {/* Game Board */}
      <div className="bg-gray-700 p-1 rounded-lg mb-4">
        <div className="grid grid-cols-9 gap-px">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={getCellClass(rowIndex, colIndex)}
                onClick={() => handleCellClick(rowIndex, colIndex)}
              >
                {cell !== 0 ? (
                  cell
                ) : notes[rowIndex][colIndex].size > 0 ? (
                  <div className="grid grid-cols-3 gap-0 text-[8px] sm:text-xs text-gray-400 w-full h-full p-0.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                      <span key={n} className="flex items-center justify-center">
                        {notes[rowIndex][colIndex].has(n) ? n : ''}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Number Input Pad */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberInput(num)}
            className="btn w-10 h-10 sm:w-12 sm:h-12 bg-surface hover:bg-gray-600 text-xl font-bold"
          >
            {num}
          </button>
        ))}
        <button
          onClick={handleClear}
          className="btn w-10 h-10 sm:w-12 sm:h-12 bg-red-500/50 hover:bg-red-500 text-sm"
        >
          Clear
        </button>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap justify-center mb-4">
        <button
          onClick={() => setNotesMode(!notesMode)}
          className={`btn ${notesMode ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          Notes {notesMode ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={handleHint}
          className="btn bg-yellow-600 hover:bg-yellow-500"
          disabled={solved}
        >
          Hint
        </button>
        <button
          onClick={handleSolve}
          className="btn bg-green-600 hover:bg-green-500"
          disabled={solved}
        >
          Solve
        </button>
        <button
          onClick={() => startNewGame()}
          className="btn btn-primary"
        >
          New Game
        </button>
      </div>

      {/* Instructions */}
      <div className="text-gray-400 text-sm text-center max-w-md">
        <p>Click a cell and use number keys or buttons to fill it.</p>
        <p>Press N to toggle notes mode. Arrow keys to navigate.</p>
      </div>

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default Sudoku;
