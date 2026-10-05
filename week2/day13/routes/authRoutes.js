const express = require('express');

const User = require('../models/User');

const {
  authService,
  authenticate
} = require('../middleware/auth');

const {
  AppError
} = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a user account and return JWT access and refresh tokens.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid registration data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', async (req, res, next) => {
  try {
    const {
      name,
      email,
      password
    } = req.body;

    if (!name || !email || !password) {
      throw new AppError(
        'Name, email and password are required',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (password.length < 8) {
      throw new AppError(
        'Password must be at least 8 characters',
        400,
        'PASSWORD_VALIDATION_ERROR'
      );
    }

    const existingUser =
      User.findByEmail(email);

    if (existingUser) {
      throw new AppError(
        'User already exists',
        400,
        'USER_ALREADY_EXISTS'
      );
    }

    const user =
      await User.createUser({
        name,
        email,
        password,
        role: 'user'
      });

    const tokens =
      await authService.generateTokens(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        ...tokens
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login
 *     description: Authenticate a user and return JWT access and refresh tokens.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res, next) => {
  try {
    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      throw new AppError(
        'Email and password are required',
        400,
        'VALIDATION_ERROR'
      );
    }

    const user =
      User.findByEmail(email);

    if (!user || !user.isActive) {
      throw new AppError(
        'Invalid credentials',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    const valid =
      await User.comparePassword(
        password,
        user.password
      );

    if (!valid) {
      throw new AppError(
        'Invalid credentials',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    const safeUser =
      User.sanitizeUser(user);

    const tokens =
      await authService.generateTokens(
        safeUser
      );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: safeUser,
        ...tokens
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const {
      refreshToken
    } = req.body;

    if (!refreshToken) {
      throw new AppError(
        'Refresh token is required',
        400,
        'REFRESH_TOKEN_REQUIRED'
      );
    }

    const decoded =
      await authService.verifyToken(
        refreshToken
      );

    if (decoded.type !== 'refresh') {
      throw new AppError(
        'Invalid refresh token',
        401,
        'INVALID_REFRESH_TOKEN'
      );
    }

    const user =
      User.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw new AppError(
        'User not found or inactive',
        401,
        'USER_NOT_FOUND'
      );
    }

    const tokens =
      await authService.generateTokens(
        User.sanitizeUser(user)
      );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Authentication required
 */
router.post(
  '/logout',
  authenticate,
  (req, res) => {
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  }
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get(
  '/me',
  authenticate,
  (req, res) => {
    res.json({
      success: true,
      data: req.user
    });
  }
);

module.exports = router;