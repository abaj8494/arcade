import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = process.env.NODE_ENV === 'production'
  ? `wss://${window.location.host}/ws`
  : 'ws://localhost:5000/ws';

const RECONNECT_DELAY = 3000;

export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  WAITING: 'waiting',
  CONNECTED: 'connected',
  ERROR: 'error'
};

export function useWirelessGame(gameType, onMove, onState, onGameReady) {
  const [connectionState, setConnectionState] = useState(ConnectionState.DISCONNECTED);
  const [roomCode, setRoomCode] = useState(null);
  const [role, setRole] = useState(null); // 'host' or 'guest'
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  // Clean up WebSocket
  const cleanup = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Send message helper
  const send = useCallback((type, data = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
      return true;
    }
    return false;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    cleanup();
    setConnectionState(ConnectionState.CONNECTING);
    setError(null);

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          send('ping');
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'created':
              setRoomCode(msg.roomCode);
              setRole(msg.role);
              setConnectionState(ConnectionState.WAITING);
              break;

            case 'joined':
              setRoomCode(msg.roomCode);
              setRole(msg.role);
              setConnectionState(ConnectionState.CONNECTED);
              break;

            case 'guestJoined':
              setConnectionState(ConnectionState.CONNECTED);
              break;

            case 'gameReady':
              if (onGameReady) onGameReady(role);
              break;

            case 'move':
              if (onMove) onMove(msg.data, msg.from);
              break;

            case 'state':
              if (onState) onState(msg.data, msg.from);
              break;

            case 'opponentLeft':
              setConnectionState(ConnectionState.WAITING);
              setError('Opponent disconnected');
              break;

            case 'roomClosed':
              setConnectionState(ConnectionState.DISCONNECTED);
              setRoomCode(null);
              setRole(null);
              setError(msg.reason || 'Room closed');
              break;

            case 'error':
              setError(msg.message);
              if (connectionState === ConnectionState.CONNECTING) {
                setConnectionState(ConnectionState.ERROR);
              }
              break;

            case 'pong':
              // Connection is alive
              break;

            default:
              break;
          }
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      ws.onclose = () => {
        if (connectionState !== ConnectionState.DISCONNECTED) {
          setConnectionState(ConnectionState.ERROR);
          setError('Connection lost');
        }
      };

      ws.onerror = () => {
        setConnectionState(ConnectionState.ERROR);
        setError('Connection failed');
      };

    } catch (e) {
      setConnectionState(ConnectionState.ERROR);
      setError('Failed to connect');
    }
  }, [cleanup, send, connectionState, role, onMove, onState, onGameReady]);

  // Create a new room
  const createRoom = useCallback(() => {
    connect();
    // Wait for connection then send create
    const checkAndCreate = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        clearInterval(checkAndCreate);
        send('create', { gameType });
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => clearInterval(checkAndCreate), 5000);
  }, [connect, send, gameType]);

  // Join an existing room
  const joinRoom = useCallback((code) => {
    connect();
    // Wait for connection then send join
    const checkAndJoin = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        clearInterval(checkAndJoin);
        send('join', { roomCode: code });
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => clearInterval(checkAndJoin), 5000);
  }, [connect, send]);

  // Send a move to opponent
  const sendMove = useCallback((moveData) => {
    return send('move', { data: moveData });
  }, [send]);

  // Send full game state to opponent
  const sendState = useCallback((stateData) => {
    return send('state', { data: stateData });
  }, [send]);

  // Disconnect
  const disconnect = useCallback(() => {
    send('leave');
    cleanup();
    setConnectionState(ConnectionState.DISCONNECTED);
    setRoomCode(null);
    setRole(null);
    setError(null);
  }, [send, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    connectionState,
    roomCode,
    role,
    error,
    isHost: role === 'host',
    isGuest: role === 'guest',
    isConnected: connectionState === ConnectionState.CONNECTED,
    isWaiting: connectionState === ConnectionState.WAITING,
    createRoom,
    joinRoom,
    sendMove,
    sendState,
    disconnect
  };
}

export default useWirelessGame;
