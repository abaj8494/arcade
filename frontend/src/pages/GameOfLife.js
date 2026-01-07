import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const CELL_SIZE = 15;
const DEFAULT_ROWS = 40;
const DEFAULT_COLS = 60;

// Preset patterns
const PATTERNS = {
  glider: [
    [0, 1], [1, 2], [2, 0], [2, 1], [2, 2]
  ],
  blinker: [
    [0, 0], [0, 1], [0, 2]
  ],
  beacon: [
    [0, 0], [0, 1], [1, 0], [1, 1],
    [2, 2], [2, 3], [3, 2], [3, 3]
  ],
  pulsar: [
    [0, 2], [0, 3], [0, 4], [0, 8], [0, 9], [0, 10],
    [2, 0], [2, 5], [2, 7], [2, 12],
    [3, 0], [3, 5], [3, 7], [3, 12],
    [4, 0], [4, 5], [4, 7], [4, 12],
    [5, 2], [5, 3], [5, 4], [5, 8], [5, 9], [5, 10],
    [7, 2], [7, 3], [7, 4], [7, 8], [7, 9], [7, 10],
    [8, 0], [8, 5], [8, 7], [8, 12],
    [9, 0], [9, 5], [9, 7], [9, 12],
    [10, 0], [10, 5], [10, 7], [10, 12],
    [12, 2], [12, 3], [12, 4], [12, 8], [12, 9], [12, 10],
  ],
  gliderGun: [
    [0, 24],
    [1, 22], [1, 24],
    [2, 12], [2, 13], [2, 20], [2, 21], [2, 34], [2, 35],
    [3, 11], [3, 15], [3, 20], [3, 21], [3, 34], [3, 35],
    [4, 0], [4, 1], [4, 10], [4, 16], [4, 20], [4, 21],
    [5, 0], [5, 1], [5, 10], [5, 14], [5, 16], [5, 17], [5, 22], [5, 24],
    [6, 10], [6, 16], [6, 24],
    [7, 11], [7, 15],
    [8, 12], [8, 13],
  ],
};

const GameOfLife = () => {
  const [grid, setGrid] = useState(() => createEmptyGrid());
  const [isRunning, setIsRunning] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [speed, setSpeed] = useState(100);
  const [isDrawing, setIsDrawing] = useState(false);
  const runningRef = useRef(isRunning);
  const speedRef = useRef(speed);

  runningRef.current = isRunning;
  speedRef.current = speed;

  function createEmptyGrid() {
    return Array(DEFAULT_ROWS).fill(null).map(() =>
      Array(DEFAULT_COLS).fill(false)
    );
  }

  function createRandomGrid() {
    return Array(DEFAULT_ROWS).fill(null).map(() =>
      Array(DEFAULT_COLS).fill(null).map(() => Math.random() > 0.7)
    );
  }

  const countNeighbors = useCallback((grid, row, col) => {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const newRow = row + i;
        const newCol = col + j;
        if (newRow >= 0 && newRow < DEFAULT_ROWS && newCol >= 0 && newCol < DEFAULT_COLS) {
          if (grid[newRow][newCol]) count++;
        }
      }
    }
    return count;
  }, []);

  const nextGeneration = useCallback(() => {
    setGrid(currentGrid => {
      const newGrid = currentGrid.map((row, rowIdx) =>
        row.map((cell, colIdx) => {
          const neighbors = countNeighbors(currentGrid, rowIdx, colIdx);
          if (cell) {
            return neighbors === 2 || neighbors === 3;
          } else {
            return neighbors === 3;
          }
        })
      );
      return newGrid;
    });
    setGeneration(g => g + 1);
  }, [countNeighbors]);

  // Game loop
  useEffect(() => {
    let timeoutId;

    const runSimulation = () => {
      if (!runningRef.current) return;
      nextGeneration();
      timeoutId = setTimeout(runSimulation, speedRef.current);
    };

    if (isRunning) {
      timeoutId = setTimeout(runSimulation, speedRef.current);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isRunning, nextGeneration]);

  const handleCellClick = (row, col) => {
    const newGrid = grid.map((r, rIdx) =>
      r.map((cell, cIdx) => {
        if (rIdx === row && cIdx === col) {
          return !cell;
        }
        return cell;
      })
    );
    setGrid(newGrid);
  };

  const handleMouseDown = (row, col) => {
    setIsDrawing(true);
    handleCellClick(row, col);
  };

  const handleMouseEnter = (row, col) => {
    if (isDrawing && !isRunning) {
      const newGrid = grid.map((r, rIdx) =>
        r.map((cell, cIdx) => {
          if (rIdx === row && cIdx === col) {
            return true;
          }
          return cell;
        })
      );
      setGrid(newGrid);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const loadPattern = (patternName) => {
    const pattern = PATTERNS[patternName];
    if (!pattern) return;

    const newGrid = createEmptyGrid();
    const offsetRow = Math.floor(DEFAULT_ROWS / 2) - 5;
    const offsetCol = Math.floor(DEFAULT_COLS / 2) - 5;

    pattern.forEach(([r, c]) => {
      const row = r + offsetRow;
      const col = c + offsetCol;
      if (row >= 0 && row < DEFAULT_ROWS && col >= 0 && col < DEFAULT_COLS) {
        newGrid[row][col] = true;
      }
    });

    setGrid(newGrid);
    setGeneration(0);
    setIsRunning(false);
  };

  const clearGrid = () => {
    setGrid(createEmptyGrid());
    setGeneration(0);
    setIsRunning(false);
  };

  const randomize = () => {
    setGrid(createRandomGrid());
    setGeneration(0);
  };

  const population = grid.flat().filter(cell => cell).length;

  return (
    <div className="flex flex-col items-center" onMouseUp={handleMouseUp}>
      <h1 className="text-3xl font-bold mb-2">Conway's Game of Life</h1>
      <p className="text-gray-400 mb-4">A cellular automaton simulation</p>

      {/* Stats */}
      <div className="mb-4 flex gap-6 text-lg">
        <div>
          Generation: <span className="text-primary font-bold">{generation}</span>
        </div>
        <div>
          Population: <span className="text-green-500 font-bold">{population}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex gap-2 flex-wrap justify-center">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`btn ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-500'}`}
        >
          {isRunning ? 'Stop' : 'Start'}
        </button>
        <button
          onClick={nextGeneration}
          className="btn bg-blue-600 hover:bg-blue-500"
          disabled={isRunning}
        >
          Step
        </button>
        <button
          onClick={clearGrid}
          className="btn bg-gray-600 hover:bg-gray-500"
        >
          Clear
        </button>
        <button
          onClick={randomize}
          className="btn bg-purple-600 hover:bg-purple-500"
        >
          Random
        </button>
      </div>

      {/* Speed control */}
      <div className="mb-4 flex items-center gap-4">
        <span className="text-gray-400">Speed:</span>
        <input
          type="range"
          min="10"
          max="500"
          value={510 - speed}
          onChange={(e) => setSpeed(510 - parseInt(e.target.value))}
          className="w-32"
        />
        <span className="text-gray-400 text-sm">{Math.round(1000 / speed)}x</span>
      </div>

      {/* Pattern presets */}
      <div className="mb-4 flex gap-2 flex-wrap justify-center">
        <span className="text-gray-400 self-center">Patterns:</span>
        {Object.keys(PATTERNS).map(pattern => (
          <button
            key={pattern}
            onClick={() => loadPattern(pattern)}
            className="btn text-sm bg-gray-700 hover:bg-gray-600"
          >
            {pattern.charAt(0).toUpperCase() + pattern.slice(1).replace(/([A-Z])/g, ' $1')}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="bg-gray-900 border border-gray-700 overflow-auto max-w-full">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${DEFAULT_COLS}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${DEFAULT_ROWS}, ${CELL_SIZE}px)`,
          }}
        >
          {grid.map((row, rowIdx) =>
            row.map((cell, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={`border border-gray-800 transition-colors cursor-pointer ${
                  cell ? 'bg-green-500' : 'bg-gray-900 hover:bg-gray-700'
                }`}
                style={{ width: CELL_SIZE, height: CELL_SIZE }}
                onMouseDown={() => handleMouseDown(rowIdx, colIdx)}
                onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
              />
            ))
          )}
        </div>
      </div>

      {/* Rules */}
      <div className="mt-4 p-4 bg-surface rounded-lg max-w-lg text-gray-400 text-sm">
        <h3 className="text-white font-semibold mb-2">Rules:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Live cell with 2-3 neighbors survives</li>
          <li>Dead cell with exactly 3 neighbors becomes alive</li>
          <li>All other cells die or stay dead</li>
          <li>Click or drag to draw cells</li>
        </ul>
      </div>

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default GameOfLife;
