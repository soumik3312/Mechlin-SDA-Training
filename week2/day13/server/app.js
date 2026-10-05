const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');

const {
  setupSwagger
} = require('../middleware/swagger');

const errorHandler =
  require('../middleware/errorHandler');

const app = express();

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

app.use(morgan('dev'));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check API health
 *     description: Returns the health status of the Day 13 API.
 *     tags: [Documentation]
 *     security: []
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Day 13 API is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Day 13 API is healthy',
    timestamp: new Date().toISOString()
  });
});

setupSwagger(app);

app.use(
  '/api/v1/auth',
  authRoutes
);

app.use(
  '/api/v1/users',
  userRoutes
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