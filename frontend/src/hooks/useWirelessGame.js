import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = process.env.NODE_ENV === 'production'
  ? `wss://${window.location.host}/ws`
  : 'ws://localhost:5000/ws';

export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  WAITING: 'waiting',
  CONNECTED: 'connected',
  ERROR: 'error'
};

export function useWirelessGame(gameType, onMove, onState) {
  const [connectionState, setConnectionState] = useState(ConnectionState.DISCONNECTED);
  const [playerNum, setPlayerNum] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const pendingActionRef = useRef(null); // 'create' or { type: 'join', code: 'XXXX' }

  // Keep callbacks in refs to avoid stale closures
  const onMoveRef = useRef(onMove);
  const onStateRef = useRef(onState);

  // Update refs when callbacks change
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);

  // Clean up
  const cleanup = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    pendingActionRef.current = null;
  }, []);

  // Send message
  const send = useCallback((type, data = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
      return true;
    }
    return false;
  }, []);

  // Internal connect and perform action
  const connectAndDo = useCallback((action) => {
    cleanup();
    setConnectionState(ConnectionState.CONNECTING);
    setError(null);
    setRoomCode(null);
    pendingActionRef.current = action;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          send('ping');
        }, 25000);

        // Perform the pending action
        const action = pendingActionRef.current;
        console.log('WebSocket opened, pending action:', action, 'gameType:', gameType);

        if (action === 'create') {
          ws.send(JSON.stringify({ type: 'create', gameType }));
        } else if (action?.type === 'join' && action?.code) {
          ws.send(JSON.stringify({ type: 'join', roomCode: action.code, gameType }));
        } else if (action?.type === 'join') {
          // Join was called without a valid code - this shouldn't happen
          console.error('Join action missing code:', action);
          setError('Invalid room code');
          setConnectionState(ConnectionState.ERROR);
          ws.close();
        } else {
          console.error('Unknown pending action:', action);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'roomCreated':
              setRoomCode(msg.roomCode);
              setConnectionState(ConnectionState.WAITING);
              break;

            case 'connected':
              setPlayerNum(msg.playerNum);
              setRoomCode(msg.roomCode);
              setConnectionState(ConnectionState.CONNECTED);
              break;

            case 'move':
              if (onMoveRef.current) onMoveRef.current(msg.data, msg.from);
              break;

            case 'state':
              if (onStateRef.current) onStateRef.current(msg.data, msg.from);
              break;

            case 'opponentLeft':
              setConnectionState(ConnectionState.DISCONNECTED);
              setPlayerNum(null);
              setRoomCode(null);
              cleanup();
              break;

            case 'error':
              setError(msg.message);
              setConnectionState(ConnectionState.ERROR);
              break;

            case 'pong':
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
          setConnectionState(ConnectionState.DISCONNECTED);
        }
        setPlayerNum(null);
        setRoomCode(null);
      };

      ws.onerror = () => {
        setConnectionState(ConnectionState.ERROR);
        setError('Connection failed');
      };

    } catch (e) {
      setConnectionState(ConnectionState.ERROR);
      setError('Failed to connect');
    }
  }, [cleanup, send, gameType, connectionState]);

  // Create a new room
  const createRoom = useCallback(() => {
    connectAndDo('create');
  }, [connectAndDo]);

  // Join an existing room
  const joinRoom = useCallback((code) => {
    if (!code || code.length !== 4) {
      setError('Invalid room code');
      setConnectionState(ConnectionState.ERROR);
      return;
    }
    connectAndDo({ type: 'join', code });
  }, [connectAndDo]);

  // Disconnect
  const disconnect = useCallback(() => {
    send('leave');
    cleanup();
    setConnectionState(ConnectionState.DISCONNECTED);
    setPlayerNum(null);
    setRoomCode(null);
    setError(null);
  }, [send, cleanup]);

  // Send move
  const sendMove = useCallback((moveData) => {
    return send('move', { data: moveData });
  }, [send]);

  // Send state
  const sendState = useCallback((stateData) => {
    return send('state', { data: stateData });
  }, [send]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    connectionState,
    playerNum,
    roomCode,
    error,
    isPlayer1: playerNum === 1,
    isPlayer2: playerNum === 2,
    isConnected: connectionState === ConnectionState.CONNECTED,
    isWaiting: connectionState === ConnectionState.WAITING,
    createRoom,
    joinRoom,
    disconnect,
    sendMove,
    sendState
  };
}

export default useWirelessGame;
