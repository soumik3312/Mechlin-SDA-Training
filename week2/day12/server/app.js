const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('../middleware/oauth');

const authRoutes = require('../routes/authRoutes');
const apiVersioning = require('../middleware/apiVersioning');
const { generalLimiter } = require('../middleware/rateLimiting');
const errorHandler = require('../middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(passport.initialize());

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Day 12 Authentication API is healthy',
    timestamp: new Date().toISOString()
  });
});

app.use(apiVersioning);

app.use(
  '/api/v1/auth',
  generalLimiter,
  authRoutes
);

app.use((req, res, next) => {
  const error = new Error(
    `Route not found: ${req.method} ${req.originalUrl}`
  );
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
});

app.use(errorHandler);

module.exports = app;