import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import TowersOfHanoi from './pages/TowersOfHanoi';
import TicTacToe from './pages/TicTacToe';
import Connect4 from './pages/Connect4';
import Sudoku from './pages/Sudoku';
import UltimateTicTacToe from './pages/UltimateTicTacToe';
import Chess from './pages/Chess';
import Tetris from './pages/Tetris';
import Snake from './pages/Snake';
import Pong from './pages/Pong';
import Hashiwokakero from './pages/Hashiwokakero';
import KnightsTour from './pages/KnightsTour';
import GameOfLife from './pages/GameOfLife';
import RockPaperScissors from './pages/RockPaperScissors';
import SydneyTrainGame from './pages/SydneyTrainGame';
import PegSolitaire from './pages/PegSolitaire';
import GamePlaceholder from './pages/GamePlaceholder';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/towers-of-hanoi" element={<TowersOfHanoi />} />
          <Route path="/game/tic-tac-toe" element={<TicTacToe />} />
          <Route path="/game/connect4" element={<Connect4 />} />
          <Route path="/game/sudoku" element={<Sudoku />} />
          <Route path="/game/ultimate-tic-tac-toe" element={<UltimateTicTacToe />} />
          <Route path="/game/banagrams-solver" element={<GamePlaceholder name="Banagrams Solver" />} />
          <Route path="/game/chess" element={<Chess />} />
          <Route path="/game/tetris" element={<Tetris />} />
          <Route path="/game/snake" element={<Snake />} />
          <Route path="/game/pong" element={<Pong />} />
          <Route path="/game/hashiwokakero" element={<Hashiwokakero />} />
          <Route path="/game/knights-tour" element={<KnightsTour />} />
          <Route path="/game/game-of-life" element={<GameOfLife />} />
          <Route path="/game/rock-paper-scissors" element={<RockPaperScissors />} />
          <Route path="/game/sydney-train-game" element={<SydneyTrainGame />} />
          <Route path="/game/peg-solitaire" element={<PegSolitaire />} />
        </Routes>
      </main>
      <footer className="bg-surface py-4 text-center text-gray-400">
        <div className="container mx-auto">
          <p>Arcade Games &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

export default App; 