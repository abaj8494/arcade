import React from 'react';
import { Link } from 'react-router-dom';

const GamePlaceholder = ({ name }) => {
  return (
    <div className="text-center py-12">
      <h1 className="text-3xl font-bold mb-4">{name}</h1>
      <div className="my-8 p-8 bg-surface rounded-lg max-w-md mx-auto">
        <p className="text-xl mb-6">Coming Soon!</p>
        <p className="text-gray-400 mb-8">
          This game is currently under development. Check back later!
        </p>
        <Link to="/" className="btn btn-primary">
          Back to Games
        </Link>
      </div>
    </div>
  );
};

export default GamePlaceholder; 