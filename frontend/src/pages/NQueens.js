import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const NQueens = () => {
  const [boardSize, setBoardSize] = useState(8);
  const [queens, setQueens] = useState([]);
  const [conflicts, setConflicts] = useState(new Set());
  const [isSolving, setIsSolving] = useState(false);
  const [solutions, setSolutions] = useState([]);
  const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
  const [message, setMessage] = useState('');
  const solveIntervalRef = useRef(null);

  // Check if a position is under attack
  const isUnderAttack = useCallback((queens, row, col) => {
    for (let i = 0; i < queens.length; i++) {
      const [qRow, qCol] = queens[i];
      // Same row or column
      if (qRow === row || qCol === col) return true;
      // Diagonal
      if (Math.abs(qRow - row) === Math.abs(qCol - col)) return true;
    }
    return false;
  }, []);

  // Find all conflicts on current board
  const findConflicts = useCallback((queens) => {
    const conflictSet = new Set();
    for (let i = 0; i < queens.length; i++) {
      for (let j = i + 1; j < queens.length; j++) {
        const [r1, c1] = queens[i];
        const [r2, c2] = queens[j];
        // Same row or column
        if (r1 === r2 || c1 === c2) {
          conflictSet.add(i);
          conflictSet.add(j);
        }
        // Diagonal
        if (Math.abs(r1 - r2) === Math.abs(c1 - c2)) {
          conflictSet.add(i);
          conflictSet.add(j);
        }
      }
    }
    return conflictSet;
  }, []);

  // Update conflicts whenever queens change
  useEffect(() => {
    setConflicts(findConflicts(queens));
  }, [queens, findConflicts]);

  // Handle cell click - place or remove queen
  const handleCellClick = (row, col) => {
    if (isSolving) return;

    const existingIndex = queens.findIndex(([r, c]) => r === row && c === col);
    if (existingIndex !== -1) {
      // Remove queen
      setQueens(queens.filter((_, i) => i !== existingIndex));
    } else {
      // Place queen
      setQueens([...queens, [row, col]]);
    }
    setSolutions([]);
    setMessage('');
  };

  // Reset board
  const resetBoard = useCallback(() => {
    if (solveIntervalRef.current) {
      clearInterval(solveIntervalRef.current);
    }
    setQueens([]);
    setSolutions([]);
    setCurrentSolutionIndex(0);
    setIsSolving(false);
    setMessage('');
  }, []);

  // Change board size
  const handleSizeChange = (newSize) => {
    setBoardSize(newSize);
    resetBoard();
  };

  // Solve N-Queens using backtracking
  const solveNQueens = useCallback(() => {
    setIsSolving(true);
    setQueens([]);
    setSolutions([]);
    setMessage('Solving...');

    const allSolutions = [];
    const solve = (col, currentQueens) => {
      if (col >= boardSize) {
        allSolutions.push([...currentQueens]);
        return;
      }

      for (let row = 0; row < boardSize; row++) {
        if (!isUnderAttack(currentQueens, row, col)) {
          currentQueens.push([row, col]);
          solve(col + 1, currentQueens);
          currentQueens.pop();
        }
      }
    };

    // Run in timeout to not block UI
    setTimeout(() => {
      solve(0, []);
      setSolutions(allSolutions);
      setCurrentSolutionIndex(0);
      if (allSolutions.length > 0) {
        setQueens(allSolutions[0]);
        setMessage(`Found ${allSolutions.length} solution${allSolutions.length > 1 ? 's' : ''}!`);
      } else {
        setMessage('No solutions found.');
      }
      setIsSolving(false);
    }, 100);
  }, [boardSize, isUnderAttack]);

  // Animate through solutions
  const animateSolution = useCallback(() => {
    if (solutions.length === 0) return;

    setIsSolving(true);
    let index = 0;
    setQueens([]);

    const solution = solutions[currentSolutionIndex];
    solveIntervalRef.current = setInterval(() => {
      if (index >= solution.length) {
        clearInterval(solveIntervalRef.current);
        setIsSolving(false);
        return;
      }
      setQueens(solution.slice(0, index + 1));
      index++;
    }, 300);
  }, [solutions, currentSolutionIndex]);

  // Navigate solutions
  const showSolution = (direction) => {
    if (solutions.length === 0) return;
    let newIndex = currentSolutionIndex + direction;
    if (newIndex < 0) newIndex = solutions.length - 1;
    if (newIndex >= solutions.length) newIndex = 0;
    setCurrentSolutionIndex(newIndex);
    setQueens(solutions[newIndex]);
  };

  // Check if cell has a queen
  const hasQueen = (row, col) => {
    return queens.some(([r, c]) => r === row && c === col);
  };

  // Get queen index for conflict checking
  const getQueenIndex = (row, col) => {
    return queens.findIndex(([r, c]) => r === row && c === col);
  };

  // Check if position is threatened by any queen
  const isThreatened = (row, col) => {
    if (hasQueen(row, col)) return false;
    return isUnderAttack(queens, row, col);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (solveIntervalRef.current) {
        clearInterval(solveIntervalRef.current);
      }
    };
  }, []);

  // Check if puzzle is solved
  const isSolved = queens.length === boardSize && conflicts.size === 0;

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-2">N-Queens</h1>
      <p className="text-gray-400 mb-4">Place {boardSize} queens so none can attack each other</p>

      {/* Board size selection */}
      <div className="mb-4 flex gap-2 flex-wrap justify-center">
        {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((size) => (
          <button
            key={size}
            onClick={() => handleSizeChange(size)}
            className={`btn ${boardSize === size ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
            disabled={isSolving}
          >
            {size}x{size}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="mb-4 flex gap-6 text-lg">
        <div>
          Queens: <span className={`font-bold ${queens.length === boardSize ? 'text-green-500' : 'text-primary'}`}>
            {queens.length}/{boardSize}
          </span>
        </div>
        <div>
          Conflicts: <span className={`font-bold ${conflicts.size === 0 ? 'text-green-500' : 'text-red-500'}`}>
            {conflicts.size}
          </span>
        </div>
      </div>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-3 rounded-lg font-semibold ${
              isSolved ? 'bg-green-600' : 'bg-blue-600'
            }`}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Solved message */}
      <AnimatePresence>
        {isSolved && !message && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="mb-4 p-3 rounded-lg font-bold bg-green-600"
          >
            Solved! All {boardSize} queens placed safely!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chessboard */}
      <div
        className="grid gap-0 border-4 border-gray-700 rounded-lg overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: boardSize * boardSize }).map((_, index) => {
          const row = Math.floor(index / boardSize);
          const col = index % boardSize;
          const isDark = (row + col) % 2 === 1;
          const hasQ = hasQueen(row, col);
          const queenIdx = getQueenIndex(row, col);
          const isConflict = hasQ && conflicts.has(queenIdx);
          const threatened = isThreatened(row, col);

          return (
            <motion.div
              key={`${row}-${col}`}
              className={`
                w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center cursor-pointer
                transition-colors duration-200
                ${isDark ? 'bg-amber-800' : 'bg-amber-200'}
                ${threatened ? (isDark ? 'bg-red-900/50' : 'bg-red-300/50') : ''}
                ${isConflict ? 'ring-2 ring-red-500 ring-inset' : ''}
              `}
              onClick={() => handleCellClick(row, col)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence>
                {hasQ && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    className={`text-2xl sm:text-3xl md:text-4xl ${
                      isConflict ? 'text-red-500' : 'text-gray-900'
                    }`}
                  >
                    ♛
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Solution navigation */}
      {solutions.length > 1 && (
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={() => showSolution(-1)}
            className="btn bg-gray-600 hover:bg-gray-500"
            disabled={isSolving}
          >
            ← Prev
          </button>
          <span className="text-lg">
            Solution {currentSolutionIndex + 1} of {solutions.length}
          </span>
          <button
            onClick={() => showSolution(1)}
            className="btn bg-gray-600 hover:bg-gray-500"
            disabled={isSolving}
          >
            Next →
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 flex-wrap justify-center mt-4">
        <button
          onClick={resetBoard}
          className="btn bg-red-500 hover:bg-red-600"
          disabled={isSolving}
        >
          Reset
        </button>
        <button
          onClick={solveNQueens}
          className="btn bg-green-600 hover:bg-green-500"
          disabled={isSolving}
        >
          {isSolving ? 'Solving...' : 'Find All Solutions'}
        </button>
        {solutions.length > 0 && (
          <button
            onClick={animateSolution}
            className="btn bg-blue-600 hover:bg-blue-500"
            disabled={isSolving}
          >
            Animate Solution
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-surface rounded-lg max-w-md text-gray-400 text-sm mt-4">
        <h3 className="text-white font-semibold mb-2">How to Play:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Click a cell to place or remove a queen</li>
          <li>Queens attack horizontally, vertically, and diagonally</li>
          <li>Place N queens so none can attack each other</li>
          <li>Red highlights show threatened squares</li>
          <li>Use "Find All Solutions" to see all possibilities</li>
        </ul>
      </div>

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default NQueens;
