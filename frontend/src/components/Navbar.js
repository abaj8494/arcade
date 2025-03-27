import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-surface shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-primary hover:text-secondary">
          Arcade Games
        </Link>
        <div className="flex items-center space-x-4">
          <Link to="/" className="text-white hover:text-secondary">
            Games
          </Link>
          <a 
            href="https://github.com/yourusername/arcade" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white hover:text-secondary"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 