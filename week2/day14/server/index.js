const app =
  require('./app');

const PORT =
  Number(process.env.PORT) ||
  3004;

const server =
  app.listen(
    PORT,
    () => {
      console.log(
        `Day 14 Integration API running on port ${PORT}`
      );

      console.log(
        `API Base URL: http://localhost:${PORT}/api/v1`
      );

      console.log(
        `Health: http://localhost:${PORT}/health`
      );

      console.log(
        `Metrics: http://localhost:${PORT}/metrics`
      );
    }
  );

function gracefulShutdown(
  signal
) {
  console.log(
    `${signal} received. Shutting down gracefully...`
  );

  server.close(() => {
    console.log(
      'HTTP server closed'
    );

    process.exit(0);
  });
}

process.on(
  'SIGTERM',
  () =>
    gracefulShutdown('SIGTERM')
);

process.on(
  'SIGINT',
  () =>
    gracefulShutdown('SIGINT')
);