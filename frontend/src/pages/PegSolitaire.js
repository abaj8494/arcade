import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';

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
    // Base layout with all pegs - starting position will be set dynamically
    layout: [
      [null, null, 1, 1, 1, null, null],
      [null, 1, 1, 1, 1, 1, null],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [null, 1, 1, 1, 1, 1, null],
      [null, null, 1, 1, 1, null, null],
    ],
    totalPegs: 36,
  },
};

// Valid starting positions for European board (positions that lead to solvable puzzles)
// W = winning/solvable starting positions from the symmetry diagram
// Sorted by row then column so top-left comes first
const EUROPEAN_VALID_STARTS = [
  [0, 2], [0, 4],                 // Top row
  [1, 3],                         // Row 1 - center only
  [2, 0], [2, 3], [2, 6],         // Row 2 - edges and center
  [3, 1], [3, 2], [3, 4], [3, 5], // Middle row
  [4, 0], [4, 3], [4, 6],         // Row 4 - edges and center
  [5, 3],                         // Row 5 - center only
  [6, 2], [6, 4],                 // Bottom row
].sort((a, b) => a[0] - b[0] || a[1] - b[1]); // Sort by row, then column

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
  const [noSolutionFound, setNoSolutionFound] = useState(false);
  const [euroStartIdx, setEuroStartIdx] = useState(0); // Index into EUROPEAN_VALID_STARTS
  const solveIntervalRef = useRef(null);
  const { showHelp, toggleHelp } = useHelpVisibility();

  function cloneBoard(layout) {
    return layout.map(row => [...row]);
  }

  // Initialize board when type or start position changes
  useEffect(() => {
    resetGame();
  }, [boardType, euroStartIdx]);

  const resetGame = useCallback(() => {
    if (solveIntervalRef.current) {
      clearInterval(solveIntervalRef.current);
    }
    const config = BOARDS[boardType];
    const newBoard = cloneBoard(config.layout);

    // For European board, set the starting empty position
    if (boardType === 'european') {
      const [startRow, startCol] = EUROPEAN_VALID_STARTS[euroStartIdx];
      // Fill all positions first, then make the start position empty
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (newBoard[r][c] !== null) {
            newBoard[r][c] = 1;
          }
        }
      }
      newBoard[startRow][startCol] = 0;
    }

    setBoard(newBoard);
    setPegsRemaining(config.totalPegs);
    setSelectedPeg(null);
    setValidMoves([]);
    setMoveHistory([]);
    setGameOver(false);
    setIsSolved(false);
    setIsSolving(false);
    setIsThinking(false);
    setNoSolutionFound(false);
  }, [boardType, euroStartIdx]);

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
      // British: single peg must be at center (3,3)
      // European: any single peg is a win
      const isBritishBoard = boardType === 'british';
      if (newPegsRemaining === 1) {
        if (isBritishBoard) {
          if (newBoard[3][3] === 1) {
            setIsSolved(true);
          }
        } else {
          // European - any single peg wins
          setIsSolved(true);
        }
      }
    }

    return newBoard;
  }, [board, boardType, pegsRemaining, moveHistory, findAllValidMoves]);

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
    setNoSolutionFound(false);
    setSelectedPeg(null);
    setValidMoves([]);
  };

  // Async DFS solver - fast version without expensive symmetry computation
  /* eslint-disable no-undef */
  const findSolutionAsync = useCallback((startBoard, onProgress) => {
    return new Promise((resolve) => {
      console.log('=== PEG SOLITAIRE SOLVER START ===');

      let solution = null;
      let expanded = 0;
      const maxExpansions = 12000000;
      const visited = new Set();

      // Count valid positions to detect board type
      let numPositions = 0;
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (startBoard[r][c] !== null) numPositions++;
        }
      }
      const isBritish = numPositions === 33;
      console.log(`Board type: ${isBritish ? 'British' : 'European'} (${numPositions} positions)`);

      // Fast state encoding: pack board into a string key
      const encodeBoard = (board) => {
        let key = '';
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 7; c++) {
            if (board[r][c] !== null) {
              key += board[r][c];
            }
          }
        }
        return key;
      };

      // Count pegs
      const countPegs = (board) => {
        let count = 0;
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 7; c++) {
            if (board[r][c] === 1) count++;
          }
        }
        return count;
      };

      // Check if solved
      const isSolved = (board) => {
        const pegs = countPegs(board);
        if (pegs !== 1) return false;
        if (isBritish) return board[3][3] === 1;
        return true;
      };

      // Get valid moves - order matches Python: up, left, down, right
      const getValidMoves = (board) => {
        const moves = [];
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 7; c++) {
            if (board[r][c] !== 1) continue;
            // up
            if (r > 1 && board[r-1][c] === 1 && board[r-2][c] === 0)
              moves.push({ from: [r, c], to: [r-2, c], over: [r-1, c] });
            // left
            if (c > 1 && board[r][c-1] === 1 && board[r][c-2] === 0)
              moves.push({ from: [r, c], to: [r, c-2], over: [r, c-1] });
            // down
            if (r < 5 && board[r+1][c] === 1 && board[r+2][c] === 0)
              moves.push({ from: [r, c], to: [r+2, c], over: [r+1, c] });
            // right
            if (c < 5 && board[r][c+1] === 1 && board[r][c+2] === 0)
              moves.push({ from: [r, c], to: [r, c+2], over: [r, c+1] });
          }
        }
        return moves;
      };

      const makeMove = (board, move) => {
        board[move.from[0]][move.from[1]] = 0;
        board[move.over[0]][move.over[1]] = 0;
        board[move.to[0]][move.to[1]] = 1;
      };
      const undoMove = (board, move) => {
        board[move.from[0]][move.from[1]] = 1;
        board[move.over[0]][move.over[1]] = 1;
        board[move.to[0]][move.to[1]] = 0;
      };

      const board = startBoard.map(row => [...row]);
      const solutionMoves = [];

      // Mark initial state
      visited.add(encodeBoard(board));
      expanded++;

      if (isSolved(board)) {
        resolve([]);
        return;
      }

      const stack = [{ moves: getValidMoves(board), moveIdx: 0 }];
      const CHUNK_SIZE = 20000;
      let iterations = 0;

      const processChunk = () => {
        const chunkStart = iterations;

        while (stack.length > 0 && !solution && expanded < maxExpansions) {
          iterations++;
          if (iterations - chunkStart >= CHUNK_SIZE) {
            setTimeout(processChunk, 0);
            return;
          }

          const frame = stack[stack.length - 1];
          let foundMove = false;

          while (frame.moveIdx < frame.moves.length) {
            const move = frame.moves[frame.moveIdx];
            frame.moveIdx++;

            makeMove(board, move);
            const stateKey = encodeBoard(board);

            if (!visited.has(stateKey)) {
              visited.add(stateKey);
              expanded++;

              if (expanded % 500000 === 0) {
                console.log(`Expanded: ${expanded}, depth: ${solutionMoves.length + 1}`);
              }

              if (isSolved(board)) {
                console.log(`FOUND SOLUTION! Expanded ${expanded} states.`);
                solutionMoves.push(move);
                solution = solutionMoves.map(m => ({ from: m.from, to: m.to }));
                break;
              }

              solutionMoves.push(move);
              stack.push({ moves: getValidMoves(board), moveIdx: 0 });
              foundMove = true;
              break;
            } else {
              undoMove(board, move);
            }
          }

          if (solution) break;

          if (!foundMove) {
            stack.pop();
            if (solutionMoves.length > 0) {
              undoMove(board, solutionMoves.pop());
            }
          }
        }

        console.log('=== SOLVER FINISHED ===');
        console.log('Total expanded:', expanded);
        console.log('Solution found:', solution ? `Yes, ${solution.length} moves` : 'No');

        resolve(solution || []);
      };

      processChunk();
    });
  }, []);
  /* eslint-enable no-undef */

  // Solve with animation - from current board state
  const solvePuzzle = useCallback(async () => {
    // Check if there are any valid moves first
    const currentMoves = findAllValidMoves(board);
    if (currentMoves.length === 0) {
      // No moves available - already stuck
      setNoSolutionFound(true);
      setGameOver(true);
      return;
    }

    setIsSolving(true);
    setIsThinking(true);
    setGameOver(false);
    setIsSolved(false);
    setNoSolutionFound(false);
    setSelectedPeg(null);
    setValidMoves([]);

    // Use current board state
    const startBoard = cloneBoard(board);
    const startPegs = pegsRemaining;

    // Run async solver (yields to event loop periodically)
    const solution = await findSolutionAsync(startBoard);
    setIsThinking(false);

    if (solution.length === 0) {
      setIsSolving(false);
      setGameOver(true);
      setIsSolved(false);
      setNoSolutionFound(true);
      return;
    }

    let currentBoard = cloneBoard(board);
    let currentPegs = startPegs;
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
  }, [board, pegsRemaining, findAllValidMoves, findSolutionAsync]);

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
      <div className="flex items-center gap-4 mb-2">
        <h1 className="text-3xl font-bold">Peg Solitaire</h1>
        <HelpButton onClick={toggleHelp} isActive={showHelp} />
      </div>
      <p className="text-gray-400 mb-4">
        {boardType === 'british'
          ? 'Remove all pegs except one in the centre'
          : 'Remove all pegs until only one remains'}
      </p>

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

      {/* European Starting Position Selector */}
      {boardType === 'european' && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-gray-400">Starting position</span>
          <button
            onClick={() => setEuroStartIdx((euroStartIdx - 1 + EUROPEAN_VALID_STARTS.length) % EUROPEAN_VALID_STARTS.length)}
            disabled={isSolving}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50 disabled:cursor-not-allowed text-lg font-bold"
          >
            ←
          </button>
          <span className="text-white font-mono w-16 text-center">
            ({EUROPEAN_VALID_STARTS[euroStartIdx][0]},{EUROPEAN_VALID_STARTS[euroStartIdx][1]})
          </span>
          <button
            onClick={() => setEuroStartIdx((euroStartIdx + 1) % EUROPEAN_VALID_STARTS.length)}
            disabled={isSolving}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded disabled:opacity-50 disabled:cursor-not-allowed text-lg font-bold"
          >
            →
          </button>
        </div>
      )}

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
              isSolved ? 'bg-green-600' : noSolutionFound ? 'bg-orange-600' : 'bg-red-600'
            }`}
          >
            {isSolved
              ? 'Perfect! You solved it!'
              : noSolutionFound
              ? 'No solution possible from this position!'
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
          disabled={isSolving || gameOver}
        >
          {isThinking ? 'Thinking...' : isSolving ? 'Solving...' : 'Solve'}
        </button>
      </div>

      {/* Instructions */}
      {showHelp && (
        <div className="p-4 bg-surface rounded-lg max-w-md text-gray-400 text-sm">
          <h3 className="text-white font-semibold mb-2">How to Play:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Click a peg to select it</li>
            <li>Click a valid empty hole to jump to it</li>
            <li>Pegs can only jump over adjacent pegs</li>
            <li>The jumped-over peg is removed</li>
            <li>Goal: {boardType === 'british' ? 'Leave exactly 1 peg in the centre' : 'Leave exactly 1 peg anywhere'}</li>
          </ul>
        </div>
      )}

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default PegSolitaire;
