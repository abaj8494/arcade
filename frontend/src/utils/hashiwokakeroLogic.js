/**
 * Hashiwokakero Game Logic
 *
 * Pure functions for Hashiwokakero game mechanics, extracted for testability.
 */

/**
 * Find the nearest island in a given direction
 * @param {Object} island - Starting island {id, x, y, bridges}
 * @param {string} direction - 'up', 'down', 'left', 'right'
 * @param {Array} islands - All islands
 * @returns {Object|null} Nearest island or null
 */
export const findNeighbour = (island, direction, islands) => {
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
};

/**
 * Find all neighbours for an island in all directions
 * @param {Object} island - The island to find neighbours for
 * @param {Array} islands - All islands
 * @returns {Array} Array of neighbour islands
 */
export const findAllNeighbours = (island, islands) => {
  const neighbours = [];
  const directions = ['up', 'down', 'left', 'right'];

  for (const direction of directions) {
    const nearest = findNeighbour(island, direction, islands);
    if (nearest) {
      neighbours.push(nearest);
    }
  }

  return neighbours;
};

/**
 * Check if a bridge crosses an existing bridge
 * @param {Object} from - Starting island
 * @param {Object} to - Ending island
 * @param {Array} bridges - Existing bridges
 * @returns {boolean} True if would cross
 */
export const bridgeCrossesExisting = (from, to, bridges) => {
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
};

/**
 * Count bridges connected to an island
 * @param {number} islandId - Island ID
 * @param {Array} bridges - All bridges
 * @returns {number} Total bridge count
 */
export const countBridges = (islandId, bridges) => {
  if (!bridges || !Array.isArray(bridges)) return 0;
  let count = 0;
  for (const bridge of bridges) {
    if (!bridge || !bridge.from || !bridge.to) continue;
    if (bridge.from.id === islandId || bridge.to.id === islandId) {
      count += (bridge.count || 0);
    }
  }
  return count;
};

/**
 * Check if puzzle is solved
 * @param {Array} islands - All islands
 * @param {Array} bridges - All bridges
 * @returns {boolean} True if all islands have correct bridge counts
 */
export const isPuzzleSolved = (islands, bridges) => {
  if (!islands || !Array.isArray(islands) || islands.length === 0) return false;
  if (!bridges || !Array.isArray(bridges) || bridges.length === 0) return false;

  return islands.every(island =>
    island && typeof island.id === 'number' && countBridges(island.id, bridges) === island.bridges
  );
};

/**
 * Validate puzzle configuration
 * @param {Array} islands - All islands
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
export const validatePuzzle = (islands) => {
  if (!islands || islands.length === 0) {
    return { valid: false, error: 'No islands provided' };
  }

  // Check sum of all bridge requirements is even
  const totalBridges = islands.reduce((sum, i) => sum + i.bridges, 0);
  if (totalBridges % 2 !== 0) {
    return { valid: false, error: 'Total bridge count must be even' };
  }

  // Check each island can potentially be satisfied
  for (const island of islands) {
    const neighbours = findAllNeighbours(island, islands);
    const maxPossible = neighbours.length * 3; // Max 3 bridges per edge
    if (island.bridges > maxPossible) {
      return {
        valid: false,
        error: `Island ${island.id} needs ${island.bridges} bridges but only has ${neighbours.length} neighbors`
      };
    }
  }

  return { valid: true, error: null };
};

/**
 * Build adjacency map for solver
 * @param {Array} islands - All islands
 * @returns {Map} Map of island ID to adjacent islands with edge keys
 */
export const buildAdjacencyMap = (islands) => {
  const adjacency = new Map();

  for (const island of islands) {
    const neighbours = findAllNeighbours(island, islands);
    const adjList = [];
    for (const neighbour of neighbours) {
      const key = island.id < neighbour.id
        ? `${island.id}-${neighbour.id}`
        : `${neighbour.id}-${island.id}`;
      adjList.push({ neighbour, key });
    }
    adjacency.set(island.id, adjList);
  }

  return adjacency;
};

/**
 * Check if two edges cross geometrically
 * @param {Object} e1 - First edge
 * @param {Object} e2 - Second edge
 * @returns {boolean} True if edges cross
 */
export const edgesCross = (e1, e2) => {
  if (e1.isHorizontal === e2.isHorizontal) return false;

  const [horiz, vert] = e1.isHorizontal ? [e1, e2] : [e2, e1];

  const hMinX = Math.min(horiz.island1.x, horiz.island2.x);
  const hMaxX = Math.max(horiz.island1.x, horiz.island2.x);
  const hY = horiz.island1.y;
  const vMinY = Math.min(vert.island1.y, vert.island2.y);
  const vMaxY = Math.max(vert.island1.y, vert.island2.y);
  const vX = vert.island1.x;

  return vX > hMinX && vX < hMaxX && hY > vMinY && hY < vMaxY;
};

/**
 * Solve puzzle using constraint propagation + backtracking
 * @param {Array} islands - All islands
 * @param {number} maxIterations - Maximum iterations
 * @returns {Object|null} Solution edge counts or null
 */
export const solvePuzzle = (islands, maxIterations = 100000) => {
  if (!validatePuzzle(islands).valid) return null;

  const adjacency = buildAdjacencyMap(islands);
  const allEdges = [];

  // Build edge list
  for (const island of islands) {
    const adj = adjacency.get(island.id);
    for (const { neighbour, key } of adj) {
      if (island.id < neighbour.id) {
        allEdges.push({
          key,
          island1: island,
          island2: neighbour,
          isHorizontal: island.y === neighbour.y
        });
      }
    }
  }

  // Precompute crossing edges
  const crossingEdges = new Map();
  for (const edge of allEdges) {
    crossingEdges.set(edge.key, []);
  }
  for (let i = 0; i < allEdges.length; i++) {
    for (let j = i + 1; j < allEdges.length; j++) {
      if (edgesCross(allEdges[i], allEdges[j])) {
        crossingEdges.get(allEdges[i].key).push(allEdges[j].key);
        crossingEdges.get(allEdges[j].key).push(allEdges[i].key);
      }
    }
  }

  const countBridgesForIsland = (islandId, edgeCounts) => {
    let count = 0;
    for (const { key } of adjacency.get(islandId)) {
      count += edgeCounts[key] || 0;
    }
    return count;
  };

  const wouldCauseCrossing = (edgeKey, edgeCounts) => {
    const crossList = crossingEdges.get(edgeKey);
    if (!crossList) return false;
    for (const crossKey of crossList) {
      if ((edgeCounts[crossKey] || 0) > 0) {
        return true;
      }
    }
    return false;
  };

  let iterations = 0;

  const solve = (edgeCounts) => {
    iterations++;
    if (iterations > maxIterations) return null;

    // Check for over-satisfied islands
    for (const island of islands) {
      if (countBridgesForIsland(island.id, edgeCounts) > island.bridges) {
        return null;
      }
    }

    // Find unsatisfied island with fewest options
    let bestIsland = null;
    let minOptions = Infinity;

    for (const island of islands) {
      const current = countBridgesForIsland(island.id, edgeCounts);
      const needed = island.bridges - current;
      if (needed > 0) {
        let available = 0;
        for (const { neighbour, key } of adjacency.get(island.id)) {
          const edgeCount = edgeCounts[key] || 0;
          if (edgeCount >= 3) continue;
          if (edgeCount === 0 && wouldCauseCrossing(key, edgeCounts)) continue;

          const edgeRemaining = 3 - edgeCount;
          const neighbourCurrent = countBridgesForIsland(neighbour.id, edgeCounts);
          const neighbourRemaining = neighbour.bridges - neighbourCurrent;

          if (neighbourRemaining > 0) {
            available += Math.min(edgeRemaining, neighbourRemaining);
          }
        }

        if (available < needed) return null;

        if (available < minOptions) {
          minOptions = available;
          bestIsland = island;
        }
      }
    }

    // All satisfied
    if (!bestIsland) {
      return edgeCounts;
    }

    // Try adding bridges
    const adjList = adjacency.get(bestIsland.id);
    for (const { neighbour, key } of adjList) {
      const edgeCount = edgeCounts[key] || 0;
      if (edgeCount >= 3) continue;
      if (edgeCount === 0 && wouldCauseCrossing(key, edgeCounts)) continue;

      const neighbourCurrent = countBridgesForIsland(neighbour.id, edgeCounts);
      if (neighbourCurrent >= neighbour.bridges) continue;

      const newCounts = { ...edgeCounts, [key]: edgeCount + 1 };
      const result = solve(newCounts);
      if (result) return result;
    }

    return null;
  };

  return solve({});
};
