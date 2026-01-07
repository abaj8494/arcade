import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const CHOICES = ['rock', 'paper', 'scissors'];

const CHOICE_EMOJIS = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️',
};

const OUTCOMES = {
  rock: { beats: 'scissors', losesTo: 'paper' },
  paper: { beats: 'rock', losesTo: 'scissors' },
  scissors: { beats: 'paper', losesTo: 'rock' },
};

const RockPaperScissors = () => {
  const [playerChoice, setPlayerChoice] = useState(null);
  const [computerChoice, setComputerChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [scores, setScores] = useState({ player: 0, computer: 0, ties: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [streak, setStreak] = useState({ count: 0, type: null });
  const [history, setHistory] = useState([]);

  const getComputerChoice = useCallback(() => {
    return CHOICES[Math.floor(Math.random() * CHOICES.length)];
  }, []);

  const determineWinner = useCallback((player, computer) => {
    if (player === computer) return 'tie';
    if (OUTCOMES[player].beats === computer) return 'win';
    return 'lose';
  }, []);

  const play = useCallback((choice) => {
    if (isAnimating) return;

    setIsAnimating(true);
    setPlayerChoice(null);
    setComputerChoice(null);
    setResult(null);

    // Animate countdown
    setTimeout(() => {
      const computer = getComputerChoice();
      const outcome = determineWinner(choice, computer);

      setPlayerChoice(choice);
      setComputerChoice(computer);
      setResult(outcome);

      // Update scores
      setScores(prev => ({
        ...prev,
        player: outcome === 'win' ? prev.player + 1 : prev.player,
        computer: outcome === 'lose' ? prev.computer + 1 : prev.computer,
        ties: outcome === 'tie' ? prev.ties + 1 : prev.ties,
      }));

      // Update streak
      setStreak(prev => {
        if (outcome === 'tie') {
          return { count: 0, type: null };
        }
        if (prev.type === outcome) {
          return { count: prev.count + 1, type: outcome };
        }
        return { count: 1, type: outcome };
      });

      // Update history
      setHistory(prev => [
        { player: choice, computer, result: outcome },
        ...prev.slice(0, 9)
      ]);

      setIsAnimating(false);
    }, 600);
  }, [isAnimating, getComputerChoice, determineWinner]);

  const resetScores = () => {
    setScores({ player: 0, computer: 0, ties: 0 });
    setPlayerChoice(null);
    setComputerChoice(null);
    setResult(null);
    setStreak({ count: 0, type: null });
    setHistory([]);
  };

  const getResultText = () => {
    if (!result) return 'Choose your weapon!';
    if (result === 'tie') return "It's a tie!";
    if (result === 'win') return 'You win!';
    return 'You lose!';
  };

  const getResultColour = () => {
    if (!result) return 'text-gray-400';
    if (result === 'tie') return 'text-yellow-400';
    if (result === 'win') return 'text-green-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">Rock Paper Scissors</h1>

      {/* Scoreboard */}
      <div className="mb-6 p-4 bg-surface rounded-lg">
        <div className="flex gap-8 text-center">
          <div>
            <div className="text-blue-400 font-bold">You</div>
            <div className="text-3xl">{scores.player}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Ties</div>
            <div className="text-2xl">{scores.ties}</div>
          </div>
          <div>
            <div className="text-red-400 font-bold">Computer</div>
            <div className="text-3xl">{scores.computer}</div>
          </div>
        </div>
      </div>

      {/* Streak indicator */}
      {streak.count >= 2 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`mb-4 px-4 py-2 rounded-full text-sm font-bold ${
            streak.type === 'win' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {streak.count} {streak.type === 'win' ? 'Win' : 'Loss'} Streak!
        </motion.div>
      )}

      {/* Battle Arena */}
      <div className="flex items-center gap-8 mb-8">
        {/* Player side */}
        <div className="text-center">
          <div className="text-gray-400 mb-2">You</div>
          <div className="w-32 h-32 bg-surface rounded-xl flex items-center justify-center">
            <AnimatePresence mode="wait">
              {playerChoice ? (
                <motion.span
                  key={playerChoice}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="text-6xl"
                >
                  {CHOICE_EMOJIS[playerChoice]}
                </motion.span>
              ) : isAnimating ? (
                <motion.span
                  key="animating"
                  animate={{ rotate: [0, 360] }}
                  transition={{ repeat: Infinity, duration: 0.3 }}
                  className="text-4xl"
                >
                  ❓
                </motion.span>
              ) : (
                <span className="text-4xl text-gray-600">?</span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* VS */}
        <div className="text-2xl font-bold text-gray-500">VS</div>

        {/* Computer side */}
        <div className="text-center">
          <div className="text-gray-400 mb-2">Computer</div>
          <div className="w-32 h-32 bg-surface rounded-xl flex items-center justify-center">
            <AnimatePresence mode="wait">
              {computerChoice ? (
                <motion.span
                  key={computerChoice}
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="text-6xl"
                >
                  {CHOICE_EMOJIS[computerChoice]}
                </motion.span>
              ) : isAnimating ? (
                <motion.span
                  key="animating"
                  animate={{ rotate: [0, -360] }}
                  transition={{ repeat: Infinity, duration: 0.3 }}
                  className="text-4xl"
                >
                  ❓
                </motion.span>
              ) : (
                <span className="text-4xl text-gray-600">?</span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Result */}
      <motion.div
        key={result}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-2xl font-bold mb-6 ${getResultColour()}`}
      >
        {getResultText()}
      </motion.div>

      {/* Choice buttons */}
      <div className="flex gap-4 mb-6">
        {CHOICES.map(choice => (
          <motion.button
            key={choice}
            onClick={() => play(choice)}
            disabled={isAnimating}
            className="w-24 h-24 bg-surface rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-gray-600 transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-4xl">{CHOICE_EMOJIS[choice]}</span>
            <span className="text-xs text-gray-400 capitalize">{choice}</span>
          </motion.button>
        ))}
      </div>

      {/* Reset button */}
      <button
        onClick={resetScores}
        className="btn bg-red-500 hover:bg-red-600 mb-6"
      >
        Reset Scores
      </button>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-surface p-4 rounded-lg">
          <h3 className="text-white font-semibold mb-2 text-center">Recent Games</h3>
          <div className="flex gap-2 flex-wrap justify-center">
            {history.map((game, idx) => (
              <div
                key={idx}
                className={`px-3 py-1 rounded text-sm ${
                  game.result === 'win' ? 'bg-green-600/50' :
                  game.result === 'lose' ? 'bg-red-600/50' :
                  'bg-gray-600/50'
                }`}
              >
                {CHOICE_EMOJIS[game.player]} vs {CHOICE_EMOJIS[game.computer]}
              </div>
            ))}
          </div>
        </div>
      )}

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default RockPaperScissors;
