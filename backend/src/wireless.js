/**
 * Simplified WebSocket handler for wireless 2-player games
 * Auto-matches players - no room codes needed
 */

const WebSocket = require('ws');

// Waiting player (first to connect)
let waitingPlayer = null;
// Active game session
let activeGame = null;
let cleanupTimer = null;

const GAME_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Clean up game
function cleanupGame() {
  if (activeGame) {
    if (activeGame.player1?.readyState === WebSocket.OPEN) {
      activeGame.player1.close();
    }
    if (activeGame.player2?.readyState === WebSocket.OPEN) {
      activeGame.player2.close();
    }
    activeGame = null;
  }
  waitingPlayer = null;
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
}

// Reset cleanup timer
function resetCleanupTimer() {
  if (cleanupTimer) clearTimeout(cleanupTimer);
  cleanupTimer = setTimeout(cleanupGame, GAME_TIMEOUT);
}

// Send JSON message
function send(ws, type, data = {}) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

// Get opponent
function getOpponent(ws) {
  if (!activeGame) return null;
  if (activeGame.player1 === ws) return activeGame.player2;
  if (activeGame.player2 === ws) return activeGame.player1;
  return null;
}

// Handle incoming messages
function handleMessage(ws, message) {
  let msg;
  try {
    msg = JSON.parse(message);
  } catch (e) {
    return;
  }

  resetCleanupTimer();

  switch (msg.type) {
    case 'join': {
      // If there's an active game, reject
      if (activeGame && activeGame.player1 && activeGame.player2) {
        send(ws, 'error', { message: 'Game in progress' });
        return;
      }

      // If someone is waiting, match them
      if (waitingPlayer && waitingPlayer.readyState === WebSocket.OPEN) {
        activeGame = {
          player1: waitingPlayer,
          player2: ws,
          gameType: msg.gameType || 'unknown'
        };
        waitingPlayer.playerNum = 1;
        ws.playerNum = 2;
        waitingPlayer = null;

        // Notify both players
        send(activeGame.player1, 'connected', { playerNum: 1 });
        send(activeGame.player2, 'connected', { playerNum: 2 });
      } else {
        // First player - wait for opponent
        waitingPlayer = ws;
        ws.gameType = msg.gameType;
        send(ws, 'waiting', {});
      }
      break;
    }

    case 'move': {
      const opponent = getOpponent(ws);
      if (opponent) {
        send(opponent, 'move', { data: msg.data, from: ws.playerNum });
      }
      break;
    }

    case 'state': {
      const opponent = getOpponent(ws);
      if (opponent) {
        send(opponent, 'state', { data: msg.data, from: ws.playerNum });
      }
      break;
    }

    case 'leave': {
      handleDisconnect(ws);
      break;
    }

    case 'ping': {
      send(ws, 'pong');
      break;
    }
  }
}

// Handle disconnect
function handleDisconnect(ws) {
  // If waiting player disconnects
  if (waitingPlayer === ws) {
    waitingPlayer = null;
    return;
  }

  if (!activeGame) return;

  const opponent = getOpponent(ws);

  // Notify opponent
  if (opponent) {
    send(opponent, 'opponentLeft', {});
  }

  // Clean up game
  activeGame = null;
}

// Initialize WebSocket server
function initWebSocket(server) {
  const wss = new WebSocket.Server({
    server,
    path: '/ws',
    maxPayload: 16384
  });

  // Ping/pong for connection health
  const pingInterval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (ws.isAlive === false) {
        handleDisconnect(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
    cleanupGame();
  });

  wss.on('connection', (ws) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message) => {
      handleMessage(ws, message.toString());
    });

    ws.on('close', () => {
      handleDisconnect(ws);
    });

    ws.on('error', () => {
      handleDisconnect(ws);
    });
  });

  console.log('WebSocket server initialized on /ws');
  return wss;
}

module.exports = { initWebSocket };
