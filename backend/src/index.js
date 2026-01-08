const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const { initWebSocket } = require('./wireless');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['https://arcade.abaj.ai', 'http://arcade.abaj.ai', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Routes
const gameRoutes = require('./routes/gameRoutes');
app.use('/api/games', gameRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build', 'index.html'));
  });
}

// Create HTTP server and attach WebSocket
const server = http.createServer(app);
initWebSocket(server);

// Start server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 