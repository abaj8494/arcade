import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 640;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_ROWS = 6;
const BRICK_COLS = 8;
const BRICK_WIDTH = 54;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 4;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = 12;

const BRICK_COLOURS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
];

const BrickBreaker = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('idle'); // idle, playing, paused, won, lost
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('brickBreaker_highScore');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Game state refs for animation loop
  const gameRef = useRef({
    paddle: { x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2 },
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 50, dx: 4, dy: -4 },
    bricks: [],
    keysPressed: {},
    animationId: null,
  });

  // Initialize bricks
  const initBricks = useCallback(() => {
    const bricks = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        bricks.push({
          x: BRICK_OFFSET_LEFT + col * (BRICK_WIDTH + BRICK_PADDING),
          y: BRICK_OFFSET_TOP + row * (BRICK_HEIGHT + BRICK_PADDING),
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          colour: BRICK_COLOURS[row],
          alive: true,
          points: (BRICK_ROWS - row) * 10,
        });
      }
    }
    return bricks;
  }, []);

  // Reset game
  const resetGame = useCallback(() => {
    const game = gameRef.current;
    game.paddle.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    game.ball.x = CANVAS_WIDTH / 2;
    game.ball.y = CANVAS_HEIGHT - 50;
    game.ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
    game.ball.dy = -4;
    game.bricks = initBricks();
    setScore(0);
    setLives(3);
    setGameState('playing');
  }, [initBricks]);

  // Reset ball position after losing a life
  const resetBall = useCallback(() => {
    const game = gameRef.current;
    game.ball.x = CANVAS_WIDTH / 2;
    game.ball.y = CANVAS_HEIGHT - 50;
    game.ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
    game.ball.dy = -4;
    game.paddle.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
  }, []);

  // Draw function
  const draw = useCallback((ctx) => {
    const game = gameRef.current;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw bricks
    game.bricks.forEach((brick) => {
      if (brick.alive) {
        ctx.fillStyle = brick.colour;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 4);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, 4);
      }
    });

    // Draw paddle
    const gradient = ctx.createLinearGradient(
      game.paddle.x,
      CANVAS_HEIGHT - 30,
      game.paddle.x,
      CANVAS_HEIGHT - 30 + PADDLE_HEIGHT
    );
    gradient.addColorStop(0, '#60a5fa');
    gradient.addColorStop(1, '#3b82f6');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(
      game.paddle.x,
      CANVAS_HEIGHT - 30,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
      6
    );
    ctx.fill();

    // Draw ball
    ctx.beginPath();
    ctx.arc(game.ball.x, game.ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.closePath();
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const game = gameRef.current;

    // Move paddle based on keys
    if (game.keysPressed['ArrowLeft'] || game.keysPressed['a']) {
      game.paddle.x = Math.max(0, game.paddle.x - 8);
    }
    if (game.keysPressed['ArrowRight'] || game.keysPressed['d']) {
      game.paddle.x = Math.min(
        CANVAS_WIDTH - PADDLE_WIDTH,
        game.paddle.x + 8
      );
    }

    // Move ball
    game.ball.x += game.ball.dx;
    game.ball.y += game.ball.dy;

    // Wall collision (left/right)
    if (
      game.ball.x - BALL_RADIUS <= 0 ||
      game.ball.x + BALL_RADIUS >= CANVAS_WIDTH
    ) {
      game.ball.dx = -game.ball.dx;
    }

    // Wall collision (top)
    if (game.ball.y - BALL_RADIUS <= 0) {
      game.ball.dy = -game.ball.dy;
    }

    // Paddle collision
    if (
      game.ball.y + BALL_RADIUS >= CANVAS_HEIGHT - 30 &&
      game.ball.y - BALL_RADIUS <= CANVAS_HEIGHT - 30 + PADDLE_HEIGHT &&
      game.ball.x >= game.paddle.x &&
      game.ball.x <= game.paddle.x + PADDLE_WIDTH
    ) {
      // Calculate where on the paddle the ball hit (0 = left edge, 1 = right edge)
      const hitPos = (game.ball.x - game.paddle.x) / PADDLE_WIDTH;
      // Angle the ball based on hit position (-60 to 60 degrees)
      const angle = (hitPos - 0.5) * 2 * (Math.PI / 3);
      const speed = Math.sqrt(game.ball.dx * game.ball.dx + game.ball.dy * game.ball.dy);
      game.ball.dx = speed * Math.sin(angle);
      game.ball.dy = -Math.abs(speed * Math.cos(angle));
      game.ball.y = CANVAS_HEIGHT - 30 - BALL_RADIUS;
    }

    // Brick collision
    let allBricksDestroyed = true;
    game.bricks.forEach((brick) => {
      if (brick.alive) {
        allBricksDestroyed = false;
        if (
          game.ball.x + BALL_RADIUS > brick.x &&
          game.ball.x - BALL_RADIUS < brick.x + brick.width &&
          game.ball.y + BALL_RADIUS > brick.y &&
          game.ball.y - BALL_RADIUS < brick.y + brick.height
        ) {
          brick.alive = false;
          game.ball.dy = -game.ball.dy;
          setScore((prev) => {
            const newScore = prev + brick.points;
            if (newScore > highScore) {
              setHighScore(newScore);
              localStorage.setItem('brickBreaker_highScore', newScore.toString());
            }
            return newScore;
          });
        }
      }
    });

    // Check win condition
    if (allBricksDestroyed) {
      setGameState('won');
      return;
    }

    // Ball fell off bottom
    if (game.ball.y - BALL_RADIUS > CANVAS_HEIGHT) {
      setLives((prev) => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState('lost');
        } else {
          resetBall();
        }
        return newLives;
      });
      if (lives <= 1) return;
    }

    // Draw
    draw(ctx);

    // Continue loop
    game.animationId = requestAnimationFrame(gameLoop);
  }, [draw, resetBall, lives, highScore]);

  // Start/pause game
  const toggleGame = useCallback(() => {
    if (gameState === 'idle' || gameState === 'won' || gameState === 'lost') {
      resetGame();
    } else if (gameState === 'playing') {
      setGameState('paused');
      if (gameRef.current.animationId) {
        cancelAnimationFrame(gameRef.current.animationId);
      }
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  }, [gameState, resetGame]);

  // Effect to start/stop game loop
  useEffect(() => {
    if (gameState === 'playing') {
      gameRef.current.animationId = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameRef.current.animationId) {
        cancelAnimationFrame(gameRef.current.animationId);
      }
    };
  }, [gameState, gameLoop]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      gameRef.current.keysPressed[e.key] = true;
      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        toggleGame();
      }
    };

    const handleKeyUp = (e) => {
      gameRef.current.keysPressed[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [toggleGame]);

  // Mouse/touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      gameRef.current.paddle.x = Math.max(
        0,
        Math.min(CANVAS_WIDTH - PADDLE_WIDTH, x - PADDLE_WIDTH / 2)
      );
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      gameRef.current.paddle.x = Math.max(
        0,
        Math.min(CANVAS_WIDTH - PADDLE_WIDTH, x - PADDLE_WIDTH / 2)
      );
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Initial draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Initialize bricks for initial display
    if (gameRef.current.bricks.length === 0) {
      gameRef.current.bricks = initBricks();
    }
    draw(ctx);
  }, [draw, initBricks]);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-2">Brick Breaker</h1>
      <p className="text-gray-400 mb-4">Break all the bricks!</p>

      {/* Score display */}
      <div className="mb-4 flex gap-6 text-lg">
        <div>
          Score: <span className="text-primary font-bold">{score}</span>
        </div>
        <div>
          Lives: <span className="text-red-500 font-bold">{'❤️'.repeat(lives)}</span>
        </div>
        <div>
          High Score: <span className="text-yellow-500 font-bold">{highScore}</span>
        </div>
      </div>

      {/* Game canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="border-4 border-gray-700 rounded-lg cursor-none"
        />

        {/* Overlay for game states */}
        {gameState !== 'playing' && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-lg">
            {gameState === 'idle' && (
              <>
                <h2 className="text-2xl font-bold mb-4">Ready to Play?</h2>
                <p className="text-gray-400 mb-4">Use arrow keys or mouse to move paddle</p>
              </>
            )}
            {gameState === 'paused' && (
              <h2 className="text-2xl font-bold mb-4">Paused</h2>
            )}
            {gameState === 'won' && (
              <>
                <h2 className="text-2xl font-bold mb-2 text-green-500">You Won!</h2>
                <p className="text-xl mb-4">Final Score: {score}</p>
              </>
            )}
            {gameState === 'lost' && (
              <>
                <h2 className="text-2xl font-bold mb-2 text-red-500">Game Over</h2>
                <p className="text-xl mb-4">Final Score: {score}</p>
              </>
            )}
            <button
              onClick={toggleGame}
              className="btn btn-primary text-lg px-8 py-3"
            >
              {gameState === 'idle' ? 'Start Game' : gameState === 'paused' ? 'Resume' : 'Play Again'}
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={toggleGame}
          className="btn bg-gray-600 hover:bg-gray-500"
        >
          {gameState === 'playing' ? 'Pause (Space)' : 'Start (Space)'}
        </button>
        <button
          onClick={resetGame}
          className="btn bg-red-500 hover:bg-red-600"
        >
          Reset
        </button>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-surface rounded-lg max-w-md text-gray-400 text-sm mt-4">
        <h3 className="text-white font-semibold mb-2">How to Play:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Move paddle with arrow keys, A/D, or mouse</li>
          <li>Press Space to start/pause</li>
          <li>Break all bricks to win</li>
          <li>Don't let the ball fall!</li>
        </ul>
      </div>

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default BrickBreaker;
