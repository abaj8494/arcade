import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';

const BOARD_SIZE = 8;
const CELL_SIZE = 60;

// Knight move offsets
const KNIGHT_MOVES = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1]
];

const KnightsTour = () => {
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [knightPosition, setKnightPosition] = useState(null);
  const [moveCount, setMoveCount] = useState(0);
  const [validMoves, setValidMoves] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [history, setHistory] = useState([]);
  const solveTimeoutRef = useRef(null);
  const { showHelp, toggleHelp } = useHelpVisibility();

  function createEmptyBoard() {
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
  }

  const getValidMoves = useCallback((row, col, currentBoard) => {
    const moves = [];
    for (const [dr, dc] of KNIGHT_MOVES) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (
        newRow >= 0 && newRow < BOARD_SIZE &&
        newCol >= 0 && newCol < BOARD_SIZE &&
        currentBoard[newRow][newCol] === 0
      ) {
        moves.push([newRow, newCol]);
      }
    }
    return moves;
  }, []);

  // Warnsdorff's heuristic: prefer squares with fewer onward moves
  const sortMovesByWarnsdorff = useCallback((moves, currentBoard) => {
    return moves.sort((a, b) => {
      const aOnward = getValidMoves(a[0], a[1], currentBoard).length;
      const bOnward = getValidMoves(b[0], b[1], currentBoard).length;
      return aOnward - bOnward;
    });
  }, [getValidMoves]);

  const handleCellClick = (row, col) => {
    if (isSolving) return;

    if (knightPosition === null) {
      // Place knight initially
      const newBoard = createEmptyBoard();
      newBoard[row][col] = 1;
      setBoard(newBoard);
      setKnightPosition([row, col]);
      setMoveCount(1);
      setValidMoves(getValidMoves(row, col, newBoard));
      setHistory([[row, col]]);
      setGameOver(false);
      setIsComplete(false);
    } else {
      // Try to move knight
      const isValidMove = validMoves.some(([r, c]) => r === row && c === col);
      if (isValidMove) {
        const newBoard = board.map(r => [...r]);
        const newMoveCount = moveCount + 1;
        newBoard[row][col] = newMoveCount;
        setBoard(newBoard);
        setKnightPosition([row, col]);
        setMoveCount(newMoveCount);
        setHistory([...history, [row, col]]);

        const newValidMoves = getValidMoves(row, col, newBoard);
        setValidMoves(newValidMoves);

        if (newMoveCount === BOARD_SIZE * BOARD_SIZE) {
          setIsComplete(true);
          setGameOver(true);
        } else if (newValidMoves.length === 0) {
          setGameOver(true);
        }
      }
    }
  };

  const undoMove = () => {
    if (history.length <= 1 || isSolving) return;

    const newHistory = history.slice(0, -1);
    const newBoard = createEmptyBoard();

    newHistory.forEach(([r, c], idx) => {
      newBoard[r][c] = idx + 1;
    });

    const lastPos = newHistory[newHistory.length - 1];
    setBoard(newBoard);
    setKnightPosition(lastPos);
    setMoveCount(newHistory.length);
    setHistory(newHistory);
    setValidMoves(getValidMoves(lastPos[0], lastPos[1], newBoard));
    setGameOver(false);
    setIsComplete(false);
  };

  const resetGame = () => {
    if (solveTimeoutRef.current) {
      clearTimeout(solveTimeoutRef.current);
    }
    setBoard(createEmptyBoard());
    setKnightPosition(null);
    setMoveCount(0);
    setValidMoves([]);
    setGameOver(false);
    setIsComplete(false);
    setIsSolving(false);
    setHistory([]);
  };

  // Solve using Warnsdorff's algorithm with animation
  const solveTour = useCallback(async () => {
    if (knightPosition === null) {
      // Start from corner
      const startRow = 0;
      const startCol = 0;
      const newBoard = createEmptyBoard();
      newBoard[startRow][startCol] = 1;
      setBoard(newBoard);
      setKnightPosition([startRow, startCol]);
      setMoveCount(1);
      setHistory([[startRow, startCol]]);
    }

    setIsSolving(true);
    setGameOver(false);
    setIsComplete(false);

    let currentBoard = knightPosition ? board.map(r => [...r]) : createEmptyBoard();
    let currentPos = knightPosition || [0, 0];
    let count = moveCount || 1;
    let path = history.length ? [...history] : [[0, 0]];

    if (!knightPosition) {
      currentBoard[0][0] = 1;
    }

    const animate = () => {
      const moves = getValidMoves(currentPos[0], currentPos[1], currentBoard);

      if (moves.length === 0) {
        if (count === BOARD_SIZE * BOARD_SIZE) {
          setIsComplete(true);
        }
        setGameOver(true);
        setIsSolving(false);
        return;
      }

      // Use Warnsdorff's heuristic
      const sortedMoves = sortMovesByWarnsdorff(moves, currentBoard);
      const [nextRow, nextCol] = sortedMoves[0];

      count++;
      currentBoard[nextRow][nextCol] = count;
      currentPos = [nextRow, nextCol];
      path.push(currentPos);

      setBoard([...currentBoard.map(r => [...r])]);
      setKnightPosition([nextRow, nextCol]);
      setMoveCount(count);
      setValidMoves(getValidMoves(nextRow, nextCol, currentBoard));
      setHistory([...path]);

      if (count === BOARD_SIZE * BOARD_SIZE) {
        setIsComplete(true);
        setGameOver(true);
        setIsSolving(false);
        return;
      }

      solveTimeoutRef.current = setTimeout(animate, 100);
    };

    solveTimeoutRef.current = setTimeout(animate, 100);
  }, [knightPosition, board, moveCount, history, getValidMoves, sortMovesByWarnsdorff]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (solveTimeoutRef.current) {
        clearTimeout(solveTimeoutRef.current);
      }
    };
  }, []);

  const getCellClass = (row, col) => {
    const isLight = (row + col) % 2 === 0;
    const isKnight = knightPosition && knightPosition[0] === row && knightPosition[1] === col;
    const isValid = validMoves.some(([r, c]) => r === row && c === col);
    const isVisited = board[row][col] > 0;

    let classes = `w-[${CELL_SIZE}px] h-[${CELL_SIZE}px] flex items-center justify-center relative cursor-pointer transition-colors `;

    if (isKnight) {
      classes += 'bg-yellow-500 ';
    } else if (isValid && showHints) {
      classes += 'bg-green-500/50 hover:bg-green-500/70 ';
    } else if (isVisited) {
      classes += isLight ? 'bg-blue-300 ' : 'bg-blue-600 ';
    } else {
      classes += isLight ? 'bg-amber-100 hover:bg-amber-200 ' : 'bg-amber-700 hover:bg-amber-600 ';
    }

    return classes;
  };

  // Count onward moves for hint display
  const getOnwardCount = (row, col) => {
    if (!showHints) return null;
    const tempBoard = board.map(r => [...r]);
    tempBoard[row][col] = moveCount + 1;
    return getValidMoves(row, col, tempBoard).length;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4 mb-2">
        <h1 className="text-3xl font-bold">Knight's Tour</h1>
        <HelpButton onClick={toggleHelp} isActive={showHelp} />
      </div>
      <p className="text-gray-400 mb-4">Visit all 64 squares with a knight</p>

      {/* Status */}
      <div className="mb-4 text-xl">
        {!knightPosition && <span>Click a square to place the knight</span>}
        {knightPosition && !gameOver && (
          <span>Moves: <span className="text-primary font-bold">{moveCount}</span> / 64</span>
        )}
        {isComplete && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-green-500 font-bold"
          >
            Tour Complete!
          </motion.span>
        )}
        {gameOver && !isComplete && (
          <span className="text-red-500">No more moves! ({moveCount}/64)</span>
        )}
      </div>

      {/* Board */}
      <div className="border-4 border-amber-900 rounded">
        <div className="grid grid-cols-8">
          {board.map((row, rowIdx) =>
            row.map((cell, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={getCellClass(rowIdx, colIdx)}
                style={{ width: CELL_SIZE, height: CELL_SIZE }}
                onClick={() => handleCellClick(rowIdx, colIdx)}
              >
                {knightPosition && knightPosition[0] === rowIdx && knightPosition[1] === colIdx ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-3xl"
                  >
                    ♞
                  </motion.span>
                ) : cell > 0 ? (
                  <span className="text-sm font-bold text-gray-800">{cell}</span>
                ) : validMoves.some(([r, c]) => r === rowIdx && c === colIdx) && showHints ? (
                  <span className="text-xs text-gray-600">{getOnwardCount(rowIdx, colIdx)}</span>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex gap-2 flex-wrap justify-center">
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
          disabled={history.length <= 1 || isSolving}
        >
          Undo
        </button>
        <button
          onClick={solveTour}
          className="btn bg-green-600 hover:bg-green-500"
          disabled={isSolving || isComplete}
        >
          {isSolving ? 'Solving...' : 'Auto Solve'}
        </button>
        <button
          onClick={() => setShowHints(!showHints)}
          className={`btn ${showHints ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          Hints {showHints ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Instructions */}
      {showHelp && (
        <div className="mt-4 p-4 bg-surface rounded-lg max-w-md text-gray-400 text-sm">
          <h3 className="text-white font-semibold mb-2">How to Play:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Click to place the knight, then move it like in chess</li>
            <li>Visit all 64 squares exactly once</li>
            <li>Green squares show valid moves</li>
            <li>Numbers show how many onward moves are available (Warnsdorff's hint)</li>
            <li>Lower numbers = safer choices</li>
          </ul>
        </div>
      )}

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default KnightsTour;
