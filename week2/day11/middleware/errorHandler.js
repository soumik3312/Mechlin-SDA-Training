function errorHandler(err, req, res, next) {
  console.error('API Error:', {
    message: err.message,
    code: err.code,
    method: req.method,
    path: req.originalUrl,
  });

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : 500;

  res.status(statusCode).json({
    success: false,
    error: {
      message:
        statusCode === 500
          ? 'Internal server error'
          : err.message,
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV !== 'production' &&
      err.details
        ? { details: err.details }
        : {}),
    },
  });
}

module.exports = {
  errorHandler,
};