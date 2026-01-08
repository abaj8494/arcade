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

// Wireless button to trigger modal
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

// Main wireless modal component
export const WirelessModal = ({
  isOpen,
  onClose,
  connectionState,
  roomCode,
  role,
  error,
  onCreateRoom,
  onJoinRoom,
  onDisconnect,
  gameName = 'Game'
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState(null); // 'create' or 'join'

  const handleJoin = () => {
    if (joinCode.length === 4) {
      onJoinRoom(joinCode);
    }
  };

  const handleClose = () => {
    if (connectionState === ConnectionState.CONNECTED ||
        connectionState === ConnectionState.WAITING) {
      // Confirm before disconnecting
      if (window.confirm('Are you sure you want to disconnect?')) {
        onDisconnect();
        onClose();
      }
    } else {
      onClose();
    }
    setMode(null);
    setJoinCode('');
  };

  const handleBack = () => {
    if (connectionState === ConnectionState.WAITING) {
      onDisconnect();
    }
    setMode(null);
    setJoinCode('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <WifiIcon size={24} className="text-primary" />
              <h2 className="text-xl font-bold">Wireless Play</h2>
            </div>
            <button
              onClick={handleClose}
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
              <p className="text-gray-400 mb-4">
                You are {role === 'host' ? 'Player 1' : 'Player 2'}
              </p>
              <p className="text-sm text-gray-500 mb-4">Room: {roomCode}</p>
              <button
                onClick={() => { onDisconnect(); handleBack(); }}
                className="btn bg-red-600 hover:bg-red-500 w-full"
              >
                Disconnect
              </button>
            </div>
          )}

          {/* Waiting State */}
          {connectionState === ConnectionState.WAITING && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-600 flex items-center justify-center animate-pulse">
                <WifiIcon size={32} className="text-white" />
              </div>
              <p className="text-blue-400 font-semibold text-lg mb-2">
                Waiting for opponent...
              </p>
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <p className="text-gray-400 text-sm mb-2">Share this code:</p>
                <p className="text-3xl font-mono font-bold text-white tracking-wider">
                  {roomCode}
                </p>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Ask your opponent to enter this code to join
              </p>
              <button
                onClick={handleBack}
                className="btn bg-gray-600 hover:bg-gray-500 w-full"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Error State */}
          {connectionState === ConnectionState.ERROR && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-600 flex items-center justify-center">
                <span className="text-3xl">!</span>
              </div>
              <p className="text-red-400 font-semibold mb-2">Connection Error</p>
              <p className="text-gray-400 mb-4">{error || 'Unable to connect'}</p>
              <button
                onClick={handleBack}
                className="btn bg-gray-600 hover:bg-gray-500 w-full"
              >
                Try Again
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

          {/* Initial State - Mode Selection */}
          {connectionState === ConnectionState.DISCONNECTED && !mode && (
            <div>
              <p className="text-gray-400 text-center mb-6">
                Play {gameName} with a friend on another device
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => { setMode('create'); onCreateRoom(); }}
                  className="btn bg-primary hover:bg-indigo-600 w-full py-3"
                >
                  Create Game
                </button>
                <button
                  onClick={() => setMode('join')}
                  className="btn bg-gray-600 hover:bg-gray-500 w-full py-3"
                >
                  Join Game
                </button>
              </div>
            </div>
          )}

          {/* Join Mode - Enter Code */}
          {connectionState === ConnectionState.DISCONNECTED && mode === 'join' && (
            <div>
              <p className="text-gray-400 text-center mb-4">
                Enter the 4-digit room code
              </p>
              <input
                type="text"
                maxLength={4}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="w-full text-center text-3xl font-mono tracking-wider bg-gray-700 border-2 border-gray-600 rounded-lg p-4 mb-4 focus:border-primary focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2">
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

          {/* Error message display */}
          {error && connectionState !== ConnectionState.ERROR && (
            <p className="text-red-400 text-sm text-center mt-4">{error}</p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WirelessModal;
