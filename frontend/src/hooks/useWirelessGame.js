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
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);

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
  }, []);

  // Send message
  const send = useCallback((type, data = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }));
      return true;
    }
    return false;
  }, []);

  // Connect and join
  const connect = useCallback(() => {
    cleanup();
    setConnectionState(ConnectionState.CONNECTING);
    setError(null);

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          send('ping');
        }, 25000);

        // Auto-join
        ws.send(JSON.stringify({ type: 'join', gameType }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'waiting':
              setConnectionState(ConnectionState.WAITING);
              break;

            case 'connected':
              setPlayerNum(msg.playerNum);
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
      };

      ws.onerror = () => {
        setConnectionState(ConnectionState.ERROR);
        setError('Connection failed');
      };

    } catch (e) {
      setConnectionState(ConnectionState.ERROR);
      setError('Failed to connect');
    }
  }, [cleanup, send, gameType]);

  // Disconnect
  const disconnect = useCallback(() => {
    send('leave');
    cleanup();
    setConnectionState(ConnectionState.DISCONNECTED);
    setPlayerNum(null);
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
    error,
    isPlayer1: playerNum === 1,
    isPlayer2: playerNum === 2,
    isConnected: connectionState === ConnectionState.CONNECTED,
    isWaiting: connectionState === ConnectionState.WAITING,
    connect,
    disconnect,
    sendMove,
    sendState
  };
}

export default useWirelessGame;
