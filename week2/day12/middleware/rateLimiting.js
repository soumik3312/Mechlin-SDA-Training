const expressRateLimit = require('express-rate-limit');

const generalLimiter = expressRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  }
});

module.exports = {
  generalLimiter
};