function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = Number.isInteger(error.status) ? error.status : 500;

  if (status >= 500) {
    req.log?.error?.(error);
    console.error(error);
  }

  return res.status(status).json({
    success: false,
    error: status >= 500 ? 'An unexpected server error occurred.' : error.message
  });
}

module.exports = { errorHandler };