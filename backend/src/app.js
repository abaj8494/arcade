/**
 * Express app configuration (separated for testing)
 */
const express = require('express');
const cors = require('cors');
const gameRoutes = require('./routes/gameRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: ['https://arcade.abaj.ai', 'http://arcade.abaj.ai', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/games', gameRoutes);

module.exports = app;
