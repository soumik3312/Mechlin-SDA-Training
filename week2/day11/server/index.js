const app = require('./app');

const {
  cacheService,
} = require('../middleware/caching');

const PORT = Number(process.env.PORT) || 3001;

async function startServer() {
  try {
    await cacheService.connect();

    const server = app.listen(PORT, () => {
      console.log(
        `Day 11 REST API running on port ${PORT}`
      );

      console.log(
        `Environment: ${
          process.env.NODE_ENV || 'development'
        }`
      );

      console.log(
        `API Base URL: http://localhost:${PORT}/api/v1`
      );

      console.log(
        'Redis cache: connected'
      );
    });

    const gracefulShutdown = async (signal) => {
      console.log(
        `${signal} received. Shutting down gracefully...`
      );

      server.close(async () => {
        await cacheService
          .disconnect()
          .catch(() => {});

        console.log(
          'HTTP server closed'
        );

        process.exit(0);
      });
    };

    process.on('SIGTERM', () =>
      gracefulShutdown('SIGTERM')
    );

    process.on('SIGINT', () =>
      gracefulShutdown('SIGINT')
    );
  } catch (error) {
    console.error(
      'Server startup failed:',
      error.message
    );

    await cacheService
      .disconnect()
      .catch(() => {});

    process.exit(1);
  }
}

startServer();