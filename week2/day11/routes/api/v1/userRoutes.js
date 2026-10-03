const express = require('express');

const {
  body,
  validationResult,
} = require('express-validator');

const router = express.Router();

const users = [
  {
    id: 'user-1',
    name: 'Day 11 Demo User',
    email: 'demo@example.com',
    role: 'user',
    isActive: true,
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

router.get('/', (req, res) => {
  const limit = Math.min(
    Math.max(
      Number(req.query.limit) || 10,
      1
    ),
    100
  );

  const offset = Math.max(
    Number(req.query.offset) || 0,
    0
  );

  const items = users.slice(
    offset,
    offset + limit
  );

  res.status(200).json({
    success: true,
    data: items,
    pagination: {
      total: users.length,
      limit,
      offset,
      hasNext:
        offset + limit < users.length,
    },
  });
});

router.get('/:userId', (req, res, next) => {
  const user = users.find(
    (item) =>
      item.id === req.params.userId
  );

  if (!user) {
    const error = new Error(
      'User not found'
    );

    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';

    return next(error);
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

router.post(
  '/',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage(
        'Name must be 2-50 characters'
      ),

    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage(
        'Valid email is required'
      ),
  ],
  validate,
  (req, res) => {
    const user = {
      id: `user-${Date.now()}`,
      name: req.body.name,
      email: req.body.email,
      role: 'user',
      isActive: true,
    };

    users.push(user);

    res.status(201).json({
      success: true,
      data: user,
    });
  }
);

router.patch(
  '/:userId',
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }),

    body('email')
      .optional()
      .isEmail()
      .normalizeEmail(),
  ],
  validate,
  (req, res, next) => {
    const user = users.find(
      (item) =>
        item.id === req.params.userId
    );

    if (!user) {
      const error = new Error(
        'User not found'
      );

      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';

      return next(error);
    }

    if (req.body.name !== undefined) {
      user.name = req.body.name;
    }

    if (req.body.email !== undefined) {
      user.email = req.body.email;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  }
);

router.delete('/:userId', (req, res, next) => {
  const index = users.findIndex(
    (item) =>
      item.id === req.params.userId
  );

  if (index === -1) {
    const error = new Error(
      'User not found'
    );

    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';

    return next(error);
  }

  users.splice(index, 1);

  res.status(204).send();
});

module.exports = router;