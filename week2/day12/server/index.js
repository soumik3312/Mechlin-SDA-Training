const mongoose = require('mongoose');
const app = require('./app');

const PORT = Number(process.env.PORT) || 3002;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/sda_training';

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });

    console.log('MongoDB connected successfully');

    const server = app.listen(PORT, () => {
      console.log(`Day 12 Authentication API running on port ${PORT}`);
      console.log(`API Base URL: http://localhost:${PORT}/api/v1/auth`);
      console.log('JWT authentication: enabled');
      console.log('OAuth2 strategies: configured when credentials are provided');
    });

    const gracefulShutdown = async (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        await mongoose.connection.close().catch(() => {});
        console.log('MongoDB connection closed');
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Server startup failed:', error.message);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
}

startServer();