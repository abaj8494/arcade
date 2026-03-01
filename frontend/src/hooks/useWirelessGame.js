import { useState, useEffect, useRef, useCallback } from 'react';
import wl from '../utils/wirelessLogger';

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
  const seqRef = useRef(0);
  const lastRecvSeqRef = useRef(-1);

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
    wl.warn('send failed - ws not open', { type, readyState: wsRef.current?.readyState });
    return false;
  }, []);

  // Internal connect and perform action
  const connectAndDo = useCallback((action) => {
    cleanup();
    setConnectionState(ConnectionState.CONNECTING);
    setError(null);
    setRoomCode(null);
    pendingActionRef.current = action;

    // Reset sequence counters on new connection
    seqRef.current = 0;
    lastRecvSeqRef.current = -1;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        wl.info('ws open', { gameType });

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          send('ping');
        }, 25000);

        // Perform the pending action
        const action = pendingActionRef.current;

        if (action === 'create') {
          ws.send(JSON.stringify({ type: 'create', gameType }));
        } else if (action?.type === 'join' && action?.code) {
          ws.send(JSON.stringify({ type: 'join', roomCode: action.code, gameType }));
        } else if (action?.type === 'join') {
          wl.error('join action missing code', action);
          setError('Invalid room code');
          setConnectionState(ConnectionState.ERROR);
          ws.close();
        } else {
          wl.error('unknown pending action', action);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'roomCreated':
              wl.info('room created', { roomCode: msg.roomCode });
              setRoomCode(msg.roomCode);
              setConnectionState(ConnectionState.WAITING);
              break;

            case 'connected':
              wl.info('connected', { playerNum: msg.playerNum, roomCode: msg.roomCode });
              setPlayerNum(msg.playerNum);
              setRoomCode(msg.roomCode);
              setConnectionState(ConnectionState.CONNECTED);
              break;

            case 'move': {
              const moveData = msg.data;
              const recvSeq = moveData?._seq;

              // Detect sequence gaps
              if (recvSeq !== undefined) {
                if (lastRecvSeqRef.current >= 0 && recvSeq !== lastRecvSeqRef.current + 1) {
                  wl.warn('sequence gap', { expected: lastRecvSeqRef.current + 1, got: recvSeq });
                }
                lastRecvSeqRef.current = recvSeq;
              }

              wl.recv('move', { from: msg.from, seq: recvSeq, data: moveData });
              if (onMoveRef.current) onMoveRef.current(moveData, msg.from);
              break;
            }

            case 'state':
              wl.recv('state', { from: msg.from });
              if (onStateRef.current) onStateRef.current(msg.data, msg.from);
              break;

            case 'opponentLeft':
              wl.info('opponent left');
              setConnectionState(ConnectionState.DISCONNECTED);
              setPlayerNum(null);
              setRoomCode(null);
              cleanup();
              break;

            case 'error':
              wl.error('server error', { message: msg.message });
              setError(msg.message);
              setConnectionState(ConnectionState.ERROR);
              break;

            case 'pong':
              break;

            default:
              break;
          }
        } catch (e) {
          wl.error('failed to parse message', { error: e.message });
        }
      };

      ws.onclose = () => {
        wl.info('ws close');
        if (connectionState !== ConnectionState.DISCONNECTED) {
          setConnectionState(ConnectionState.DISCONNECTED);
        }
        setPlayerNum(null);
        setRoomCode(null);
      };

      ws.onerror = () => {
        wl.error('ws error');
        setConnectionState(ConnectionState.ERROR);
        setError('Connection failed');
      };

    } catch (e) {
      wl.error('failed to connect', { error: e.message });
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
    wl.info('disconnect');
    send('leave');
    cleanup();
    setConnectionState(ConnectionState.DISCONNECTED);
    setPlayerNum(null);
    setRoomCode(null);
    setError(null);
  }, [send, cleanup]);

  // Send move - returns { sent: boolean, seq: number }
  const sendMove = useCallback((moveData) => {
    const seq = ++seqRef.current;
    const dataWithSeq = { ...moveData, _seq: seq };
    const sent = send('move', { data: dataWithSeq });

    if (sent) {
      wl.send('move', { seq, data: moveData });
    } else {
      wl.error('sendMove failed', { seq, data: moveData });
    }

    return { sent, seq };
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
