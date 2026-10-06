const jwt = require('jsonwebtoken');

const {
  findUserById,
  sanitizeUser
} = require('../models/store');

const {
  AppError
} = require('./errorHandler');

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'day14-development-secret';

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN ||
        '15m',
      issuer:
        'sda-training-api',
      audience:
        'sda-training-client'
    }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(
      token,
      JWT_SECRET,
      {
        issuer:
          'sda-training-api',
        audience:
          'sda-training-client'
      }
    );
  } catch (error) {
    throw new AppError(
      'Invalid or expired token',
      401,
      'INVALID_TOKEN'
    );
  }
}

function authenticate(
  req,
  res,
  next
) {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith(
        'Bearer '
      )
    ) {
      throw new AppError(
        'Access token is required',
        401,
        'TOKEN_REQUIRED'
      );
    }

    const token =
      authorization
        .substring(7)
        .trim();

    const decoded =
      verifyToken(token);

    const user =
      findUserById(
        decoded.userId
      );

    if (!user || !user.isActive) {
      throw new AppError(
        'User not found or inactive',
        401,
        'USER_NOT_FOUND'
      );
    }

    req.user =
      sanitizeUser(user);

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate
};