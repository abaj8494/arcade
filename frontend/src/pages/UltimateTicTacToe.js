import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useWirelessGame from '../hooks/useWirelessGame';
import { WirelessButton, WirelessModal } from '../components/WirelessModal';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';

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

  // AI helper: evaluate a line (3 positions) for scoring
  const evaluateLine = useCallback((cells, a, b, c, player) => {
    const opponent = player === 'X' ? 'O' : 'X';
    const line = [cells[a], cells[b], cells[c]];
    const playerCount = line.filter(c => c === player).length;
    const opponentCount = line.filter(c => c === opponent).length;
    const emptyCount = line.filter(c => c === null).length;

    if (playerCount === 3) return 100;
    if (opponentCount === 3) return -100;
    if (playerCount === 2 && emptyCount === 1) return 10;
    if (opponentCount === 2 && emptyCount === 1) return -10;
    if (playerCount === 1 && emptyCount === 2) return 1;
    if (opponentCount === 1 && emptyCount === 2) return -1;
    return 0;
  }, []);

  // AI helper: evaluate a mini board
  const evaluateMiniBoard = useCallback((cells, player) => {
    let score = 0;
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      score += evaluateLine(cells, a, b, c, player);
    }
    // Centre cell bonus
    if (cells[4] === player) score += 3;
    else if (cells[4] !== null) score -= 3;
    return score;
  }, [evaluateLine]);

  // AI helper: evaluate the entire game state
  const evaluateGameState = useCallback((bds, winners, player) => {
    let score = 0;
    const opponent = player === 'X' ? 'O' : 'X';

    // Evaluate main board (board winners)
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      score += evaluateLine(winners, a, b, c, player) * 100;
    }

    // Centre board is most strategic
    if (winners[4] === player) score += 500;
    else if (winners[4] === opponent) score -= 500;

    // Corner boards are next most valuable
    [0, 2, 6, 8].forEach(i => {
      if (winners[i] === player) score += 300;
      else if (winners[i] === opponent) score -= 300;
    });

    // Evaluate each mini board's potential
    for (let i = 0; i < 9; i++) {
      if (!winners[i]) {
        score += evaluateMiniBoard(bds[i], player) * 5;
      }
    }

    return score;
  }, [evaluateLine, evaluateMiniBoard]);

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

  // Alpha-beta AI with proper minimax search
  const getAiMove = useCallback((bds, winners, active, difficulty) => {
    const moves = getValidMoves(bds, winners, active);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    const AI = 'O';
    const HUMAN = 'X';

    // Static evaluation function for non-terminal states
    const evaluate = (boards, boardWins, player) => {
      let score = 0;
      const opp = player === AI ? HUMAN : AI;

      // Evaluate meta-board (which sub-boards are won)
      for (const [a, b, c] of WINNING_COMBINATIONS) {
        const line = [boardWins[a], boardWins[b], boardWins[c]];
        const pCount = line.filter(w => w === player).length;
        const oCount = line.filter(w => w === opp).length;
        const open = line.filter(w => w === null).length;
        const draws = line.filter(w => w === 'draw').length;

        if (pCount === 3) score += 10000;
        else if (oCount === 3) score -= 10000;
        else if (pCount === 2 && open === 1) score += 500;
        else if (oCount === 2 && open === 1) score -= 500;
        else if (pCount === 1 && open === 2 && draws === 0) score += 50;
        else if (oCount === 1 && open === 2 && draws === 0) score -= 50;
      }

      // Strategic board bonuses
      if (boardWins[4] === player) score += 200;
      else if (boardWins[4] === opp) score -= 200;

      for (const corner of [0, 2, 6, 8]) {
        if (boardWins[corner] === player) score += 80;
        else if (boardWins[corner] === opp) score -= 80;
      }

      // Evaluate potential in each sub-board
      for (let b = 0; b < 9; b++) {
        if (boardWins[b]) continue;
        const board = boards[b];
        for (const [a, x, c] of WINNING_COMBINATIONS) {
          const line = [board[a], board[x], board[c]];
          const pCount = line.filter(cell => cell === player).length;
          const oCount = line.filter(cell => cell === opp).length;
          const empty = line.filter(cell => cell === null).length;

          if (pCount === 2 && empty === 1) score += 20;
          else if (oCount === 2 && empty === 1) score -= 20;
          else if (pCount === 1 && empty === 2) score += 2;
          else if (oCount === 1 && empty === 2) score -= 2;
        }
        // Center cell bonus
        if (board[4] === player) score += 5;
        else if (board[4] === opp) score -= 5;
      }

      return score;
    };

    // Check if game is over
    const isTerminal = (boardWins) => {
      const result = checkWinner(boardWins);
      return result !== null;
    };

    // Get terminal score
    const terminalScore = (boardWins, depth) => {
      const result = checkWinner(boardWins);
      if (!result) return 0;
      if (result.winner === AI) return 100000 - depth; // Prefer faster wins
      if (result.winner === HUMAN) return -100000 + depth; // Prefer slower losses
      return 0; // Draw
    };

    // Negamax with alpha-beta pruning
    const alphabeta = (boards, boardWins, activeBoard, depth, alpha, beta, maximizing) => {
      if (isTerminal(boardWins)) {
        const score = terminalScore(boardWins, depth);
        return maximizing ? score : -score;
      }

      if (depth === 0) {
        const score = evaluate(boards, boardWins, AI);
        return maximizing ? score : -score;
      }

      const currentMoves = getValidMoves(boards, boardWins, activeBoard);
      if (currentMoves.length === 0) {
        return 0; // Draw
      }

      // Move ordering: prioritize center cells and winning moves
      currentMoves.sort((a, b) => {
        let scoreA = 0, scoreB = 0;
        if (a.cell === 4) scoreA += 10;
        if (b.cell === 4) scoreB += 10;
        if (a.board === 4) scoreA += 5;
        if (b.board === 4) scoreB += 5;
        return scoreB - scoreA;
      });

      const player = maximizing ? AI : HUMAN;
      let bestScore = -Infinity;

      for (const move of currentMoves) {
        const newState = applyMove(boards, boardWins, move, player);
        const score = -alphabeta(
          newState.boards,
          newState.winners,
          newState.active,
          depth - 1,
          -beta,
          -alpha,
          !maximizing
        );

        if (score > bestScore) {
          bestScore = score;
        }
        alpha = Math.max(alpha, score);
        if (alpha >= beta) break; // Beta cutoff
      }

      return bestScore;
    };

    // Determine search depth based on difficulty
    const getDepth = (diff, numMoves) => {
      if (diff === 'easy') return 1;
      if (diff === 'medium') return numMoves > 30 ? 3 : 2;
      // Hard mode: deeper search, but limit based on move count
      if (numMoves > 50) return 5;
      if (numMoves > 30) return 4;
      return 3;
    };

    const depth = getDepth(difficulty, moves.length);

    // Easy mode: add randomness
    if (difficulty === 'easy' && Math.random() < 0.4) {
      return moves[Math.floor(Math.random() * moves.length)];
    }

    // Find best move using alpha-beta
    let bestMove = moves[0];
    let bestScore = -Infinity;

    // Sort moves for better pruning
    const sortedMoves = [...moves].sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      // Prioritize center positions
      if (a.cell === 4) scoreA += 20;
      if (b.cell === 4) scoreB += 20;
      if (a.board === 4) scoreA += 10;
      if (b.board === 4) scoreB += 10;
      // Check if move wins a board
      const stateA = applyMove(bds, winners, a, AI);
      const stateB = applyMove(bds, winners, b, AI);
      if (stateA.winners[a.board] === AI && !winners[a.board]) scoreA += 100;
      if (stateB.winners[b.board] === AI && !winners[b.board]) scoreB += 100;
      return scoreB - scoreA;
    });

    for (const move of sortedMoves) {
      const newState = applyMove(bds, winners, move, AI);

      // Check for immediate win
      if (newState.result && newState.result.winner === AI) {
        return move;
      }

      const score = -alphabeta(
        newState.boards,
        newState.winners,
        newState.active,
        depth - 1,
        -Infinity,
        -bestScore,
        false
      );

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    // Medium mode: occasionally pick a suboptimal move
    if (difficulty === 'medium' && Math.random() < 0.15) {
      const goodMoves = sortedMoves.slice(0, Math.min(3, sortedMoves.length));
      return goodMoves[Math.floor(Math.random() * goodMoves.length)];
    }

    return bestMove;
  }, [getValidMoves, applyMove, checkWinner]);

  // Core move logic - used by both human and AI
  const executeMove = useCallback((boardIndex, cellIndex, player) => {
    const newBoards = boards.map(b => [...b]);
    newBoards[boardIndex][cellIndex] = player;
    setBoards(newBoards);
    setLastMove({ board: boardIndex, cell: cellIndex });

    // Check if this mini board is won
    const newBoardWinners = [...boardWinners];
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
  }, [boards, boardWinners, checkWinner]);

  // Store executeMove in ref for wireless callback
  useEffect(() => {
    wirelessMoveRef.current = executeMove;
  }, [executeMove]);

  // Handle incoming wireless moves
  const handleWirelessMove = useCallback((data, from) => {
    if (data.type === 'move' && wirelessMoveRef.current) {
      const { board: boardIdx, cell: cellIdx, player } = data;
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

  // AI turn effect
  useEffect(() => {
    if (gameMode !== 'ai' || currentPlayer !== 'O' || gameWinner || isAiThinking) {
      return;
    }

    setIsAiThinking(true);
    aiTimeoutRef.current = setTimeout(() => {
      const move = getAiMove(boards, boardWinners, activeBoard, aiDifficulty);
      if (move) {
        executeMove(move.board, move.cell, 'O');
      }
      setIsAiThinking(false);
    }, 500); // Small delay for UX

    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
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

    executeMove(boardIndex, cellIndex, currentPlayer);

    // Send move to opponent in wireless mode
    if (gameMode === 'wireless' && wireless.isConnected) {
      wireless.sendMove({
        type: 'move',
        board: boardIndex,
        cell: cellIndex,
        player: currentPlayer
      });
    }
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

      {/* Wireless Modal */}
      <WirelessModal
        isOpen={showWirelessModal}
        onClose={() => setShowWirelessModal(false)}
        connectionState={wireless.connectionState}
        playerNum={wireless.playerNum}
        error={wireless.error}
        onConnect={wireless.connect}
        onDisconnect={wireless.disconnect}
        gameName="Ultimate Tic Tac Toe"
      />
    </div>
  );
};

export default UltimateTicTacToe;
