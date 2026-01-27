import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useWirelessGame from '../hooks/useWirelessGame';
import { WirelessButton, WirelessModal } from '../components/WirelessModal';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';

const EMPTY = null;
const PLAYER_1 = 'red';
const PLAYER_2 = 'yellow';

// Board size presets
const BOARD_SIZES = {
  standard: { rows: 6, cols: 7, label: 'Standard (6×7)' },
  large: { rows: 7, cols: 8, label: 'Large (7×8)' },
  xlarge: { rows: 8, cols: 9, label: 'X-Large (8×9)' }
};

const Connect4 = () => {
  const [boardSize, setBoardSize] = useState('standard');
  const rows = BOARD_SIZES[boardSize].rows;
  const cols = BOARD_SIZES[boardSize].cols;
  const { showHelp, toggleHelp } = useHelpVisibility();

  const createEmptyBoard = useCallback(() => {
    return Array(rows).fill(null).map(() => Array(cols).fill(EMPTY));
  }, [rows, cols]);

  const [board, setBoard] = useState(() => Array(6).fill(null).map(() => Array(7).fill(EMPTY)));
  const [currentPlayer, setCurrentPlayer] = useState(PLAYER_1);
  const [winner, setWinner] = useState(null);
  const [winningCells, setWinningCells] = useState([]);
  const [scores, setScores] = useState({ red: 0, yellow: 0, draws: 0 });
  const [gameMode, setGameMode] = useState('2player'); // '2player' or 'ai'
  const [aiDifficulty, setAiDifficulty] = useState('medium'); // 'easy', 'medium', 'hard'
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [hoverCol, setHoverCol] = useState(null);
  const [lastAiMove, setLastAiMove] = useState(null); // { row, col }
  const [replayingMove, setReplayingMove] = useState(false);
  const [animatingCell, setAnimatingCell] = useState(null); // { row, col }
  const [lastMove, setLastMove] = useState(null); // { row, col, player } - tracks opponent's last move
  const aiTimeoutRef = useRef(null);

  // Wireless state
  const [showWirelessModal, setShowWirelessModal] = useState(false);
  const [myColour, setMyColour] = useState(null); // 'red' or 'yellow'
  const wirelessMoveRef = useRef(null);

  // Reset board when size changes
  useEffect(() => {
    setBoard(createEmptyBoard());
    setCurrentPlayer(PLAYER_1);
    setWinner(null);
    setWinningCells([]);
    setLastAiMove(null);
    setAnimatingCell(null);
    setLastMove(null);
  }, [boardSize, createEmptyBoard]);

  const checkWinner = useCallback((board) => {
    const numRows = board.length;
    const numCols = board[0]?.length || 0;
    const directions = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal down-right
      [1, -1],  // diagonal down-left
    ];

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        const cell = board[row][col];
        if (!cell) continue;

        for (const [dr, dc] of directions) {
          const cells = [[row, col]];
          let r = row + dr;
          let c = col + dc;

          while (
            r >= 0 && r < numRows &&
            c >= 0 && c < numCols &&
            board[r][c] === cell
          ) {
            cells.push([r, c]);
            r += dr;
            c += dc;
          }

          if (cells.length >= 4) {
            return { winner: cell, cells: cells.slice(0, 4) };
          }
        }
      }
    }

    // Check for draw
    if (board[0].every(cell => cell !== EMPTY)) {
      return { winner: 'draw', cells: [] };
    }

    return null;
  }, []);

  const getLowestEmptyRow = useCallback((board, col) => {
    const numRows = board.length;
    for (let row = numRows - 1; row >= 0; row--) {
      if (board[row][col] === EMPTY) {
        return row;
      }
    }
    return -1;
  }, []);

  const makeMove = useCallback((col, player, isAiMove = false) => {
    const row = getLowestEmptyRow(board, col);
    if (row === -1 || winner) return { success: false, row: -1 };

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = player;
    setBoard(newBoard);

    // Track last move for opponent indicator
    setLastMove({ row, col, player });

    // Track AI moves for replay
    if (isAiMove) {
      setLastAiMove({ row, col });
      setAnimatingCell({ row, col });
      // Clear animation state after animation completes
      setTimeout(() => setAnimatingCell(null), 600);
    }

    const result = checkWinner(newBoard);
    if (result) {
      setWinner(result.winner);
      setWinningCells(result.cells);
      if (result.winner === 'draw') {
        setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
      } else {
        setScores(prev => ({ ...prev, [result.winner]: prev[result.winner] + 1 }));
      }
    } else {
      setCurrentPlayer(player === PLAYER_1 ? PLAYER_2 : PLAYER_1);
    }

    return { success: true, row };
  }, [board, winner, getLowestEmptyRow, checkWinner]);

  // Wireless game hook
  const handleWirelessMove = useCallback((move) => {
    if (wirelessMoveRef.current) {
      wirelessMoveRef.current(move);
    }
  }, []);

  const handleWirelessState = useCallback((state) => {
    if (state.board) setBoard(state.board);
    if (state.currentPlayer) setCurrentPlayer(state.currentPlayer);
    if (state.winner !== undefined) setWinner(state.winner);
    if (state.winningCells) setWinningCells(state.winningCells);
  }, []);

  const { connectionState, playerNum, roomCode, error, createRoom, joinRoom, disconnect, sendMove, sendState } =
    useWirelessGame('connect4', handleWirelessMove, handleWirelessState);

  // Update wirelessMoveRef with the actual move handler
  useEffect(() => {
    wirelessMoveRef.current = (move) => {
      const { col, player } = move;
      makeMove(col, player);
    };
  }, [makeMove]);

  // Handle wireless connection - player 1 is red, player 2 is yellow
  useEffect(() => {
    if (connectionState === 'connected' && playerNum) {
      setMyColour(playerNum === 1 ? 'red' : 'yellow');
      setGameMode('2player');
      // Player 1 initialises the game
      if (playerNum === 1) {
        setBoard(createEmptyBoard());
        setCurrentPlayer(PLAYER_1);
        setWinner(null);
        setWinningCells([]);
        sendState({
          board: createEmptyBoard(),
          currentPlayer: PLAYER_1,
          winner: null,
          winningCells: []
        });
      }
    }
  }, [connectionState, playerNum, sendState]);

  const handleCreateRoom = () => {
    createRoom();
  };

  const handleJoinRoom = (code) => {
    joinRoom(code);
  };

  const handleDisconnect = () => {
    disconnect();
    setMyColour(null);
    resetGame();
  };

  const handleColumnClick = useCallback((col) => {
    if (winner || isAiThinking) return;
    if (gameMode === 'ai' && currentPlayer === PLAYER_2) return;

    // Check if it's our turn in wireless mode
    if (connectionState === 'connected' && myColour) {
      const isMyTurn = (myColour === 'red' && currentPlayer === PLAYER_1) ||
                       (myColour === 'yellow' && currentPlayer === PLAYER_2);
      if (!isMyTurn) return;
    }

    const result = makeMove(col, currentPlayer);
    // Send move over wireless
    if (result.success && connectionState === 'connected') {
      sendMove({ col, player: currentPlayer });
    }
  }, [winner, isAiThinking, gameMode, currentPlayer, makeMove, connectionState, myColour, sendMove]);

  // AI Logic with Minimax
  const evaluateBoard = useCallback((board, player) => {
    const numRows = board.length;
    const numCols = board[0]?.length || 0;
    const opponent = player === PLAYER_1 ? PLAYER_2 : PLAYER_1;
    let score = 0;

    // Check all possible windows of 4
    const evaluateWindow = (window) => {
      const playerCount = window.filter(c => c === player).length;
      const opponentCount = window.filter(c => c === opponent).length;
      const emptyCount = window.filter(c => c === EMPTY).length;

      if (playerCount === 4) return 10000;
      if (opponentCount === 4) return -10000;
      if (playerCount === 3 && emptyCount === 1) return 100;
      if (playerCount === 2 && emptyCount === 2) return 10;
      if (opponentCount === 3 && emptyCount === 1) return -80;
      if (opponentCount === 2 && emptyCount === 2) return -5;
      return 0;
    };

    // Horizontal windows
    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col <= numCols - 4; col++) {
        const window = [board[row][col], board[row][col+1], board[row][col+2], board[row][col+3]];
        score += evaluateWindow(window);
      }
    }

    // Vertical windows
    for (let row = 0; row <= numRows - 4; row++) {
      for (let col = 0; col < numCols; col++) {
        const window = [board[row][col], board[row+1][col], board[row+2][col], board[row+3][col]];
        score += evaluateWindow(window);
      }
    }

    // Diagonal windows (down-right)
    for (let row = 0; row <= numRows - 4; row++) {
      for (let col = 0; col <= numCols - 4; col++) {
        const window = [board[row][col], board[row+1][col+1], board[row+2][col+2], board[row+3][col+3]];
        score += evaluateWindow(window);
      }
    }

    // Diagonal windows (down-left)
    for (let row = 0; row <= numRows - 4; row++) {
      for (let col = 3; col < numCols; col++) {
        const window = [board[row][col], board[row+1][col-1], board[row+2][col-2], board[row+3][col-3]];
        score += evaluateWindow(window);
      }
    }

    // Centre column preference
    const centreCol = Math.floor(numCols / 2);
    const centreCount = board.filter((row) => row[centreCol] === player).length;
    score += centreCount * 3;

    return score;
  }, []);

  const minimax = useCallback((board, depth, alpha, beta, isMaximizing, player) => {
    const numCols = board[0]?.length || 0;
    const result = checkWinner(board);
    if (result) {
      if (result.winner === PLAYER_2) return 1000 - depth;
      if (result.winner === PLAYER_1) return -1000 + depth;
      return 0;
    }
    if (depth === 0) {
      return evaluateBoard(board, PLAYER_2);
    }

    const validCols = [];
    for (let col = 0; col < numCols; col++) {
      if (board[0][col] === EMPTY) validCols.push(col);
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const col of validCols) {
        const row = getLowestEmptyRow(board, col);
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = player;
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, PLAYER_1);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const col of validCols) {
        const row = getLowestEmptyRow(board, col);
        const newBoard = board.map(r => [...r]);
        newBoard[row][col] = player;
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, PLAYER_2);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }, [checkWinner, evaluateBoard, getLowestEmptyRow]);

  // Check if a move wins for a player
  const checkWinningMove = useCallback((board, col, player) => {
    const row = getLowestEmptyRow(board, col);
    if (row === -1) return false;
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = player;
    const result = checkWinner(newBoard);
    return result && result.winner === player;
  }, [getLowestEmptyRow, checkWinner]);

  const getAiMove = useCallback(() => {
    const numCols = board[0]?.length || 7;
    const depths = { easy: 2, medium: 5, hard: 7 };
    const depth = depths[aiDifficulty];

    const validCols = [];
    for (let col = 0; col < numCols; col++) {
      if (board[0][col] === EMPTY) validCols.push(col);
    }

    // Easy mode: sometimes make random moves
    if (aiDifficulty === 'easy' && Math.random() < 0.4) {
      return validCols[Math.floor(Math.random() * validCols.length)];
    }

    // CRITICAL: First check for immediate winning move
    for (const col of validCols) {
      if (checkWinningMove(board, col, PLAYER_2)) {
        return col; // Take the win!
      }
    }

    // CRITICAL: Then check if opponent can win next turn and block
    for (const col of validCols) {
      if (checkWinningMove(board, col, PLAYER_1)) {
        return col; // Block the win!
      }
    }

    // Use minimax for strategic move
    let bestCol = validCols[Math.floor(validCols.length / 2)]; // Prefer centre
    let bestScore = -Infinity;

    // Order columns to check centre first (better pruning)
    const centreCol = Math.floor(numCols / 2);
    const orderedCols = [...validCols].sort((a, b) =>
      Math.abs(a - centreCol) - Math.abs(b - centreCol)
    );

    for (const col of orderedCols) {
      const row = getLowestEmptyRow(board, col);
      const newBoard = board.map(r => [...r]);
      newBoard[row][col] = PLAYER_2;
      const score = minimax(newBoard, depth - 1, -Infinity, Infinity, false, PLAYER_1);
      if (score > bestScore) {
        bestScore = score;
        bestCol = col;
      }
    }

    return bestCol;
  }, [board, aiDifficulty, getLowestEmptyRow, minimax, checkWinningMove]);

  // AI turn effect
  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === PLAYER_2 && !winner) {
      setIsAiThinking(true);
      aiTimeoutRef.current = setTimeout(() => {
        const col = getAiMove();
        makeMove(col, PLAYER_2, true); // Pass isAiMove = true
        setIsAiThinking(false);
      }, 500);
    }

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [gameMode, currentPlayer, winner, getAiMove, makeMove]);

  // Replay the last AI move animation
  const replayAiMove = useCallback(() => {
    if (!lastAiMove || replayingMove) return;
    setReplayingMove(true);
    setAnimatingCell({ row: lastAiMove.row, col: lastAiMove.col });
    setTimeout(() => {
      setAnimatingCell(null);
      setReplayingMove(false);
    }, 600);
  }, [lastAiMove, replayingMove]);

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setCurrentPlayer(PLAYER_1);
    setWinner(null);
    setWinningCells([]);
    setIsAiThinking(false);
    setLastAiMove(null);
    setAnimatingCell(null);
    setReplayingMove(false);
    setLastMove(null);
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
  };

  const resetScores = () => {
    setScores({ red: 0, yellow: 0, draws: 0 });
    resetGame();
  };

  const getStatusText = () => {
    if (winner === 'draw') return "It's a draw!";
    if (winner) return `${winner === PLAYER_1 ? 'Red' : 'Yellow'} wins!`;
    if (isAiThinking) return 'AI is thinking...';
    const turnText = `${currentPlayer === PLAYER_1 ? 'Red' : 'Yellow'}'s turn`;
    if (connectionState === 'connected' && myColour) {
      const isMyTurn = (myColour === 'red' && currentPlayer === PLAYER_1) ||
                       (myColour === 'yellow' && currentPlayer === PLAYER_2);
      return `${turnText} ${isMyTurn ? '(Your turn)' : '(Waiting...)'}`;
    }
    return turnText;
  };

  const isWinningCell = (row, col) => {
    return winningCells.some(([r, c]) => r === row && c === col);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">Connect 4</h1>
        <WirelessButton
          onClick={() => connectionState === 'connected' ? handleDisconnect() : setShowWirelessModal(true)}
          isActive={connectionState === 'connected' || connectionState === 'waiting'}
          disabled={gameMode === 'ai'}
        />
        <HelpButton onClick={toggleHelp} isActive={showHelp} />
      </div>

      {/* Wireless connection status */}
      {connectionState === 'connected' && (
        <div className="mb-4 text-green-400 text-sm">
          Connected - Playing as {myColour === 'red' ? 'Red' : 'Yellow'}
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

      {/* Board Size Selection */}
      <div className="mb-4 flex gap-2 flex-wrap justify-center">
        {Object.entries(BOARD_SIZES).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setBoardSize(key)}
            className={`btn text-sm ${boardSize === key ? 'bg-teal-600' : 'bg-gray-600 hover:bg-gray-500'}`}
            disabled={connectionState === 'connected'}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Score Board */}
      <div className="mb-4 p-4 bg-surface rounded-lg">
        <div className="flex gap-8 text-center">
          <div>
            <div className="text-red-500 text-xl font-bold">Red</div>
            <div className="text-xl">{scores.red}</div>
          </div>
          <div>
            <div className="text-gray-400 text-lg">Draws</div>
            <div className="text-xl">{scores.draws}</div>
          </div>
          <div>
            <div className="text-yellow-400 text-xl font-bold">Yellow</div>
            <div className="text-xl">{scores.yellow}</div>
          </div>
        </div>
      </div>

      {/* Status */}
      <motion.div
        key={getStatusText()}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-xl mb-4 font-semibold ${
          winner === PLAYER_1 ? 'text-red-500' :
          winner === PLAYER_2 ? 'text-yellow-400' :
          winner === 'draw' ? 'text-gray-400' :
          currentPlayer === PLAYER_1 ? 'text-red-500' : 'text-yellow-400'
        }`}
      >
        {getStatusText()}
      </motion.div>

      {/* Game Board */}
      <div className="relative bg-blue-600 p-2 rounded-lg shadow-xl overflow-x-auto">
        {/* Column hover indicators */}
        <div className="flex gap-1 mb-1">
          {Array(cols).fill(null).map((_, col) => (
            <div
              key={col}
              className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center"
              onMouseEnter={() => setHoverCol(col)}
              onMouseLeave={() => setHoverCol(null)}
              onClick={() => handleColumnClick(col)}
            >
              {hoverCol === col && !winner && !isAiThinking && board[0]?.[col] === EMPTY && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 0.5, y: 0 }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${
                    currentPlayer === PLAYER_1 ? 'bg-red-500' : 'bg-yellow-400'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Board grid */}
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isAnimating = animatingCell?.row === rowIndex && animatingCell?.col === colIndex;
              // Show indicator for opponent's last move (when it's not their color's turn)
              const isOpponentLastMove = lastMove &&
                lastMove.row === rowIndex &&
                lastMove.col === colIndex &&
                lastMove.player !== currentPlayer &&
                !winner;
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 bg-blue-700 rounded-full flex items-center justify-center cursor-pointer relative overflow-hidden"
                  onClick={() => handleColumnClick(colIndex)}
                  onMouseEnter={() => setHoverCol(colIndex)}
                  onMouseLeave={() => setHoverCol(null)}
                >
                  {cell && (
                    <motion.div
                      initial={isAnimating ? { y: -rowIndex * 48 - 50 } : false}
                      animate={{ y: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20, duration: 0.5 }}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${
                        cell === PLAYER_1 ? 'bg-red-500' : 'bg-yellow-400'
                      } ${isWinningCell(rowIndex, colIndex) ? 'ring-4 ring-white animate-pulse' : ''} ${
                        isOpponentLastMove ? 'ring-4 ring-white/60' : ''
                      }`}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mt-6 flex-wrap justify-center">
        <button
          onClick={resetGame}
          className="btn bg-primary hover:bg-indigo-600 text-white"
        >
          New Game
        </button>
        <button
          onClick={resetScores}
          className="btn bg-red-500 hover:bg-red-600 text-white"
        >
          Reset Scores
        </button>
        {gameMode === 'ai' && lastAiMove && (
          <button
            onClick={replayAiMove}
            disabled={replayingMove}
            className="btn bg-yellow-600 hover:bg-yellow-500 text-white disabled:opacity-50"
          >
            {replayingMove ? 'Replaying...' : 'Replay AI Move'}
          </button>
        )}
      </div>

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
        gameName="Connect 4"
      />
    </div>
  );
};

export default Connect4;
