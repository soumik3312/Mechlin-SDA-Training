const jwt = require('jsonwebtoken');

function createAuthMiddleware(secret) {
  return function authenticate(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    try {
      req.user = jwt.verify(token, secret);
      return next();
    } catch {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired access token.'
      });
    }
  };
}

module.exports = { createAuthMiddleware };