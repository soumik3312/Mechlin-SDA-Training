const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const {
  store,
  findUserByEmail,
  findUserById,
  sanitizeUser,
  findProductById
} = require('../models/store');

const {
  generateToken,
  authenticate
} = require('../middleware/auth');

const {
  AppError
} = require('../middleware/errorHandler');

const router = express.Router();

// -------------------- AUTH --------------------

router.post(
  '/auth/register',
  async (req, res, next) => {
    try {
      const {
        name,
        email,
        password
      } = req.body;

      if (
        !name ||
        !email ||
        !password
      ) {
        throw new AppError(
          'Name, email and password are required',
          400,
          'VALIDATION_ERROR',
          [
            'name is required',
            'email is required',
            'password is required'
          ]
        );
      }

      if (
        !email.includes('@')
      ) {
        throw new AppError(
          'Invalid email format',
          400,
          'VALIDATION_ERROR',
          ['email must be valid']
        );
      }

      if (
        password.length < 8
      ) {
        throw new AppError(
          'Password must be at least 8 characters',
          400,
          'VALIDATION_ERROR',
          ['password must contain at least 8 characters']
        );
      }

      if (
        findUserByEmail(email)
      ) {
        throw new AppError(
          'User already exists',
          400,
          'USER_ALREADY_EXISTS'
        );
      }

      const user = {
        id:
          crypto.randomUUID(),
        name:
          name.trim(),
        email:
          email
            .trim()
            .toLowerCase(),
        password:
          await bcrypt.hash(
            password,
            12
          ),
        role: 'user',
        isActive: true,
        createdAt:
          new Date().toISOString()
      };

      store.users.push(user);

      res.status(201).json({
        success: true,
        message:
          'User registered successfully',
        data: {
          user:
            sanitizeUser(user),
          accessToken:
            generateToken(user)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/auth/login',
  async (req, res, next) => {
    try {
      const {
        email,
        password
      } = req.body;

      const user =
        findUserByEmail(email || '');

      if (!user) {
        throw new AppError(
          'Invalid credentials',
          401,
          'INVALID_CREDENTIALS'
        );
      }

      const valid =
        await bcrypt.compare(
          password || '',
          user.password
        );

      if (!valid) {
        throw new AppError(
          'Invalid credentials',
          401,
          'INVALID_CREDENTIALS'
        );
      }

      res.json({
        success: true,
        message:
          'Login successful',
        data: {
          user:
            sanitizeUser(user),
          accessToken:
            generateToken(user)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/auth/me',
  authenticate,
  (req, res) => {
    res.json({
      success: true,
      data: req.user
    });
  }
);

// -------------------- PRODUCTS --------------------

router.get(
  '/products',
  authenticate,
  (req, res) => {
    res.json({
      success: true,
      data: {
        products:
          store.products,
        total:
          store.products.length
      }
    });
  }
);

router.get(
  '/products/:id',
  authenticate,
  (req, res, next) => {
    try {
      const product =
        findProductById(
          req.params.id
        );

      if (!product) {
        throw new AppError(
          'Product not found',
          404,
          'PRODUCT_NOT_FOUND'
        );
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      next(error);
    }
  }
);

// -------------------- ORDERS --------------------

router.post(
  '/orders',
  authenticate,
  (req, res, next) => {
    try {
      const {
        items,
        shippingAddress
      } = req.body;

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        throw new AppError(
          'Order must contain at least one item',
          400,
          'VALIDATION_ERROR'
        );
      }

      if (
        !shippingAddress
      ) {
        throw new AppError(
          'Shipping address is required',
          400,
          'VALIDATION_ERROR'
        );
      }

      const normalizedItems =
        items.map((item) => {
          const product =
            findProductById(
              item.productId
            );

          if (!product) {
            throw new AppError(
              'Product not found',
              404,
              'PRODUCT_NOT_FOUND'
            );
          }

          if (
            item.quantity < 1
          ) {
            throw new AppError(
              'Quantity must be at least 1',
              400,
              'VALIDATION_ERROR'
            );
          }

          if (
            product.stock <
            item.quantity
          ) {
            throw new AppError(
              'Insufficient stock',
              400,
              'INSUFFICIENT_STOCK'
            );
          }

          return {
            productId:
              product.id,
            quantity:
              item.quantity,
            price:
              product.price
          };
        });

      const total =
        normalizedItems.reduce(
          (sum, item) =>
            sum +
            item.price *
              item.quantity,
          0
        );

      normalizedItems.forEach(
        (item) => {
          const product =
            findProductById(
              item.productId
            );

          product.stock -=
            item.quantity;
        }
      );

      const order = {
        id:
          crypto.randomUUID(),
        userId:
          req.user.id,
        items:
          normalizedItems,
        total,
        status:
          'pending',
        shippingAddress,
        createdAt:
          new Date().toISOString()
      };

      store.orders.push(order);

      res.status(201).json({
        success: true,
        message:
          'Order created successfully',
        data: order
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/orders',
  authenticate,
  (req, res) => {
    const orders =
      store.orders.filter(
        (order) =>
          order.userId ===
          req.user.id
      );

    res.json({
      success: true,
      data: {
        orders
      }
    });
  }
);

// -------------------- ANALYTICS --------------------

router.get(
  '/analytics',
  authenticate,
  (req, res) => {
    const userOrders =
      store.orders.filter(
        (order) =>
          order.userId ===
          req.user.id
      );

    const revenue =
      userOrders.reduce(
        (sum, order) =>
          sum + order.total,
        0
      );

    res.json({
      success: true,
      data: {
        timeRange:
          req.query.timeRange ||
          '30d',
        orders:
          userOrders.length,
        revenue,
        productsViewed:
          store.products.length,
        generatedAt:
          new Date().toISOString()
      }
    });
  }
);

// -------------------- USERS --------------------

router.get(
  '/users',
  authenticate,
  (req, res, next) => {
    try {
      if (
        req.user.role !==
        'admin'
      ) {
        throw new AppError(
          'Insufficient permissions',
          403,
          'INSUFFICIENT_PERMISSIONS'
        );
      }

      const users =
        store.users.map(
          sanitizeUser
        );

      res.json({
        success: true,
        data: {
          users,
          total:
            users.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/users/:id',
  authenticate,
  (req, res, next) => {
    try {
      if (
        req.user.role !==
          'admin' &&
        req.user.id !==
          req.params.id
      ) {
        throw new AppError(
          'Insufficient permissions',
          403,
          'INSUFFICIENT_PERMISSIONS'
        );
      }

      const user =
        findUserById(
          req.params.id
        );

      if (!user) {
        throw new AppError(
          'User not found',
          404,
          'USER_NOT_FOUND'
        );
      }

      res.json({
        success: true,
        data:
          sanitizeUser(user)
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;