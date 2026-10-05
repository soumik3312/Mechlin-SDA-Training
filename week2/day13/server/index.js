const app = require('./app');

const PORT =
  Number(process.env.PORT) || 3003;

const server =
  app.listen(PORT, () => {
    console.log(
      `Day 13 API running on port ${PORT}`
    );

    console.log(
      `API Base URL: http://localhost:${PORT}/api/v1`
    );

    console.log(
      `Swagger UI: http://localhost:${PORT}/api/v1/docs/`
    );

    console.log(
      `Swagger JSON: http://localhost:${PORT}/api/v1/docs/swagger.json`
    );
  });

function gracefulShutdown(signal) {
  console.log(
    `${signal} received. Shutting down gracefully...`
  );

  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
}

process.on(
  'SIGTERM',
  () => gracefulShutdown('SIGTERM')
);

process.on(
  'SIGINT',
  () => gracefulShutdown('SIGINT')
);