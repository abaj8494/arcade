import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectionState } from '../hooks/useWirelessGame';

// WiFi Icon SVG component
export const WifiIcon = ({ className = '', size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <circle cx="12" cy="20" r="1" fill="currentColor" />
  </svg>
);

// Wireless button to trigger connection
export const WirelessButton = ({ onClick, isActive, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-lg transition-all ${
      isActive
        ? 'bg-green-600 text-white'
        : 'bg-gray-600 hover:bg-gray-500 text-white'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    title="Wireless 2-Player"
  >
    <WifiIcon size={20} />
  </button>
);

// Wireless modal with room code support
export const WirelessModal = ({
  isOpen,
  onClose,
  connectionState,
  playerNum,
  roomCode,
  error,
  onCreateRoom,
  onJoinRoom,
  onDisconnect,
  gameName = 'Game'
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState(null); // null, 'create', 'join'

  if (!isOpen) return null;

  // Close and disconnect
  const handleCloseAndDisconnect = () => {
    if (connectionState === ConnectionState.WAITING ||
        connectionState === ConnectionState.CONNECTED) {
      onDisconnect();
    }
    setMode(null);
    setJoinCode('');
    onClose();
  };

  // Just close modal (for Start Playing)
  const handleJustClose = () => {
    setMode(null);
    setJoinCode('');
    onClose();
  };

  // Handle join code input
  const handleJoinCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setJoinCode(value);
  };

  // Submit join
  const handleJoin = () => {
    if (joinCode.length === 4) {
      onJoinRoom(joinCode);
    }
  };

  // Reset to initial state
  const handleBack = () => {
    if (connectionState === ConnectionState.WAITING) {
      onDisconnect();
    }
    setMode(null);
    setJoinCode('');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={handleCloseAndDisconnect}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header with close button */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <WifiIcon size={24} className="text-primary" />
              <h2 className="text-xl font-bold">Wireless Play</h2>
            </div>
            <button
              onClick={handleCloseAndDisconnect}
              className="text-gray-400 hover:text-white text-2xl leading-none"
            >
              &times;
            </button>
          </div>

          {/* Connected State */}
          {connectionState === ConnectionState.CONNECTED && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-600 flex items-center justify-center">
                <WifiIcon size={32} className="text-white" />
              </div>
              <p className="text-green-400 font-semibold text-lg mb-2">Connected!</p>
              <p className="text-gray-400 mb-1">
                You are Player {playerNum}
              </p>
              {roomCode && (
                <p className="text-gray-500 text-sm mb-4">
                  Room: {roomCode}
                </p>
              )}
              <button
                onClick={handleJustClose}
                className="btn bg-primary hover:bg-indigo-600 w-full"
              >
                Start Playing
              </button>
            </div>
          )}

          {/* Waiting State (room created, waiting for opponent) */}
          {connectionState === ConnectionState.WAITING && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-600 flex items-center justify-center animate-pulse">
                <WifiIcon size={32} className="text-white" />
              </div>
              <p className="text-blue-400 font-semibold text-lg mb-2">
                Room Created!
              </p>
              {roomCode && (
                <div className="mb-4">
                  <p className="text-gray-400 text-sm mb-2">Share this code with your friend:</p>
                  <div className="bg-gray-900 rounded-lg py-4 px-6 inline-block">
                    <span className="text-4xl font-mono font-bold tracking-widest text-white">
                      {roomCode}
                    </span>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500 mb-4">
                Waiting for opponent to join...
              </p>
              <button
                onClick={handleBack}
                className="btn bg-gray-600 hover:bg-gray-500 w-full"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Connecting State */}
          {connectionState === ConnectionState.CONNECTING && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-600 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
              </div>
              <p className="text-gray-400">Connecting...</p>
            </div>
          )}

          {/* Error State */}
          {connectionState === ConnectionState.ERROR && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-600 flex items-center justify-center">
                <span className="text-3xl">!</span>
              </div>
              <p className="text-red-400 font-semibold mb-2">Error</p>
              <p className="text-gray-400 mb-4">{error || 'Unable to connect'}</p>
              <button
                onClick={handleBack}
                className="btn bg-gray-600 hover:bg-gray-500 w-full"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Initial/Disconnected State */}
          {connectionState === ConnectionState.DISCONNECTED && !mode && (
            <div className="text-center">
              <p className="text-gray-400 mb-6">
                Play {gameName} with a friend on another device
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setMode('create');
                    onCreateRoom();
                  }}
                  className="btn bg-primary hover:bg-indigo-600 w-full py-3"
                >
                  Create Room
                </button>
                <button
                  onClick={() => setMode('join')}
                  className="btn bg-gray-600 hover:bg-gray-500 w-full py-3"
                >
                  Join Room
                </button>
              </div>
            </div>
          )}

          {/* Join Room Input */}
          {connectionState === ConnectionState.DISCONNECTED && mode === 'join' && (
            <div className="text-center">
              <p className="text-gray-400 mb-4">
                Enter the 4-digit room code
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={joinCode}
                onChange={handleJoinCodeChange}
                placeholder="0000"
                className="w-full text-center text-3xl font-mono tracking-widest py-3 px-4 bg-gray-900 border border-gray-700 rounded-lg focus:border-primary focus:outline-none mb-4"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="btn bg-gray-600 hover:bg-gray-500 flex-1"
                >
                  Back
                </button>
                <button
                  onClick={handleJoin}
                  disabled={joinCode.length !== 4}
                  className="btn bg-primary hover:bg-indigo-600 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WirelessModal;
