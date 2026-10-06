const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const {
  resetStore
} = require('../models/store');

const apiRoutes =
  require('../routes/apiRoutes');

const {
  monitoringMiddleware,
  healthCheck,
  metrics
} = require('../middleware/monitoring');

const errorHandler =
  require('../middleware/errorHandler');

const app = express();

resetStore();

app.use(helmet());
app.use(cors());

app.use(
  express.json({
    limit: '1mb'
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(morgan('combined'));

app.use(
  monitoringMiddleware
);

app.get(
  '/health',
  healthCheck
);

app.get(
  '/metrics',
  metrics
);

app.use(
  '/api/v1',
  apiRoutes
);

app.use(
  (req, res, next) => {
    const error =
      new Error(
        `Route not found: ${req.method} ${req.originalUrl}`
      );

    error.statusCode = 404;
    error.code =
      'ROUTE_NOT_FOUND';

    next(error);
  }
);

app.use(
  errorHandler
);

module.exports = app;