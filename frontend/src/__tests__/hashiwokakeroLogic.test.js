/**
 * Tests for Hashiwokakero Game Logic
 */

import {
  findNeighbour,
  findAllNeighbours,
  bridgeCrossesExisting,
  countBridges,
  isPuzzleSolved,
  validatePuzzle,
  buildAdjacencyMap,
  edgesCross,
  solvePuzzle
} from '../utils/hashiwokakeroLogic';

describe('Hashiwokakero Logic', () => {
  // Sample islands for testing
  const createSampleIslands = () => [
    { id: 0, x: 0, y: 0, bridges: 2 },
    { id: 1, x: 2, y: 0, bridges: 3 },
    { id: 2, x: 0, y: 2, bridges: 2 },
    { id: 3, x: 2, y: 2, bridges: 1 }
  ];

  describe('findNeighbour', () => {
    it('finds neighbour to the right', () => {
      const islands = createSampleIslands();
      const result = findNeighbour(islands[0], 'right', islands);
      expect(result).not.toBeNull();
      expect(result.id).toBe(1);
    });

    it('finds neighbour down', () => {
      const islands = createSampleIslands();
      const result = findNeighbour(islands[0], 'down', islands);
      expect(result).not.toBeNull();
      expect(result.id).toBe(2);
    });

    it('returns null when no neighbour in direction', () => {
      const islands = createSampleIslands();
      const result = findNeighbour(islands[0], 'up', islands);
      expect(result).toBeNull();
    });

    it('returns null when no neighbour to the left', () => {
      const islands = createSampleIslands();
      const result = findNeighbour(islands[0], 'left', islands);
      expect(result).toBeNull();
    });

    it('handles blocked paths', () => {
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 1 },
        { id: 1, x: 1, y: 0, bridges: 1 },
        { id: 2, x: 2, y: 0, bridges: 1 }
      ];
      // Island 0 looking right should find island 1 (not 2, since 1 blocks path)
      const result = findNeighbour(islands[0], 'right', islands);
      expect(result).not.toBeNull();
      expect(result.id).toBe(1);
    });

    it('finds nearest neighbour when multiple exist', () => {
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 1 },
        { id: 1, x: 2, y: 0, bridges: 1 },
        { id: 2, x: 4, y: 0, bridges: 1 }
      ];
      const result = findNeighbour(islands[0], 'right', islands);
      expect(result.id).toBe(1); // Nearest
    });
  });

  describe('findAllNeighbours', () => {
    it('finds all neighbours for corner island', () => {
      const islands = createSampleIslands();
      const neighbours = findAllNeighbours(islands[0], islands);
      expect(neighbours).toHaveLength(2);
      const ids = neighbours.map(n => n.id);
      expect(ids).toContain(1);
      expect(ids).toContain(2);
    });

    it('finds all neighbours for center island', () => {
      const islands = [
        { id: 0, x: 1, y: 0, bridges: 1 },
        { id: 1, x: 0, y: 1, bridges: 1 },
        { id: 2, x: 1, y: 1, bridges: 4 },
        { id: 3, x: 2, y: 1, bridges: 1 },
        { id: 4, x: 1, y: 2, bridges: 1 }
      ];
      const neighbours = findAllNeighbours(islands[2], islands);
      expect(neighbours).toHaveLength(4);
    });

    it('returns empty array for isolated island', () => {
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 1 },
        { id: 1, x: 5, y: 5, bridges: 1 } // Far away, different row/col
      ];
      const neighbours = findAllNeighbours(islands[0], islands);
      expect(neighbours).toHaveLength(0);
    });
  });

  describe('bridgeCrossesExisting', () => {
    it('returns false for parallel horizontal bridges', () => {
      const bridges = [
        { from: { x: 0, y: 0 }, to: { x: 2, y: 0 }, count: 1 }
      ];
      const result = bridgeCrossesExisting(
        { x: 0, y: 2 }, { x: 2, y: 2 }, bridges
      );
      expect(result).toBe(false);
    });

    it('returns false for parallel vertical bridges', () => {
      const bridges = [
        { from: { x: 0, y: 0 }, to: { x: 0, y: 2 }, count: 1 }
      ];
      const result = bridgeCrossesExisting(
        { x: 2, y: 0 }, { x: 2, y: 2 }, bridges
      );
      expect(result).toBe(false);
    });

    it('detects crossing bridges', () => {
      const bridges = [
        { from: { x: 1, y: 0 }, to: { x: 1, y: 2 }, count: 1 }
      ];
      // Horizontal bridge crossing vertical
      const result = bridgeCrossesExisting(
        { x: 0, y: 1 }, { x: 2, y: 1 }, bridges
      );
      expect(result).toBe(true);
    });

    it('returns false for non-crossing perpendicular bridges', () => {
      const bridges = [
        { from: { x: 3, y: 0 }, to: { x: 3, y: 2 }, count: 1 }
      ];
      // Horizontal bridge not crossing
      const result = bridgeCrossesExisting(
        { x: 0, y: 0 }, { x: 2, y: 0 }, bridges
      );
      expect(result).toBe(false);
    });

    it('returns false for empty bridge list', () => {
      const result = bridgeCrossesExisting(
        { x: 0, y: 0 }, { x: 2, y: 0 }, []
      );
      expect(result).toBe(false);
    });
  });

  describe('countBridges', () => {
    it('counts bridges correctly for an island', () => {
      const bridges = [
        { from: { id: 0 }, to: { id: 1 }, count: 2 },
        { from: { id: 0 }, to: { id: 2 }, count: 1 }
      ];
      expect(countBridges(0, bridges)).toBe(3);
    });

    it('returns 0 for island with no bridges', () => {
      const bridges = [
        { from: { id: 1 }, to: { id: 2 }, count: 1 }
      ];
      expect(countBridges(0, bridges)).toBe(0);
    });

    it('handles empty bridge array', () => {
      expect(countBridges(0, [])).toBe(0);
    });

    it('handles null bridge array', () => {
      expect(countBridges(0, null)).toBe(0);
    });

    it('handles invalid bridge entries', () => {
      const bridges = [
        null,
        { from: null, to: { id: 1 }, count: 1 },
        { from: { id: 0 }, to: { id: 1 }, count: 2 }
      ];
      expect(countBridges(0, bridges)).toBe(2);
    });
  });

  describe('isPuzzleSolved', () => {
    it('returns true when all islands satisfied', () => {
      const islands = [
        { id: 0, bridges: 1 },
        { id: 1, bridges: 1 }
      ];
      const bridges = [
        { from: { id: 0 }, to: { id: 1 }, count: 1 }
      ];
      expect(isPuzzleSolved(islands, bridges)).toBe(true);
    });

    it('returns false when islands not satisfied', () => {
      const islands = [
        { id: 0, bridges: 2 },
        { id: 1, bridges: 2 }
      ];
      const bridges = [
        { from: { id: 0 }, to: { id: 1 }, count: 1 }
      ];
      expect(isPuzzleSolved(islands, bridges)).toBe(false);
    });

    it('returns false for empty islands', () => {
      expect(isPuzzleSolved([], [])).toBe(false);
    });

    it('returns false for empty bridges when islands need bridges', () => {
      const islands = [{ id: 0, bridges: 1 }];
      expect(isPuzzleSolved(islands, [])).toBe(false);
    });
  });

  describe('validatePuzzle', () => {
    it('returns valid for correct puzzle', () => {
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 1 },
        { id: 1, x: 2, y: 0, bridges: 1 }
      ];
      const result = validatePuzzle(islands);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns invalid for odd total bridges', () => {
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 1 },
        { id: 1, x: 2, y: 0, bridges: 2 }
      ];
      const result = validatePuzzle(islands);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('even');
    });

    it('returns invalid when island needs more bridges than possible', () => {
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 10 }, // Needs 10, but only 1 neighbor
        { id: 1, x: 2, y: 0, bridges: 2 }
      ];
      const result = validatePuzzle(islands);
      expect(result.valid).toBe(false);
    });

    it('returns invalid for empty islands', () => {
      const result = validatePuzzle([]);
      expect(result.valid).toBe(false);
    });
  });

  describe('buildAdjacencyMap', () => {
    it('builds correct adjacency map', () => {
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 2 },
        { id: 1, x: 2, y: 0, bridges: 2 }
      ];
      const adj = buildAdjacencyMap(islands);
      expect(adj.size).toBe(2);
      expect(adj.get(0)).toHaveLength(1);
      expect(adj.get(0)[0].neighbour.id).toBe(1);
    });

    it('assigns consistent edge keys', () => {
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 1 },
        { id: 1, x: 2, y: 0, bridges: 1 }
      ];
      const adj = buildAdjacencyMap(islands);
      expect(adj.get(0)[0].key).toBe('0-1');
      expect(adj.get(1)[0].key).toBe('0-1');
    });
  });

  describe('edgesCross', () => {
    it('returns false for parallel edges', () => {
      const e1 = { isHorizontal: true, island1: { x: 0, y: 0 }, island2: { x: 2, y: 0 } };
      const e2 = { isHorizontal: true, island1: { x: 0, y: 2 }, island2: { x: 2, y: 2 } };
      expect(edgesCross(e1, e2)).toBe(false);
    });

    it('detects crossing perpendicular edges', () => {
      const horiz = { isHorizontal: true, island1: { x: 0, y: 1 }, island2: { x: 2, y: 1 } };
      const vert = { isHorizontal: false, island1: { x: 1, y: 0 }, island2: { x: 1, y: 2 } };
      expect(edgesCross(horiz, vert)).toBe(true);
    });

    it('returns false for non-crossing perpendicular edges', () => {
      const horiz = { isHorizontal: true, island1: { x: 0, y: 0 }, island2: { x: 2, y: 0 } };
      const vert = { isHorizontal: false, island1: { x: 3, y: 0 }, island2: { x: 3, y: 2 } };
      expect(edgesCross(horiz, vert)).toBe(false);
    });
  });

  describe('solvePuzzle', () => {
    it('solves simple 2-island puzzle', () => {
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 1 },
        { id: 1, x: 2, y: 0, bridges: 1 }
      ];
      const solution = solvePuzzle(islands);
      expect(solution).not.toBeNull();
      expect(solution['0-1']).toBe(1);
    });

    it('solves puzzle with multiple bridges', () => {
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 2 },
        { id: 1, x: 2, y: 0, bridges: 2 }
      ];
      const solution = solvePuzzle(islands);
      expect(solution).not.toBeNull();
      expect(solution['0-1']).toBe(2);
    });

    it('solves 4-island puzzle', () => {
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 2 },
        { id: 1, x: 2, y: 0, bridges: 2 },
        { id: 2, x: 0, y: 2, bridges: 2 },
        { id: 3, x: 2, y: 2, bridges: 2 }
      ];
      const solution = solvePuzzle(islands);
      expect(solution).not.toBeNull();
    });

    it('returns null for invalid puzzle', () => {
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 10 }, // Impossible
        { id: 1, x: 2, y: 0, bridges: 2 }
      ];
      const solution = solvePuzzle(islands);
      expect(solution).toBeNull();
    });

    it('respects max iterations limit', () => {
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 1 },
        { id: 1, x: 2, y: 0, bridges: 1 }
      ];
      // Very low limit should still solve simple puzzle
      const solution = solvePuzzle(islands, 10);
      expect(solution).not.toBeNull();
    });
  });

  describe('integration tests', () => {
    it('correctly validates and solves a simple linear puzzle', () => {
      // Simple puzzle: 3 islands in a row needing 1-2-1 bridges
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 1 },
        { id: 1, x: 1, y: 0, bridges: 2 },
        { id: 2, x: 2, y: 0, bridges: 1 }
      ];

      const validation = validatePuzzle(islands);
      expect(validation.valid).toBe(true);

      const solution = solvePuzzle(islands, 50000);
      expect(solution).not.toBeNull();

      // Verify solution satisfies all islands
      const adj = buildAdjacencyMap(islands);
      for (const island of islands) {
        let count = 0;
        for (const { key } of adj.get(island.id)) {
          count += solution[key] || 0;
        }
        expect(count).toBe(island.bridges);
      }
    });

    it('correctly validates a simple 4-island puzzle', () => {
      // Simple 2x2 grid puzzle
      const islands = [
        { id: 0, x: 0, y: 0, bridges: 2 },
        { id: 1, x: 2, y: 0, bridges: 2 },
        { id: 2, x: 0, y: 2, bridges: 2 },
        { id: 3, x: 2, y: 2, bridges: 2 }
      ];

      const validation = validatePuzzle(islands);
      expect(validation.valid).toBe(true);

      const solution = solvePuzzle(islands, 100000);
      expect(solution).not.toBeNull();
    });
  });
});
