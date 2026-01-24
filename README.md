# Arcade Games

A collection of classic and strategic games implemented with React on the frontend and Node.js on the backend.

## Games

| Game | Features | Status |
|------|----------|--------|
| Battleships | 2-player + AI, wireless play | Implemented |
| Brick Breaker | Classic breakout gameplay | Implemented |
| Bubble Burst | Match-3 bubble popping | Implemented |
| Chess | 2-player + AI (minimax), wireless play, hints | Implemented |
| Connect 4 | 2-player + AI (minimax), wireless play | Implemented |
| Game of Life | Conway's cellular automaton | Implemented |
| Go | 2-player + AI, wireless play, 9x9/13x13/19x19 boards | Implemented |
| Hashiwokakero | Bridges puzzle with solver | Implemented |
| Knight's Tour | Warnsdorff algorithm solver | Implemented |
| Minesweeper | Classic + leaderboards | Implemented |
| N-Queens | Puzzle solver with visualization | Implemented |
| Othello | 2-player + AI, wireless play, hints | Implemented |
| Peg Solitaire | British + European boards, AI solver | Implemented |
| Pong | 2-player + AI modes | Implemented |
| Rock Paper Scissors | vs Computer with streaks | Implemented |
| Snake | Arrow key controls | Implemented |
| Sudoku | Puzzle generator + solver | Implemented |
| Sydney Train Game | Make 10 from 4 digits puzzle | Implemented |
| Tetris | Classic gameplay with levels | Implemented |
| Tic-Tac-Toe | 2-player mode | Implemented |
| Towers of Hanoi | Normal and advanced modes | Implemented |
| Ultimate Tic-Tac-Toe | 2-player + AI, wireless play | Implemented |

## Tech Stack

- **Frontend**: React, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, PM2, Socket.IO (wireless play)

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

## Testing

Run tests with coverage:

```bash
cd frontend
npm test -- --coverage
```

### Test Coverage Summary

| Category | Coverage |
|----------|----------|
| **Test Suites** | 6 passed |
| **Tests** | 265 passed |

#### Game Logic Coverage (src/utils)

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
| **goLogic.js** | 96.73% | 90.34% | 95.65% | 97.58% |
| **othelloLogic.js** | 99.33% | 95.23% | 100% | 99.18% |
| **connect4Logic.js** | 100% | 92.15% | 100% | 100% |
| **utttLogic.js** | 89.26% | 77.34% | 95.23% | 94.02% |
| **pegSolitaireLogic.js** | 95.80% | 95.08% | 94.73% | 95.08% |
| **hashiwokakeroLogic.js** | 89.16% | 85.00% | 100% | 91.75% |
| **Overall (utils)** | 94.56% | 87.59% | 97.14% | 95.89% |

## Features

- Mobile responsive design
- Game algorithms implemented with comprehensive test coverage
- Interactive animations
- Wireless multiplayer via WebSocket
- AI opponents with multiple difficulty levels
- Customizable game settings

## Deployment

For deployment on a server, the backend serves the static frontend files when in production mode.
