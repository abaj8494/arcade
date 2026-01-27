const path = require('path');
const dotenv = require('dotenv');
const http = require('http');
const { initWebSocket } = require('./wireless');

// Load environment variables
dotenv.config();

const app = require('./app');
const port = process.env.PORT || 5000;

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(require('express').static(path.join(__dirname, '../../frontend/build')));

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
