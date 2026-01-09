import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

// Use the correct API URL based on the environment
const API_URL = window.location.hostname === 'arcade.abaj.ai'
  ? 'https://arcade.abaj.ai/api'
  : process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const HomePage = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await axios.get(`${API_URL}/games`);
        setGames(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching games:', err);
        setError('Failed to load games. Please try again later.');
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 text-red-500">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="w-10" /> {/* Spacer for centering */}
        <h1 className="text-3xl font-bold text-center">Arcade Games</h1>
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className="p-2 rounded-lg bg-surface hover:bg-gray-700 transition-colors"
          title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
        >
          {viewMode === 'grid' ? (
            // List icon (shows when in grid mode, clicking switches to list)
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          ) : (
            // Grid icon (shows when in list mode, clicking switches to grid)
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          )}
        </button>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {games.map((game) => (
            <Link to={`/game/${game.id}`} key={game.id}>
              <motion.div
                className="game-card"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="aspect-w-4 aspect-h-3 mb-3 bg-gray-100 rounded-md overflow-hidden">
                  {game.image ? (
                    <img
                      src={game.image}
                      alt={game.name}
                      className="object-contain h-full w-full p-2"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-4xl bg-gray-700">
                      {game.name.charAt(0)}
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-1">{game.name}</h3>
                <p className="text-sm text-gray-400">
                  {game.implemented ? 'Ready to Play' : 'Coming Soon'}
                </p>
              </motion.div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {games.map((game) => (
            <Link to={`/game/${game.id}`} key={game.id}>
              <motion.div
                className="game-card flex items-center gap-4 p-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                  {game.image ? (
                    <img
                      src={game.image}
                      alt={game.name}
                      className="object-contain h-full w-full p-1"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xl bg-gray-700">
                      {game.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold">{game.name}</h3>
                </div>
                <p className="text-sm text-gray-400 flex-shrink-0">
                  {game.implemented ? 'Ready to Play' : 'Coming Soon'}
                </p>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage; 