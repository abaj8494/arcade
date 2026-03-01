/**
 * WebSocket handler for wireless 2-player games
 * Supports multiple rooms with 4-digit pin codes
 *
 * Set WS_DEBUG=1 env var for verbose logging.
 */

const WebSocket = require('ws');

// Map of room codes to room data
const rooms = new Map();

const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const debugEnabled = process.env.WS_DEBUG === '1';

// Logging helper — errors/warns always log, debug only when WS_DEBUG=1
function wsLog(level, msg, data) {
  const prefix = `[WS ${level}]`;
  if (level === 'ERROR') {
    console.error(prefix, msg, data !== undefined ? data : '');
  } else if (level === 'WARN') {
    console.warn(prefix, msg, data !== undefined ? data : '');
  } else if (debugEnabled) {
    console.log(prefix, msg, data !== undefined ? data : '');
  }
}

// Generate a random 4-digit room code
function generateRoomCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

// Clean up a specific room
function cleanupRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  wsLog('INFO', 'room cleanup', { roomCode });

  if (room.player1?.readyState === WebSocket.OPEN) {
    room.player1.close();
  }
  if (room.player2?.readyState === WebSocket.OPEN) {
    room.player2.close();
  }
  if (room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
  }
  rooms.delete(roomCode);
}

// Reset cleanup timer for a room
function resetRoomTimer(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.cleanupTimer = setTimeout(() => cleanupRoom(roomCode), ROOM_TIMEOUT);
}

// Send JSON message — returns true if sent, false otherwise
function send(ws, type, data = {}) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
    return true;
  }
  wsLog('WARN', 'send failed - ws not open', { type, readyState: ws?.readyState });
  return false;
}

// Get opponent in a room
function getOpponent(ws) {
  if (!ws.roomCode) return null;
  const room = rooms.get(ws.roomCode);
  if (!room) return null;
  if (room.player1 === ws) return room.player2;
  if (room.player2 === ws) return room.player1;
  return null;
}

// Handle incoming messages
function handleMessage(ws, message) {
  let msg;
  try {
    msg = JSON.parse(message);
  } catch (e) {
    wsLog('ERROR', 'failed to parse message', { message });
    return;
  }

  if (ws.roomCode) {
    resetRoomTimer(ws.roomCode);
  }

  switch (msg.type) {
    case 'create': {
      // Create a new room
      const roomCode = generateRoomCode();
      const room = {
        player1: ws,
        player2: null,
        gameType: msg.gameType || 'unknown',
        cleanupTimer: null
      };
      rooms.set(roomCode, room);
      ws.roomCode = roomCode;
      ws.playerNum = 1;

      wsLog('INFO', 'room created', { roomCode, gameType: room.gameType });

      resetRoomTimer(roomCode);
      send(ws, 'roomCreated', { roomCode });
      break;
    }

    case 'join': {
      const roomCode = msg.roomCode;
      const joiningGameType = msg.gameType;

      if (!roomCode) {
        send(ws, 'error', { message: 'Room code required' });
        return;
      }

      const room = rooms.get(roomCode);

      if (!room) {
        wsLog('WARN', 'join failed - room not found', { roomCode });
        send(ws, 'error', { message: 'Room not found' });
        return;
      }

      if (room.player2) {
        wsLog('WARN', 'join failed - room full', { roomCode });
        send(ws, 'error', { message: 'Room is full' });
        return;
      }

      // Validate game type matches
      if (joiningGameType && room.gameType && joiningGameType !== room.gameType) {
        wsLog('WARN', 'join failed - game type mismatch', { roomCode, expected: room.gameType, got: joiningGameType });
        send(ws, 'error', { message: `Wrong game. This room is for ${room.gameType}` });
        return;
      }

      // Join as player 2
      room.player2 = ws;
      ws.roomCode = roomCode;
      ws.playerNum = 2;
      ws.gameType = joiningGameType;

      wsLog('INFO', 'player joined', { roomCode, gameType: room.gameType });

      // Notify both players
      send(room.player1, 'connected', { playerNum: 1, roomCode, gameType: room.gameType });
      send(room.player2, 'connected', { playerNum: 2, roomCode, gameType: room.gameType });
      break;
    }

    case 'move': {
      const opponent = getOpponent(ws);
      if (opponent) {
        wsLog('INFO', 'relay move', { roomCode: ws.roomCode, from: ws.playerNum });
        const relayed = send(opponent, 'move', { data: msg.data, from: ws.playerNum });
        if (!relayed) {
          wsLog('WARN', 'move relay failed - opponent ws not open', { roomCode: ws.roomCode });
        }
      } else {
        wsLog('WARN', 'move relay failed - no opponent', { roomCode: ws.roomCode });
      }
      break;
    }

    case 'state': {
      const opponent = getOpponent(ws);
      if (opponent) {
        wsLog('INFO', 'relay state', { roomCode: ws.roomCode, from: ws.playerNum });
        send(opponent, 'state', { data: msg.data, from: ws.playerNum });
      } else {
        wsLog('WARN', 'state relay failed - no opponent', { roomCode: ws.roomCode });
      }
      break;
    }

    case 'leave': {
      wsLog('INFO', 'player leave', { roomCode: ws.roomCode, playerNum: ws.playerNum });
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
  if (!ws.roomCode) return;

  const roomCode = ws.roomCode;
  const room = rooms.get(roomCode);
  if (!room) return;

  wsLog('INFO', 'player disconnect', { roomCode, playerNum: ws.playerNum });

  const opponent = getOpponent(ws);

  // Notify opponent
  if (opponent) {
    send(opponent, 'opponentLeft', {});
    opponent.roomCode = null;
  }

  // Clean up room
  cleanupRoom(roomCode);
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
        wsLog('INFO', 'terminating dead connection', { roomCode: ws.roomCode });
        handleDisconnect(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
    for (const roomCode of rooms.keys()) {
      cleanupRoom(roomCode);
    }
  });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    wsLog('INFO', 'new ws connection');

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
      wsLog('ERROR', 'ws error', { roomCode: ws.roomCode });
      handleDisconnect(ws);
    });
  });

  console.log('WebSocket server initialized on /ws (with room support)');
  return wss;
}

module.exports = { initWebSocket };
