import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useWirelessGame, { ConnectionState } from '../hooks/useWirelessGame';
import { WirelessButton, WirelessModal } from '../components/WirelessModal';

const GRID_SIZE = 10;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// Ship configurations
const SHIPS = [
  { name: 'Carrier', size: 5, colour: 'bg-purple-600' },
  { name: 'Battleship', size: 4, colour: 'bg-blue-600' },
  { name: 'Cruiser', size: 3, colour: 'bg-green-600' },
  { name: 'Submarine', size: 3, colour: 'bg-yellow-600' },
  { name: 'Destroyer', size: 2, colour: 'bg-red-600' },
];

// Create empty grid
const createEmptyGrid = () =>
  Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

// Check if ship placement is valid
const isValidPlacement = (grid, row, col, size, isHorizontal) => {
  for (let i = 0; i < size; i++) {
    const r = isHorizontal ? row : row + i;
    const c = isHorizontal ? col + i : col;

    if (r >= GRID_SIZE || c >= GRID_SIZE) return false;
    if (grid[r][c] !== null) return false;
  }
  return true;
};

// Place ship on grid
const placeShip = (grid, row, col, shipIndex, isHorizontal) => {
  const newGrid = grid.map(r => [...r]);
  const ship = SHIPS[shipIndex];

  for (let i = 0; i < ship.size; i++) {
    const r = isHorizontal ? row : row + i;
    const c = isHorizontal ? col + i : col;
    newGrid[r][c] = { shipIndex, segment: i, isHorizontal };
  }

  return newGrid;
};

// Randomly place all ships
const randomPlacement = () => {
  let grid = createEmptyGrid();

  for (let shipIndex = 0; shipIndex < SHIPS.length; shipIndex++) {
    const ship = SHIPS[shipIndex];
    let placed = false;
    let attempts = 0;

    while (!placed && attempts < 100) {
      const isHorizontal = Math.random() > 0.5;
      const maxRow = isHorizontal ? GRID_SIZE : GRID_SIZE - ship.size;
      const maxCol = isHorizontal ? GRID_SIZE - ship.size : GRID_SIZE;

      const row = Math.floor(Math.random() * maxRow);
      const col = Math.floor(Math.random() * maxCol);

      if (isValidPlacement(grid, row, col, ship.size, isHorizontal)) {
        grid = placeShip(grid, row, col, shipIndex, isHorizontal);
        placed = true;
      }
      attempts++;
    }
  }

  return grid;
};

// Check if all ships are sunk
const checkAllSunk = (grid, hits) => {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] !== null && !hits[r][c]) {
        return false;
      }
    }
  }
  return true;
};

const Battleships = () => {
  // Game phases: 'placement', 'waiting', 'battle', 'gameover'
  const [gamePhase, setGamePhase] = useState('placement');

  // Player grids
  const [myGrid, setMyGrid] = useState(createEmptyGrid);
  const [myHits, setMyHits] = useState(createEmptyGrid); // Hits received
  const [opponentHits, setOpponentHits] = useState(createEmptyGrid); // My attacks on opponent
  const [opponentGrid, setOpponentGrid] = useState(null); // Revealed at end

  // Placement state
  const [placingShipIndex, setPlacingShipIndex] = useState(0);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [placedShips, setPlacedShips] = useState([]);
  const [hoverCells, setHoverCells] = useState([]);

  // Battle state
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [lastAttack, setLastAttack] = useState(null);
  const [message, setMessage] = useState('');
  const [winner, setWinner] = useState(null);

  // Wireless state
  const [showWirelessModal, setShowWirelessModal] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);

  // Handle incoming moves from opponent
  const handleOpponentMove = useCallback((data, from) => {
    if (data.type === 'attack') {
      const { row, col } = data;
      const hit = myGrid[row][col] !== null;

      // Update my hits received
      setMyHits(prev => {
        const newHits = prev.map(r => [...r]);
        newHits[row][col] = hit ? 'hit' : 'miss';
        return newHits;
      });

      // Send result back
      wireless.sendMove({
        type: 'attackResult',
        row,
        col,
        hit,
        sunk: hit ? checkShipSunk(myGrid, row, col, myHits) : null
      });

      // Check if I lost
      const newHits = myHits.map(r => [...r]);
      newHits[row][col] = true;
      if (hit && checkAllSunk(myGrid, newHits)) {
        setWinner('opponent');
        setGamePhase('gameover');
        wireless.sendMove({ type: 'gameOver', winner: 'me' });
      } else {
        setIsMyTurn(true);
        setMessage(hit ? 'They hit your ship!' : 'They missed!');
      }
    } else if (data.type === 'attackResult') {
      const { row, col, hit, sunk } = data;

      setOpponentHits(prev => {
        const newHits = prev.map(r => [...r]);
        newHits[row][col] = hit ? 'hit' : 'miss';
        return newHits;
      });

      setLastAttack({ row, col, hit });
      setMessage(hit ? (sunk ? `You sunk their ${sunk}!` : 'Hit!') : 'Miss!');

      if (hit) {
        // Check after state update if we won
        const newHits = opponentHits.map(r => [...r]);
        newHits[row][col] = 'hit';
        let hitCount = 0;
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (newHits[r][c] === 'hit') hitCount++;
          }
        }
        // Total ship cells: 5+4+3+3+2 = 17
        if (hitCount >= 17) {
          setWinner('me');
          setGamePhase('gameover');
        }
      }
    } else if (data.type === 'ready') {
      setOpponentReady(true);
      if (gamePhase === 'waiting') {
        // Both ready - determine who goes first (host goes first)
        setGamePhase('battle');
        setIsMyTurn(wireless.isHost);
        setMessage(wireless.isHost ? 'Your turn - attack!' : "Opponent's turn...");
      }
    } else if (data.type === 'gameOver') {
      setWinner(data.winner === 'me' ? 'opponent' : 'me');
      setGamePhase('gameover');
    }
  }, [myGrid, myHits, opponentHits, gamePhase]);

  // Handle game state sync
  const handleStateSync = useCallback((data, from) => {
    // Could be used for reconnection
  }, []);

  // Handle game ready
  const handleGameReady = useCallback((role) => {
    setMessage('Connected! Place your ships.');
  }, []);

  // Wireless hook
  const wireless = useWirelessGame(
    'battleships',
    handleOpponentMove,
    handleStateSync,
    handleGameReady
  );

  // Check if a ship is sunk
  const checkShipSunk = (grid, hitRow, hitCol, currentHits) => {
    const cell = grid[hitRow][hitCol];
    if (!cell) return null;

    const { shipIndex, isHorizontal: shipHoriz } = cell;
    const ship = SHIPS[shipIndex];

    // Find ship start position
    let startRow = hitRow, startCol = hitCol;
    if (shipHoriz) {
      while (startCol > 0 && grid[startRow][startCol - 1]?.shipIndex === shipIndex) {
        startCol--;
      }
    } else {
      while (startRow > 0 && grid[startRow - 1][startCol]?.shipIndex === shipIndex) {
        startRow--;
      }
    }

    // Check if all segments are hit
    for (let i = 0; i < ship.size; i++) {
      const r = shipHoriz ? startRow : startRow + i;
      const c = shipHoriz ? startCol + i : startCol;
      if (r === hitRow && c === hitCol) continue; // This is the current hit
      if (!currentHits[r][c]) return null;
    }

    return ship.name;
  };

  // Handle placement click
  const handlePlacementClick = (row, col) => {
    if (placingShipIndex >= SHIPS.length) return;

    const ship = SHIPS[placingShipIndex];
    if (isValidPlacement(myGrid, row, col, ship.size, isHorizontal)) {
      const newGrid = placeShip(myGrid, row, col, placingShipIndex, isHorizontal);
      setMyGrid(newGrid);
      setPlacedShips([...placedShips, { shipIndex: placingShipIndex, row, col, isHorizontal }]);
      setPlacingShipIndex(placingShipIndex + 1);
      setHoverCells([]);
    }
  };

  // Handle placement hover
  const handlePlacementHover = (row, col) => {
    if (placingShipIndex >= SHIPS.length) {
      setHoverCells([]);
      return;
    }

    const ship = SHIPS[placingShipIndex];
    const cells = [];

    if (isValidPlacement(myGrid, row, col, ship.size, isHorizontal)) {
      for (let i = 0; i < ship.size; i++) {
        const r = isHorizontal ? row : row + i;
        const c = isHorizontal ? col + i : col;
        cells.push({ row: r, col: c });
      }
    }

    setHoverCells(cells);
  };

  // Handle attack click
  const handleAttackClick = (row, col) => {
    if (!isMyTurn || gamePhase !== 'battle') return;
    if (opponentHits[row][col] !== null) return; // Already attacked

    setIsMyTurn(false);
    setMessage("Opponent's turn...");

    wireless.sendMove({
      type: 'attack',
      row,
      col
    });
  };

  // Confirm ship placement
  const confirmPlacement = () => {
    if (placingShipIndex < SHIPS.length) return;

    if (wireless.isConnected) {
      setGamePhase('waiting');
      setMessage('Waiting for opponent...');
      wireless.sendMove({ type: 'ready' });

      if (opponentReady) {
        setGamePhase('battle');
        setIsMyTurn(wireless.isHost);
        setMessage(wireless.isHost ? 'Your turn - attack!' : "Opponent's turn...");
      }
    } else {
      setMessage('Connect to an opponent first!');
    }
  };

  // Randomise placement
  const randomise = () => {
    const grid = randomPlacement();
    setMyGrid(grid);
    setPlacingShipIndex(SHIPS.length);
    setPlacedShips(SHIPS.map((_, i) => ({ shipIndex: i })));
    setHoverCells([]);
  };

  // Reset placement
  const resetPlacement = () => {
    setMyGrid(createEmptyGrid());
    setPlacingShipIndex(0);
    setPlacedShips([]);
    setHoverCells([]);
  };

  // Reset game
  const resetGame = () => {
    setGamePhase('placement');
    setMyGrid(createEmptyGrid());
    setMyHits(createEmptyGrid());
    setOpponentHits(createEmptyGrid());
    setOpponentGrid(null);
    setPlacingShipIndex(0);
    setPlacedShips([]);
    setHoverCells([]);
    setIsMyTurn(false);
    setLastAttack(null);
    setMessage('');
    setWinner(null);
    setOpponentReady(false);
  };

  // Render cell for player's grid
  const renderMyCell = (row, col) => {
    const cell = myGrid[row][col];
    const hit = myHits[row][col];
    const isHover = hoverCells.some(h => h.row === row && h.col === col);

    let bgClass = 'bg-blue-900';
    if (cell) {
      bgClass = SHIPS[cell.shipIndex].colour;
    }
    if (isHover && gamePhase === 'placement') {
      bgClass = SHIPS[placingShipIndex]?.colour || bgClass;
      bgClass += ' opacity-60';
    }

    return (
      <div
        key={`${row}-${col}`}
        className={`w-7 h-7 sm:w-8 sm:h-8 border border-blue-700 ${bgClass}
          flex items-center justify-center cursor-pointer transition-all
          ${gamePhase === 'placement' ? 'hover:brightness-125' : ''}`}
        onClick={() => gamePhase === 'placement' && handlePlacementClick(row, col)}
        onMouseEnter={() => gamePhase === 'placement' && handlePlacementHover(row, col)}
        onMouseLeave={() => setHoverCells([])}
      >
        {hit === 'hit' && <div className="w-4 h-4 rounded-full bg-red-500" />}
        {hit === 'miss' && <div className="w-3 h-3 rounded-full bg-white/30" />}
      </div>
    );
  };

  // Render cell for opponent's grid (attack grid)
  const renderOpponentCell = (row, col) => {
    const hit = opponentHits[row][col];
    const isLast = lastAttack?.row === row && lastAttack?.col === col;

    let bgClass = 'bg-gray-700';
    if (hit === 'hit') bgClass = 'bg-red-600';
    if (hit === 'miss') bgClass = 'bg-blue-800';

    const canAttack = gamePhase === 'battle' && isMyTurn && hit === null;

    return (
      <motion.div
        key={`${row}-${col}`}
        className={`w-7 h-7 sm:w-8 sm:h-8 border border-gray-600 ${bgClass}
          flex items-center justify-center transition-all
          ${canAttack ? 'cursor-crosshair hover:bg-gray-500' : 'cursor-default'}`}
        onClick={() => canAttack && handleAttackClick(row, col)}
        animate={isLast ? { scale: [1, 1.2, 1] } : {}}
      >
        {hit === 'hit' && <span className="text-white text-lg">X</span>}
        {hit === 'miss' && <div className="w-2 h-2 rounded-full bg-white/50" />}
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col items-center pb-8">
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-3xl font-bold">Battleships</h1>
        <WirelessButton
          onClick={() => setShowWirelessModal(true)}
          isActive={wireless.isConnected}
          disabled={gamePhase === 'battle'}
        />
      </div>

      {/* Connection status */}
      {wireless.isConnected && (
        <div className="mb-2 px-3 py-1 rounded-full bg-green-600 text-sm">
          Connected as {wireless.isHost ? 'Player 1' : 'Player 2'}
        </div>
      )}

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mb-4 px-4 py-2 rounded-lg font-semibold ${
              winner === 'me' ? 'bg-green-600' :
              winner === 'opponent' ? 'bg-red-600' :
              'bg-blue-600'
            }`}
          >
            {winner === 'me' ? 'Victory! You sunk all enemy ships!' :
             winner === 'opponent' ? 'Defeat! All your ships were sunk!' :
             message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placement Phase */}
      {gamePhase === 'placement' && (
        <div className="mb-4">
          {placingShipIndex < SHIPS.length ? (
            <div className="text-center">
              <p className="text-gray-400 mb-2">
                Place your <span className={`font-bold ${SHIPS[placingShipIndex].colour.replace('bg-', 'text-').replace('-600', '-400')}`}>
                  {SHIPS[placingShipIndex].name}
                </span> ({SHIPS[placingShipIndex].size} cells)
              </p>
              <button
                onClick={() => setIsHorizontal(!isHorizontal)}
                className="btn bg-gray-600 hover:bg-gray-500 text-sm"
              >
                Rotate ({isHorizontal ? 'Horizontal' : 'Vertical'})
              </button>
            </div>
          ) : (
            <p className="text-green-400 font-semibold">All ships placed!</p>
          )}
        </div>
      )}

      {/* Grids Container */}
      <div className="flex flex-col lg:flex-row gap-8 items-center">
        {/* My Grid */}
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-2">Your Fleet</h3>
          <div className="flex">
            <div className="w-7 sm:w-8" /> {/* Spacer for labels */}
            {LETTERS.map(letter => (
              <div key={letter} className="w-7 h-6 sm:w-8 flex items-center justify-center text-xs text-gray-400">
                {letter}
              </div>
            ))}
          </div>
          {Array(GRID_SIZE).fill(null).map((_, row) => (
            <div key={row} className="flex">
              <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs text-gray-400">
                {row + 1}
              </div>
              {Array(GRID_SIZE).fill(null).map((_, col) => renderMyCell(row, col))}
            </div>
          ))}
        </div>

        {/* Opponent Grid (during battle) */}
        {(gamePhase === 'battle' || gamePhase === 'gameover') && (
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-2">Enemy Waters</h3>
            <div className="flex">
              <div className="w-7 sm:w-8" />
              {LETTERS.map(letter => (
                <div key={letter} className="w-7 h-6 sm:w-8 flex items-center justify-center text-xs text-gray-400">
                  {letter}
                </div>
              ))}
            </div>
            {Array(GRID_SIZE).fill(null).map((_, row) => (
              <div key={row} className="flex">
                <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs text-gray-400">
                  {row + 1}
                </div>
                {Array(GRID_SIZE).fill(null).map((_, col) => renderOpponentCell(row, col))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ship Legend */}
      {gamePhase === 'placement' && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {SHIPS.map((ship, idx) => (
            <div
              key={ship.name}
              className={`px-2 py-1 rounded text-xs ${ship.colour} ${
                idx < placingShipIndex ? 'opacity-50' : ''
              } ${idx === placingShipIndex ? 'ring-2 ring-white' : ''}`}
            >
              {ship.name} ({ship.size})
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 mt-6 flex-wrap justify-center">
        {gamePhase === 'placement' && (
          <>
            <button
              onClick={randomise}
              className="btn bg-blue-600 hover:bg-blue-500"
            >
              Randomise
            </button>
            <button
              onClick={resetPlacement}
              className="btn bg-gray-600 hover:bg-gray-500"
            >
              Reset
            </button>
            <button
              onClick={confirmPlacement}
              disabled={placingShipIndex < SHIPS.length || !wireless.isConnected}
              className="btn bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ready!
            </button>
          </>
        )}

        {gamePhase === 'gameover' && (
          <button
            onClick={resetGame}
            className="btn bg-primary hover:bg-indigo-600"
          >
            Play Again
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-surface rounded-lg max-w-lg text-gray-400 text-sm">
        <h3 className="text-white font-semibold mb-2">How to Play:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Connect with another player using the WiFi button</li>
          <li>Place your 5 ships on the grid (click to place, button to rotate)</li>
          <li>Once both players are ready, take turns attacking</li>
          <li>Click enemy waters to fire - red = hit, white = miss</li>
          <li>Sink all enemy ships to win!</li>
        </ul>
      </div>

      {/* Wireless Modal */}
      <WirelessModal
        isOpen={showWirelessModal}
        onClose={() => setShowWirelessModal(false)}
        connectionState={wireless.connectionState}
        roomCode={wireless.roomCode}
        role={wireless.role}
        error={wireless.error}
        onCreateRoom={wireless.createRoom}
        onJoinRoom={wireless.joinRoom}
        onDisconnect={wireless.disconnect}
        gameName="Battleships"
      />

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default Battleships;
