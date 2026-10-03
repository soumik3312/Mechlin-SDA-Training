const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const { apiVersioning } =
  require('../middleware/apiVersioning');

const { generalLimiter } =
  require('../middleware/rateLimiting');

const { errorHandler } =
  require('../middleware/errorHandler');

const {
  specs,
  swaggerUi,
} = require('../docs/swagger');

const apiV1Routes =
  require('../routes/api/v1');

const app = express();

app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials:
      process.env.FRONTEND_URL ? true : false,
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-API-Key',
    ],
  })
);

app.use(compression());

app.use(morgan('combined'));

app.use(
  express.json({
    limit: '1mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '1mb',
  })
);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'operational',
      service: 'sda-training-day11-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    },
  });
});

// Swagger / OpenAPI documentation
app.use(
  '/api/v1/docs',
  swaggerUi.serve,
  swaggerUi.setup(specs)
);

// API versioning
app.use(apiVersioning);

// Versioned API
app.use(
  '/api/v1',
  generalLimiter,
  apiV1Routes
);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'ROUTE_NOT_FOUND',
      path: req.originalUrl,
    },
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;