const express = require('express');

const {
  cache,
} = require('../../../middleware/caching');

const router = express.Router();

router.get(
  '/summary',
  cache(30),
  (req, res) => {
    res.set(
      'Cache-Control',
      'public, max-age=30'
    );

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: 1,
          active: 1,
        },

        products: {
          total: 2,
          inStock: 2,
        },

        orders: {
          total: 1,
          pending: 1,
        },

        generatedAt:
          new Date().toISOString(),
      },
    });
  }
);

router.get(
  '/health',
  (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        service: 'analytics',
        status: 'operational',
        timestamp:
          new Date().toISOString(),
      },
    });
  }
);

module.exports = router;