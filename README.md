# Arcade Games

A collection of classic and strategic games implemented with React on the frontend and Node.js on the backend.

## Games

| Game | Features | Status |
|------|----------|--------|
| Towers of Hanoi | Normal and advanced modes | Implemented |
| Tic-Tac-Toe | 2-player mode | Implemented |
| Connect 4 | 2-player + AI (minimax) | Implemented |
| Sudoku | Puzzle generator + solver | Implemented |
| Ultimate Tic-Tac-Toe | 2-player mode | Implemented |
| Chess | 2-player + AI (minimax with alpha-beta) | Implemented |
| Tetris | Classic gameplay with levels | Implemented |
| Snake | Arrow key controls | Implemented |
| Pong | 2-player + AI modes | Implemented |
| Hashiwokakero | Bridges puzzle with solver | Implemented |
| Knight's Tour | Warnsdorff algorithm solver | Implemented |
| Game of Life | Conway's cellular automaton | Implemented |
| Rock Paper Scissors | vs Computer with streaks | Implemented |
| Sydney Train Game | Make 10 from 4 digits puzzle | Implemented |
| Peg Solitaire | British + European boards | Implemented |
| Bananagrams Solver | Word puzzle solver | Coming Soon |

## Tech Stack

- **Frontend**: React, Tailwind CSS, Framer Motion, Zustand
- **Backend**: Node.js, Express, PM2

## Setup Instructions

### Backend

```bash
cd backend
npm install
npm start
```

Or to run with PM2:

```bash
cd backend
npm install
npx pm2 start ecosystem.config.js
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Production Build

```bash
# Build frontend
cd frontend
npm run build

# Set backend to production
cd ../backend
NODE_ENV=production npx pm2 start ecosystem.config.js
```

## Features

- Mobile responsive design
- Game algorithms implemented on the backend
- Interactive animations
- Customizable game settings

## Deployment

For deployment on a server, the backend serves the static frontend files when in production mode.
