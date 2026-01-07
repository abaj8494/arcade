import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 28;

const PIECES = {
  I: { shape: [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], color: '#00f0f0' },
  O: { shape: [[1,1], [1,1]], color: '#f0f000' },
  T: { shape: [[0,1,0], [1,1,1], [0,0,0]], color: '#a000f0' },
  S: { shape: [[0,1,1], [1,1,0], [0,0,0]], color: '#00f000' },
  Z: { shape: [[1,1,0], [0,1,1], [0,0,0]], color: '#f00000' },
  J: { shape: [[1,0,0], [1,1,1], [0,0,0]], color: '#0000f0' },
  L: { shape: [[0,0,1], [1,1,1], [0,0,0]], color: '#f0a000' },
};

const PIECE_NAMES = Object.keys(PIECES);

const Tetris = () => {
  const [board, setBoard] = useState(() => createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState(null);
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [nextPiece, setNextPiece] = useState(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('tetrisHighScore');
    return saved ? parseInt(saved) : 0;
  });

  const gameLoopRef = useRef(null);
  const lastDropRef = useRef(Date.now());
  const boardRef = useRef(board);

  function createEmptyBoard() {
    return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null));
  }

  const getRandomPiece = useCallback(() => {
    const name = PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)];
    return { name, ...PIECES[name] };
  }, []);

  const rotate = useCallback((matrix) => {
    const N = matrix.length;
    const rotated = matrix.map((row, i) =>
      row.map((_, j) => matrix[N - 1 - j][i])
    );
    return rotated;
  }, []);

  const isValidPosition = useCallback((piece, pos, boardState) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = pos.x + x;
          const newY = pos.y + y;

          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return false;
          }

          if (newY >= 0 && boardState[newY][newX]) {
            return false;
          }
        }
      }
    }
    return true;
  }, []);

  const mergePieceToBoard = useCallback((piece, pos, boardState) => {
    const newBoard = boardState.map(row => [...row]);
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = pos.y + y;
          const boardX = pos.x + x;
          if (boardY >= 0 && boardY < BOARD_HEIGHT) {
            newBoard[boardY][boardX] = piece.color;
          }
        }
      }
    }
    return newBoard;
  }, []);

  const clearLines = useCallback((boardState) => {
    let linesCleared = 0;
    const newBoard = boardState.filter(row => {
      const isFull = row.every(cell => cell !== null);
      if (isFull) linesCleared++;
      return !isFull;
    });

    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(null));
    }

    return { newBoard, linesCleared };
  }, []);

  const spawnPiece = useCallback(() => {
    const piece = nextPiece || getRandomPiece();
    const pos = {
      x: Math.floor((BOARD_WIDTH - piece.shape[0].length) / 2),
      y: 0
    };

    if (!isValidPosition(piece, pos, boardRef.current)) {
      setGameOver(true);
      setIsPlaying(false);
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('tetrisHighScore', score.toString());
      }
      return false;
    }

    setCurrentPiece(piece);
    setCurrentPos(pos);
    setNextPiece(getRandomPiece());
    return true;
  }, [nextPiece, getRandomPiece, isValidPosition, score, highScore]);

  const drop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;

    const newPos = { x: currentPos.x, y: currentPos.y + 1 };

    if (isValidPosition(currentPiece, newPos, boardRef.current)) {
      setCurrentPos(newPos);
    } else {
      // Lock piece
      const mergedBoard = mergePieceToBoard(currentPiece, currentPos, boardRef.current);
      const { newBoard, linesCleared } = clearLines(mergedBoard);

      setBoard(newBoard);
      boardRef.current = newBoard;

      if (linesCleared > 0) {
        const points = [0, 100, 300, 500, 800][linesCleared] * level;
        setScore(s => s + points);
        setLines(l => {
          const newLines = l + linesCleared;
          setLevel(Math.floor(newLines / 10) + 1);
          return newLines;
        });
      }

      spawnPiece();
    }
  }, [currentPiece, currentPos, gameOver, isPaused, isValidPosition, mergePieceToBoard, clearLines, level, spawnPiece]);

  const hardDrop = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;

    let newY = currentPos.y;
    while (isValidPosition(currentPiece, { x: currentPos.x, y: newY + 1 }, boardRef.current)) {
      newY++;
    }

    const dropDistance = newY - currentPos.y;
    setScore(s => s + dropDistance * 2);
    setCurrentPos({ x: currentPos.x, y: newY });

    // Immediately lock
    const mergedBoard = mergePieceToBoard(currentPiece, { x: currentPos.x, y: newY }, boardRef.current);
    const { newBoard, linesCleared } = clearLines(mergedBoard);

    setBoard(newBoard);
    boardRef.current = newBoard;

    if (linesCleared > 0) {
      const points = [0, 100, 300, 500, 800][linesCleared] * level;
      setScore(s => s + points);
      setLines(l => {
        const newLines = l + linesCleared;
        setLevel(Math.floor(newLines / 10) + 1);
        return newLines;
      });
    }

    spawnPiece();
  }, [currentPiece, currentPos, gameOver, isPaused, isValidPosition, mergePieceToBoard, clearLines, level, spawnPiece]);

  const moveHorizontal = useCallback((dir) => {
    if (!currentPiece || gameOver || isPaused) return;

    const newPos = { x: currentPos.x + dir, y: currentPos.y };
    if (isValidPosition(currentPiece, newPos, boardRef.current)) {
      setCurrentPos(newPos);
    }
  }, [currentPiece, currentPos, gameOver, isPaused, isValidPosition]);

  const rotatePiece = useCallback(() => {
    if (!currentPiece || gameOver || isPaused) return;

    const rotated = rotate(currentPiece.shape);
    const rotatedPiece = { ...currentPiece, shape: rotated };

    // Try rotation with wall kicks
    const kicks = [0, 1, -1, 2, -2];
    for (const kick of kicks) {
      const newPos = { x: currentPos.x + kick, y: currentPos.y };
      if (isValidPosition(rotatedPiece, newPos, boardRef.current)) {
        setCurrentPiece(rotatedPiece);
        setCurrentPos(newPos);
        return;
      }
    }
  }, [currentPiece, currentPos, gameOver, isPaused, rotate, isValidPosition]);

  const startGame = useCallback(() => {
    const emptyBoard = createEmptyBoard();
    setBoard(emptyBoard);
    boardRef.current = emptyBoard;
    setScore(0);
    setLevel(1);
    setLines(0);
    setGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);
    setNextPiece(getRandomPiece());

    const piece = getRandomPiece();
    const pos = {
      x: Math.floor((BOARD_WIDTH - piece.shape[0].length) / 2),
      y: 0
    };
    setCurrentPiece(piece);
    setCurrentPos(pos);
  }, [getRandomPiece]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver || isPaused) return;

    const dropInterval = Math.max(100, 1000 - (level - 1) * 100);

    gameLoopRef.current = setInterval(() => {
      drop();
    }, dropInterval);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [isPlaying, gameOver, isPaused, level, drop]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying) {
        if (e.key === 'Enter') startGame();
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveHorizontal(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveHorizontal(1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          drop();
          break;
        case 'ArrowUp':
          e.preventDefault();
          rotatePiece();
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          setIsPaused(p => !p);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, moveHorizontal, drop, rotatePiece, hardDrop, startGame]);

  // Get ghost piece position
  const getGhostY = useCallback(() => {
    if (!currentPiece) return currentPos.y;

    let ghostY = currentPos.y;
    while (isValidPosition(currentPiece, { x: currentPos.x, y: ghostY + 1 }, board)) {
      ghostY++;
    }
    return ghostY;
  }, [currentPiece, currentPos, board, isValidPosition]);

  // Render the board with current piece
  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    const ghostY = getGhostY();

    // Draw ghost piece
    if (currentPiece && !gameOver) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = ghostY + y;
            const boardX = currentPos.x + x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              if (!displayBoard[boardY][boardX]) {
                displayBoard[boardY][boardX] = 'ghost';
              }
            }
          }
        }
      }
    }

    // Draw current piece
    if (currentPiece && !gameOver) {
      for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
          if (currentPiece.shape[y][x]) {
            const boardY = currentPos.y + y;
            const boardX = currentPos.x + x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT) {
              displayBoard[boardY][boardX] = currentPiece.color;
            }
          }
        }
      }
    }

    return displayBoard;
  };

  const renderNextPiece = () => {
    if (!nextPiece) return null;

    return (
      <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${nextPiece.shape[0].length}, 1fr)` }}>
        {nextPiece.shape.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${y}-${x}`}
              className="w-5 h-5 rounded-sm"
              style={{
                backgroundColor: cell ? nextPiece.color : 'transparent',
                border: cell ? '1px solid rgba(255,255,255,0.3)' : 'none'
              }}
            />
          ))
        )}
      </div>
    );
  };

  const displayBoard = renderBoard();

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">Tetris</h1>

      <div className="flex gap-6">
        {/* Game Board */}
        <div className="relative">
          <div
            className="grid gap-px bg-gray-800 p-1 rounded"
            style={{
              gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${BOARD_HEIGHT}, ${CELL_SIZE}px)`,
            }}
          >
            {displayBoard.map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${y}-${x}`}
                  className="rounded-sm transition-colors"
                  style={{
                    backgroundColor: cell === 'ghost' ? 'rgba(255,255,255,0.1)' :
                                    cell ? cell : '#1e293b',
                    border: cell && cell !== 'ghost' ? '1px solid rgba(255,255,255,0.2)' : 'none',
                    boxShadow: cell && cell !== 'ghost' ? 'inset 0 0 5px rgba(255,255,255,0.2)' : 'none'
                  }}
                />
              ))
            )}
          </div>

          {/* Game Over Overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded">
              <p className="text-2xl font-bold text-red-500 mb-2">Game Over!</p>
              <p className="text-xl mb-4">Score: {score}</p>
              <button onClick={startGame} className="btn btn-primary">
                Play Again
              </button>
            </div>
          )}

          {/* Paused Overlay */}
          {isPaused && !gameOver && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded">
              <p className="text-2xl font-bold">Paused</p>
            </div>
          )}

          {/* Start Screen */}
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded">
              <p className="text-2xl font-bold mb-4">Tetris</p>
              <button onClick={startGame} className="btn btn-primary">
                Start Game
              </button>
              <p className="text-sm text-gray-400 mt-4">Press Enter to start</p>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-4">
          {/* Score */}
          <div className="bg-surface p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Score</div>
            <div className="text-2xl font-bold text-primary">{score}</div>
          </div>

          {/* High Score */}
          <div className="bg-surface p-4 rounded-lg">
            <div className="text-gray-400 text-sm">High Score</div>
            <div className="text-xl font-bold text-yellow-400">{highScore}</div>
          </div>

          {/* Level */}
          <div className="bg-surface p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Level</div>
            <div className="text-xl font-bold">{level}</div>
          </div>

          {/* Lines */}
          <div className="bg-surface p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Lines</div>
            <div className="text-xl font-bold">{lines}</div>
          </div>

          {/* Next Piece */}
          <div className="bg-surface p-4 rounded-lg">
            <div className="text-gray-400 text-sm mb-2">Next</div>
            <div className="flex justify-center">
              {renderNextPiece()}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-surface p-4 rounded-lg text-sm text-gray-400">
            <div className="font-semibold text-white mb-2">Controls:</div>
            <div>← → Move</div>
            <div>↑ Rotate</div>
            <div>↓ Soft drop</div>
            <div>Space Hard drop</div>
            <div>P Pause</div>
          </div>
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="mt-4 flex gap-2 sm:hidden">
        <button onClick={() => moveHorizontal(-1)} className="btn bg-gray-600 w-12 h-12 text-xl">←</button>
        <button onClick={rotatePiece} className="btn bg-gray-600 w-12 h-12 text-xl">↻</button>
        <button onClick={() => drop()} className="btn bg-gray-600 w-12 h-12 text-xl">↓</button>
        <button onClick={() => moveHorizontal(1)} className="btn bg-gray-600 w-12 h-12 text-xl">→</button>
        <button onClick={hardDrop} className="btn bg-primary w-12 h-12 text-sm">Drop</button>
      </div>

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default Tetris;
