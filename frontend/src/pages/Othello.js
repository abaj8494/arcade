import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useWirelessGame from '../hooks/useWirelessGame';
import { WirelessButton, WirelessModal } from '../components/WirelessModal';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';

const EMPTY = null;
const BLACK = 'black';
const WHITE = 'white';
const BOARD_SIZE = 8;

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],          [0, 1],
  [1, -1],  [1, 0], [1, 1]
];

const Othello = () => {
  const { showHelp, toggleHelp } = useHelpVisibility();

  const createInitialBoard = useCallback(() => {
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
    // Initial 4 pieces in center
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;
    return board;
  }, []);

  const [board, setBoard] = useState(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState(BLACK);
  const [gameOver, setGameOver] = useState(false);
  const [scores, setScores] = useState({ black: 2, white: 2 });
  const [validMoves, setValidMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [gameMode, setGameMode] = useState('2player');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [passCount, setPassCount] = useState(0);
  const [showHints, setShowHints] = useState(true);
  const aiTimeoutRef = useRef(null);

  // Wireless state
  const [showWirelessModal, setShowWirelessModal] = useState(false);
  const [myColor, setMyColor] = useState(null);
  const wirelessMoveRef = useRef(null);

  // Count pieces
  const countPieces = useCallback((board) => {
    let black = 0, white = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === BLACK) black++;
        else if (board[r][c] === WHITE) white++;
      }
    }
    return { black, white };
  }, []);

  // Check if position is valid
  const isValidPos = (row, col) => row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

  // Get flipped pieces for a move
  const getFlippedPieces = useCallback((board, row, col, player) => {
    if (board[row][col] !== EMPTY) return [];

    const opponent = player === BLACK ? WHITE : BLACK;
    const allFlipped = [];

    for (const [dr, dc] of DIRECTIONS) {
      const flipped = [];
      let r = row + dr;
      let c = col + dc;

      // Collect opponent pieces in this direction
      while (isValidPos(r, c) && board[r][c] === opponent) {
        flipped.push([r, c]);
        r += dr;
        c += dc;
      }

      // Check if we end with our own piece
      if (flipped.length > 0 && isValidPos(r, c) && board[r][c] === player) {
        allFlipped.push(...flipped);
      }
    }

    return allFlipped;
  }, []);

  // Get all valid moves for a player
  const getValidMoves = useCallback((board, player) => {
    const moves = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (getFlippedPieces(board, r, c, player).length > 0) {
          moves.push([r, c]);
        }
      }
    }
    return moves;
  }, [getFlippedPieces]);

  // Make a move
  const makeMove = useCallback((row, col, player) => {
    const flipped = getFlippedPieces(board, row, col, player);
    if (flipped.length === 0) return false;

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = player;
    for (const [fr, fc] of flipped) {
      newBoard[fr][fc] = player;
    }

    setBoard(newBoard);
    setLastMove({ row, col, player });
    setScores(countPieces(newBoard));
    setPassCount(0);

    const nextPlayer = player === BLACK ? WHITE : BLACK;
    const nextMoves = getValidMoves(newBoard, nextPlayer);

    if (nextMoves.length === 0) {
      // Next player has no moves, check if current player can continue
      const currentMoves = getValidMoves(newBoard, player);
      if (currentMoves.length === 0) {
        // Game over - neither can move
        setGameOver(true);
        setValidMoves([]);
      } else {
        // Skip next player's turn
        setPassCount(1);
        setValidMoves(currentMoves);
        // Current player continues
      }
    } else {
      setCurrentPlayer(nextPlayer);
      setValidMoves(nextMoves);
    }

    return true;
  }, [board, getFlippedPieces, getValidMoves, countPieces]);

  // Update valid moves when player changes
  useEffect(() => {
    if (!gameOver) {
      const moves = getValidMoves(board, currentPlayer);
      setValidMoves(moves);
    }
  }, [currentPlayer, board, gameOver, getValidMoves]);

  // Wireless handlers
  const handleWirelessMove = useCallback((data, from) => {
    if (wirelessMoveRef.current) {
      wirelessMoveRef.current(data);
    }
  }, []);

  const handleWirelessState = useCallback((state) => {
    if (state.board) setBoard(state.board);
    if (state.currentPlayer) setCurrentPlayer(state.currentPlayer);
    if (state.scores) setScores(state.scores);
    if (state.gameOver !== undefined) setGameOver(state.gameOver);
    if (state.lastMove !== undefined) setLastMove(state.lastMove);
  }, []);

  const { connectionState, playerNum, roomCode, error, createRoom, joinRoom, disconnect, sendMove, sendState } =
    useWirelessGame('othello', handleWirelessMove, handleWirelessState);

  useEffect(() => {
    wirelessMoveRef.current = (data) => {
      const { row, col, player } = data;
      makeMove(row, col, player);
    };
  }, [makeMove]);

  // Handle wireless connection
  useEffect(() => {
    if (connectionState === 'connected' && playerNum) {
      setMyColor(playerNum === 1 ? BLACK : WHITE);
      setGameMode('2player');
      if (playerNum === 1) {
        const initialBoard = createInitialBoard();
        setBoard(initialBoard);
        setCurrentPlayer(BLACK);
        setGameOver(false);
        setScores({ black: 2, white: 2 });
        setLastMove(null);
        sendState({
          board: initialBoard,
          currentPlayer: BLACK,
          scores: { black: 2, white: 2 },
          gameOver: false,
          lastMove: null
        });
      }
    }
  }, [connectionState, playerNum, sendState, createInitialBoard]);

  const handleCreateRoom = () => createRoom();
  const handleJoinRoom = (code) => joinRoom(code);
  const handleDisconnect = () => {
    disconnect();
    setMyColor(null);
    resetGame();
  };

  // Handle cell click
  const handleCellClick = (row, col) => {
    if (gameOver || isAiThinking) return;
    if (gameMode === 'ai' && currentPlayer === WHITE) return;

    // Check wireless turn
    if (connectionState === 'connected' && myColor) {
      if (myColor !== currentPlayer) return;
    }

    // Check if valid move
    if (!validMoves.some(([r, c]) => r === row && c === col)) return;

    const success = makeMove(row, col, currentPlayer);
    if (success && connectionState === 'connected') {
      sendMove({ row, col, player: currentPlayer });
    }
  };

  // AI logic
  const evaluateBoard = useCallback((board, player) => {
    const opponent = player === BLACK ? WHITE : BLACK;
    let score = 0;

    // Piece count
    const counts = countPieces(board);
    score += (counts[player] - counts[opponent]) * 1;

    // Corner bonus (corners are very valuable)
    const corners = [[0, 0], [0, 7], [7, 0], [7, 7]];
    for (const [r, c] of corners) {
      if (board[r][c] === player) score += 25;
      else if (board[r][c] === opponent) score -= 25;
    }

    // Edge bonus
    for (let i = 0; i < BOARD_SIZE; i++) {
      // Top/bottom edges
      if (board[0][i] === player) score += 5;
      else if (board[0][i] === opponent) score -= 5;
      if (board[7][i] === player) score += 5;
      else if (board[7][i] === opponent) score -= 5;
      // Left/right edges
      if (board[i][0] === player) score += 5;
      else if (board[i][0] === opponent) score -= 5;
      if (board[i][7] === player) score += 5;
      else if (board[i][7] === opponent) score -= 5;
    }

    // Mobility (number of valid moves)
    const playerMoves = getValidMoves(board, player).length;
    const opponentMoves = getValidMoves(board, opponent).length;
    score += (playerMoves - opponentMoves) * 2;

    return score;
  }, [countPieces, getValidMoves]);

  const minimax = useCallback((board, depth, alpha, beta, isMaximizing, player) => {
    const opponent = player === BLACK ? WHITE : BLACK;
    const moves = getValidMoves(board, isMaximizing ? player : opponent);

    if (depth === 0 || moves.length === 0) {
      return evaluateBoard(board, player);
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const [r, c] of moves) {
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = player;
        const flipped = getFlippedPieces(board, r, c, player);
        for (const [fr, fc] of flipped) {
          newBoard[fr][fc] = player;
        }
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, player);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const [r, c] of moves) {
        const newBoard = board.map(row => [...row]);
        newBoard[r][c] = opponent;
        const flipped = getFlippedPieces(board, r, c, opponent);
        for (const [fr, fc] of flipped) {
          newBoard[fr][fc] = opponent;
        }
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, player);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }, [getValidMoves, getFlippedPieces, evaluateBoard]);

  const getAiMove = useCallback(() => {
    const depths = { easy: 2, medium: 4, hard: 6 };
    const depth = depths[aiDifficulty];
    const moves = getValidMoves(board, WHITE);

    if (moves.length === 0) return null;

    // Easy mode: sometimes random
    if (aiDifficulty === 'easy' && Math.random() < 0.3) {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const [r, c] of moves) {
      const newBoard = board.map(row => [...row]);
      newBoard[r][c] = WHITE;
      const flipped = getFlippedPieces(board, r, c, WHITE);
      for (const [fr, fc] of flipped) {
        newBoard[fr][fc] = WHITE;
      }
      const score = minimax(newBoard, depth - 1, -Infinity, Infinity, false, WHITE);
      if (score > bestScore) {
        bestScore = score;
        bestMove = [r, c];
      }
    }

    return bestMove;
  }, [board, aiDifficulty, getValidMoves, getFlippedPieces, minimax]);

  // AI turn
  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === WHITE && !gameOver && validMoves.length > 0) {
      setIsAiThinking(true);
      aiTimeoutRef.current = setTimeout(() => {
        const move = getAiMove();
        if (move) {
          makeMove(move[0], move[1], WHITE);
        }
        setIsAiThinking(false);
      }, 500);
    }

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [gameMode, currentPlayer, gameOver, validMoves, getAiMove, makeMove]);

  const resetGame = () => {
    setBoard(createInitialBoard());
    setCurrentPlayer(BLACK);
    setGameOver(false);
    setScores({ black: 2, white: 2 });
    setValidMoves([]);
    setLastMove(null);
    setPassCount(0);
    setIsAiThinking(false);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
  };

  const getWinner = () => {
    if (scores.black > scores.white) return 'Black wins!';
    if (scores.white > scores.black) return 'White wins!';
    return "It's a tie!";
  };

  const isValidMove = (row, col) => validMoves.some(([r, c]) => r === row && c === col);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">Othello</h1>
        <WirelessButton
          onClick={() => connectionState === 'connected' ? handleDisconnect() : setShowWirelessModal(true)}
          isActive={connectionState === 'connected' || connectionState === 'waiting'}
          disabled={gameMode === 'ai'}
        />
        <HelpButton onClick={toggleHelp} isActive={showHelp} />
      </div>

      {/* Wireless status */}
      {connectionState === 'connected' && (
        <div className="mb-4 text-green-400 text-sm">
          Connected - Playing as {myColor === BLACK ? 'Black' : 'White'}
        </div>
      )}

      {/* Game Mode Selection */}
      <div className="mb-4 flex gap-4">
        <button
          onClick={() => { setGameMode('2player'); resetGame(); handleDisconnect(); }}
          className={`btn ${gameMode === '2player' && connectionState !== 'connected' ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
          disabled={connectionState === 'connected'}
        >
          2 Player
        </button>
        <button
          onClick={() => { setGameMode('ai'); resetGame(); handleDisconnect(); }}
          className={`btn ${gameMode === 'ai' ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
          disabled={connectionState === 'connected'}
        >
          vs AI
        </button>
      </div>

      {/* AI Difficulty */}
      {gameMode === 'ai' && (
        <div className="mb-4 flex gap-2">
          {['easy', 'medium', 'hard'].map((diff) => (
            <button
              key={diff}
              onClick={() => { setAiDifficulty(diff); resetGame(); }}
              className={`btn text-sm ${aiDifficulty === diff ? 'bg-purple-600' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              {diff.charAt(0).toUpperCase() + diff.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Score Board */}
      <div className="mb-4 p-4 bg-surface rounded-lg">
        <div className="flex gap-8 text-center">
          <div className={`${currentPlayer === BLACK && !gameOver ? 'ring-2 ring-white rounded-lg p-2' : 'p-2'}`}>
            <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-gray-900 border-2 border-gray-600" />
            <div className="text-lg font-bold">{scores.black}</div>
          </div>
          <div className={`${currentPlayer === WHITE && !gameOver ? 'ring-2 ring-white rounded-lg p-2' : 'p-2'}`}>
            <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-white border-2 border-gray-300" />
            <div className="text-lg font-bold">{scores.white}</div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="mb-4 text-lg font-semibold">
        {gameOver ? (
          <span className="text-green-400">{getWinner()}</span>
        ) : isAiThinking ? (
          <span className="text-yellow-400">AI is thinking...</span>
        ) : passCount > 0 ? (
          <span className="text-orange-400">{currentPlayer === BLACK ? 'White' : 'Black'} has no moves - {currentPlayer === BLACK ? 'Black' : 'White'}'s turn again</span>
        ) : (
          <span>{currentPlayer === BLACK ? 'Black' : 'White'}'s turn</span>
        )}
      </div>

      {/* Game Board */}
      <div className="bg-green-700 p-2 rounded-lg shadow-xl">
        <div className="grid grid-cols-8 gap-0.5">
          {board.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const isValid = isValidMove(rowIdx, colIdx);
              const isLast = lastMove?.row === rowIdx && lastMove?.col === colIdx;
              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  onClick={() => handleCellClick(rowIdx, colIdx)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 bg-green-600 flex items-center justify-center cursor-pointer relative
                    ${isValid ? 'hover:bg-green-500' : ''}
                    ${isLast ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
                >
                  <AnimatePresence>
                    {cell && (
                      <motion.div
                        initial={{ scale: 0, rotateY: 180 }}
                        animate={{ scale: 1, rotateY: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 ${
                          cell === BLACK
                            ? 'bg-gray-900 border-gray-700'
                            : 'bg-white border-gray-300'
                        }`}
                      />
                    )}
                  </AnimatePresence>
                  {showHints && isValid && !cell && (
                    <div className={`w-3 h-3 rounded-full ${
                      currentPlayer === BLACK ? 'bg-gray-900/40' : 'bg-white/40'
                    }`} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mt-6">
        <button onClick={resetGame} className="btn btn-primary">
          New Game
        </button>
        <button
          onClick={() => setShowHints(!showHints)}
          className={`btn ${showHints ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          Hints {showHints ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Help */}
      {showHelp && (
        <div className="mt-4 p-4 bg-surface rounded-lg max-w-md text-gray-300 text-sm">
          <h3 className="font-bold mb-2">How to Play Othello:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Black moves first</li>
            <li>Place your disc to trap opponent's discs between yours</li>
            <li>Trapped discs flip to your color</li>
            <li>Valid moves are shown as small dots</li>
            <li>If you can't move, your turn is skipped</li>
            <li>Game ends when neither player can move</li>
            <li>Player with most discs wins!</li>
          </ul>
        </div>
      )}

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>

      {/* Wireless Modal */}
      <WirelessModal
        isOpen={showWirelessModal}
        onClose={() => setShowWirelessModal(false)}
        connectionState={connectionState}
        playerNum={playerNum}
        roomCode={roomCode}
        error={error}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onDisconnect={handleDisconnect}
        gameName="Othello"
      />
    </div>
  );
};

export default Othello;
