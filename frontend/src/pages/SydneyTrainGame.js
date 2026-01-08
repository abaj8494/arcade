import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useHelpVisibility, HelpButton } from '../hooks/useHelpVisibility';

const TARGET = 10;
const OPERATORS = ['+', '-', '*', '/', '^'];

const SydneyTrainGame = () => {
  const [digits, setDigits] = useState([]);
  const [inputDigits, setInputDigits] = useState('');
  const [solutions, setSolutions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);
  const [userExpression, setUserExpression] = useState('');
  const [userResult, setUserResult] = useState(null);
  const [streak, setStreak] = useState(0);
  const { showHelp, toggleHelp } = useHelpVisibility();

  // Generate random 4-digit number
  const generateDigits = useCallback(() => {
    const newDigits = Array(4).fill(null).map(() => Math.floor(Math.random() * 10));
    setDigits(newDigits);
    setInputDigits(newDigits.join(''));
    setSolutions([]);
    setShowSolutions(false);
    setUserExpression('');
    setUserResult(null);
  }, []);

  useEffect(() => {
    generateDigits();
  }, [generateDigits]);

  // Evaluate an expression safely
  const evaluate = useCallback((expr) => {
    try {
      // Replace ^ with ** for JavaScript
      const jsExpr = expr.replace(/\^/g, '**');
      // Use Function to evaluate (safer than eval)
      const result = Function('"use strict";return (' + jsExpr + ')')();
      if (typeof result === 'number' && isFinite(result)) {
        return result;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Recursive solver using DFS
  const solve = useCallback((nums) => {
    const found = [];

    const dfs = (arr, expr) => {
      if (arr.length === 1) {
        const result = evaluate(expr[0]);
        if (result !== null && Math.abs(result - TARGET) < 0.0001) {
          found.push(expr[0]);
        }
        return;
      }

      // Try all pairs
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const remaining = arr.filter((_, idx) => idx !== i && idx !== j);
          const a = arr[i];
          const b = arr[j];
          const exprA = expr[i];
          const exprB = expr[j];
          const remainingExpr = expr.filter((_, idx) => idx !== i && idx !== j);

          for (const op of OPERATORS) {
            // Forward operation: a op b
            const newVal1 = op === '^' ? Math.pow(a, b) :
                           op === '+' ? a + b :
                           op === '-' ? a - b :
                           op === '*' ? a * b :
                           b !== 0 ? a / b : NaN;

            if (isFinite(newVal1)) {
              const newExpr1 = `(${exprA}${op}${exprB})`;
              dfs([...remaining, newVal1], [...remainingExpr, newExpr1]);
            }

            // Reverse operation: b op a (for non-commutative ops)
            if (op === '-' || op === '/' || op === '^') {
              const newVal2 = op === '^' ? Math.pow(b, a) :
                             op === '-' ? b - a :
                             a !== 0 ? b / a : NaN;

              if (isFinite(newVal2)) {
                const newExpr2 = `(${exprB}${op}${exprA})`;
                dfs([...remaining, newVal2], [...remainingExpr, newExpr2]);
              }
            }
          }
        }
      }
    };

    const nums_arr = nums.map(n => n);
    const expr_arr = nums.map(n => n.toString());
    dfs(nums_arr, expr_arr);

    // Remove duplicates and clean up expressions
    const unique = [...new Set(found)];
    return unique.slice(0, 20); // Limit to 20 solutions
  }, [evaluate]);

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setInputDigits(value);
    if (value.length === 4) {
      const newDigits = value.split('').map(Number);
      setDigits(newDigits);
      setSolutions([]);
      setShowSolutions(false);
      setUserExpression('');
      setUserResult(null);
    }
  };

  const findSolutions = () => {
    if (digits.length !== 4) return;
    setIsSearching(true);
    setTimeout(() => {
      const found = solve(digits);
      setSolutions(found);
      setShowSolutions(true);
      setIsSearching(false);
    }, 100);
  };

  const checkUserAnswer = () => {
    if (!userExpression) return;

    // Verify the expression uses exactly the given digits
    const usedDigits = userExpression.match(/\d/g) || [];
    const sortedUsed = [...usedDigits].sort().join('');
    const sortedDigits = [...digits.map(String)].sort().join('');

    if (sortedUsed !== sortedDigits) {
      setUserResult({ valid: false, message: 'Must use exactly the given digits!' });
      return;
    }

    const result = evaluate(userExpression);
    if (result === null) {
      setUserResult({ valid: false, message: 'Invalid expression!' });
    } else if (Math.abs(result - TARGET) < 0.0001) {
      setUserResult({ valid: true, message: `Correct! = ${TARGET}` });
      setStreak(s => s + 1);
    } else {
      setUserResult({ valid: false, message: `= ${result.toFixed(4)} (not ${TARGET})` });
      setStreak(0);
    }
  };

  const getHint = () => {
    if (solutions.length === 0) {
      const found = solve(digits);
      setSolutions(found);
    }
    if (solutions.length > 0) {
      alert(`Hint: Try using ${OPERATORS[Math.floor(Math.random() * OPERATORS.length)]} operator`);
    } else {
      alert('This combination might not have a solution with basic operators!');
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-4 mb-2">
        <h1 className="text-3xl font-bold">Sydney Train Game</h1>
        <HelpButton onClick={toggleHelp} isActive={showHelp} />
      </div>
      <p className="text-gray-400 mb-4">Make {TARGET} using all 4 digits</p>

      {/* Streak */}
      {streak > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-4 px-4 py-2 bg-green-600 rounded-full text-sm font-bold"
        >
          {streak} in a row!
        </motion.div>
      )}

      {/* Digit Display */}
      <div className="flex gap-4 mb-6">
        {digits.map((digit, idx) => (
          <motion.div
            key={idx}
            initial={{ rotateY: 180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="w-16 h-20 bg-yellow-500 rounded-lg flex items-center justify-center text-4xl font-bold text-black shadow-lg"
          >
            {digit}
          </motion.div>
        ))}
      </div>

      {/* Custom Input */}
      <div className="mb-4 flex gap-2 items-center">
        <span className="text-gray-400">Or enter digits:</span>
        <input
          type="text"
          value={inputDigits}
          onChange={handleInputChange}
          placeholder="1234"
          className="w-24 px-3 py-2 bg-surface border border-gray-600 rounded text-center text-xl tracking-widest"
          maxLength={4}
        />
        <button
          onClick={generateDigits}
          className="btn bg-purple-600 hover:bg-purple-500"
        >
          Random
        </button>
      </div>

      {/* User Expression Input */}
      <div className="mb-4 flex flex-col items-center gap-2">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={userExpression}
            onChange={(e) => setUserExpression(e.target.value)}
            placeholder="e.g., (6+3)*1+1"
            className="w-64 px-4 py-2 bg-surface border border-gray-600 rounded text-lg font-mono"
            onKeyDown={(e) => e.key === 'Enter' && checkUserAnswer()}
          />
          <button
            onClick={checkUserAnswer}
            className="btn btn-primary"
          >
            Check
          </button>
        </div>
        <div className="text-gray-400 text-sm">
          Operators: + - * / ^ (power)
        </div>
      </div>

      {/* User Result */}
      {userResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 p-3 rounded-lg font-semibold ${
            userResult.valid ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {userResult.message}
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={getHint}
          className="btn bg-yellow-600 hover:bg-yellow-500"
        >
          Hint
        </button>
        <button
          onClick={findSolutions}
          className="btn bg-blue-600 hover:bg-blue-500"
          disabled={isSearching || digits.length !== 4}
        >
          {isSearching ? 'Searching...' : 'Show Solutions'}
        </button>
      </div>

      {/* Solutions */}
      {showSolutions && (
        <div className="bg-surface p-4 rounded-lg max-w-md">
          <h3 className="text-white font-semibold mb-2 text-center">
            {solutions.length > 0 ? `Found ${solutions.length} solution(s):` : 'No solutions found!'}
          </h3>
          {solutions.length > 0 ? (
            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {solutions.map((sol, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 bg-gray-700 rounded font-mono text-sm"
                >
                  {sol} = {TARGET}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center">
              Try different digits or use exponentiation (^)
            </p>
          )}
        </div>
      )}

      {/* Instructions */}
      {showHelp && (
        <div className="mt-6 p-4 bg-surface rounded-lg max-w-md text-gray-400 text-sm">
          <h3 className="text-white font-semibold mb-2">How to Play:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Use all 4 digits exactly once</li>
            <li>Combine them with +, -, *, /, or ^ to make {TARGET}</li>
            <li>You can use parentheses for grouping</li>
            <li>Example: 1,2,2,5 → (5-2)*(2+1)+1 = {TARGET}</li>
            <li>Popular on Sydney trains - look at car numbers!</li>
          </ul>
        </div>
      )}

      <Link to="/" className="btn btn-secondary mt-6">
        Back to Games
      </Link>
    </div>
  );
};

export default SydneyTrainGame;
