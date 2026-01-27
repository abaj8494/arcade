import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useWirelessGame from '../hooks/useWirelessGame';
import { WirelessButton, WirelessModal } from '../components/WirelessModal';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';

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

// Check if a ship is sunk (standalone function for use in callbacks)
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

const Battleships = () => {
  // Game phases: 'placement', 'waiting', 'battle', 'gameover'
  const [gamePhase, setGamePhase] = useState('placement');

  // Player grids
  const [myGrid, setMyGrid] = useState(createEmptyGrid);
  const [myHits, setMyHits] = useState(createEmptyGrid); // Hits received
  const [opponentHits, setOpponentHits] = useState(createEmptyGrid); // My attacks on opponent

  // Placement state
  const [placingShipIndex, setPlacingShipIndex] = useState(0);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [placedShips, setPlacedShips] = useState([]);
  const [hoverCells, setHoverCells] = useState([]);

  // Battle state
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [lastAttack, setLastAttack] = useState(null); // Last attack I made
  const [lastHitReceived, setLastHitReceived] = useState(null); // Last hit received from opponent
  const [message, setMessage] = useState('');
  const [winner, setWinner] = useState(null);

  // Track sunk ships
  const [mySunkShips, setMySunkShips] = useState([]); // Ships opponent has sunk
  const [opponentSunkShips, setOpponentSunkShips] = useState([]); // Ships I have sunk

  // Help visibility
  const { showHelp, toggleHelp } = useHelpVisibility();

  // Wireless state
  const [showWirelessModal, setShowWirelessModal] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const wirelessRef = useRef(null);

  // Refs to avoid stale closures in callbacks
  const myGridRef = useRef(myGrid);
  const gamePhaseRef = useRef(gamePhase);
  const opponentReadyRef = useRef(opponentReady);

  // Keep refs in sync
  useEffect(() => { myGridRef.current = myGrid; }, [myGrid]);
  useEffect(() => { gamePhaseRef.current = gamePhase; }, [gamePhase]);
  useEffect(() => { opponentReadyRef.current = opponentReady; }, [opponentReady]);

  // Handle incoming moves from opponent
  const handleOpponentMove = useCallback((data, from) => {
    const wireless = wirelessRef.current;
    if (!wireless) return;

    const currentGrid = myGridRef.current;
    const currentPhase = gamePhaseRef.current;

    if (data.type === 'attack') {
      const { row, col } = data;
      const hit = currentGrid[row][col] !== null;

      // Highlight the incoming attack immediately
      setLastHitReceived({ row, col, hit });

      // Update my hits received and check for loss
      setMyHits(prev => {
        const newHits = prev.map(r => [...r]);
        newHits[row][col] = hit ? 'hit' : 'miss';

        // Send result back (do this inside setState to have correct state)
        const sunkShip = hit ? checkShipSunk(currentGrid, row, col, prev) : null;
        wireless.sendMove({
          type: 'attackResult',
          row,
          col,
          hit,
          sunk: sunkShip
        });

        // Track if my ship was sunk
        if (sunkShip) {
          setMySunkShips(prev => [...prev, sunkShip]);
        }

        // Check if I lost (count all hits including this one)
        if (hit && checkAllSunk(currentGrid, newHits)) {
          setWinner('opponent');
          setGamePhase('gameover');
          wireless.sendMove({ type: 'gameOver', winner: 'me' });
        } else {
          // Only switch turns on a miss - hits give opponent another turn
          if (!hit) {
            setIsMyTurn(true);
            setMessage('They missed! Your turn!');
          } else {
            setMessage(sunkShip ? `They sunk your ${sunkShip}!` : 'They hit your ship!');
          }
        }

        return newHits;
      });
    } else if (data.type === 'attackResult') {
      const { row, col, hit, sunk } = data;

      setOpponentHits(prev => {
        const newHits = prev.map(r => [...r]);
        newHits[row][col] = hit ? 'hit' : 'miss';

        setLastAttack({ row, col, hit });

        // Track if I sunk an opponent's ship
        if (sunk) {
          setOpponentSunkShips(prev => [...prev, sunk]);
        }

        if (hit) {
          // Hit - get another turn!
          setIsMyTurn(true);
          setMessage(sunk ? `You sunk their ${sunk}! Fire again!` : 'Hit! Fire again!');

          // Count total hits to check for win
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
        } else {
          // Miss - opponent's turn
          setMessage("Miss! Opponent's turn...");
        }

        return newHits;
      });
    } else if (data.type === 'ready') {
      setOpponentReady(true);
      opponentReadyRef.current = true;
      if (currentPhase === 'waiting') {
        // Both ready - determine who goes first (player 1 goes first)
        setGamePhase('battle');
        gamePhaseRef.current = 'battle';
        setIsMyTurn(wireless.isPlayer1);
        setMessage(wireless.isPlayer1 ? 'Your turn - attack!' : "Opponent's turn...");
      }
    } else if (data.type === 'gameOver') {
      setWinner(data.winner === 'me' ? 'opponent' : 'me');
      setGamePhase('gameover');
    }
  }, []);

  // Handle game state sync
  const handleStateSync = useCallback((data, from) => {
    // Could be used for reconnection
  }, []);

  // Wireless hook
  const wireless = useWirelessGame(
    'battleships',
    handleOpponentMove,
    handleStateSync
  );

  // Keep ref updated
  wirelessRef.current = wireless;

  // Handle connection - set message when connected
  useEffect(() => {
    if (wireless.isConnected) {
      setMessage('Connected! Place your ships.');
    }
  }, [wireless.isConnected]);

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
    setMessage("Firing...");

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
      gamePhaseRef.current = 'waiting';
      setMessage('Waiting for opponent...');
      wireless.sendMove({ type: 'ready' });

      // Use ref to check if opponent already sent ready
      if (opponentReadyRef.current) {
        setGamePhase('battle');
        gamePhaseRef.current = 'battle';
        setIsMyTurn(wireless.isPlayer1);
        setMessage(wireless.isPlayer1 ? 'Your turn - attack!' : "Opponent's turn...");
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
    setPlacingShipIndex(0);
    setPlacedShips([]);
    setHoverCells([]);
    setIsMyTurn(false);
    setLastAttack(null);
    setLastHitReceived(null);
    setMessage('');
    setWinner(null);
    setOpponentReady(false);
    setMySunkShips([]);
    setOpponentSunkShips([]);
  };

  // Render cell for player's grid
  const renderMyCell = (row, col) => {
    const cell = myGrid[row][col];
    const hit = myHits[row][col];
    const isHover = hoverCells.some(h => h.row === row && h.col === col);
    const isLastHit = lastHitReceived?.row === row && lastHitReceived?.col === col;

    let bgClass = 'bg-blue-900';
    if (cell) {
      bgClass = SHIPS[cell.shipIndex].colour;
    }
    if (isHover && gamePhase === 'placement') {
      bgClass = SHIPS[placingShipIndex]?.colour || bgClass;
      bgClass += ' opacity-60';
    }

    return (
      <motion.div
        key={`${row}-${col}`}
        className={`w-7 h-7 sm:w-8 sm:h-8 border border-blue-700 ${bgClass}
          flex items-center justify-center cursor-pointer transition-all
          ${gamePhase === 'placement' ? 'hover:brightness-125' : ''}
          ${isLastHit ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
        onClick={() => gamePhase === 'placement' && handlePlacementClick(row, col)}
        onMouseEnter={() => gamePhase === 'placement' && handlePlacementHover(row, col)}
        onMouseLeave={() => setHoverCells([])}
        animate={isLastHit ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {hit === 'hit' && <div className="w-4 h-4 rounded-full bg-red-500" />}
        {hit === 'miss' && <div className="w-3 h-3 rounded-full bg-white/30" />}
      </motion.div>
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
          ${canAttack ? 'cursor-crosshair hover:bg-gray-500' : 'cursor-default'}
          ${isLast ? 'ring-2 ring-yellow-400 ring-inset' : ''}`}
        onClick={() => canAttack && handleAttackClick(row, col)}
        animate={isLast ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        {hit === 'hit' && <span className="text-white text-lg font-bold">X</span>}
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
        <HelpButton onClick={toggleHelp} isActive={showHelp} />
      </div>

      {/* Connection status */}
      {wireless.isConnected && (
        <div className="mb-2 px-3 py-1 rounded-full bg-green-600 text-sm">
          Connected as Player {wireless.playerNum}
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
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 items-center lg:items-start">
        {/* My Fleet Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
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

          {/* My Ships Status */}
          {(gamePhase === 'battle' || gamePhase === 'gameover') && (
            <div className="flex flex-col gap-1 min-w-[100px]">
              <h4 className="text-sm font-semibold text-gray-400 mb-1">Your Ships</h4>
              {SHIPS.map(ship => {
                const isSunk = mySunkShips.includes(ship.name);
                return (
                  <div
                    key={ship.name}
                    className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-all ${
                      isSunk
                        ? 'bg-gray-700 text-gray-500 line-through'
                        : ship.colour + ' text-white'
                    }`}
                  >
                    <span className="flex-1">{ship.name}</span>
                    <span className="flex gap-0.5">
                      {Array(ship.size).fill(null).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-sm ${
                            isSunk ? 'bg-gray-600' : 'bg-white/30'
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Enemy Section */}
        {(gamePhase === 'battle' || gamePhase === 'gameover') && (
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            {/* Enemy Ships Status */}
            <div className="flex flex-col gap-1 min-w-[100px] order-2 sm:order-1">
              <h4 className="text-sm font-semibold text-gray-400 mb-1">Enemy Ships</h4>
              {SHIPS.map(ship => {
                const isSunk = opponentSunkShips.includes(ship.name);
                return (
                  <div
                    key={ship.name}
                    className={`flex items-center gap-2 px-2 py-1 rounded text-xs transition-all ${
                      isSunk
                        ? 'bg-red-900/50 text-red-400 line-through'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    <span className="flex-1">{ship.name}</span>
                    <span className="flex gap-0.5">
                      {Array(ship.size).fill(null).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-sm ${
                            isSunk ? 'bg-red-500' : 'bg-gray-600'
                          }`}
                        />
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Opponent Grid */}
            <div className="flex flex-col items-center order-1 sm:order-2">
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
      {showHelp && (
        <div className="mt-6 p-4 bg-surface rounded-lg max-w-lg text-gray-400 text-sm">
          <h3 className="text-white font-semibold mb-2">How to Play:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Connect with another player using the WiFi button</li>
            <li>Place your 5 ships on the grid (click to place, button to rotate)</li>
            <li>Once both players are ready, take turns attacking</li>
            <li>Click enemy waters to fire - red = hit, white = miss</li>
            <li><span className="text-green-400">Hit = fire again!</span> Miss = opponent's turn</li>
            <li>Sink all enemy ships to win!</li>
          </ul>
        </div>
      )}

      {/* Wireless Modal */}
      <WirelessModal
        isOpen={showWirelessModal}
        onClose={() => setShowWirelessModal(false)}
        connectionState={wireless.connectionState}
        playerNum={wireless.playerNum}
        roomCode={wireless.roomCode}
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
