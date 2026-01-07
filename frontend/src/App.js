import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import TowersOfHanoi from './pages/TowersOfHanoi';
import TicTacToe from './pages/TicTacToe';
import Connect4 from './pages/Connect4';
import Sudoku from './pages/Sudoku';
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
          <Route path="/game/ultimate-tic-tac-toe" element={<GamePlaceholder name="Ultimate Tic Tac Toe" />} />
          <Route path="/game/banagrams-solver" element={<GamePlaceholder name="Banagrams Solver" />} />
          <Route path="/game/chess" element={<GamePlaceholder name="Chess" />} />
          <Route path="/game/tetris" element={<GamePlaceholder name="Tetris" />} />
          <Route path="/game/snake" element={<GamePlaceholder name="Snake" />} />
          <Route path="/game/pong" element={<GamePlaceholder name="Pong" />} />
          <Route path="/game/hashiwokakero" element={<GamePlaceholder name="Hashiwokakero" />} />
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