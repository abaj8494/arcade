import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useWirelessGame from '../hooks/useWirelessGame';
import { WirelessButton, WirelessModal } from '../components/WirelessModal';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';

const EMPTY = null;
const BLACK = 'black';
const WHITE = 'white';

const Go = () => {
  const { showHelp, toggleHelp } = useHelpVisibility();

  const [boardSize, setBoardSize] = useState(9);
  const [board, setBoard] = useState(() => createEmptyBoard(9));
  const [currentPlayer, setCurrentPlayer] = useState(BLACK);
  const [gameOver, setGameOver] = useState(false);
  const [captures, setCaptures] = useState({ black: 0, white: 0 });
  const [lastMove, setLastMove] = useState(null);
  const [koPoint, setKoPoint] = useState(null);
  const [passCount, setPassCount] = useState(0);
  const [gameMode, setGameMode] = useState('2player');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [finalScore, setFinalScore] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const aiTimeoutRef = useRef(null);

  // Wireless state
  const [showWirelessModal, setShowWirelessModal] = useState(false);
  const [myColor, setMyColor] = useState(null);
  const wirelessMoveRef = useRef(null);

  // Komi (compensation for white going second)
  const komi = 6.5;

  function createEmptyBoard(size) {
    return Array(size).fill(null).map(() => Array(size).fill(EMPTY));
  }

  // Get all adjacent points
  const getNeighbors = useCallback((row, col, size) => {
    const neighbors = [];
    if (row > 0) neighbors.push([row - 1, col]);
    if (row < size - 1) neighbors.push([row + 1, col]);
    if (col > 0) neighbors.push([row, col - 1]);
    if (col < size - 1) neighbors.push([row, col + 1]);
    return neighbors;
  }, []);

  // Find all stones in a group and count liberties
  const getGroupAndLiberties = useCallback((board, row, col) => {
    const size = board.length;
    const color = board[row][col];
    if (!color) return { group: [], liberties: 0 };

    const group = [];
    const visited = new Set();
    let liberties = 0;
    const libertySet = new Set();

    const stack = [[row, col]];
    while (stack.length > 0) {
      const [r, c] = stack.pop();
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (board[r][c] === color) {
        group.push([r, c]);
        for (const [nr, nc] of getNeighbors(r, c, size)) {
          const nkey = `${nr},${nc}`;
          if (!visited.has(nkey)) {
            if (board[nr][nc] === EMPTY) {
              if (!libertySet.has(nkey)) {
                libertySet.add(nkey);
                liberties++;
              }
            } else if (board[nr][nc] === color) {
              stack.push([nr, nc]);
            }
          }
        }
      }
    }

    return { group, liberties };
  }, [getNeighbors]);

  // Check if a move is valid
  const isValidMove = useCallback((board, row, col, player, currentKoPoint) => {
    if (board[row][col] !== EMPTY) return false;

    // Check ko rule
    if (currentKoPoint && currentKoPoint[0] === row && currentKoPoint[1] === col) {
      return false;
    }

    const size = board.length;
    const opponent = player === BLACK ? WHITE : BLACK;

    // Simulate the move
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = player;

    // Check if any opponent groups are captured
    let captures = false;
    for (const [nr, nc] of getNeighbors(row, col, size)) {
      if (newBoard[nr][nc] === opponent) {
        const { liberties } = getGroupAndLiberties(newBoard, nr, nc);
        if (liberties === 0) {
          captures = true;
          break;
        }
      }
    }

    // If we capture something, move is valid
    if (captures) return true;

    // Check if our own group has liberties
    const { liberties } = getGroupAndLiberties(newBoard, row, col);
    return liberties > 0;
  }, [getNeighbors, getGroupAndLiberties]);

  // Make a move and return the new board state
  const makeMove = useCallback((row, col, player) => {
    if (!isValidMove(board, row, col, player, koPoint)) return false;

    const size = board.length;
    const opponent = player === BLACK ? WHITE : BLACK;
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = player;

    let capturedCount = 0;
    let capturedSingle = null;

    // Remove captured opponent groups
    for (const [nr, nc] of getNeighbors(row, col, size)) {
      if (newBoard[nr][nc] === opponent) {
        const { group, liberties } = getGroupAndLiberties(newBoard, nr, nc);
        if (liberties === 0) {
          if (group.length === 1) {
            capturedSingle = group[0];
          }
          capturedCount += group.length;
          for (const [gr, gc] of group) {
            newBoard[gr][gc] = EMPTY;
          }
        }
      }
    }

    // Update ko point (only if exactly one stone was captured and it could immediately recapture)
    let newKoPoint = null;
    if (capturedCount === 1 && capturedSingle) {
      // Check if replaying at captured point would capture the stone just played
      const testBoard = newBoard.map(r => [...r]);
      testBoard[capturedSingle[0]][capturedSingle[1]] = opponent;
      const { group, liberties } = getGroupAndLiberties(testBoard, row, col);
      if (liberties === 0 && group.length === 1) {
        newKoPoint = capturedSingle;
      }
    }

    setBoard(newBoard);
    setLastMove({ row, col, player });
    setKoPoint(newKoPoint);
    setPassCount(0);
    setMoveHistory(prev => [...prev, { row, col, player, type: 'move' }]);

    // Update captures
    if (capturedCount > 0) {
      setCaptures(prev => ({
        ...prev,
        [player]: prev[player] + capturedCount
      }));
    }

    // Switch player
    const nextPlayer = player === BLACK ? WHITE : BLACK;
    setCurrentPlayer(nextPlayer);

    return true;
  }, [board, koPoint, isValidMove, getNeighbors, getGroupAndLiberties]);

  // Handle pass
  const handlePass = useCallback(() => {
    if (gameOver || isAiThinking) return;
    if (gameMode === 'ai' && currentPlayer === WHITE) return;

    // Check wireless turn
    if (connectionState === 'connected' && myColor && myColor !== currentPlayer) return;

    const newPassCount = passCount + 1;
    setPassCount(newPassCount);
    setMoveHistory(prev => [...prev, { player: currentPlayer, type: 'pass' }]);
    setLastMove(null);
    setKoPoint(null);

    if (newPassCount >= 2) {
      // Game over - calculate score
      endGame();
    } else {
      const nextPlayer = currentPlayer === BLACK ? WHITE : BLACK;
      setCurrentPlayer(nextPlayer);

      if (connectionState === 'connected') {
        sendMove({ type: 'pass', player: currentPlayer });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver, isAiThinking, gameMode, currentPlayer, passCount, myColor]);

  // Calculate territory and final score
  const calculateScore = useCallback((board) => {
    const size = board.length;
    const visited = new Set();
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // Count stones on board
    let blackStones = 0;
    let whiteStones = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === BLACK) blackStones++;
        else if (board[r][c] === WHITE) whiteStones++;
      }
    }

    // Find and assign empty regions (territory)
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === EMPTY && !visited.has(`${r},${c}`)) {
          // Flood fill to find connected empty region
          const region = [];
          const stack = [[r, c]];
          let touchesBlack = false;
          let touchesWhite = false;

          while (stack.length > 0) {
            const [cr, cc] = stack.pop();
            const key = `${cr},${cc}`;
            if (visited.has(key)) continue;
            visited.add(key);

            if (board[cr][cc] === EMPTY) {
              region.push([cr, cc]);
              for (const [nr, nc] of getNeighbors(cr, cc, size)) {
                if (!visited.has(`${nr},${nc}`)) {
                  if (board[nr][nc] === EMPTY) {
                    stack.push([nr, nc]);
                  } else if (board[nr][nc] === BLACK) {
                    touchesBlack = true;
                  } else if (board[nr][nc] === WHITE) {
                    touchesWhite = true;
                  }
                }
              }
            }
          }

          // Assign territory
          if (touchesBlack && !touchesWhite) {
            blackTerritory += region.length;
          } else if (touchesWhite && !touchesBlack) {
            whiteTerritory += region.length;
          }
        }
      }
    }

    return {
      black: blackStones + blackTerritory + captures.white, // Add captured opponent stones
      white: whiteStones + whiteTerritory + captures.black + komi,
      blackTerritory,
      whiteTerritory
    };
  }, [getNeighbors, captures, komi]);

  const endGame = useCallback(() => {
    const score = calculateScore(board);
    setFinalScore(score);
    setGameOver(true);
  }, [board, calculateScore]);

  // Wireless handlers
  const handleWirelessMove = useCallback((data) => {
    if (wirelessMoveRef.current) {
      wirelessMoveRef.current(data);
    }
  }, []);

  const handleWirelessState = useCallback((state) => {
    if (state.board) setBoard(state.board);
    if (state.currentPlayer) setCurrentPlayer(state.currentPlayer);
    if (state.captures) setCaptures(state.captures);
    if (state.gameOver !== undefined) setGameOver(state.gameOver);
    if (state.lastMove !== undefined) setLastMove(state.lastMove);
    if (state.koPoint !== undefined) setKoPoint(state.koPoint);
    if (state.passCount !== undefined) setPassCount(state.passCount);
    if (state.finalScore !== undefined) setFinalScore(state.finalScore);
    if (state.boardSize !== undefined) {
      setBoardSize(state.boardSize);
      if (!state.board) setBoard(createEmptyBoard(state.boardSize));
    }
  }, []);

  const { connectionState, playerNum, roomCode, error, createRoom, joinRoom, disconnect, sendMove, sendState } =
    useWirelessGame('go', handleWirelessMove, handleWirelessState);

  // Board rotation for wireless play - black at bottom for black player, white at bottom for white
  const flipBoard = gameMode === 'ai' ? false :
    (connectionState === 'connected' && myColor) ? myColor === WHITE :
    currentPlayer === WHITE;

  useEffect(() => {
    wirelessMoveRef.current = (data) => {
      if (data.type === 'pass') {
        const newPassCount = passCount + 1;
        setPassCount(newPassCount);
        setMoveHistory(prev => [...prev, { player: data.player, type: 'pass' }]);
        setLastMove(null);
        setKoPoint(null);
        if (newPassCount >= 2) {
          endGame();
        } else {
          setCurrentPlayer(data.player === BLACK ? WHITE : BLACK);
        }
      } else {
        const { row, col, player } = data;
        makeMove(row, col, player);
      }
    };
  }, [makeMove, passCount, endGame]);

  // Handle wireless connection
  useEffect(() => {
    if (connectionState === 'connected' && playerNum) {
      setMyColor(playerNum === 1 ? BLACK : WHITE);
      setGameMode('2player');
      if (playerNum === 1) {
        const initialBoard = createEmptyBoard(boardSize);
        setBoard(initialBoard);
        setCurrentPlayer(BLACK);
        setGameOver(false);
        setCaptures({ black: 0, white: 0 });
        setLastMove(null);
        setKoPoint(null);
        setPassCount(0);
        setFinalScore(null);
        setMoveHistory([]);
        sendState({
          board: initialBoard,
          boardSize,
          currentPlayer: BLACK,
          captures: { black: 0, white: 0 },
          gameOver: false,
          lastMove: null,
          koPoint: null,
          passCount: 0,
          finalScore: null
        });
      }
    }
  }, [connectionState, playerNum, sendState, boardSize]);

  const handleCreateRoom = () => createRoom();
  const handleJoinRoom = (code) => joinRoom(code);
  const handleDisconnect = () => {
    disconnect();
    setMyColor(null);
    resetGame();
  };

  // Handle intersection click
  const handleIntersectionClick = (row, col) => {
    if (gameOver || isAiThinking) return;
    if (gameMode === 'ai' && currentPlayer === WHITE) return;

    // Check wireless turn
    if (connectionState === 'connected' && myColor) {
      if (myColor !== currentPlayer) return;
    }

    const success = makeMove(row, col, currentPlayer);
    if (success && connectionState === 'connected') {
      sendMove({ row, col, player: currentPlayer, type: 'move' });
    }
  };

  // AI logic
  const evaluatePosition = useCallback((board, player) => {
    const size = board.length;
    const opponent = player === BLACK ? WHITE : BLACK;
    let score = 0;

    // Count stones and liberties
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === player) {
          score += 10;
          const { liberties } = getGroupAndLiberties(board, r, c);
          score += liberties * 2;
        } else if (board[r][c] === opponent) {
          score -= 10;
          const { liberties } = getGroupAndLiberties(board, r, c);
          score -= liberties * 2;
        }
      }
    }

    // Bonus for corners (valuable in Go for making eyes)
    const cornerBonus = 5;
    const corners = [[0, 0], [0, size - 1], [size - 1, 0], [size - 1, size - 1]];
    for (const [r, c] of corners) {
      if (board[r][c] === player) score += cornerBonus;
      else if (board[r][c] === opponent) score -= cornerBonus;
    }

    return score;
  }, [getGroupAndLiberties]);

  const getAiMove = useCallback(() => {
    const size = board.length;
    const validMoves = [];

    // Collect all valid moves
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (isValidMove(board, r, c, WHITE, koPoint)) {
          validMoves.push([r, c]);
        }
      }
    }

    if (validMoves.length === 0) return null;

    // Easy: mostly random
    if (aiDifficulty === 'easy') {
      if (Math.random() < 0.7) {
        return validMoves[Math.floor(Math.random() * validMoves.length)];
      }
    }

    // Score each move
    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (const [r, c] of validMoves) {
      const newBoard = board.map(row => [...row]);
      newBoard[r][c] = WHITE;

      // Remove captured stones
      for (const [nr, nc] of getNeighbors(r, c, size)) {
        if (newBoard[nr][nc] === BLACK) {
          const { group, liberties } = getGroupAndLiberties(newBoard, nr, nc);
          if (liberties === 0) {
            for (const [gr, gc] of group) {
              newBoard[gr][gc] = EMPTY;
            }
          }
        }
      }

      let score = evaluatePosition(newBoard, WHITE);

      // Bonus for capturing
      let captureCount = 0;
      for (const [nr, nc] of getNeighbors(r, c, size)) {
        if (board[nr][nc] === BLACK) {
          const { group, liberties } = getGroupAndLiberties(board, nr, nc);
          if (liberties === 1) {
            captureCount += group.length;
          }
        }
      }
      score += captureCount * 20;

      // Bonus for saving own groups in atari
      for (const [nr, nc] of getNeighbors(r, c, size)) {
        if (board[nr][nc] === WHITE) {
          const { liberties: oldLib } = getGroupAndLiberties(board, nr, nc);
          const { liberties: newLib } = getGroupAndLiberties(newBoard, r, c);
          if (oldLib === 1 && newLib > 1) {
            score += 30;
          }
        }
      }

      // Add some randomness
      score += Math.random() * 5;

      if (score > bestScore) {
        bestScore = score;
        bestMove = [r, c];
      }
    }

    return bestMove;
  }, [board, koPoint, aiDifficulty, isValidMove, getNeighbors, getGroupAndLiberties, evaluatePosition]);

  // AI turn
  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === WHITE && !gameOver) {
      setIsAiThinking(true);
      aiTimeoutRef.current = setTimeout(() => {
        const move = getAiMove();
        if (move) {
          makeMove(move[0], move[1], WHITE);
        } else {
          // AI passes if no good moves
          setPassCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 2) {
              endGame();
            }
            return newCount;
          });
          setMoveHistory(prev => [...prev, { player: WHITE, type: 'pass' }]);
          setCurrentPlayer(BLACK);
        }
        setIsAiThinking(false);
      }, 500);
    }

    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [gameMode, currentPlayer, gameOver, getAiMove, makeMove, endGame]);

  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard(boardSize));
    setCurrentPlayer(BLACK);
    setGameOver(false);
    setCaptures({ black: 0, white: 0 });
    setLastMove(null);
    setKoPoint(null);
    setPassCount(0);
    setFinalScore(null);
    setMoveHistory([]);
    setIsAiThinking(false);
    if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
  }, [boardSize]);

  const changeBoardSize = (newSize) => {
    setBoardSize(newSize);
    setBoard(createEmptyBoard(newSize));
    setCurrentPlayer(BLACK);
    setGameOver(false);
    setCaptures({ black: 0, white: 0 });
    setLastMove(null);
    setKoPoint(null);
    setPassCount(0);
    setFinalScore(null);
    setMoveHistory([]);
  };

  const getWinner = () => {
    if (!finalScore) return '';
    if (finalScore.black > finalScore.white) {
      return `Black wins by ${(finalScore.black - finalScore.white).toFixed(1)} points!`;
    } else if (finalScore.white > finalScore.black) {
      return `White wins by ${(finalScore.white - finalScore.black).toFixed(1)} points!`;
    }
    return "It's a tie!";
  };

  // Check if a point is a star point (hoshi)
  const isStarPoint = (row, col, size) => {
    if (size === 9) {
      const stars = [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]];
      return stars.some(([r, c]) => r === row && c === col);
    } else if (size === 13) {
      const stars = [[3, 3], [3, 9], [6, 6], [9, 3], [9, 9]];
      return stars.some(([r, c]) => r === row && c === col);
    } else if (size === 19) {
      const stars = [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]];
      return stars.some(([r, c]) => r === row && c === col);
    }
    return false;
  };

  // Get groups in atari (one liberty) for hints
  const getAtariGroups = useCallback(() => {
    const atariPoints = new Set();
    for (let r = 0; r < boardSize; r++) {
      for (let c = 0; c < boardSize; c++) {
        if (board[r][c]) {
          const { group, liberties } = getGroupAndLiberties(board, r, c);
          if (liberties === 1) {
            group.forEach(([gr, gc]) => atariPoints.add(`${gr},${gc}`));
          }
        }
      }
    }
    return atariPoints;
  }, [board, boardSize, getGroupAndLiberties]);

  const atariGroups = showHints ? getAtariGroups() : new Set();

  // Calculate cell size based on board size
  const getCellSize = () => {
    if (boardSize === 19) return 'w-5 h-5 sm:w-6 sm:h-6';
    if (boardSize === 13) return 'w-6 h-6 sm:w-8 sm:h-8';
    return 'w-8 h-8 sm:w-10 sm:h-10';
  };

  const getStoneSize = () => {
    if (boardSize === 19) return 'w-4 h-4 sm:w-5 sm:h-5';
    if (boardSize === 13) return 'w-5 h-5 sm:w-7 sm:h-7';
    return 'w-7 h-7 sm:w-9 sm:h-9';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">Go</h1>
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

      {/* Board Size Selection */}
      <div className="mb-4 flex gap-2">
        {[9, 13, 19].map((size) => (
          <button
            key={size}
            onClick={() => changeBoardSize(size)}
            className={`btn text-sm ${boardSize === size ? 'bg-amber-600' : 'bg-gray-600 hover:bg-gray-500'}`}
            disabled={connectionState === 'connected'}
          >
            {size}×{size}
          </button>
        ))}
      </div>

      {/* Score Board */}
      <div className="mb-4 p-4 bg-surface rounded-lg">
        <div className="flex gap-8 text-center">
          <div className={`${currentPlayer === BLACK && !gameOver ? 'ring-2 ring-white rounded-lg p-2' : 'p-2'}`}>
            <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-gray-900 border-2 border-gray-600" />
            <div className="text-sm text-gray-400">Captures</div>
            <div className="text-lg font-bold">{captures.black}</div>
          </div>
          <div className={`${currentPlayer === WHITE && !gameOver ? 'ring-2 ring-white rounded-lg p-2' : 'p-2'}`}>
            <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-white border-2 border-gray-300" />
            <div className="text-sm text-gray-400">Captures</div>
            <div className="text-lg font-bold">{captures.white}</div>
          </div>
        </div>
        {finalScore && (
          <div className="mt-2 pt-2 border-t border-gray-600 text-sm">
            <div className="flex justify-between">
              <span>Black: {finalScore.black.toFixed(1)}</span>
              <span>White: {finalScore.white.toFixed(1)} (incl. {komi} komi)</span>
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="mb-4 text-lg font-semibold">
        {gameOver ? (
          <span className="text-green-400">{getWinner()}</span>
        ) : isAiThinking ? (
          <span className="text-yellow-400">AI is thinking...</span>
        ) : (
          <span>{currentPlayer === BLACK ? 'Black' : 'White'}'s turn</span>
        )}
      </div>

      {/* Game Board */}
      <div className="bg-amber-200 p-4 rounded-lg shadow-xl relative">
        <div
          className="relative"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
            gap: 0
          }}
        >
          {(flipBoard ? [...board].reverse().map(row => [...row].reverse()) : board).map((row, displayRowIndex) => {
            const actualRowIndex = flipBoard ? boardSize - 1 - displayRowIndex : displayRowIndex;
            return row.map((cell, displayColIndex) => {
              const actualColIndex = flipBoard ? boardSize - 1 - displayColIndex : displayColIndex;
              const actualCell = board[actualRowIndex][actualColIndex];
              const isLast = lastMove?.row === actualRowIndex && lastMove?.col === actualColIndex;
              const isKo = koPoint && koPoint[0] === actualRowIndex && koPoint[1] === actualColIndex;
              const isAtari = atariGroups.has(`${actualRowIndex},${actualColIndex}`);
              const canPlay = !actualCell && isValidMove(board, actualRowIndex, actualColIndex, currentPlayer, koPoint);

              return (
                <div
                  key={`${actualRowIndex}-${actualColIndex}`}
                  className={`${getCellSize()} relative flex items-center justify-center cursor-pointer`}
                  onClick={() => handleIntersectionClick(actualRowIndex, actualColIndex)}
                >
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Horizontal line */}
                    <div
                      className="absolute h-px bg-gray-800"
                      style={{
                        left: displayColIndex === 0 ? '50%' : 0,
                        right: displayColIndex === boardSize - 1 ? '50%' : 0,
                        top: '50%'
                      }}
                    />
                    {/* Vertical line */}
                    <div
                      className="absolute w-px bg-gray-800"
                      style={{
                        top: displayRowIndex === 0 ? '50%' : 0,
                        bottom: displayRowIndex === boardSize - 1 ? '50%' : 0,
                        left: '50%'
                      }}
                    />
                  </div>

                  {/* Star point */}
                  {isStarPoint(actualRowIndex, actualColIndex, boardSize) && !actualCell && (
                    <div className="absolute w-2 h-2 bg-gray-800 rounded-full" />
                  )}

                  {/* Stone */}
                  <AnimatePresence>
                    {actualCell && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={`${getStoneSize()} rounded-full z-10 ${
                          actualCell === BLACK
                            ? 'bg-gradient-to-br from-gray-700 to-gray-900 border border-gray-600'
                            : 'bg-gradient-to-br from-white to-gray-200 border border-gray-300'
                        } ${isAtari ? 'ring-2 ring-red-500' : ''}`}
                      >
                        {/* Last move marker */}
                        {isLast && (
                          <div className={`absolute inset-0 flex items-center justify-center`}>
                            <div className={`w-2 h-2 rounded-full ${actualCell === BLACK ? 'bg-white' : 'bg-black'}`} />
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Ko marker */}
                  {isKo && showHints && (
                    <div className="absolute w-3 h-3 border-2 border-red-500 rounded-sm z-5" />
                  )}

                  {/* Valid move hint */}
                  {showHints && canPlay && !actualCell && (
                    <div className={`absolute w-3 h-3 rounded-full opacity-30 z-5 ${
                      currentPlayer === BLACK ? 'bg-gray-900' : 'bg-white border border-gray-400'
                    }`} />
                  )}
                </div>
              );
            });
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mt-6 flex-wrap justify-center">
        <button onClick={resetGame} className="btn btn-primary">
          New Game
        </button>
        <button
          onClick={handlePass}
          className="btn bg-orange-600 hover:bg-orange-500"
          disabled={gameOver || isAiThinking || (connectionState === 'connected' && myColor !== currentPlayer)}
        >
          Pass
        </button>
        <button
          onClick={() => setShowHints(!showHints)}
          className={`btn ${showHints ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'}`}
        >
          Hints {showHints ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Move count */}
      <div className="mt-4 text-gray-400 text-sm">
        Moves: {moveHistory.filter(m => m.type === 'move').length}
      </div>

      {/* Help */}
      {showHelp && (
        <div className="mt-4 p-4 bg-surface rounded-lg max-w-md text-gray-300 text-sm">
          <h3 className="font-bold mb-2">How to Play Go:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Black plays first, placing stones on intersections</li>
            <li>Surround opponent stones to capture them</li>
            <li>Stones with no liberties (adjacent empty points) are captured</li>
            <li>Ko rule: cannot immediately recapture (marked with red square)</li>
            <li>Pass when you have no good moves</li>
            <li>Game ends when both players pass</li>
            <li>Score = your stones + surrounded territory + captures</li>
            <li>White gets {komi} points (komi) to compensate for going second</li>
            <li>Red ring indicates stones in atari (one liberty left)</li>
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
        gameName="Go"
      />
    </div>
  );
};

export default Go;
