import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';

const CELL_SIZE = 50;

// Use the correct API URL based on the environment
const API_URL = window.location.hostname === 'arcade.abaj.ai'
  ? 'https://arcade.abaj.ai/api'
  : process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Hashiwokakero = () => {
  const [difficulty, setDifficulty] = useState('easy');
  const [islands, setIslands] = useState([]);
  const [bridges, setBridges] = useState([]);
  const [gridSize, setGridSize] = useState(7);
  const [selectedIsland, setSelectedIsland] = useState(null);
  const [isSolved, setIsSolved] = useState(false);
  const [solving, setSolving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const solveIntervalRef = useRef(null);
  const { showHelp, toggleHelp } = useHelpVisibility();

  // Fetch puzzle from API
  const fetchPuzzle = useCallback(async (diff) => {
    if (solveIntervalRef.current) {
      clearInterval(solveIntervalRef.current);
    }

    setLoading(true);
    setBridges([]);
    setSelectedIsland(null);
    setIsSolved(false);
    setSolving(false);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/games/hashiwokakero/generate?difficulty=${diff}`);
      if (!response.ok) {
        throw new Error('Failed to fetch puzzle');
      }
      const puzzle = await response.json();

      setGridSize(puzzle.size);
      setIslands(puzzle.islands.map((island, idx) => ({
        ...island,
        id: idx,
        currentBridges: 0
      })));
    } catch (err) {
      console.error('Error fetching puzzle:', err);
      setError('Failed to load puzzle. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial puzzle
  useEffect(() => {
    fetchPuzzle(difficulty);
  }, []); // Only run on mount

  // Handle difficulty change
  const handleDifficultyChange = (diff) => {
    setDifficulty(diff);
    fetchPuzzle(diff);
  };

  // Generate new puzzle with same difficulty
  const generateNewPuzzle = () => {
    fetchPuzzle(difficulty);
  };

  // Reset current puzzle (clear bridges but keep same layout)
  const resetPuzzle = useCallback(() => {
    if (solveIntervalRef.current) {
      clearInterval(solveIntervalRef.current);
    }
    setBridges([]);
    setSelectedIsland(null);
    setIsSolved(false);
    setSolving(false);
    setError(null);
  }, []);

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

  // Solve puzzle using simple recursive backtracking
  const solvePuzzle = useCallback(() => {
    setSolving(true);
    setBridges([]);
    setSelectedIsland(null);

    const islandsList = islands.map(island => ({ ...island }));
    const n = islandsList.length;

    // Build adjacency: for each island, list of {neighbour, edgeKey}
    const adjacency = new Map();
    const edgeSet = new Set();

    for (const island of islandsList) {
      const neighbours = findAllNeighbours(island, islandsList);
      const adjList = [];
      for (const neighbour of neighbours) {
        const key = island.id < neighbour.id
          ? `${island.id}-${neighbour.id}`
          : `${neighbour.id}-${island.id}`;
        adjList.push({ neighbour, key });
        edgeSet.add(key);
      }
      adjacency.set(island.id, adjList);
    }

    // Edge state: key -> count (0, 1, or 2)
    const allEdgeKeys = [...edgeSet];

    // Check if two edges cross (given their endpoints)
    const edgesCross = (key1, key2, edgeCounts, islandMap) => {
      if (edgeCounts[key1] === 0 || edgeCounts[key2] === 0) return false;

      const [id1a, id1b] = key1.split('-').map(Number);
      const [id2a, id2b] = key2.split('-').map(Number);

      const e1From = islandMap.get(id1a);
      const e1To = islandMap.get(id1b);
      const e2From = islandMap.get(id2a);
      const e2To = islandMap.get(id2b);

      const e1Horiz = e1From.y === e1To.y;
      const e2Horiz = e2From.y === e2To.y;

      if (e1Horiz === e2Horiz) return false;

      const [horiz, vert] = e1Horiz
        ? [{ from: e1From, to: e1To }, { from: e2From, to: e2To }]
        : [{ from: e2From, to: e2To }, { from: e1From, to: e1To }];

      const hMinX = Math.min(horiz.from.x, horiz.to.x);
      const hMaxX = Math.max(horiz.from.x, horiz.to.x);
      const hY = horiz.from.y;
      const vMinY = Math.min(vert.from.y, vert.to.y);
      const vMaxY = Math.max(vert.from.y, vert.to.y);
      const vX = vert.from.x;

      return vX > hMinX && vX < hMaxX && hY > vMinY && hY < vMaxY;
    };

    // Build island map for quick lookup
    const islandMap = new Map();
    for (const island of islandsList) {
      islandMap.set(island.id, island);
    }

    // Count bridges for an island
    const countBridges = (islandId, edgeCounts) => {
      let count = 0;
      for (const { key } of adjacency.get(islandId)) {
        count += edgeCounts[key] || 0;
      }
      return count;
    };

    // Check if adding a bridge would cause a crossing
    const wouldCross = (key, edgeCounts) => {
      for (const otherKey of allEdgeKeys) {
        if (otherKey !== key && edgesCross(key, otherKey, { ...edgeCounts, [key]: 1 }, islandMap)) {
          return true;
        }
      }
      return false;
    };

    // Check connectivity via BFS
    const isConnected = (edgeCounts) => {
      if (n <= 1) return true;
      const visited = new Set();
      const queue = [islandsList[0].id];
      visited.add(islandsList[0].id);

      while (queue.length > 0) {
        const current = queue.shift();
        for (const { neighbour, key } of adjacency.get(current)) {
          if ((edgeCounts[key] || 0) > 0 && !visited.has(neighbour.id)) {
            visited.add(neighbour.id);
            queue.push(neighbour.id);
          }
        }
      }
      return visited.size === n;
    };

    // Recursive solver with proper constraint checking
    const solve = (edgeCounts) => {
      // FIRST: Check ALL islands for oversatisfied (bug fix)
      for (const island of islandsList) {
        const current = countBridges(island.id, edgeCounts);
        if (current > island.bridges) {
          return null; // Over-satisfied, invalid state
        }
      }

      // THEN: Find first unsatisfied island
      let targetIsland = null;
      for (const island of islandsList) {
        const current = countBridges(island.id, edgeCounts);
        if (current < island.bridges) {
          targetIsland = island;
          break;
        }
      }

      // All satisfied - check connectivity
      if (!targetIsland) {
        return isConnected(edgeCounts) ? edgeCounts : null;
      }

      const currentCount = countBridges(targetIsland.id, edgeCounts);
      const needed = targetIsland.bridges - currentCount;

      // Get valid edges we can add bridges to
      const validEdges = [];
      for (const { neighbour, key } of adjacency.get(targetIsland.id)) {
        const edgeCount = edgeCounts[key] || 0;
        if (edgeCount >= 2) continue; // Max 2 bridges per edge

        const neighbourCurrent = countBridges(neighbour.id, edgeCounts);
        if (neighbourCurrent >= neighbour.bridges) continue; // Neighbour is full

        // Check if this edge would cross existing bridges
        if (edgeCount === 0 && wouldCross(key, edgeCounts)) continue;

        const canAdd = Math.min(2 - edgeCount, neighbour.bridges - neighbourCurrent);
        validEdges.push({ key, neighbour, canAdd });
      }

      // Calculate total available
      const totalAvailable = validEdges.reduce((sum, e) => sum + e.canAdd, 0);
      if (totalAvailable < needed) return null; // Can't satisfy this island

      // Sort edges by constraint (fewer options = try first for better pruning)
      validEdges.sort((a, b) => a.canAdd - b.canAdd);

      // Try adding bridges recursively
      for (const { key } of validEdges) {
        const newCounts = { ...edgeCounts };
        newCounts[key] = (newCounts[key] || 0) + 1;

        const result = solve(newCounts);
        if (result) return result;
      }

      return null;
    };

    // Run solver
    setTimeout(() => {
      try {
        const solution = solve({});

        if (solution) {
          const solutionBridges = [];
          for (const key of allEdgeKeys) {
            const count = solution[key] || 0;
            if (count > 0) {
              const [id1, id2] = key.split('-').map(Number);
              solutionBridges.push({
                from: islandMap.get(id1),
                to: islandMap.get(id2),
                count
              });
            }
          }

          // Animate the solution
          let idx = 0;
          solveIntervalRef.current = setInterval(() => {
            if (idx >= solutionBridges.length) {
              clearInterval(solveIntervalRef.current);
              setSolving(false);
              return;
            }
            setBridges(prev => [...prev, solutionBridges[idx]]);
            idx++;
          }, 100);
        } else {
          setSolving(false);
          alert('No solution found! Please try a different puzzle.');
        }
      } catch (err) {
        console.error('Solver error:', err);
        setSolving(false);
        setError('An error occurred while solving. Please try again.');
      }
    }, 50);
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

  if (error && !loading) {
    return (
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-4">Hashiwokakero</h1>
        <div className="mb-4 p-4 bg-red-600 rounded-lg text-white">
          {error}
        </div>
        <button
          onClick={() => fetchPuzzle(difficulty)}
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
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">Hashiwokakero</h1>
        <HelpButton onClick={toggleHelp} isActive={showHelp} />
      </div>
      <p className="text-gray-400 mb-4">Connect islands with bridges</p>

      {/* Difficulty Selection */}
      <div className="mb-4 flex gap-2">
        {['easy', 'medium', 'hard'].map((diff) => (
          <button
            key={diff}
            onClick={() => handleDifficultyChange(diff)}
            className={`btn ${difficulty === diff ? 'btn-primary' : 'bg-gray-600 hover:bg-gray-500'}`}
            disabled={solving || loading}
          >
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="mb-4 p-4 bg-blue-600 rounded-lg text-xl font-bold flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          Generating puzzle...
        </div>
      )}

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
          onClick={generateNewPuzzle}
          className="btn bg-primary hover:bg-indigo-600"
          disabled={solving || loading}
        >
          {loading ? 'Generating...' : 'New Puzzle'}
        </button>
        <button
          onClick={resetPuzzle}
          className="btn bg-red-500 hover:bg-red-600"
          disabled={solving || loading}
        >
          Reset
        </button>
        <button
          onClick={solvePuzzle}
          className="btn bg-green-600 hover:bg-green-500"
          disabled={solving || isSolved || loading}
        >
          {solving ? 'Solving...' : 'Solve'}
        </button>
      </div>

      {/* Instructions */}
      {showHelp && (
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
      )}

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default Hashiwokakero;
