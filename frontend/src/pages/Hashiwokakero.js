import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const CELL_SIZE = 50;

// Sample puzzles
const PUZZLES = {
  easy: {
    size: 7,
    islands: [
      { x: 0, y: 0, bridges: 2 },
      { x: 4, y: 0, bridges: 3 },
      { x: 6, y: 0, bridges: 1 },
      { x: 0, y: 2, bridges: 3 },
      { x: 2, y: 2, bridges: 4 },
      { x: 4, y: 2, bridges: 4 },
      { x: 6, y: 2, bridges: 2 },
      { x: 0, y: 4, bridges: 1 },
      { x: 2, y: 4, bridges: 3 },
      { x: 6, y: 4, bridges: 2 },
      { x: 0, y: 6, bridges: 2 },
      { x: 2, y: 6, bridges: 3 },
      { x: 4, y: 6, bridges: 2 },
      { x: 6, y: 6, bridges: 2 },
    ]
  },
  medium: {
    size: 9,
    islands: [
      { x: 0, y: 0, bridges: 2 },
      { x: 4, y: 0, bridges: 4 },
      { x: 8, y: 0, bridges: 2 },
      { x: 0, y: 2, bridges: 4 },
      { x: 2, y: 2, bridges: 3 },
      { x: 4, y: 2, bridges: 2 },
      { x: 6, y: 2, bridges: 3 },
      { x: 8, y: 2, bridges: 3 },
      { x: 0, y: 4, bridges: 3 },
      { x: 4, y: 4, bridges: 5 },
      { x: 8, y: 4, bridges: 3 },
      { x: 0, y: 6, bridges: 4 },
      { x: 2, y: 6, bridges: 3 },
      { x: 4, y: 6, bridges: 3 },
      { x: 6, y: 6, bridges: 2 },
      { x: 8, y: 6, bridges: 3 },
      { x: 0, y: 8, bridges: 2 },
      { x: 4, y: 8, bridges: 3 },
      { x: 8, y: 8, bridges: 2 },
    ]
  },
  hard: {
    size: 11,
    islands: [
      { x: 0, y: 0, bridges: 3 },
      { x: 4, y: 0, bridges: 5 },
      { x: 8, y: 0, bridges: 3 },
      { x: 10, y: 0, bridges: 2 },
      { x: 0, y: 2, bridges: 4 },
      { x: 2, y: 2, bridges: 3 },
      { x: 4, y: 2, bridges: 2 },
      { x: 6, y: 2, bridges: 4 },
      { x: 8, y: 2, bridges: 3 },
      { x: 10, y: 2, bridges: 3 },
      { x: 0, y: 4, bridges: 3 },
      { x: 4, y: 4, bridges: 6 },
      { x: 6, y: 4, bridges: 4 },
      { x: 10, y: 4, bridges: 2 },
      { x: 0, y: 6, bridges: 4 },
      { x: 2, y: 6, bridges: 4 },
      { x: 4, y: 6, bridges: 3 },
      { x: 6, y: 6, bridges: 4 },
      { x: 8, y: 6, bridges: 3 },
      { x: 10, y: 6, bridges: 3 },
      { x: 0, y: 8, bridges: 3 },
      { x: 4, y: 8, bridges: 5 },
      { x: 8, y: 8, bridges: 4 },
      { x: 10, y: 8, bridges: 2 },
      { x: 0, y: 10, bridges: 2 },
      { x: 4, y: 10, bridges: 3 },
      { x: 8, y: 10, bridges: 2 },
      { x: 10, y: 10, bridges: 2 },
    ]
  }
};

const Hashiwokakero = () => {
  const [difficulty, setDifficulty] = useState('easy');
  const [islands, setIslands] = useState([]);
  const [bridges, setBridges] = useState([]);
  const [gridSize, setGridSize] = useState(7);
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [isSolved, setIsSolved] = useState(false);
  const [solving, setSolving] = useState(false);
  const [error, setError] = useState(null);
  const solveIntervalRef = useRef(null);

  // Initialize puzzle
  const initPuzzle = useCallback((diff) => {
    if (solveIntervalRef.current) {
      clearInterval(solveIntervalRef.current);
    }
    const puzzle = PUZZLES[diff];
    setGridSize(puzzle.size);
    setIslands(puzzle.islands.map((island, idx) => ({
      ...island,
      id: idx,
      currentBridges: 0
    })));
    setBridges([]);
    setSelectedIsland(null);
    setIsSolved(false);
    setSolving(false);
    setError(null);
  }, []);

  useEffect(() => {
    initPuzzle(difficulty);
  }, [difficulty, initPuzzle]);

  // Find nearest island in a direction
  const findNeighbour = useCallback((island, direction) => {
    let nearest = null;
    let minDist = Infinity;

    for (const other of islands) {
      if (other.id === island.id) continue;

      let isInDirection = false;
      let dist = 0;

      switch (direction) {
        case 'up':
          if (other.x === island.x && other.y < island.y) {
            isInDirection = true;
            dist = island.y - other.y;
          }
          break;
        case 'down':
          if (other.x === island.x && other.y > island.y) {
            isInDirection = true;
            dist = other.y - island.y;
          }
          break;
        case 'left':
          if (other.y === island.y && other.x < island.x) {
            isInDirection = true;
            dist = island.x - other.x;
          }
          break;
        case 'right':
          if (other.y === island.y && other.x > island.x) {
            isInDirection = true;
            dist = other.x - island.x;
          }
          break;
        default:
          break;
      }

      if (isInDirection && dist < minDist) {
        // Check if path is blocked by another island
        let blocked = false;
        for (const blocker of islands) {
          if (blocker.id === island.id || blocker.id === other.id) continue;
          if (direction === 'up' || direction === 'down') {
            if (blocker.x === island.x &&
                blocker.y > Math.min(island.y, other.y) &&
                blocker.y < Math.max(island.y, other.y)) {
              blocked = true;
              break;
            }
          } else {
            if (blocker.y === island.y &&
                blocker.x > Math.min(island.x, other.x) &&
                blocker.x < Math.max(island.x, other.x)) {
              blocked = true;
              break;
            }
          }
        }

        if (!blocked) {
          minDist = dist;
          nearest = other;
        }
      }
    }

    return nearest;
  }, [islands]);

  // Check if bridge crosses another bridge
  const bridgeCrossesExisting = useCallback((from, to) => {
    const isHorizontal = from.y === to.y;

    for (const bridge of bridges) {
      const bridgeIsHorizontal = bridge.from.y === bridge.to.y;

      // Parallel bridges don't cross
      if (isHorizontal === bridgeIsHorizontal) continue;

      if (isHorizontal) {
        // New bridge is horizontal, existing is vertical
        const minX = Math.min(from.x, to.x);
        const maxX = Math.max(from.x, to.x);
        const minY = Math.min(bridge.from.y, bridge.to.y);
        const maxY = Math.max(bridge.from.y, bridge.to.y);

        if (bridge.from.x > minX && bridge.from.x < maxX &&
            from.y > minY && from.y < maxY) {
          return true;
        }
      } else {
        // New bridge is vertical, existing is horizontal
        const minY = Math.min(from.y, to.y);
        const maxY = Math.max(from.y, to.y);
        const minX = Math.min(bridge.from.x, bridge.to.x);
        const maxX = Math.max(bridge.from.x, bridge.to.x);

        if (bridge.from.y > minY && bridge.from.y < maxY &&
            from.x > minX && from.x < maxX) {
          return true;
        }
      }
    }

    return false;
  }, [bridges]);

  // Count bridges for an island
  const countBridges = useCallback((islandId) => {
    if (!bridges || !Array.isArray(bridges)) return 0;
    let count = 0;
    for (const bridge of bridges) {
      if (!bridge || !bridge.from || !bridge.to) continue;
      if (bridge.from.id === islandId || bridge.to.id === islandId) {
        count += (bridge.count || 0);
      }
    }
    return count;
  }, [bridges]);

  // Handle island click
  const handleIslandClick = (island) => {
    if (isSolved || solving) return;

    if (selectedIsland === null) {
      if (countBridges(island.id) < island.bridges) {
        setSelectedIsland(island);
      }
    } else if (selectedIsland.id === island.id) {
      setSelectedIsland(null);
    } else {
      // Try to build bridge
      const fromIsland = selectedIsland;
      const toIsland = island;

      // Check if they're aligned
      if (fromIsland.x !== toIsland.x && fromIsland.y !== toIsland.y) {
        setSelectedIsland(null);
        return;
      }

      // Check if there's a direct path
      const direction = fromIsland.x === toIsland.x
        ? (toIsland.y > fromIsland.y ? 'down' : 'up')
        : (toIsland.x > fromIsland.x ? 'right' : 'left');

      const neighbourIsland = findNeighbour(fromIsland, direction);
      if (!neighbourIsland || neighbourIsland.id !== toIsland.id) {
        setSelectedIsland(null);
        return;
      }

      // Check bridge limits
      const fromCount = countBridges(fromIsland.id);
      const toCount = countBridges(toIsland.id);

      if (fromCount >= fromIsland.bridges || toCount >= toIsland.bridges) {
        setSelectedIsland(null);
        return;
      }

      // Check for existing bridge
      const existingBridgeIdx = bridges.findIndex(
        b => (b.from.id === fromIsland.id && b.to.id === toIsland.id) ||
             (b.from.id === toIsland.id && b.to.id === fromIsland.id)
      );

      if (existingBridgeIdx >= 0) {
        const existingBridge = bridges[existingBridgeIdx];
        if (existingBridge.count >= 2) {
          setSelectedIsland(null);
          return;
        }

        // Check if we can add another bridge
        if (fromCount + 1 <= fromIsland.bridges && toCount + 1 <= toIsland.bridges) {
          const newBridges = [...bridges];
          newBridges[existingBridgeIdx] = { ...existingBridge, count: existingBridge.count + 1 };
          setBridges(newBridges);
        }
      } else {
        // Check for crossing bridges
        if (bridgeCrossesExisting(fromIsland, toIsland)) {
          setSelectedIsland(null);
          return;
        }

        setBridges([...bridges, { from: fromIsland, to: toIsland, count: 1 }]);
      }

      setSelectedIsland(null);
    }
  };

  // Remove bridge on right click
  const handleBridgeRightClick = (e, bridgeIdx) => {
    e.preventDefault();
    if (isSolved || solving) return;

    const bridge = bridges[bridgeIdx];
    if (bridge.count > 1) {
      const newBridges = [...bridges];
      newBridges[bridgeIdx] = { ...bridge, count: bridge.count - 1 };
      setBridges(newBridges);
    } else {
      setBridges(bridges.filter((_, idx) => idx !== bridgeIdx));
    }
  };

  // Check if puzzle is solved
  useEffect(() => {
    if (!islands || !Array.isArray(islands) || islands.length === 0) return;
    if (!bridges || !Array.isArray(bridges) || bridges.length === 0) return;

    try {
      const allSatisfied = islands.every(island =>
        island && typeof island.id === 'number' && countBridges(island.id) === island.bridges
      );

      if (allSatisfied) {
        // Check connectivity using BFS
        const visited = new Set();
        const queue = [islands[0].id];
        visited.add(islands[0].id);

        while (queue.length > 0) {
          const current = queue.shift();
          for (const bridge of bridges) {
            if (!bridge || !bridge.from || !bridge.to) continue;
            let neighbour = null;
            if (bridge.from.id === current) neighbour = bridge.to.id;
            else if (bridge.to.id === current) neighbour = bridge.from.id;

            if (neighbour !== null && !visited.has(neighbour)) {
              visited.add(neighbour);
              queue.push(neighbour);
            }
          }
        }

        if (visited.size === islands.length) {
          setIsSolved(true);
        }
      }
    } catch (err) {
      console.error('Error checking solved state:', err);
    }
  }, [islands, bridges, countBridges]);

  // Find all neighbours for an island
  const findAllNeighbours = useCallback((island, islandsList) => {
    const neighbours = [];
    const directions = ['up', 'down', 'left', 'right'];

    for (const direction of directions) {
      let nearest = null;
      let minDist = Infinity;

      for (const other of islandsList) {
        if (other.id === island.id) continue;

        let isInDirection = false;
        let dist = 0;

        switch (direction) {
          case 'up':
            if (other.x === island.x && other.y < island.y) {
              isInDirection = true;
              dist = island.y - other.y;
            }
            break;
          case 'down':
            if (other.x === island.x && other.y > island.y) {
              isInDirection = true;
              dist = other.y - island.y;
            }
            break;
          case 'left':
            if (other.y === island.y && other.x < island.x) {
              isInDirection = true;
              dist = island.x - other.x;
            }
            break;
          case 'right':
            if (other.y === island.y && other.x > island.x) {
              isInDirection = true;
              dist = other.x - island.x;
            }
            break;
          default:
            break;
        }

        if (isInDirection && dist < minDist) {
          // Check if path is blocked by another island
          let blocked = false;
          for (const blocker of islandsList) {
            if (blocker.id === island.id || blocker.id === other.id) continue;
            if (direction === 'up' || direction === 'down') {
              if (blocker.x === island.x &&
                  blocker.y > Math.min(island.y, other.y) &&
                  blocker.y < Math.max(island.y, other.y)) {
                blocked = true;
                break;
              }
            } else {
              if (blocker.y === island.y &&
                  blocker.x > Math.min(island.x, other.x) &&
                  blocker.x < Math.max(island.x, other.x)) {
                blocked = true;
                break;
              }
            }
          }

          if (!blocked) {
            minDist = dist;
            nearest = other;
          }
        }
      }

      if (nearest) {
        neighbours.push(nearest);
      }
    }

    return neighbours;
  }, []);

  // Solve puzzle using backtracking
  const solvePuzzle = useCallback(() => {
    setSolving(true);
    setBridges([]);
    setSelectedIsland(null);

    const islandsList = islands.map(island => ({ ...island }));

    // Build adjacency list
    const adjacency = new Map();
    for (const island of islandsList) {
      adjacency.set(island.id, findAllNeighbours(island, islandsList));
    }

    // Generate all potential bridge pairs (avoid duplicates)
    const potentialBridges = [];
    const seen = new Set();
    for (const island of islandsList) {
      const neighbours = adjacency.get(island.id);
      for (const neighbour of neighbours) {
        const key = [Math.min(island.id, neighbour.id), Math.max(island.id, neighbour.id)].join('-');
        if (!seen.has(key)) {
          seen.add(key);
          potentialBridges.push({ from: island, to: neighbour });
        }
      }
    }

    // Check if a bridge crosses existing bridges
    const checkCross = (newBridge, existingBridges) => {
      const isHorizontal = newBridge.from.y === newBridge.to.y;

      for (const bridge of existingBridges) {
        if (bridge.count === 0) continue;
        const bridgeIsHorizontal = bridge.from.y === bridge.to.y;
        if (isHorizontal === bridgeIsHorizontal) continue;

        if (isHorizontal) {
          const minX = Math.min(newBridge.from.x, newBridge.to.x);
          const maxX = Math.max(newBridge.from.x, newBridge.to.x);
          const minY = Math.min(bridge.from.y, bridge.to.y);
          const maxY = Math.max(bridge.from.y, bridge.to.y);

          if (bridge.from.x > minX && bridge.from.x < maxX &&
              newBridge.from.y > minY && newBridge.from.y < maxY) {
            return true;
          }
        } else {
          const minY = Math.min(newBridge.from.y, newBridge.to.y);
          const maxY = Math.max(newBridge.from.y, newBridge.to.y);
          const minX = Math.min(bridge.from.x, bridge.to.x);
          const maxX = Math.max(bridge.from.x, bridge.to.x);

          if (bridge.from.y > minY && bridge.from.y < maxY &&
              newBridge.from.x > minX && newBridge.from.x < maxX) {
            return true;
          }
        }
      }
      return false;
    };

    // Count bridges for an island in current state
    const countIslandBridges = (islandId, bridgeState) => {
      let count = 0;
      for (const b of bridgeState) {
        if (b.from.id === islandId || b.to.id === islandId) {
          count += b.count;
        }
      }
      return count;
    };

    // Check connectivity
    const isConnected = (bridgeState) => {
      const activeBridges = bridgeState.filter(b => b.count > 0);
      if (activeBridges.length === 0) return false;

      const visited = new Set();
      const queue = [islandsList[0].id];
      visited.add(islandsList[0].id);

      while (queue.length > 0) {
        const current = queue.shift();
        for (const bridge of activeBridges) {
          let neighbour = null;
          if (bridge.from.id === current) neighbour = bridge.to.id;
          else if (bridge.to.id === current) neighbour = bridge.from.id;

          if (neighbour !== null && !visited.has(neighbour)) {
            visited.add(neighbour);
            queue.push(neighbour);
          }
        }
      }

      return visited.size === islandsList.length;
    };

    // Backtracking solver
    const solve = (bridgeIdx, bridgeState) => {
      // Check if all islands satisfied
      const allSatisfied = islandsList.every(island =>
        countIslandBridges(island.id, bridgeState) === island.bridges
      );

      if (allSatisfied) {
        // Check connectivity
        if (isConnected(bridgeState)) {
          return bridgeState.filter(b => b.count > 0);
        }
        return null;
      }

      if (bridgeIdx >= potentialBridges.length) {
        return null;
      }

      const { from, to } = potentialBridges[bridgeIdx];
      const fromCount = countIslandBridges(from.id, bridgeState);
      const toCount = countIslandBridges(to.id, bridgeState);
      const fromRemaining = from.bridges - fromCount;
      const toRemaining = to.bridges - toCount;

      // Try 0, 1, or 2 bridges
      const maxBridges = Math.min(2, fromRemaining, toRemaining);

      for (let count = maxBridges; count >= 0; count--) {
        const newBridge = { from, to, count };

        // Check crossing
        if (count > 0 && checkCross(newBridge, bridgeState)) {
          continue;
        }

        const newState = [...bridgeState, newBridge];
        const result = solve(bridgeIdx + 1, newState);
        if (result) return result;
      }

      return null;
    };

    // Run solver with timeout
    setTimeout(() => {
      try {
        const solution = solve(0, []);

        if (solution) {
          // Animate the solution
          let idx = 0;
          solveIntervalRef.current = setInterval(() => {
            if (idx >= solution.length) {
              clearInterval(solveIntervalRef.current);
              setSolving(false);
              return;
            }
            // Ensure bridge has valid structure before adding
            const bridge = solution[idx];
            if (bridge && bridge.from && bridge.to && typeof bridge.count === 'number') {
              setBridges(prev => [...prev, bridge]);
            }
            idx++;
          }, 200);
        } else {
          setSolving(false);
          alert('No solution found!');
        }
      } catch (err) {
        console.error('Solver error:', err);
        setSolving(false);
        setError('An error occurred while solving. Please try again.');
      }
    }, 100);
  }, [islands, findAllNeighbours]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (solveIntervalRef.current) {
        clearInterval(solveIntervalRef.current);
      }
    };
  }, []);

  // Render bridges
  const renderBridges = () => {
    if (!bridges || !Array.isArray(bridges)) return null;

    return bridges.map((bridge, idx) => {
      // Guard against invalid bridge data
      if (!bridge || !bridge.from || !bridge.to || typeof bridge.from.x !== 'number' || typeof bridge.count !== 'number' || bridge.count < 1) {
        return null;
      }

      const x1 = bridge.from.x * CELL_SIZE + CELL_SIZE / 2;
      const y1 = bridge.from.y * CELL_SIZE + CELL_SIZE / 2;
      const x2 = bridge.to.x * CELL_SIZE + CELL_SIZE / 2;
      const y2 = bridge.to.y * CELL_SIZE + CELL_SIZE / 2;

      const isHorizontal = y1 === y2;
      const offset = 4;

      if (bridge.count === 1) {
        return (
          <line
            key={idx}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#60a5fa"
            strokeWidth="3"
            style={{ cursor: 'pointer' }}
            onContextMenu={(e) => handleBridgeRightClick(e, idx)}
          />
        );
      } else {
        return (
          <g key={idx} onContextMenu={(e) => handleBridgeRightClick(e, idx)} style={{ cursor: 'pointer' }}>
            <line
              x1={isHorizontal ? x1 : x1 - offset}
              y1={isHorizontal ? y1 - offset : y1}
              x2={isHorizontal ? x2 : x2 - offset}
              y2={isHorizontal ? y2 - offset : y2}
              stroke="#60a5fa"
              strokeWidth="3"
            />
            <line
              x1={isHorizontal ? x1 : x1 + offset}
              y1={isHorizontal ? y1 + offset : y1}
              x2={isHorizontal ? x2 : x2 + offset}
              y2={isHorizontal ? y2 + offset : y2}
              stroke="#60a5fa"
              strokeWidth="3"
            />
          </g>
        );
      }
    });
  };

  // Render islands
  const renderIslands = () => {
    if (!islands || !Array.isArray(islands) || islands.length === 0) return null;

    return islands.map((island) => {
      if (!island || typeof island.id !== 'number' || typeof island.x !== 'number' || typeof island.y !== 'number') {
        return null;
      }

      let currentCount = 0;
      try {
        currentCount = countBridges(island.id);
      } catch (e) {
        console.error('Error counting bridges for island', island.id, e);
      }
      const isComplete = currentCount === island.bridges;
      const isSelected = selectedIsland?.id === island.id;

      return (
        <g key={island.id} onClick={() => handleIslandClick(island)} style={{ cursor: 'pointer' }}>
          <circle
            cx={island.x * CELL_SIZE + CELL_SIZE / 2}
            cy={island.y * CELL_SIZE + CELL_SIZE / 2}
            r={20}
            fill={isComplete ? '#22c55e' : isSelected ? '#fbbf24' : '#1e293b'}
            stroke={isSelected ? '#fbbf24' : isComplete ? '#22c55e' : '#64748b'}
            strokeWidth="3"
          />
          <text
            x={island.x * CELL_SIZE + CELL_SIZE / 2}
            y={island.y * CELL_SIZE + CELL_SIZE / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={isComplete || isSelected ? '#000' : '#fff'}
            fontSize="18"
            fontWeight="bold"
          >
            {island.bridges}
          </text>
        </g>
      );
    });
  };

  // Early return if not initialized or error
  if (!gridSize || gridSize < 1 || !islands || islands.length === 0) {
    return (
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-4">Hashiwokakero</h1>
        <p className="text-gray-400 mb-4">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-4">Hashiwokakero</h1>
        <div className="mb-4 p-4 bg-red-600 rounded-lg text-white">
          {error}
        </div>
        <button
          onClick={() => initPuzzle(difficulty)}
          className="btn bg-primary hover:bg-indigo-600"
        >
          Try Again
        </button>
        <Link to="/" className="btn btn-secondary mt-6">
          Back to Games
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">Hashiwokakero</h1>
      <p className="text-gray-400 mb-4">Connect islands with bridges</p>

      {/* Difficulty Selection */}
      <div className="mb-4 flex gap-2">
        {['easy', 'medium', 'hard'].map((diff) => (
          <button
            key={diff}
            onClick={() => setDifficulty(diff)}
            className={`btn ${difficulty === diff ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
            disabled={solving}
          >
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </button>
        ))}
      </div>

      {/* Solved Message */}
      {isSolved && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-4 p-4 bg-green-600 rounded-lg text-xl font-bold"
        >
          Puzzle Solved!
        </motion.div>
      )}

      {/* Game Board */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <svg
          width={gridSize * CELL_SIZE}
          height={gridSize * CELL_SIZE}
          className="block"
        >
          {/* Grid */}
          {Array.from({ length: gridSize }).map((_, i) => (
            <g key={i}>
              <line
                x1={0}
                y1={i * CELL_SIZE + CELL_SIZE / 2}
                x2={gridSize * CELL_SIZE}
                y2={i * CELL_SIZE + CELL_SIZE / 2}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="2,4"
              />
              <line
                x1={i * CELL_SIZE + CELL_SIZE / 2}
                y1={0}
                x2={i * CELL_SIZE + CELL_SIZE / 2}
                y2={gridSize * CELL_SIZE}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="2,4"
              />
            </g>
          ))}

          {/* Bridges */}
          {renderBridges()}

          {/* Islands */}
          {renderIslands()}
        </svg>
      </div>

      {/* Controls */}
      <div className="mt-4 flex gap-4">
        <button
          onClick={() => initPuzzle(difficulty)}
          className="btn bg-red-500 hover:bg-red-600"
          disabled={solving}
        >
          Reset
        </button>
        <button
          onClick={solvePuzzle}
          className="btn bg-green-600 hover:bg-green-500"
          disabled={solving || isSolved}
        >
          {solving ? 'Solving...' : 'Solve'}
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-4 bg-surface rounded-lg max-w-md text-gray-400 text-sm">
        <h3 className="text-white font-semibold mb-2">How to Play:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Click an island to select it, then click a neighbour to build a bridge</li>
          <li>Right-click a bridge to remove it</li>
          <li>Each island needs exactly the number of bridges shown</li>
          <li>Max 2 bridges between any two islands</li>
          <li>Bridges cannot cross each other</li>
        </ul>
      </div>

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default Hashiwokakero;
