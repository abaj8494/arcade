import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_SIZE = 15;
const PADDLE_SPEED = 8;
const INITIAL_BALL_SPEED = 6;
const WINNING_SCORE = 11;

const Pong = () => {
  const canvasRef = useRef(null);
  const [gameMode, setGameMode] = useState('ai'); // 'ai' or '2player'
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [winner, setWinner] = useState(null);

  const gameStateRef = useRef({
    paddle1Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    paddle2Y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    ballX: CANVAS_WIDTH / 2,
    ballY: CANVAS_HEIGHT / 2,
    ballVX: INITIAL_BALL_SPEED,
    ballVY: 0,
    keys: {},
  });

  const resetBall = useCallback((direction = 1) => {
    const state = gameStateRef.current;
    state.ballX = CANVAS_WIDTH / 2;
    state.ballY = CANVAS_HEIGHT / 2;
    const angle = (Math.random() - 0.5) * Math.PI / 3; // Random angle between -30 and 30 degrees
    const speed = INITIAL_BALL_SPEED;
    state.ballVX = Math.cos(angle) * speed * direction;
    state.ballVY = Math.sin(angle) * speed;
  }, []);

  const resetGame = useCallback(() => {
    const state = gameStateRef.current;
    state.paddle1Y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    state.paddle2Y = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    resetBall(Math.random() > 0.5 ? 1 : -1);
    setScores({ player1: 0, player2: 0 });
    setWinner(null);
    setIsPaused(false);
  }, [resetBall]);

  const startGame = useCallback(() => {
    resetGame();
    setIsPlaying(true);
  }, [resetGame]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || isPaused || winner) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    let animationId;
    const state = gameStateRef.current;

    const aiSpeeds = { easy: 3, medium: 5, hard: 7 };
    const aiSpeed = aiSpeeds[aiDifficulty];

    const gameLoop = () => {
      // Update paddle positions based on keys
      if (state.keys['w'] || state.keys['W']) {
        state.paddle1Y = Math.max(0, state.paddle1Y - PADDLE_SPEED);
      }
      if (state.keys['s'] || state.keys['S']) {
        state.paddle1Y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.paddle1Y + PADDLE_SPEED);
      }

      if (gameMode === '2player') {
        if (state.keys['ArrowUp']) {
          state.paddle2Y = Math.max(0, state.paddle2Y - PADDLE_SPEED);
        }
        if (state.keys['ArrowDown']) {
          state.paddle2Y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.paddle2Y + PADDLE_SPEED);
        }
      } else {
        // AI control for paddle 2
        const paddle2Center = state.paddle2Y + PADDLE_HEIGHT / 2;
        const targetY = state.ballX > CANVAS_WIDTH / 2 ? state.ballY : CANVAS_HEIGHT / 2;

        if (paddle2Center < targetY - 10) {
          state.paddle2Y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, state.paddle2Y + aiSpeed);
        } else if (paddle2Center > targetY + 10) {
          state.paddle2Y = Math.max(0, state.paddle2Y - aiSpeed);
        }
      }

      // Update ball position
      state.ballX += state.ballVX;
      state.ballY += state.ballVY;

      // Ball collision with top/bottom walls
      if (state.ballY <= 0 || state.ballY >= CANVAS_HEIGHT - BALL_SIZE) {
        state.ballVY = -state.ballVY;
        state.ballY = Math.max(0, Math.min(CANVAS_HEIGHT - BALL_SIZE, state.ballY));
      }

      // Ball collision with paddles
      // Left paddle (player 1)
      if (
        state.ballX <= PADDLE_WIDTH + 20 &&
        state.ballX >= 20 &&
        state.ballY + BALL_SIZE >= state.paddle1Y &&
        state.ballY <= state.paddle1Y + PADDLE_HEIGHT
      ) {
        const relativeIntersectY = (state.paddle1Y + PADDLE_HEIGHT / 2) - (state.ballY + BALL_SIZE / 2);
        const normalizedRelativeIntersectionY = relativeIntersectY / (PADDLE_HEIGHT / 2);
        const bounceAngle = normalizedRelativeIntersectionY * Math.PI / 4;

        const speed = Math.sqrt(state.ballVX * state.ballVX + state.ballVY * state.ballVY) + 0.2;
        state.ballVX = Math.cos(bounceAngle) * speed;
        state.ballVY = -Math.sin(bounceAngle) * speed;
        state.ballX = PADDLE_WIDTH + 21;
      }

      // Right paddle (player 2 / AI)
      if (
        state.ballX + BALL_SIZE >= CANVAS_WIDTH - PADDLE_WIDTH - 20 &&
        state.ballX + BALL_SIZE <= CANVAS_WIDTH - 20 &&
        state.ballY + BALL_SIZE >= state.paddle2Y &&
        state.ballY <= state.paddle2Y + PADDLE_HEIGHT
      ) {
        const relativeIntersectY = (state.paddle2Y + PADDLE_HEIGHT / 2) - (state.ballY + BALL_SIZE / 2);
        const normalizedRelativeIntersectionY = relativeIntersectY / (PADDLE_HEIGHT / 2);
        const bounceAngle = normalizedRelativeIntersectionY * Math.PI / 4;

        const speed = Math.sqrt(state.ballVX * state.ballVX + state.ballVY * state.ballVY) + 0.2;
        state.ballVX = -Math.cos(bounceAngle) * speed;
        state.ballVY = -Math.sin(bounceAngle) * speed;
        state.ballX = CANVAS_WIDTH - PADDLE_WIDTH - 21 - BALL_SIZE;
      }

      // Score detection
      if (state.ballX <= 0) {
        setScores(prev => {
          const newScores = { ...prev, player2: prev.player2 + 1 };
          if (newScores.player2 >= WINNING_SCORE) {
            setWinner(gameMode === 'ai' ? 'AI' : 'Player 2');
          }
          return newScores;
        });
        resetBall(-1);
      }

      if (state.ballX >= CANVAS_WIDTH) {
        setScores(prev => {
          const newScores = { ...prev, player1: prev.player1 + 1 };
          if (newScores.player1 >= WINNING_SCORE) {
            setWinner('Player 1');
          }
          return newScores;
        });
        resetBall(1);
      }

      // Draw
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw center line
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw paddles
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(20, state.paddle1Y, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH - 20, state.paddle2Y, PADDLE_WIDTH, PADDLE_HEIGHT);

      // Draw ball
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(state.ballX + BALL_SIZE / 2, state.ballY + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw scores
      ctx.font = 'bold 48px monospace';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      ctx.fillText(scores.player1.toString(), CANVAS_WIDTH / 4, 60);
      ctx.fillText(scores.player2.toString(), (CANVAS_WIDTH * 3) / 4, 60);

      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPlaying, isPaused, winner, gameMode, aiDifficulty, scores, resetBall]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      gameStateRef.current.keys[e.key] = true;

      if (e.key === ' ' && !isPlaying) {
        startGame();
      }

      if ((e.key === 'p' || e.key === 'P') && isPlaying && !winner) {
        setIsPaused(p => !p);
      }

      if (['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'].includes(e.key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e) => {
      gameStateRef.current.keys[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, startGame, winner]);

  // Draw initial state
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || isPlaying) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(20, CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT);
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH - 20, CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, PADDLE_WIDTH, PADDLE_HEIGHT);

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
  }, [isPlaying]);

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">Pong</h1>

      {/* Game Mode Selection */}
      <div className="mb-4 flex gap-4">
        <button
          onClick={() => { setGameMode('ai'); resetGame(); setIsPlaying(false); }}
          className={`btn ${gameMode === 'ai' ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          vs AI
        </button>
        <button
          onClick={() => { setGameMode('2player'); resetGame(); setIsPlaying(false); }}
          className={`btn ${gameMode === '2player' ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          2 Player
        </button>
      </div>

      {/* AI Difficulty */}
      {gameMode === 'ai' && (
        <div className="mb-4 flex gap-2">
          {['easy', 'medium', 'hard'].map((diff) => (
            <button
              key={diff}
              onClick={() => { setAiDifficulty(diff); if (!isPlaying) resetGame(); }}
              className={`btn text-sm ${aiDifficulty === diff ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              {diff.charAt(0).toUpperCase() + diff.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="relative rounded-lg overflow-hidden border-4 border-gray-700">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block"
        />

        {/* Overlays */}
        {!isPlaying && !winner && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
            <h2 className="text-3xl font-bold mb-4">Pong</h2>
            <button onClick={startGame} className="btn btn-primary text-lg px-6 py-3">
              Start Game
            </button>
            <p className="text-gray-400 mt-4 text-sm">Press Space to start</p>
          </div>
        )}

        {isPaused && !winner && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-bold mb-4">Paused</p>
              <p className="text-gray-400">Press P to resume</p>
            </div>
          </div>
        )}

        {winner && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
            <p className="text-3xl font-bold mb-2 text-yellow-400">{winner} Wins!</p>
            <p className="text-xl mb-4">{scores.player1} - {scores.player2}</p>
            <button onClick={startGame} className="btn btn-primary">
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Score Display */}
      <div className="mt-4 flex gap-12 text-xl">
        <div className="text-center">
          <div className="text-blue-400 font-bold">Player 1</div>
          <div className="text-3xl">{scores.player1}</div>
          <div className="text-gray-400 text-sm mt-1">W/S</div>
        </div>
        <div className="text-center">
          <div className={`font-bold ${gameMode === 'ai' ? 'text-gray-400' : 'text-pink-400'}`}>
            {gameMode === 'ai' ? 'AI' : 'Player 2'}
          </div>
          <div className="text-3xl">{scores.player2}</div>
          <div className="text-gray-400 text-sm mt-1">{gameMode === '2player' ? '↑/↓' : ''}</div>
        </div>
      </div>

      {/* Controls Info */}
      <div className="mt-4 bg-surface p-4 rounded-lg text-sm text-gray-400 text-center">
        <div className="font-semibold text-white mb-2">Controls</div>
        <div>Player 1: W (up) / S (down)</div>
        {gameMode === '2player' && <div>Player 2: ↑ (up) / ↓ (down)</div>}
        <div className="mt-1">P to pause • First to {WINNING_SCORE} wins</div>
      </div>

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default Pong;
