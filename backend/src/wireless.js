/**
 * Lightweight WebSocket handler for wireless 2-player games
 * Designed for low memory usage on constrained VPS
 */

const WebSocket = require('ws');

// Single room store - only one active game at a time to save memory
let activeRoom = null;
let cleanupTimer = null;

const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const PING_INTERVAL = 30000; // 30 seconds

// Generate short 4-digit room code
function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Clean up room
function cleanupRoom() {
  if (activeRoom) {
    if (activeRoom.host && activeRoom.host.readyState === WebSocket.OPEN) {
      activeRoom.host.close();
    }
    if (activeRoom.guest && activeRoom.guest.readyState === WebSocket.OPEN) {
      activeRoom.guest.close();
    }
    activeRoom = null;
  }
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
}

// Reset cleanup timer
function resetCleanupTimer() {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
  }
  cleanupTimer = setTimeout(cleanupRoom, ROOM_TIMEOUT);
}

// Send JSON message
function send(ws, type, data = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}

// Broadcast to both players
function broadcast(type, data = {}) {
  if (activeRoom) {
    send(activeRoom.host, type, data);
    send(activeRoom.guest, type, data);
  }
}

// Get opponent WebSocket
function getOpponent(ws) {
  if (!activeRoom) return null;
  if (activeRoom.host === ws) return activeRoom.guest;
  if (activeRoom.guest === ws) return activeRoom.host;
  return null;
}

// Handle incoming messages
function handleMessage(ws, message) {
  let msg;
  try {
    msg = JSON.parse(message);
  } catch (e) {
    send(ws, 'error', { message: 'Invalid JSON' });
    return;
  }

  resetCleanupTimer();

  switch (msg.type) {
    case 'create': {
      // Clean up any existing room first
      if (activeRoom) {
        // Notify existing players
        broadcast('roomClosed', { reason: 'New room created' });
        cleanupRoom();
      }

      const code = generateRoomCode();
      activeRoom = {
        code,
        gameType: msg.gameType || 'unknown',
        host: ws,
        guest: null,
        state: null,
        createdAt: Date.now()
      };
      ws.roomRole = 'host';
      ws.roomCode = code;

      send(ws, 'created', { roomCode: code, role: 'host' });
      resetCleanupTimer();
      break;
    }

    case 'join': {
      const code = msg.roomCode;

      if (!activeRoom) {
        send(ws, 'error', { message: 'No active room found' });
        return;
      }

      if (activeRoom.code !== code) {
        send(ws, 'error', { message: 'Invalid room code' });
        return;
      }

      if (activeRoom.guest) {
        send(ws, 'error', { message: 'Room is full' });
        return;
      }

      activeRoom.guest = ws;
      ws.roomRole = 'guest';
      ws.roomCode = code;

      // Notify both players
      send(ws, 'joined', { roomCode: code, role: 'guest', gameType: activeRoom.gameType });
      send(activeRoom.host, 'guestJoined', { gameType: activeRoom.gameType });

      // Game is ready to start
      broadcast('gameReady', { gameType: activeRoom.gameType });
      break;
    }

    case 'move': {
      // Forward move to opponent
      const opponent = getOpponent(ws);
      if (opponent) {
        send(opponent, 'move', { data: msg.data, from: ws.roomRole });
      }
      break;
    }

    case 'state': {
      // Sync full game state to opponent
      const opponent = getOpponent(ws);
      if (opponent) {
        send(opponent, 'state', { data: msg.data, from: ws.roomRole });
      }
      // Also store in room for reconnection
      if (activeRoom) {
        activeRoom.state = msg.data;
      }
      break;
    }

    case 'chat': {
      // Simple chat message
      const opponent = getOpponent(ws);
      if (opponent) {
        send(opponent, 'chat', { message: msg.message, from: ws.roomRole });
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

    default:
      send(ws, 'error', { message: 'Unknown message type' });
  }
}

// Handle disconnect
function handleDisconnect(ws) {
  if (!activeRoom) return;

  const opponent = getOpponent(ws);

  if (activeRoom.host === ws) {
    activeRoom.host = null;
  } else if (activeRoom.guest === ws) {
    activeRoom.guest = null;
  }

  // Notify opponent
  if (opponent) {
    send(opponent, 'opponentLeft', { reason: 'Opponent disconnected' });
  }

  // Clean up if both disconnected
  if (!activeRoom.host && !activeRoom.guest) {
    cleanupRoom();
  }
}

// Initialize WebSocket server
function initWebSocket(server) {
  const wss = new WebSocket.Server({
    server,
    path: '/ws',
    maxPayload: 16384 // 16KB max message size
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
  }, PING_INTERVAL);

  wss.on('close', () => {
    clearInterval(pingInterval);
    cleanupRoom();
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

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
      handleDisconnect(ws);
    });
  });

  console.log('WebSocket server initialized on /ws');
  return wss;
}

module.exports = { initWebSocket };
