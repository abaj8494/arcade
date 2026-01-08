import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'arcade-help-visible';

// Shared hook for help visibility across all games
export function useHelpVisibility() {
  const [showHelp, setShowHelp] = useState(() => {
    // Initialize from localStorage, default to true for first-time users
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  // Sync to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(showHelp));
  }, [showHelp]);

  const toggleHelp = useCallback(() => {
    setShowHelp(prev => !prev);
  }, []);

  return { showHelp, toggleHelp };
}

// Help button component - uses ? icon, not emoji
export const HelpButton = ({ onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
      isActive
        ? 'bg-primary text-white'
        : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
    }`}
    title={isActive ? 'Hide help' : 'Show help'}
  >
    ?
  </button>
);

export default useHelpVisibility;
