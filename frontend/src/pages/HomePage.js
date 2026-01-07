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
      <h1 className="text-3xl font-bold mb-8 text-center">Arcade Games</h1>
      
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
    </div>
  );
};

export default HomePage; 