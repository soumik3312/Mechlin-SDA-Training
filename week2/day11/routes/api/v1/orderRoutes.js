const express = require('express');

const {
  body,
  query,
  validationResult,
} = require('express-validator');

const router = express.Router();

const orders = [
  {
    id: 'order-1',
    userId: 'user-1',
    status: 'pending',
    totalAmount: 79999,
    createdAt:
      new Date().toISOString(),
  },
];

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array(),
      },
    });
  }

  next();
};

router.get(
  '/',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }),

    query('offset')
      .optional()
      .isInt({ min: 0 }),
  ],
  validate,
  (req, res) => {
    const limit =
      Number(req.query.limit) || 10;

    const offset =
      Number(req.query.offset) || 0;

    const items = orders.slice(
      offset,
      offset + limit
    );

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        total: orders.length,
        limit,
        offset,
        hasNext:
          offset + limit < orders.length,
      },
    });
  }
);

router.post(
  '/',
  [
    body('userId')
      .trim()
      .notEmpty(),

    body('totalAmount')
      .isFloat({ min: 0 }),
  ],
  validate,
  (req, res) => {
    const order = {
      id: `order-${Date.now()}`,
      userId: req.body.userId,
      status: 'pending',
      totalAmount: Number(
        req.body.totalAmount
      ),
      createdAt:
        new Date().toISOString(),
    };

    orders.push(order);

    res.status(201).json({
      success: true,
      data: order,
    });
  }
);

router.get(
  '/:orderId',
  (req, res, next) => {
    const order = orders.find(
      (item) =>
        item.id === req.params.orderId
    );

    if (!order) {
      const error = new Error(
        'Order not found'
      );

      error.statusCode = 404;
      error.code =
        'ORDER_NOT_FOUND';

      return next(error);
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  }
);

router.patch(
  '/:orderId/status',
  [
    body('status').isIn([
      'pending',
      'confirmed',
      'shipped',
      'delivered',
      'cancelled',
    ]),
  ],
  validate,
  (req, res, next) => {
    const order = orders.find(
      (item) =>
        item.id === req.params.orderId
    );

    if (!order) {
      const error = new Error(
        'Order not found'
      );

      error.statusCode = 404;
      error.code =
        'ORDER_NOT_FOUND';

      return next(error);
    }

    order.status = req.body.status;

    res.status(200).json({
      success: true,
      data: order,
    });
  }
);

module.exports = router;