import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

const TowersOfHanoi = () => {
  const [numDiscs, setNumDiscs] = useState(3);
  const [towers, setTowers] = useState([[], [], []]);
  const [solving, setSolving] = useState(false);
  const [moves, setMoves] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const animationRef = useRef(null);
  
  // Initialize towers based on numDiscs
  useEffect(() => {
    resetTowers();
  }, [numDiscs]);
  
  // Function to reset the towers
  const resetTowers = () => {
    setSolving(false);
    setCurrentMoveIndex(0);
    setMoves([]);
    // Create initial state with all discs on the first tower
    const initialTowers = [[], [], []];
    for (let i = numDiscs; i >= 1; i--) {
      initialTowers[0].push(i);
    }
    setTowers(initialTowers);
    
    // Clear any ongoing animation
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
  };
  
  // Function to solve the Tower of Hanoi puzzle
  const solveTowers = async () => {
    if (solving) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`http://localhost:5000/api/games/towers-of-hanoi/solve?discs=${numDiscs}`);
      setMoves(response.data.moves);
      setLoading(false);
      setSolving(true);
      setCurrentMoveIndex(0);
      
      // Start the animation
      animateSolution(response.data.moves);
    } catch (err) {
      setLoading(false);
      setError('Failed to load solution. Please try again.');
    }
  };
  
  // Function to animate the solution
  const animateSolution = (solutionMoves) => {
    if (!solutionMoves.length) return;
    
    let currentIndex = 0;
    const speedFactor = 11 - numDiscs; // Adjust speed based on disc count
    const stepDelay = numDiscs <= 3 ? 800 : 400 / speedFactor; // Faster animation for more discs
    
    const performMove = () => {
      if (currentIndex >= solutionMoves.length) {
        setSolving(false);
        return;
      }
      
      const { from, to } = solutionMoves[currentIndex];
      
      setTowers((prevTowers) => {
        const newTowers = [...prevTowers];
        const disc = newTowers[from].pop();
        newTowers[to].push(disc);
        return newTowers;
      });
      
      setCurrentMoveIndex(currentIndex + 1);
      currentIndex++;
      
      // Schedule next move
      animationRef.current = setTimeout(performMove, stepDelay);
    };
    
    // Start animation
    animationRef.current = setTimeout(performMove, stepDelay);
  };
  
  // Function to handle disc count change
  const handleDiscCountChange = (e) => {
    const value = parseInt(e.target.value);
    setNumDiscs(value);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-4">Towers of Hanoi</h1>
        
        <div className="mb-8 p-4 bg-surface rounded-lg w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <label htmlFor="discSlider" className="text-lg">Number of Discs:</label>
            <span className="text-xl font-bold text-primary">{numDiscs}</span>
          </div>
          
          <input 
            id="discSlider"
            type="range" 
            min="1" 
            max="8" 
            value={numDiscs} 
            onChange={handleDiscCountChange}
            disabled={solving}
            className="w-full accent-primary"
          />
          
          <div className="mt-6 flex justify-between">
            <button 
              onClick={resetTowers} 
              className="btn bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              disabled={loading}
            >
              Reset
            </button>
            
            <button 
              onClick={solveTowers} 
              className="btn btn-primary disabled:opacity-50"
              disabled={solving || loading}
            >
              {loading ? 'Loading...' : 'Solve'}
            </button>
          </div>
          
          {error && (
            <p className="mt-4 text-red-500">{error}</p>
          )}
          
          {solving && (
            <div className="mt-4 text-center text-sm text-gray-400">
              Move {currentMoveIndex} of {moves.length}
            </div>
          )}
        </div>
        
        <div className="w-full max-w-3xl bg-surface rounded-lg p-6 mb-8">
          <div className="flex justify-around items-end h-64 relative">
            {[0, 1, 2].map((towerIndex) => (
              <div key={towerIndex} className="flex flex-col-reverse items-center">
                {/* Tower base */}
                <div className="w-4 h-40 bg-gray-600 rounded-t-sm absolute bottom-0"></div>
                
                {/* Discs */}
                <div className="w-32 h-6 bg-gray-700 rounded-md mb-2 z-10"></div>
                
                {towers[towerIndex].map((disc, i) => (
                  <motion.div
                    key={`tower-${towerIndex}-disc-${disc}`}
                    className="rounded-md mb-1 z-20"
                    style={{
                      backgroundColor: getDiscColor(disc),
                      width: `${disc * 20 + 30}px`,
                      height: '20px',
                    }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  ></motion.div>
                ))}
              </div>
            ))}
          </div>
        </div>
        
        <Link to="/" className="btn btn-secondary mt-4">
          Back to Games
        </Link>
      </div>
    </div>
  );
};

// Function to get disc color based on size
const getDiscColor = (size) => {
  const colors = [
    '#F87171', // red
    '#FBBF24', // amber
    '#34D399', // emerald
    '#60A5FA', // blue
    '#A78BFA', // violet
    '#F472B6', // pink
    '#6EE7B7', // green
    '#C4B5FD', // purple
  ];
  
  return colors[(size - 1) % colors.length];
};

export default TowersOfHanoi; 