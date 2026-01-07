import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

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

  const handleCellClick = (boardIndex, cellIndex) => {
    // Check if move is valid
    if (gameWinner) return;
    if (boards[boardIndex][cellIndex]) return;
    if (boardWinners[boardIndex]) return;
    if (activeBoard !== null && activeBoard !== boardIndex) return;

    // Make the move
    const newBoards = boards.map(b => [...b]);
    newBoards[boardIndex][cellIndex] = currentPlayer;
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

    setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
  };

  const resetGame = () => {
    setBoards(Array(9).fill(null).map(() => Array(9).fill(null)));
    setBoardWinners(Array(9).fill(null));
    setCurrentPlayer('X');
    setActiveBoard(null);
    setGameWinner(null);
    setWinningBoards([]);
    setLastMove(null);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0, draws: 0 });
    resetGame();
  };

  const getStatusText = () => {
    if (gameWinner === 'draw') return "It's a draw!";
    if (gameWinner) return `Player ${gameWinner} wins!`;
    if (activeBoard === null) return `${currentPlayer}'s turn - Play anywhere`;
    return `${currentPlayer}'s turn - Play in highlighted board`;
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

  const getSymbolColor = (value) => {
    if (value === 'X') return 'text-blue-400';
    if (value === 'O') return 'text-pink-400';
    return '';
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">Ultimate Tic Tac Toe</h1>

      {/* Score Board */}
      <div className="mb-4 p-4 bg-surface rounded-lg">
        <div className="flex gap-8 text-center">
          <div>
            <div className="text-blue-400 text-2xl font-bold">X</div>
            <div className="text-xl">{scores.X}</div>
          </div>
          <div>
            <div className="text-gray-400 text-lg">Draws</div>
            <div className="text-xl">{scores.draws}</div>
          </div>
          <div>
            <div className="text-pink-400 text-2xl font-bold">O</div>
            <div className="text-xl">{scores.O}</div>
          </div>
        </div>
      </div>

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
                  className={`text-5xl font-bold ${getSymbolColor(boardWinners[boardIndex])}`}
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
                      className={getSymbolColor(cell)}
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
      <div className="mt-2 p-4 bg-surface rounded-lg max-w-lg text-gray-400 text-sm">
        <h3 className="text-white font-semibold mb-2">How to Play:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Win 3 small boards in a row to win the game</li>
          <li>Your move determines which board your opponent plays in next</li>
          <li>If sent to a won/full board, play anywhere</li>
          <li>Highlighted board shows where you must play</li>
        </ul>
      </div>

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default UltimateTicTacToe;
