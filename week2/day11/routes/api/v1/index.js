const express = require('express');

const router = express.Router();

const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const orderRoutes = require('./orderRoutes');
const analyticsRoutes =
  require('./analyticsRoutes');

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'SDA Training API',
      version: '1.0.0',
      description:
        'REST API demonstrating Day 11 best practices',

      endpoints: {
        users: '/api/v1/users',
        products: '/api/v1/products',
        orders: '/api/v1/orders',
        analytics: '/api/v1/analytics',
      },

      documentation: '/api/v1/docs',
      status: 'operational',
    },
  });
});

router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;