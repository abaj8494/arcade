import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const WINNING_COMBINATIONS = [
  [0, 1, 2], // rows
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6], // columns
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8], // diagonals
  [2, 4, 6]
];

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });

  const checkWinner = useCallback((squares) => {
    for (const [a, b, c] of WINNING_COMBINATIONS) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: [a, b, c] };
      }
    }
    if (squares.every(square => square !== null)) {
      return { winner: 'draw', line: null };
    }
    return null;
  }, []);

  const handleCellClick = (index) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    if (result) {
      setWinner(result.winner);
      setWinningLine(result.line);
      if (result.winner === 'draw') {
        setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
      } else {
        setScores(prev => ({ ...prev, [result.winner]: prev[result.winner] + 1 }));
      }
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
    setWinningLine(null);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0, draws: 0 });
    resetGame();
  };

  const getStatusText = () => {
    if (winner === 'draw') return "It's a draw!";
    if (winner) return `Player ${winner} wins!`;
    return `Player ${currentPlayer}'s turn`;
  };

  const getCellClass = (index) => {
    let classes = 'w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center text-4xl sm:text-5xl font-bold rounded-lg transition-all duration-200 ';

    if (winningLine?.includes(index)) {
      classes += 'bg-green-600 ';
    } else if (board[index]) {
      classes += 'bg-surface ';
    } else if (!winner) {
      classes += 'bg-surface hover:bg-gray-600 cursor-pointer ';
    } else {
      classes += 'bg-surface ';
    }

    return classes;
  };

  const getSymbolColour = (value) => {
    if (value === 'X') return 'text-blue-400';
    if (value === 'O') return 'text-pink-400';
    return '';
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">Tic Tac Toe</h1>

      {/* Score Board */}
      <div className="mb-6 p-4 bg-surface rounded-lg">
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
        className={`text-xl mb-6 font-semibold ${
          winner === 'X' ? 'text-blue-400' :
          winner === 'O' ? 'text-pink-400' :
          winner === 'draw' ? 'text-yellow-400' :
          currentPlayer === 'X' ? 'text-blue-400' : 'text-pink-400'
        }`}
      >
        {getStatusText()}
      </motion.div>

      {/* Game Board */}
      <div className="grid grid-cols-3 gap-2 mb-6 p-4 bg-gray-700 rounded-xl">
        {board.map((cell, index) => (
          <motion.button
            key={index}
            className={getCellClass(index)}
            onClick={() => handleCellClick(index)}
            whileHover={!board[index] && !winner ? { scale: 1.05 } : {}}
            whileTap={!board[index] && !winner ? { scale: 0.95 } : {}}
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

      {/* Game Rules */}
      <div className="mt-4 p-4 bg-surface rounded-lg max-w-md text-center text-gray-400 text-sm">
        <p>Take turns placing X and O on the board.</p>
        <p>First to get three in a row wins!</p>
      </div>

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default TicTacToe;
