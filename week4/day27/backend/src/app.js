const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { JsonStore } = require('./services/store');
const { AIService } = require('./services/aiService');
const { createAuthMiddleware } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');

const { createAuthRouter } = require('./routes/auth');
const { createTasksRouter } = require('./routes/tasks');
const { createAIRouter } = require('./routes/ai');
const { createAnalyticsRouter } = require('./routes/analytics');

function createApp(options = {}) {
  const app = express();

  const jwtSecret =
    options.jwtSecret ||
    process.env.JWT_SECRET ||
    'local-development-secret-change-before-deployment';

  if (
    process.env.NODE_ENV === 'production' &&
    jwtSecret === 'local-development-secret-change-before-deployment'
  ) {
    throw new Error('JWT_SECRET must be configured in production.');
  }

  const store = options.store || new JsonStore();
  const aiService = options.aiService || new AIService();
  const authenticate = createAuthMiddleware(jwtSecret);
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

  const allowedOrigins = (
    process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:3000'
  )
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  app.disable('x-powered-by');

  // Trust exactly one reverse proxy hop (NGINX).
  // This allows Express to identify the actual client IP safely
  // when processing forwarded requests and rate limits.
  app.set('trust proxy', 1);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  app.use(cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }

      return callback(new Error('Origin is not allowed by CORS.'));
    },
    credentials: true
  }));

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.set('store', store);
  app.set('aiService', aiService);

  app.get('/health', async (req, res, next) => {
    try {
      await store.ready;

      return res.json({
        success: true,
        status: 'healthy',
        service: 'sda-capstone-api',
        version: '1.0.0',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        storage: 'local-json',
        aiGateway: process.env.AI_GATEWAY_URL || 'http://127.0.0.1:5003'
      });
    } catch (error) {
      return next(error);
    }
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many requests. Please try again later.'
    }
  });

  app.use('/api', apiLimiter);

  app.use(
    '/api/auth',
    createAuthRouter({ store, jwtSecret, jwtExpiresIn })
  );

  app.use(
    '/api/tasks',
    createTasksRouter({ store, authenticate })
  );

  app.use(
    '/api/ai',
    createAIRouter({ store, aiService, authenticate })
  );

  app.use(
    '/api/analytics',
    createAnalyticsRouter({ store, authenticate })
  );

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'API route not found.'
    });
  });

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };