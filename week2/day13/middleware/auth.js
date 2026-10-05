const jwt = require('jsonwebtoken');

const User = require('../models/User');
const {
  AppError
} = require('./errorHandler');

class AuthService {
  constructor() {
    this.jwtSecret =
      process.env.JWT_SECRET ||
      'day13-development-secret';

    this.jwtExpiresIn =
      process.env.JWT_EXPIRES_IN ||
      '15m';

    this.refreshTokenExpiresIn =
      process.env.REFRESH_TOKEN_EXPIRES_IN ||
      '30d';
  }

  async generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(
      payload,
      this.jwtSecret,
      {
        expiresIn: this.jwtExpiresIn,
        issuer: 'sda-training-api',
        audience: 'sda-training-client'
      }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      this.jwtSecret,
      {
        expiresIn: this.refreshTokenExpiresIn,
        issuer: 'sda-training-api',
        audience: 'sda-training-client'
      }
    );

    return {
      accessToken,
      refreshToken
    };
  }

  async verifyToken(token) {
    try {
      return jwt.verify(
        token,
        this.jwtSecret,
        {
          issuer: 'sda-training-api',
          audience: 'sda-training-client'
        }
      );
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError(
          'Token expired',
          401,
          'TOKEN_EXPIRED'
        );
      }

      throw new AppError(
        'Invalid token',
        401,
        'INVALID_TOKEN'
      );
    }
  }
}

const authService = new AuthService();

async function authenticate(req, res, next) {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith('Bearer ')
    ) {
      throw new AppError(
        'Access token is required',
        401,
        'TOKEN_REQUIRED'
      );
    }

    const token =
      authorization.substring(7).trim();

    const decoded =
      await authService.verifyToken(token);

    const user =
      User.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw new AppError(
        'User not found or inactive',
        401,
        'USER_NOT_FOUND'
      );
    }

    req.user = User.sanitizeUser(user);
    req.userRecord = user;

    next();
  } catch (error) {
    next(error);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(
          'Authentication required',
          401,
          'AUTHENTICATION_REQUIRED'
        )
      );
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'Insufficient permissions',
          403,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
}

module.exports = {
  authService,
  authenticate,
  authorize
};