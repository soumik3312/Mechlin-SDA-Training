require('dotenv').config();

const http = require('node:http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const { createApp } = require('./app');

const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || '0.0.0.0';
const jwtSecret =
  process.env.JWT_SECRET ||
  'local-development-secret-change-before-deployment';

const app = createApp();
const server = http.createServer(app);

const allowedOrigins = (
  process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:3000'
)
  .split(',')
  .map((item) => item.trim());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication required.'));
  }

  try {
    socket.user = jwt.verify(token, jwtSecret);
    return next();
  } catch {
    return next(new Error('Invalid or expired socket token.'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.user.id}`);
  console.log(`Authenticated WebSocket connected: ${socket.user.id}`);

  socket.on('disconnect', () => {
    console.log(`WebSocket disconnected: ${socket.user.id}`);
  });
});

server.listen(port, host, () => {
  console.log(`SDA Capstone API listening on http://${host}:${port}`);
  console.log('Health endpoint: /health');
  console.log('AI gateway:', process.env.AI_GATEWAY_URL || 'http://127.0.0.1:5003');
});

function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully.`);

  server.close(() => {
    io.close(() => {
      console.log('SDA Capstone API stopped.');
      process.exit(0);
    });
  });

  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));