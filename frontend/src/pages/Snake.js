import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;

const Snake = () => {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 10 });
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snakeHighScore');
    return saved ? parseInt(saved) : 0;
  });
  const { showHelp, toggleHelp } = useHelpVisibility();

  const directionRef = useRef(direction);
  const gameLoopRef = useRef(null);

  const generateFood = useCallback((snakeBody) => {
    let newFood;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snakeBody.some(segment => segment.x === newFood.x && segment.y === newFood.y));
    return newFood;
  }, []);

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    setSnake(initialSnake);
    setFood(generateFood(initialSnake));
    setDirection({ x: 1, y: 0 });
    directionRef.current = { x: 1, y: 0 };
    setGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setIsPaused(false);
  }, [generateFood]);

  const startGame = useCallback(() => {
    resetGame();
    setIsPlaying(true);
  }, [resetGame]);

  const moveSnake = useCallback(() => {
    if (gameOver || isPaused) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = {
        x: (head.x + directionRef.current.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + directionRef.current.y + GRID_SIZE) % GRID_SIZE,
      };

      // Check self collision
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        setIsPlaying(false);
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem('snakeHighScore', score.toString());
        }
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => {
          const newScore = s + 10;
          // Increase speed every 50 points
          if (newScore % 50 === 0) {
            setSpeed(sp => Math.max(50, sp - 10));
          }
          return newScore;
        });
        setFood(generateFood(newSnake));
        return newSnake;
      }

      // Remove tail if no food eaten
      newSnake.pop();
      return newSnake;
    });
  }, [gameOver, isPaused, food, generateFood, score, highScore]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || gameOver || isPaused) return;

    gameLoopRef.current = setInterval(moveSnake, speed);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [isPlaying, gameOver, isPaused, speed, moveSnake]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying && !gameOver && e.key === 'Enter') {
        startGame();
        return;
      }

      if (gameOver) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (directionRef.current.y !== 1) {
            directionRef.current = { x: 0, y: -1 };
            setDirection({ x: 0, y: -1 });
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (directionRef.current.y !== -1) {
            directionRef.current = { x: 0, y: 1 };
            setDirection({ x: 0, y: 1 });
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (directionRef.current.x !== 1) {
            directionRef.current = { x: -1, y: 0 };
            setDirection({ x: -1, y: 0 });
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (directionRef.current.x !== -1) {
            directionRef.current = { x: 1, y: 0 };
            setDirection({ x: 1, y: 0 });
          }
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          if (isPlaying && !gameOver) {
            setIsPaused(p => !p);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, startGame]);

  // Touch controls for mobile
  const touchStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleTouchStart = (e) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = (e) => {
      if (!isPlaying || gameOver || isPaused) return;

      const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
      const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 30 && directionRef.current.x !== -1) {
          directionRef.current = { x: 1, y: 0 };
          setDirection({ x: 1, y: 0 });
        } else if (deltaX < -30 && directionRef.current.x !== 1) {
          directionRef.current = { x: -1, y: 0 };
          setDirection({ x: -1, y: 0 });
        }
      } else {
        // Vertical swipe
        if (deltaY > 30 && directionRef.current.y !== -1) {
          directionRef.current = { x: 0, y: 1 };
          setDirection({ x: 0, y: 1 });
        } else if (deltaY < -30 && directionRef.current.y !== 1) {
          directionRef.current = { x: 0, y: -1 };
          setDirection({ x: 0, y: -1 });
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPlaying, gameOver, isPaused]);

  const renderGrid = () => {
    const cells = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isSnakeHead = snake[0].x === x && snake[0].y === y;
        const isSnakeBody = snake.slice(1).some(segment => segment.x === x && segment.y === y);
        const isFood = food.x === x && food.y === y;

        let backgroundColor = '#1e293b';
        let boxShadow = 'none';

        if (isSnakeHead) {
          backgroundColor = '#22c55e';
          boxShadow = '0 0 10px #22c55e';
        } else if (isSnakeBody) {
          backgroundColor = '#16a34a';
        } else if (isFood) {
          backgroundColor = '#ef4444';
          boxShadow = '0 0 10px #ef4444';
        }

        cells.push(
          <div
            key={`${x}-${y}`}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundColor,
              boxShadow,
              borderRadius: isSnakeHead || isFood ? '4px' : '2px',
              transition: 'background-color 0.1s',
            }}
          />
        );
      }
    }

    return cells;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">Snake</h1>
        <HelpButton onClick={toggleHelp} isActive={showHelp} />
      </div>

      <div className="flex gap-6">
        {/* Game Board */}
        <div className="relative">
          <div
            className="grid gap-px bg-gray-800 p-2 rounded-lg"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
            }}
          >
            {renderGrid()}
          </div>

          {/* Game Over Overlay */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-lg">
              <p className="text-2xl font-bold text-red-500 mb-2">Game Over!</p>
              <p className="text-xl mb-4">Score: {score}</p>
              {score > highScore - 10 && score <= highScore && (
                <p className="text-yellow-400 mb-4">New High Score!</p>
              )}
              <button onClick={startGame} className="btn btn-primary">
                Play Again
              </button>
            </div>
          )}

          {/* Paused Overlay */}
          {isPaused && !gameOver && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
              <p className="text-2xl font-bold">Paused</p>
            </div>
          )}

          {/* Start Screen */}
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-lg">
              <p className="text-2xl font-bold mb-4">Snake</p>
              <button onClick={startGame} className="btn btn-primary">
                Start Game
              </button>
              <p className="text-sm text-gray-400 mt-4">Press Enter or tap to start</p>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-4">
          {/* Score */}
          <div className="bg-surface p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Score</div>
            <div className="text-2xl font-bold text-green-500">{score}</div>
          </div>

          {/* High Score */}
          <div className="bg-surface p-4 rounded-lg">
            <div className="text-gray-400 text-sm">High Score</div>
            <div className="text-xl font-bold text-yellow-400">{highScore}</div>
          </div>

          {/* Length */}
          <div className="bg-surface p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Length</div>
            <div className="text-xl font-bold">{snake.length}</div>
          </div>

          {/* Speed */}
          <div className="bg-surface p-4 rounded-lg">
            <div className="text-gray-400 text-sm">Speed</div>
            <div className="text-xl font-bold">{Math.round((INITIAL_SPEED / speed) * 100)}%</div>
          </div>

          {/* Controls */}
          {showHelp && (
            <div className="bg-surface p-4 rounded-lg text-sm text-gray-400">
              <div className="font-semibold text-white mb-2">Controls:</div>
              <div>Arrow keys to move</div>
              <div>P to pause</div>
              <div className="mt-2 text-xs">On mobile: Swipe to change direction</div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="mt-4 grid grid-cols-3 gap-2 sm:hidden">
        <div></div>
        <button
          onClick={() => {
            if (directionRef.current.y !== 1) {
              directionRef.current = { x: 0, y: -1 };
              setDirection({ x: 0, y: -1 });
            }
          }}
          className="btn bg-gray-600 w-14 h-14 text-2xl"
        >
          ↑
        </button>
        <div></div>
        <button
          onClick={() => {
            if (directionRef.current.x !== 1) {
              directionRef.current = { x: -1, y: 0 };
              setDirection({ x: -1, y: 0 });
            }
          }}
          className="btn bg-gray-600 w-14 h-14 text-2xl"
        >
          ←
        </button>
        <button
          onClick={() => {
            if (directionRef.current.y !== -1) {
              directionRef.current = { x: 0, y: 1 };
              setDirection({ x: 0, y: 1 });
            }
          }}
          className="btn bg-gray-600 w-14 h-14 text-2xl"
        >
          ↓
        </button>
        <button
          onClick={() => {
            if (directionRef.current.x !== -1) {
              directionRef.current = { x: 1, y: 0 };
              setDirection({ x: 1, y: 0 });
            }
          }}
          className="btn bg-gray-600 w-14 h-14 text-2xl"
        >
          →
        </button>
      </div>

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default Snake;
