# Arcade Games

A collection of classic and strategic games implemented with React on the frontend and Node.js on the backend.

## Games

0. Towers of Hanoi (normal and advanced) - **Implemented**
1. Connect4 (AI) - Coming Soon
2. Sudoku - Coming Soon
3. Ultimate Tic Tac Toe - Coming Soon
4. Banagrams Solver - Coming Soon
5. Chess (AI) - Coming Soon
6. Tetris - Coming Soon
7. Snake - Coming Soon
8. Pong - Coming Soon
9. Hashiwokakero - Coming Soon

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
