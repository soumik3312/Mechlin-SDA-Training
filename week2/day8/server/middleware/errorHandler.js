const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',

  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),

  defaultMeta: {
    service: 'day8-nodejs',
  },

  transports: [
    new winston.transports.File({
      filename: 'week2/day8/logs/error.log',
      level: 'error',
    }),

    new winston.transports.File({
      filename: 'week2/day8/logs/combined.log',
    }),

    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(
      this,
      this.constructor
    );
  }
}

const errorHandler = (err, req, res, next) => {
  let error = {
    ...err,
  };

  error.message = err.message;

  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = new AppError(
      'Resource not found',
      404
    );
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error = new AppError(
      'Duplicate field value entered',
      400
    );
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(
      err.errors
    ).map((value) => value.message);

    error = new AppError(
      message,
      400
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError(
      'Invalid token',
      401
    );
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError(
      'Token expired',
      401
    );
  }

  res.status(error.statusCode || 500).json({
    success: false,

    error: {
      message:
        error.message ||
        'Server Error',

      ...(process.env.NODE_ENV ===
        'development' && {
        stack: err.stack,
      }),
    },
  });
};

module.exports = {
  errorHandler,
  AppError,
  logger,
};