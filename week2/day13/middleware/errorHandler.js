class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  const response = {
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_SERVER_ERROR'
    }
  };

  if (err.details) {
    response.error.details = err.details;
  }

  console.error(
    `[${new Date().toISOString()}]`,
    req.method,
    req.originalUrl,
    err.message
  );

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
module.exports.AppError = AppError;