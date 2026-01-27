import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';
import axios from 'axios';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://arcade.abaj.ai/api';

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const COLOR_CLASSES = {
  red: 'bg-red-500 hover:bg-red-400',
  blue: 'bg-blue-500 hover:bg-blue-400',
  green: 'bg-green-500 hover:bg-green-400',
  yellow: 'bg-yellow-400 hover:bg-yellow-300',
  purple: 'bg-purple-500 hover:bg-purple-400'
};

const DIFFICULTIES = {
  easy: { rows: 10, cols: 10, colors: 3, label: 'Easy' },
  medium: { rows: 12, cols: 12, colors: 4, label: 'Medium' },
  hard: { rows: 15, cols: 15, colors: 5, label: 'Hard' }
};

const BubbleBurst = () => {
  const [difficulty, setDifficulty] = useState('medium');
  const [board, setBoard] = useState([]);
  const [score, setScore] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [previewScore, setPreviewScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [bubblesLeft, setBubblesLeft] = useState(0);
  const { showHelp, toggleHelp } = useHelpVisibility();

  // Leaderboard state
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState({ easy: [], medium: [], hard: [] });
  const [leaderboardTab, setLeaderboardTab] = useState('medium');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [pendingScore, setPendingScore] = useState(null);

  const config = DIFFICULTIES[difficulty];

  // Create new board
  const createBoard = useCallback(() => {
    const { rows, cols, colors } = DIFFICULTIES[difficulty];
    const board = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push(COLORS[Math.floor(Math.random() * colors)]);
      }
      board.push(row);
    }
    return board;
  }, [difficulty]);

  // Initialize game
  const initGame = useCallback(() => {
    const newBoard = createBoard();
    setBoard(newBoard);
    setScore(0);
    setSelectedGroup(null);
    setPreviewScore(0);
    setGameOver(false);
    countBubbles(newBoard);
  }, [createBoard]);

  // Count remaining bubbles
  const countBubbles = (board) => {
    let count = 0;
    for (const row of board) {
      for (const cell of row) {
        if (cell) count++;
      }
    }
    setBubblesLeft(count);
    return count;
  };

  // Find connected group of same color
  const findGroup = useCallback((board, startRow, startCol) => {
    if (!board[startRow] || !board[startRow][startCol]) return [];

    const color = board[startRow][startCol];
    const visited = new Set();
    const group = [];
    const stack = [[startRow, startCol]];

    while (stack.length > 0) {
      const [r, c] = stack.pop();
      const key = `${r},${c}`;

      if (visited.has(key)) continue;
      if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) continue;
      if (board[r][c] !== color) continue;

      visited.add(key);
      group.push([r, c]);

      stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }

    return group;
  }, []);

  // Calculate score for a group (n^2 scoring)
  const calculateGroupScore = (groupSize) => {
    return groupSize * groupSize;
  };

  // Apply gravity - bubbles fall down and columns collapse left
  const applyGravity = useCallback((board) => {
    const rows = board.length;
    const cols = board[0].length;
    const newBoard = board.map(r => [...r]);

    // First, let bubbles fall down within each column
    for (let c = 0; c < cols; c++) {
      const column = [];
      for (let r = rows - 1; r >= 0; r--) {
        if (newBoard[r][c]) {
          column.push(newBoard[r][c]);
        }
      }
      // Fill column from bottom
      for (let r = rows - 1; r >= 0; r--) {
        newBoard[r][c] = column[rows - 1 - r] || null;
      }
    }

    // Then, collapse empty columns to the left
    const nonEmptyCols = [];
    for (let c = 0; c < cols; c++) {
      let hasContent = false;
      for (let r = 0; r < rows; r++) {
        if (newBoard[r][c]) {
          hasContent = true;
          break;
        }
      }
      if (hasContent) {
        nonEmptyCols.push(c);
      }
    }

    // Rebuild board with collapsed columns
    const finalBoard = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let i = 0; i < cols; i++) {
        if (i < nonEmptyCols.length) {
          row.push(newBoard[r][nonEmptyCols[i]]);
        } else {
          row.push(null);
        }
      }
      finalBoard.push(row);
    }

    return finalBoard;
  }, []);

  // Check if any moves are available
  const hasValidMoves = useCallback((board) => {
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[0].length; c++) {
        if (board[r][c]) {
          const group = findGroup(board, r, c);
          if (group.length >= 2) return true;
        }
      }
    }
    return false;
  }, [findGroup]);

  // Handle cell click
  const handleCellClick = (row, col) => {
    if (gameOver || !board[row][col]) return;

    const group = findGroup(board, row, col);

    // Need at least 2 bubbles to pop
    if (group.length < 2) {
      setSelectedGroup(null);
      setPreviewScore(0);
      return;
    }

    // Check if this is the same group (second click = confirm)
    const isSameGroup = selectedGroup &&
      selectedGroup.length === group.length &&
      selectedGroup.every(([r, c]) => group.some(([gr, gc]) => gr === r && gc === c));

    if (isSameGroup) {
      // Pop the group
      const newBoard = board.map(r => [...r]);
      for (const [r, c] of group) {
        newBoard[r][c] = null;
      }

      const afterGravity = applyGravity(newBoard);
      const groupScore = calculateGroupScore(group.length);

      setBoard(afterGravity);
      setScore(prev => prev + groupScore);
      setSelectedGroup(null);
      setPreviewScore(0);
      countBubbles(afterGravity);

      // Check game over
      if (!hasValidMoves(afterGravity)) {
        setGameOver(true);
      }
    } else {
      // First click - show preview
      setSelectedGroup(group);
      setPreviewScore(calculateGroupScore(group.length));
    }
  };

  // Check if cell is in selected group
  const isInSelectedGroup = (row, col) => {
    return selectedGroup?.some(([r, c]) => r === row && c === col);
  };

  // Initialize on mount and difficulty change
  useEffect(() => {
    initGame();
  }, [difficulty, initGame]);

  // Handle game over - show leaderboard prompt
  useEffect(() => {
    if (gameOver && score > 0) {
      setPendingScore({ difficulty, score });
      setShowNamePrompt(true);
    }
  }, [gameOver, score, difficulty]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/games/bubble-burst/leaderboard`);
      setLeaderboard(response.data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  }, []);

  useEffect(() => {
    if (showLeaderboard) {
      fetchLeaderboard();
    }
  }, [showLeaderboard, fetchLeaderboard]);

  // Submit score
  const submitScore = async () => {
    if (!playerName.trim() || !pendingScore) return;

    try {
      await axios.post(`${API_URL}/games/bubble-burst/leaderboard`, {
        name: playerName.trim(),
        difficulty: pendingScore.difficulty,
        score: pendingScore.score
      });
      await fetchLeaderboard();
      setShowNamePrompt(false);
      setPlayerName('');
      setPendingScore(null);
      setShowLeaderboard(true);
      setLeaderboardTab(pendingScore.difficulty);
    } catch (err) {
      console.error('Error submitting score:', err);
    }
  };

  const cancelScoreSubmit = () => {
    setShowNamePrompt(false);
    setPlayerName('');
    setPendingScore(null);
  };

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center gap-6">
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold">Bubble Burst</h1>
          <HelpButton onClick={toggleHelp} isActive={showHelp} />
        </div>
        <p className="text-gray-400 mb-4">Pop groups of bubbles for points!</p>

        {/* Difficulty selection */}
        <div className="mb-4 flex gap-2 flex-wrap justify-center">
          {Object.entries(DIFFICULTIES).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setDifficulty(key)}
              className={`btn ${difficulty === key ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
            >
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mb-4 flex gap-6 text-lg bg-gray-800 px-6 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <span>Score:</span>
            <span className="font-mono font-bold text-green-500">{score}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Bubbles:</span>
            <span className="font-mono font-bold text-blue-500">{bubblesLeft}</span>
          </div>
          {previewScore > 0 && (
            <div className="flex items-center gap-2 text-yellow-400">
              <span>+{previewScore}</span>
              <span className="text-sm">(click again)</span>
            </div>
          )}
        </div>

        {/* Game over message */}
        <AnimatePresence>
          {gameOver && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="mb-4 p-3 rounded-lg font-bold bg-purple-600"
            >
              Game Over! Final Score: {score}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game board */}
        <div className="bg-gray-800 p-2 rounded-lg overflow-auto max-w-full">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${config.cols}, minmax(0, 1fr))`
            }}
          >
            {board.map((row, rowIdx) =>
              row.map((cell, colIdx) => (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                    cell
                      ? `${COLOR_CLASSES[cell]} ${isInSelectedGroup(rowIdx, colIdx) ? 'ring-2 ring-white scale-110' : ''}`
                      : 'bg-gray-700'
                  }`}
                  onClick={() => handleCellClick(rowIdx, colIdx)}
                >
                  {cell && isInSelectedGroup(rowIdx, colIdx) && (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className="w-full h-full rounded-full"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={initGame}
            className="btn bg-green-600 hover:bg-green-500"
          >
            New Game
          </button>
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className={`btn ${showLeaderboard ? 'btn-primary' : 'bg-yellow-600 hover:bg-yellow-500'}`}
          >
            Leaderboard
          </button>
        </div>

        {/* Help */}
        {showHelp && (
          <div className="p-4 bg-surface rounded-lg max-w-md text-gray-400 text-sm mt-4">
            <h3 className="text-white font-semibold mb-2">How to Play:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Click on a group of 2+ same-colored bubbles to select</li>
              <li>Click again to pop them and earn points</li>
              <li>Larger groups = more points (size squared)</li>
              <li>Bubbles fall down and columns collapse left</li>
              <li>Game ends when no more groups of 2+ remain</li>
            </ul>
          </div>
        )}

        <Link to="/" className="btn btn-secondary mt-6">
          Back to Games
        </Link>
      </div>

      {/* Leaderboard panel */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="bg-gray-800 rounded-lg p-4 w-72 lg:mt-12"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Leaderboard</h2>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                x
              </button>
            </div>

            {/* Difficulty tabs */}
            <div className="flex gap-1 mb-4">
              {Object.entries(DIFFICULTIES).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setLeaderboardTab(key)}
                  className={`flex-1 py-1 px-2 text-xs rounded transition-colors ${
                    leaderboardTab === key
                      ? 'bg-primary text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            {/* Scores list */}
            <div className="space-y-2">
              {leaderboard[leaderboardTab]?.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No scores yet!</p>
              ) : (
                leaderboard[leaderboardTab]?.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`flex justify-between items-center p-2 rounded ${
                      idx === 0 ? 'bg-yellow-600/20' : idx === 1 ? 'bg-gray-400/20' : idx === 2 ? 'bg-amber-700/20' : 'bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-bold w-6 ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {idx + 1}.
                      </span>
                      <span className="truncate max-w-[120px]">{entry.name}</span>
                    </div>
                    <span className="font-mono text-green-400">{entry.score}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Name prompt modal */}
      <AnimatePresence>
        {showNamePrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            onClick={cancelScoreSubmit}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-2">Game Over!</h2>
              <p className="text-gray-400 mb-4">
                Score: {pendingScore?.score} on {DIFFICULTIES[pendingScore?.difficulty]?.label}
              </p>
              <p className="text-gray-300 mb-2">Enter your name for the leaderboard:</p>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitScore()}
                placeholder="Your name"
                maxLength={20}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:border-primary focus:outline-none mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={submitScore}
                  disabled={!playerName.trim()}
                  className="flex-1 btn bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
                <button
                  onClick={cancelScoreSubmit}
                  className="flex-1 btn bg-gray-600 hover:bg-gray-500"
                >
                  Skip
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BubbleBurst;
