import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useWirelessGame from '../hooks/useWirelessGame';
import { WirelessButton, WirelessModal } from '../components/WirelessModal';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';
import WirelessDebugPanel from '../components/WirelessDebugPanel';
import wl from '../utils/wirelessLogger';

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6]             // diagonals
];

const UltimateTicTacToe = () => {
  // Main board: 9 mini boards, each mini board has 9 cells
  const [boards, setBoards] = useState(() => Array(9).fill(null).map(() => Array(9).fill(null)));
  const [boardWinners, setBoardWinners] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [activeBoard, setActiveBoard] = useState(null); // null means any board is valid
  const [gameWinner, setGameWinner] = useState(null);
  const [winningBoards, setWinningBoards] = useState([]);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [lastMove, setLastMove] = useState(null);
  const { showHelp, toggleHelp } = useHelpVisibility();

  // AI settings
  const [gameMode, setGameMode] = useState('2player'); // '2player', 'ai', or 'wireless'
  const [aiDifficulty, setAiDifficulty] = useState('medium'); // 'easy', 'medium', 'hard'
  const [isAiThinking, setIsAiThinking] = useState(false);
  const aiTimeoutRef = useRef(null);

  // Refs to avoid stale closures in wireless callbacks
  const boardsRef = useRef(boards);
  const boardWinnersRef = useRef(boardWinners);
  useEffect(() => { boardsRef.current = boards; }, [boards]);
  useEffect(() => { boardWinnersRef.current = boardWinners; }, [boardWinners]);

  // Wireless state
  const [showWirelessModal, setShowWirelessModal] = useState(false);
  const [mySymbol, setMySymbol] = useState(null); // 'X' or 'O' in wireless mode
  const wirelessMoveRef = useRef(null); // Store move handler ref

  const checkWinner = useCallback((cells) => {
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
        return { winner: cells[a], line: [a, b, c] };
      }
    }
    if (cells.every(cell => cell !== null)) {
      return { winner: 'draw', line: null };
    }
    return null;
  }, []);

  // Get all valid moves for current state
  const getValidMoves = useCallback((bds, winners, active) => {
    const moves = [];
    const boardsToCheck = active !== null ? [active] :
      Array.from({ length: 9 }, (_, i) => i).filter(i => !winners[i]);

    for (const boardIdx of boardsToCheck) {
      if (winners[boardIdx]) continue;
      for (let cellIdx = 0; cellIdx < 9; cellIdx++) {
        if (!bds[boardIdx][cellIdx]) {
          moves.push({ board: boardIdx, cell: cellIdx });
        }
      }
    }
    return moves;
  }, []);

  // Apply a move and return new state
  const applyMove = useCallback((bds, winners, move, player) => {
    const newBoards = bds.map(b => [...b]);
    newBoards[move.board][move.cell] = player;

    const newWinners = [...winners];
    const boardResult = checkWinner(newBoards[move.board]);
    if (boardResult) {
      newWinners[move.board] = boardResult.winner;
    }

    // Determine next active board
    let nextActive = move.cell;
    if (newWinners[nextActive] || newBoards[nextActive].every(c => c !== null)) {
      nextActive = null;
    }

    const gameResult = checkWinner(newWinners);

    return {
      boards: newBoards,
      winners: newWinners,
      active: nextActive,
      gameOver: gameResult !== null,
      result: gameResult
    };
  }, [checkWinner]);

  // Fast AI using minimax with alpha-beta pruning
  const getAiMove = useCallback((bds, winners, active, difficulty) => {
    const startTime = performance.now();
    console.log('=== UTTT AI DEBUG ===');
    console.log('Active board:', active);
    console.log('Board winners:', winners);
    console.log('Difficulty:', difficulty);

    const moves = getValidMoves(bds, winners, active);
    console.log('Valid moves:', moves.length);
    if (moves.length === 0) return null;
    if (moves.length === 1) {
      console.log('Only one move available');
      return moves[0];
    }

    const AI = 'O';
    const HUMAN = 'X';
    let nodeCount = 0;

    // Fast static evaluation
    const evaluate = (boards, boardWins) => {
      let score = 0;

      // Check for game win/loss
      const gameResult = checkWinner(boardWins);
      if (gameResult) {
        if (gameResult.winner === AI) return 100000;
        if (gameResult.winner === HUMAN) return -100000;
        return 0;
      }

      // Evaluate meta-board lines
      for (const [a, b, c] of WINNING_COMBINATIONS) {
        const line = [boardWins[a], boardWins[b], boardWins[c]];
        const aiCount = line.filter(w => w === AI).length;
        const humanCount = line.filter(w => w === HUMAN).length;
        const open = line.filter(w => w === null).length;

        if (aiCount === 2 && open === 1) score += 500;
        else if (humanCount === 2 && open === 1) score -= 500;
        else if (aiCount === 1 && open === 2) score += 50;
        else if (humanCount === 1 && open === 2) score -= 50;
      }

      // Strategic positions
      if (boardWins[4] === AI) score += 200;
      else if (boardWins[4] === HUMAN) score -= 200;

      for (const c of [0, 2, 6, 8]) {
        if (boardWins[c] === AI) score += 80;
        else if (boardWins[c] === HUMAN) score -= 80;
      }

      // Quick sub-board evaluation (only check threats)
      for (let b = 0; b < 9; b++) {
        if (boardWins[b]) continue;
        const board = boards[b];
        for (const [x, y, z] of WINNING_COMBINATIONS) {
          const line = [board[x], board[y], board[z]];
          const aiCount = line.filter(c => c === AI).length;
          const humanCount = line.filter(c => c === HUMAN).length;
          const empty = line.filter(c => c === null).length;

          if (aiCount === 2 && empty === 1) score += 15;
          else if (humanCount === 2 && empty === 1) score -= 15;
        }
      }

      return score;
    };

    // Simple minimax with alpha-beta
    const minimax = (boards, boardWins, activeBoard, depth, alpha, beta, isMaximizing) => {
      nodeCount++;
      if (nodeCount > 50000) {
        console.log('AI exceeded 50k nodes, returning early');
        return 0;
      }

      const gameResult = checkWinner(boardWins);
      if (gameResult) {
        if (gameResult.winner === AI) return 100000 + depth;
        if (gameResult.winner === HUMAN) return -100000 - depth;
        return 0;
      }

      if (depth === 0) {
        return evaluate(boards, boardWins);
      }

      const currentMoves = getValidMoves(boards, boardWins, activeBoard);
      if (currentMoves.length === 0) return 0;

      // Simple move ordering (no expensive state computation)
      currentMoves.sort((a, b) => {
        let sa = 0, sb = 0;
        if (a.cell === 4) sa += 3;
        if (b.cell === 4) sb += 3;
        if (a.board === 4) sa += 2;
        if (b.board === 4) sb += 2;
        if ([0,2,6,8].includes(a.cell)) sa += 1;
        if ([0,2,6,8].includes(b.cell)) sb += 1;
        return sb - sa;
      });

      if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of currentMoves) {
          const newState = applyMove(boards, boardWins, move, AI);
          const evalScore = minimax(newState.boards, newState.winners, newState.active, depth - 1, alpha, beta, false);
          maxEval = Math.max(maxEval, evalScore);
          alpha = Math.max(alpha, evalScore);
          if (beta <= alpha) break;
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for (const move of currentMoves) {
          const newState = applyMove(boards, boardWins, move, HUMAN);
          const evalScore = minimax(newState.boards, newState.winners, newState.active, depth - 1, alpha, beta, true);
          minEval = Math.min(minEval, evalScore);
          beta = Math.min(beta, evalScore);
          if (beta <= alpha) break;
        }
        return minEval;
      }
    };

    // Depth based on difficulty (keep shallow for speed)
    const depth = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
    console.log('Search depth:', depth);

    // Easy mode: random chance
    if (difficulty === 'easy' && Math.random() < 0.4) {
      const move = moves[Math.floor(Math.random() * moves.length)];
      console.log('Easy mode random move:', move);
      console.log('Time:', (performance.now() - startTime).toFixed(2), 'ms');
      return move;
    }

    // Quick check for immediate wins/blocks
    for (const move of moves) {
      const state = applyMove(bds, winners, move, AI);
      if (state.result && state.result.winner === AI) {
        console.log('Found winning move:', move);
        console.log('Time:', (performance.now() - startTime).toFixed(2), 'ms');
        return move;
      }
    }

    // Check if opponent could win (block)
    for (const move of moves) {
      const state = applyMove(bds, winners, move, HUMAN);
      if (state.result && state.result.winner === HUMAN) {
        console.log('Blocking opponent win:', move);
        console.log('Time:', (performance.now() - startTime).toFixed(2), 'ms');
        return move;
      }
    }

    // Find best move with minimax
    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      const newState = applyMove(bds, winners, move, AI);
      const score = minimax(newState.boards, newState.winners, newState.active, depth - 1, -Infinity, Infinity, false);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    // Medium mode: occasional suboptimal play
    if (difficulty === 'medium' && Math.random() < 0.15) {
      const randomMoves = moves.filter(m => m.cell === 4 || m.board === 4 || [0,2,6,8].includes(m.cell));
      if (randomMoves.length > 0) {
        const move = randomMoves[Math.floor(Math.random() * randomMoves.length)];
        console.log('Medium mode random move:', move);
        console.log('Total nodes:', nodeCount, 'Time:', (performance.now() - startTime).toFixed(2), 'ms');
        return move;
      }
    }

    console.log('Best move:', bestMove, 'Score:', bestScore);
    console.log('Total nodes:', nodeCount, 'Time:', (performance.now() - startTime).toFixed(2), 'ms');
    return bestMove;
  }, [getValidMoves, applyMove, checkWinner]);

  // Core move logic - reads from refs so it's stable for wireless callbacks
  const executeMove = useCallback((boardIndex, cellIndex, player) => {
    const curBoards = boardsRef.current;
    const curWinners = boardWinnersRef.current;

    const newBoards = curBoards.map(b => [...b]);
    newBoards[boardIndex][cellIndex] = player;
    setBoards(newBoards);
    setLastMove({ board: boardIndex, cell: cellIndex });

    // Check if this mini board is won
    const newBoardWinners = [...curWinners];
    const boardResult = checkWinner(newBoards[boardIndex]);
    if (boardResult) {
      newBoardWinners[boardIndex] = boardResult.winner;
      setBoardWinners(newBoardWinners);

      // Check if main game is won
      const gameResult = checkWinner(newBoardWinners);
      if (gameResult) {
        setGameWinner(gameResult.winner);
        setWinningBoards(gameResult.line || []);
        if (gameResult.winner === 'draw') {
          setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
        } else {
          setScores(prev => ({ ...prev, [gameResult.winner]: prev[gameResult.winner] + 1 }));
        }
        return;
      }
    }

    // Determine next active board
    const nextBoard = cellIndex;
    if (newBoardWinners[nextBoard] || newBoards[nextBoard].every(c => c !== null)) {
      setActiveBoard(null); // Free choice
    } else {
      setActiveBoard(nextBoard);
    }

    setCurrentPlayer(player === 'X' ? 'O' : 'X');
  }, [checkWinner]);

  // Store executeMove in ref for wireless callback
  useEffect(() => {
    wirelessMoveRef.current = executeMove;
  }, [executeMove]);

  // Handle incoming wireless moves
  const handleWirelessMove = useCallback((data, from) => {
    if (data.type === 'move' && wirelessMoveRef.current) {
      const { board: boardIdx, cell: cellIdx, player } = data;
      wl.recv('move', { board: boardIdx, cell: cellIdx, player, from });
      wirelessMoveRef.current(boardIdx, cellIdx, player);
    }
  }, []);

  // Wireless hook
  const wireless = useWirelessGame(
    'ultimate-tic-tac-toe',
    handleWirelessMove,
    null
  );

  // Set symbol when wireless connects - player 1 is X, player 2 is O
  useEffect(() => {
    if (wireless.isConnected && wireless.playerNum && gameMode !== 'wireless') {
      setMySymbol(wireless.isPlayer1 ? 'X' : 'O');
      setGameMode('wireless');
      // Reset game for wireless play
      setBoards(Array(9).fill(null).map(() => Array(9).fill(null)));
      setBoardWinners(Array(9).fill(null));
      setCurrentPlayer('X');
      setActiveBoard(null);
      setGameWinner(null);
      setWinningBoards([]);
      setLastMove(null);
    }
  }, [wireless.isConnected, wireless.playerNum, wireless.isPlayer1, gameMode]);

  // AI turn effect - use ref to prevent cleanup from canceling the timeout
  const aiStartedRef = useRef(false);

  useEffect(() => {
    console.log('AI effect check:', { gameMode, currentPlayer, gameWinner, isAiThinking });
    if (gameMode !== 'ai' || currentPlayer !== 'O' || gameWinner) {
      aiStartedRef.current = false;
      return;
    }

    // Prevent re-triggering if already started
    if (aiStartedRef.current || isAiThinking) {
      return;
    }

    console.log('AI turn starting...');
    aiStartedRef.current = true;
    setIsAiThinking(true);

    aiTimeoutRef.current = setTimeout(() => {
      console.log('AI setTimeout fired, calling getAiMove...');
      try {
        const move = getAiMove(boards, boardWinners, activeBoard, aiDifficulty);
        console.log('getAiMove returned:', move);
        if (move) {
          executeMove(move.board, move.cell, 'O');
        }
      } catch (err) {
        console.error('AI error:', err);
      }
      setIsAiThinking(false);
      aiStartedRef.current = false;
    }, 300);

    return () => {
      // Only clear if we're no longer in AI mode or game ended
      if (gameMode !== 'ai' || gameWinner) {
        if (aiTimeoutRef.current) {
          clearTimeout(aiTimeoutRef.current);
        }
        aiStartedRef.current = false;
      }
    };
  }, [gameMode, currentPlayer, gameWinner, boards, boardWinners, activeBoard, aiDifficulty, isAiThinking, getAiMove, executeMove]);

  const handleCellClick = (boardIndex, cellIndex) => {
    // Check if move is valid
    if (gameWinner) return;
    if (boards[boardIndex][cellIndex]) return;
    if (boardWinners[boardIndex]) return;
    if (activeBoard !== null && activeBoard !== boardIndex) return;
    // Block clicks during AI's turn
    if (gameMode === 'ai' && currentPlayer === 'O') return;
    // Block clicks if not my turn in wireless mode
    if (gameMode === 'wireless' && currentPlayer !== mySymbol) return;

    // In wireless mode, send FIRST — only apply locally if send succeeded
    if (gameMode === 'wireless' && wireless.isConnected) {
      const { sent } = wireless.sendMove({
        type: 'move',
        board: boardIndex,
        cell: cellIndex,
        player: currentPlayer
      });
      if (!sent) {
        wl.error('move send failed', { board: boardIndex, cell: cellIndex });
        return; // Don't apply locally — avoids desync
      }
      wl.send('move', { board: boardIndex, cell: cellIndex, player: currentPlayer });
    }

    executeMove(boardIndex, cellIndex, currentPlayer);
  };

  const resetGame = () => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
    setBoards(Array(9).fill(null).map(() => Array(9).fill(null)));
    setBoardWinners(Array(9).fill(null));
    setCurrentPlayer('X');
    setActiveBoard(null);
    setGameWinner(null);
    setWinningBoards([]);
    setLastMove(null);
    setIsAiThinking(false);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0, draws: 0 });
    resetGame();
  };

  const getStatusText = () => {
    if (gameWinner === 'draw') return "It's a draw!";
    if (gameWinner) {
      if (gameMode === 'ai') {
        return gameWinner === 'X' ? 'You win!' : 'AI wins!';
      }
      return `Player ${gameWinner} wins!`;
    }
    if (isAiThinking) return 'AI is thinking...';
    const playerLabel = gameMode === 'ai' ? (currentPlayer === 'X' ? 'Your' : "AI's") : `${currentPlayer}'s`;
    if (activeBoard === null) return `${playerLabel} turn - Play anywhere`;
    return `${playerLabel} turn - Play in highlighted board`;
  };

  const getBoardClass = (boardIndex) => {
    const isWon = boardWinners[boardIndex];
    const isActive = activeBoard === null ? !isWon : activeBoard === boardIndex;
    const isWinningBoard = winningBoards.includes(boardIndex);

    let classes = 'grid grid-cols-3 gap-0.5 p-1 rounded transition-all duration-200 ';

    if (isWinningBoard) {
      classes += 'ring-4 ring-green-500 ';
    }

    if (isWon) {
      classes += isWon === 'X' ? 'bg-blue-900/50 ' :
                 isWon === 'O' ? 'bg-pink-900/50 ' : 'bg-gray-700 ';
    } else if (isActive && !gameWinner) {
      classes += 'bg-gray-600 ring-2 ring-primary ';
    } else {
      classes += 'bg-gray-700/50 ';
    }

    return classes;
  };

  const getCellClass = (boardIndex, cellIndex) => {
    const cell = boards[boardIndex][cellIndex];
    const boardWon = boardWinners[boardIndex];
    const isLastMove = lastMove && lastMove.board === boardIndex && lastMove.cell === cellIndex;

    let classes = 'w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-sm sm:text-lg font-bold rounded transition-all ';

    if (isLastMove) {
      classes += 'ring-2 ring-yellow-400 ';
    }

    if (boardWon || gameWinner) {
      classes += 'cursor-default ';
    } else if (cell) {
      classes += 'cursor-default ';
    } else {
      const isPlayable = activeBoard === null ? !boardWon : activeBoard === boardIndex;
      classes += isPlayable ? 'cursor-pointer hover:bg-gray-500 ' : 'cursor-not-allowed ';
    }

    classes += 'bg-surface ';

    return classes;
  };

  const getSymbolColour = (value) => {
    if (value === 'X') return 'text-blue-400';
    if (value === 'O') return 'text-pink-400';
    return '';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">Ultimate Tic Tac Toe</h1>
        <WirelessButton
          onClick={() => setShowWirelessModal(true)}
          isActive={wireless.isConnected}
          disabled={gameMode === 'ai'}
        />
        <HelpButton onClick={toggleHelp} isActive={showHelp} />
      </div>

      {/* Wireless status */}
      {wireless.isConnected && (
        <div className="mb-2 px-3 py-1 rounded-full bg-green-600 text-sm">
          Wireless: You are {mySymbol} (Player {wireless.playerNum})
        </div>
      )}

      {/* Game Mode Selection */}
      <div className="mb-4 flex gap-4 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => { setGameMode('2player'); resetGame(); wireless.disconnect(); }}
            className={`btn text-sm ${gameMode === '2player' ? 'bg-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
          >
            2 Player
          </button>
          <button
            onClick={() => { setGameMode('ai'); resetGame(); wireless.disconnect(); }}
            className={`btn text-sm ${gameMode === 'ai' ? 'bg-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
          >
            vs AI
          </button>
        </div>
        {gameMode === 'ai' && (
          <div className="flex gap-2">
            <button
              onClick={() => { setAiDifficulty('easy'); resetGame(); }}
              className={`btn text-sm ${aiDifficulty === 'easy' ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              Easy
            </button>
            <button
              onClick={() => { setAiDifficulty('medium'); resetGame(); }}
              className={`btn text-sm ${aiDifficulty === 'medium' ? 'bg-yellow-600' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              Medium
            </button>
            <button
              onClick={() => { setAiDifficulty('hard'); resetGame(); }}
              className={`btn text-sm ${aiDifficulty === 'hard' ? 'bg-red-600' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              Hard
            </button>
          </div>
        )}
      </div>

      {/* Score Board */}
      <div className="mb-4 p-4 bg-surface rounded-lg">
        <div className="flex gap-8 text-center">
          <div>
            <div className="text-blue-400 text-2xl font-bold">{gameMode === 'ai' ? 'You' : 'X'}</div>
            <div className="text-xl">{scores.X}</div>
          </div>
          <div>
            <div className="text-gray-400 text-lg">Draws</div>
            <div className="text-xl">{scores.draws}</div>
          </div>
          <div>
            <div className="text-pink-400 text-2xl font-bold">{gameMode === 'ai' ? 'AI' : 'O'}</div>
            <div className="text-xl">{scores.O}</div>
          </div>
        </div>
      </div>

      {/* AI Thinking Indicator */}
      {isAiThinking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-3 rounded-lg bg-pink-600 flex items-center gap-3"
        >
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          <span>AI is thinking...</span>
        </motion.div>
      )}

      {/* Status */}
      <motion.div
        key={getStatusText()}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-lg mb-4 font-semibold text-center ${
          gameWinner === 'X' ? 'text-blue-400' :
          gameWinner === 'O' ? 'text-pink-400' :
          gameWinner === 'draw' ? 'text-gray-400' :
          currentPlayer === 'X' ? 'text-blue-400' : 'text-pink-400'
        }`}
      >
        {getStatusText()}
      </motion.div>

      {/* Main Game Board */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-gray-800 rounded-xl mb-6">
        {boards.map((board, boardIndex) => (
          <div key={boardIndex} className={getBoardClass(boardIndex)}>
            {boardWinners[boardIndex] && boardWinners[boardIndex] !== 'draw' ? (
              <div className="col-span-3 row-span-3 flex items-center justify-center">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`text-5xl font-bold ${getSymbolColour(boardWinners[boardIndex])}`}
                >
                  {boardWinners[boardIndex]}
                </motion.span>
              </div>
            ) : boardWinners[boardIndex] === 'draw' ? (
              <div className="col-span-3 row-span-3 flex items-center justify-center">
                <span className="text-2xl text-gray-500">Draw</span>
              </div>
            ) : (
              board.map((cell, cellIndex) => (
                <motion.button
                  key={cellIndex}
                  className={getCellClass(boardIndex, cellIndex)}
                  onClick={() => handleCellClick(boardIndex, cellIndex)}
                  whileHover={!cell && !boardWinners[boardIndex] && !gameWinner ? { scale: 1.1 } : {}}
                  whileTap={!cell && !boardWinners[boardIndex] && !gameWinner ? { scale: 0.9 } : {}}
                >
                  {cell && (
                    <motion.span
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className={getSymbolColour(cell)}
                    >
                      {cell}
                    </motion.span>
                  )}
                </motion.button>
              ))
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6">
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
      </div>

      {/* Rules */}
      {showHelp && (
        <div className="mt-2 p-4 bg-surface rounded-lg max-w-lg text-gray-400 text-sm">
          <h3 className="text-white font-semibold mb-2">How to Play:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Win 3 small boards in a row to win the game</li>
            <li>Your move determines which board your opponent plays in next</li>
            <li>If sent to a won/full board, play anywhere</li>
            <li>Highlighted board shows where you must play</li>
          </ul>
        </div>
      )}

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>

      <WirelessDebugPanel />

      {/* Wireless Modal */}
      <WirelessModal
        isOpen={showWirelessModal}
        onClose={() => setShowWirelessModal(false)}
        connectionState={wireless.connectionState}
        playerNum={wireless.playerNum}
        roomCode={wireless.roomCode}
        error={wireless.error}
        onCreateRoom={wireless.createRoom}
        onJoinRoom={wireless.joinRoom}
        onDisconnect={wireless.disconnect}
        gameName="Ultimate Tic Tac Toe"
      />
    </div>
  );
};

export default UltimateTicTacToe;
