import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Board layouts - null = invalid, 0 = empty, 1 = peg
const BOARDS = {
  british: {
    name: 'British (English)',
    layout: [
      [null, null, 1, 1, 1, null, null],
      [null, null, 1, 1, 1, null, null],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 1, 1, 1], // Centre empty
      [1, 1, 1, 1, 1, 1, 1],
      [null, null, 1, 1, 1, null, null],
      [null, null, 1, 1, 1, null, null],
    ],
    totalPegs: 32,
  },
  european: {
    name: 'European',
    layout: [
      [null, null, 1, 1, 1, null, null],
      [null, 1, 1, 1, 1, 1, null],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 1, 1, 1, 1], // Position (3,1) empty - solvable
      [1, 1, 1, 1, 1, 1, 1],
      [null, 1, 1, 1, 1, 1, null],
      [null, null, 1, 1, 1, null, null],
    ],
    totalPegs: 36,
  },
};

const DIRECTIONS = [
  [-2, 0], // up
  [2, 0],  // down
  [0, -2], // left
  [0, 2],  // right
];

const PegSolitaire = () => {
  const [boardType, setBoardType] = useState('british');
  const [board, setBoard] = useState(() => cloneBoard(BOARDS.british.layout));
  const [selectedPeg, setSelectedPeg] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [pegsRemaining, setPegsRemaining] = useState(32);
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [solutionMoves, setSolutionMoves] = useState([]);
  const solveIntervalRef = useRef(null);

  function cloneBoard(layout) {
    return layout.map(row => [...row]);
  }

  // Initialize board when type changes
  useEffect(() => {
    resetGame();
  }, [boardType]);

  const resetGame = useCallback(() => {
    if (solveIntervalRef.current) {
      clearInterval(solveIntervalRef.current);
    }
    const config = BOARDS[boardType];
    setBoard(cloneBoard(config.layout));
    setPegsRemaining(config.totalPegs);
    setSelectedPeg(null);
    setValidMoves([]);
    setMoveHistory([]);
    setGameOver(false);
    setIsSolved(false);
    setIsSolving(false);
    setIsThinking(false);
    setSolutionMoves([]);
  }, [boardType]);

  // Find valid moves for a peg
  const findValidMovesForPeg = useCallback((board, row, col) => {
    const moves = [];
    for (const [dr, dc] of DIRECTIONS) {
      const midRow = row + dr / 2;
      const midCol = col + dc / 2;
      const endRow = row + dr;
      const endCol = col + dc;

      if (
        endRow >= 0 && endRow < 7 &&
        endCol >= 0 && endCol < 7 &&
        board[midRow]?.[midCol] === 1 && // Peg to jump over
        board[endRow]?.[endCol] === 0    // Empty destination
      ) {
        moves.push({ endRow, endCol, midRow, midCol });
      }
    }
    return moves;
  }, []);

  // Find all valid moves on the board
  const findAllValidMoves = useCallback((board) => {
    const moves = [];
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (board[r][c] === 1) {
          const pegMoves = findValidMovesForPeg(board, r, c);
          moves.push(...pegMoves.map(m => ({ startRow: r, startCol: c, ...m })));
        }
      }
    }
    return moves;
  }, [findValidMovesForPeg]);

  // Handle peg click
  const handleCellClick = (row, col) => {
    if (gameOver || isSolving) return;

    const cell = board[row][col];

    if (cell === 1) {
      // Select this peg
      const moves = findValidMovesForPeg(board, row, col);
      if (moves.length > 0) {
        setSelectedPeg({ row, col });
        setValidMoves(moves);
      }
    } else if (cell === 0 && selectedPeg) {
      // Try to move to this empty cell
      const move = validMoves.find(m => m.endRow === row && m.endCol === col);
      if (move) {
        makeMove(selectedPeg.row, selectedPeg.col, move);
      }
      setSelectedPeg(null);
      setValidMoves([]);
    }
  };

  // Make a move
  const makeMove = useCallback((startRow, startCol, move) => {
    const newBoard = cloneBoard(board);
    newBoard[startRow][startCol] = 0;
    newBoard[move.midRow][move.midCol] = 0;
    newBoard[move.endRow][move.endCol] = 1;
    setBoard(newBoard);

    const newPegsRemaining = pegsRemaining - 1;
    setPegsRemaining(newPegsRemaining);

    setMoveHistory([...moveHistory, {
      from: { row: startRow, col: startCol },
      over: { row: move.midRow, col: move.midCol },
      to: { row: move.endRow, col: move.endCol }
    }]);

    // Check game state
    const allMoves = findAllValidMoves(newBoard);
    if (allMoves.length === 0) {
      setGameOver(true);
      if (newPegsRemaining === 1 && newBoard[3][3] === 1) {
        setIsSolved(true);
      }
    }

    return newBoard;
  }, [board, pegsRemaining, moveHistory, findAllValidMoves]);

  // Undo last move
  const undoMove = () => {
    if (moveHistory.length === 0 || isSolving) return;

    const lastMove = moveHistory[moveHistory.length - 1];
    const newBoard = cloneBoard(board);
    newBoard[lastMove.from.row][lastMove.from.col] = 1;
    newBoard[lastMove.over.row][lastMove.over.col] = 1;
    newBoard[lastMove.to.row][lastMove.to.col] = 0;
    setBoard(newBoard);
    setPegsRemaining(pegsRemaining + 1);
    setMoveHistory(moveHistory.slice(0, -1));
    setGameOver(false);
    setIsSolved(false);
    setSelectedPeg(null);
    setValidMoves([]);
  };

  // Optimised DFS solver with memoisation
  const findSolution = useCallback((startBoard) => {
    const solution = [];
    const visited = new Set();

    // Convert board to string for memoisation
    const boardToKey = (board) => {
      return board.map(row => row.map(c => c === null ? 'x' : c).join('')).join('');
    };

    const getAllMoves = (board) => {
      const moves = [];
      // Prioritise moves towards centre for better pruning
      const order = [[3,3], [2,3], [3,2], [3,4], [4,3], [2,2], [2,4], [4,2], [4,4]];
      const checked = new Set();

      // Check centre-adjacent positions first
      for (const [r, c] of order) {
        if (board[r]?.[c] === 1) {
          for (const [dr, dc] of DIRECTIONS) {
            const midR = r + dr / 2;
            const midC = c + dc / 2;
            const endR = r + dr;
            const endC = c + dc;
            if (endR >= 0 && endR < 7 && endC >= 0 && endC < 7 &&
                board[midR]?.[midC] === 1 && board[endR]?.[endC] === 0) {
              moves.push({ from: [r, c], to: [endR, endC], mid: [midR, midC] });
            }
          }
          checked.add(`${r},${c}`);
        }
      }

      // Check remaining positions
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (board[r][c] === 1 && !checked.has(`${r},${c}`)) {
            for (const [dr, dc] of DIRECTIONS) {
              const midR = r + dr / 2;
              const midC = c + dc / 2;
              const endR = r + dr;
              const endC = c + dc;
              if (endR >= 0 && endR < 7 && endC >= 0 && endC < 7 &&
                  board[midR]?.[midC] === 1 && board[endR]?.[endC] === 0) {
                moves.push({ from: [r, c], to: [endR, endC], mid: [midR, midC] });
              }
            }
          }
        }
      }
      return moves;
    };

    const countPegs = (board) => {
      let count = 0;
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (board[r][c] === 1) count++;
        }
      }
      return count;
    };

    const dfs = (board, moves) => {
      const pegCount = countPegs(board);
      if (pegCount === 1) {
        if (board[3][3] === 1) {
          solution.push(...moves);
          return true;
        }
        return false;
      }

      const key = boardToKey(board);
      if (visited.has(key)) return false;
      visited.add(key);

      const possibleMoves = getAllMoves(board);
      if (possibleMoves.length === 0) return false;

      for (const move of possibleMoves) {
        const [sr, sc] = move.from;
        const [er, ec] = move.to;
        const [mr, mc] = move.mid;

        // Make move in-place for speed
        board[sr][sc] = 0;
        board[mr][mc] = 0;
        board[er][ec] = 1;

        if (dfs(board, [...moves, { from: move.from, to: move.to }])) {
          return true;
        }

        // Undo move
        board[sr][sc] = 1;
        board[mr][mc] = 1;
        board[er][ec] = 0;
      }
      return false;
    };

    // Clone start board for DFS
    const workingBoard = startBoard.map(r => [...r]);
    dfs(workingBoard, []);
    return solution;
  }, []);

  // Solve with animation
  const solvePuzzle = useCallback(() => {
    setIsSolving(true);
    setIsThinking(true);

    // Reset to initial state
    const config = BOARDS[boardType];
    const startBoard = cloneBoard(config.layout);

    setBoard(cloneBoard(config.layout));
    setPegsRemaining(config.totalPegs);
    setMoveHistory([]);
    setGameOver(false);
    setIsSolved(false);
    setSelectedPeg(null);
    setValidMoves([]);

    // Run solver in setTimeout to allow UI to update with thinking state
    setTimeout(() => {
      const solution = findSolution(startBoard);
      setIsThinking(false);

      if (solution.length === 0) {
        setIsSolving(false);
        alert('No solution found for this board configuration.');
        return;
      }

      let currentBoard = cloneBoard(config.layout);
      let currentPegs = config.totalPegs;
      let moveIndex = 0;

      solveIntervalRef.current = setInterval(() => {
        if (moveIndex >= solution.length) {
          clearInterval(solveIntervalRef.current);
          setIsSolving(false);
          setGameOver(true);
          setIsSolved(true);
          return;
        }

        const move = solution[moveIndex];
        const [startRow, startCol] = move.from;
        const [endRow, endCol] = move.to;
        const midRow = (startRow + endRow) / 2;
        const midCol = (startCol + endCol) / 2;

        currentBoard[startRow][startCol] = 0;
        currentBoard[midRow][midCol] = 0;
        currentBoard[endRow][endCol] = 1;
        currentPegs--;

        setBoard([...currentBoard.map(r => [...r])]);
        setPegsRemaining(currentPegs);

        moveIndex++;
      }, 400);
    }, 50);
  }, [boardType, findSolution]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (solveIntervalRef.current) {
        clearInterval(solveIntervalRef.current);
      }
    };
  }, []);

  const getCellClass = (row, col) => {
    const cell = board[row][col];
    if (cell === null) return 'invisible';

    const isSelected = selectedPeg?.row === row && selectedPeg?.col === col;
    const isValidTarget = validMoves.some(m => m.endRow === row && m.endCol === col);

    let classes = 'w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-200 flex items-center justify-center ';

    if (cell === 1) {
      classes += isSelected
        ? 'ring-4 ring-pink-400 cursor-pointer transform scale-110 '
        : 'cursor-pointer ';
    } else {
      // Empty hole - dark depression in the board
      classes += isValidTarget
        ? 'bg-amber-950 ring-2 ring-green-400 cursor-pointer '
        : 'bg-amber-950 ';
    }

    return classes;
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-2">Peg Solitaire</h1>
      <p className="text-gray-400 mb-4">Remove all pegs except one in the centre</p>

      {/* Board Type Selection */}
      <div className="mb-4 flex gap-4">
        {Object.entries(BOARDS).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setBoardType(key)}
            className={`btn ${boardType === key ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
            disabled={isSolving}
          >
            {config.name}
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="mb-4 flex gap-6 text-lg">
        <div>
          Pegs: <span className="text-primary font-bold">{pegsRemaining}</span>
        </div>
        <div>
          Moves: <span className="text-green-500 font-bold">{moveHistory.length}</span>
        </div>
      </div>

      {/* Thinking Indicator */}
      <AnimatePresence>
        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 rounded-lg font-bold bg-blue-600 flex items-center gap-3"
          >
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            Computing solution...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over Message */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className={`mb-4 p-4 rounded-lg font-bold ${
              isSolved ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {isSolved
              ? 'Perfect! You solved it!'
              : `Game Over! ${pegsRemaining} peg${pegsRemaining > 1 ? 's' : ''} remaining`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Board */}
      <div className="bg-amber-900 p-4 rounded-xl shadow-xl mb-4">
        <div className="grid grid-cols-7 gap-1">
          {board.map((row, rowIdx) =>
            row.map((cell, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center"
              >
                {cell !== null && (
                  <motion.div
                    className={getCellClass(rowIdx, colIdx)}
                    onClick={() => handleCellClick(rowIdx, colIdx)}
                    whileHover={cell === 1 && !isSolving ? { scale: 1.1 } : {}}
                    whileTap={cell === 1 && !isSolving ? { scale: 0.95 } : {}}
                    layout
                  >
                    {cell === 1 && (
                      <div className={`w-full h-full rounded-full shadow-lg ${
                        selectedPeg?.row === rowIdx && selectedPeg?.col === colIdx
                          ? 'bg-gradient-to-br from-pink-400 to-pink-600'
                          : 'bg-gradient-to-br from-blue-400 to-blue-700'
                      }`} />
                    )}
                  </motion.div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap justify-center mb-4">
        <button
          onClick={resetGame}
          className="btn bg-red-500 hover:bg-red-600"
          disabled={isSolving}
        >
          Reset
        </button>
        <button
          onClick={undoMove}
          className="btn bg-gray-600 hover:bg-gray-500"
          disabled={moveHistory.length === 0 || isSolving}
        >
          Undo
        </button>
        <button
          onClick={solvePuzzle}
          className="btn bg-green-600 hover:bg-green-500"
          disabled={isSolving}
        >
          {isThinking ? 'Thinking...' : isSolving ? 'Solving...' : 'Show Solution'}
        </button>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-surface rounded-lg max-w-md text-gray-400 text-sm">
        <h3 className="text-white font-semibold mb-2">How to Play:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Click a peg to select it</li>
          <li>Click a valid empty hole to jump to it</li>
          <li>Pegs can only jump over adjacent pegs</li>
          <li>The jumped-over peg is removed</li>
          <li>Goal: Leave exactly 1 peg in the centre</li>
        </ul>
      </div>

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default PegSolitaire;
