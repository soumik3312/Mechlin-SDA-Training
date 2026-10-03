const express = require('express');

const {
  body,
  query,
  validationResult,
} = require('express-validator');

const {
  cache,
} = require('../../../middleware/caching');

const router = express.Router();

const products = [
  {
    id: 'product-1',
    name: 'Training Laptop',
    description:
      'Demo product for Day 11 API testing.',
    price: 79999,
    category: 'electronics',
    stock: 10,
  },
  {
    id: 'product-2',
    name: 'Mechanical Keyboard',
    description:
      'Keyboard for development and productivity.',
    price: 4999,
    category: 'accessories',
    stock: 25,
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

    query('minPrice')
      .optional()
      .isFloat({ min: 0 }),

    query('maxPrice')
      .optional()
      .isFloat({ min: 0 }),
  ],
  validate,
  cache(60),
  (req, res) => {
    const limit =
      Number(req.query.limit) || 10;

    const offset =
      Number(req.query.offset) || 0;

    const minPrice =
      req.query.minPrice !== undefined
        ? Number(req.query.minPrice)
        : null;

    const maxPrice =
      req.query.maxPrice !== undefined
        ? Number(req.query.maxPrice)
        : null;

    let result = [...products];

    if (req.query.category) {
      result = result.filter(
        (product) =>
          product.category ===
          req.query.category
      );
    }

    if (minPrice !== null) {
      result = result.filter(
        (product) =>
          product.price >= minPrice
      );
    }

    if (maxPrice !== null) {
      result = result.filter(
        (product) =>
          product.price <= maxPrice
      );
    }

    const items = result.slice(
      offset,
      offset + limit
    );

    res.set(
      'Cache-Control',
      'public, max-age=60'
    );

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        total: result.length,
        limit,
        offset,
        hasNext:
          offset + limit < result.length,
      },
    });
  }
);

router.get(
  '/:productId',
  (req, res, next) => {
    const product = products.find(
      (item) =>
        item.id === req.params.productId
    );

    if (!product) {
      const error = new Error(
        'Product not found'
      );

      error.statusCode = 404;
      error.code =
        'PRODUCT_NOT_FOUND';

      return next(error);
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  }
);

router.post(
  '/',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 }),

    body('description')
      .trim()
      .isLength({ min: 10, max: 500 }),

    body('price')
      .isFloat({ min: 0 }),

    body('category')
      .trim()
      .notEmpty(),

    body('stock')
      .isInt({ min: 0 }),
  ],
  validate,
  (req, res) => {
    const product = {
      id: `product-${Date.now()}`,
      name: req.body.name,
      description: req.body.description,
      price: Number(req.body.price),
      category: req.body.category,
      stock: Number(req.body.stock),
    };

    products.push(product);

    res.status(201).json({
      success: true,
      data: product,
    });
  }
);

router.patch(
  '/:productId',
  validate,
  (req, res, next) => {
    const product = products.find(
      (item) =>
        item.id === req.params.productId
    );

    if (!product) {
      const error = new Error(
        'Product not found'
      );

      error.statusCode = 404;
      error.code =
        'PRODUCT_NOT_FOUND';

      return next(error);
    }

    const allowedFields = [
      'name',
      'description',
      'price',
      'category',
      'stock',
    ];

    for (const field of allowedFields) {
      if (
        req.body[field] !== undefined
      ) {
        product[field] =
          req.body[field];
      }
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  }
);

router.delete(
  '/:productId',
  (req, res, next) => {
    const index = products.findIndex(
      (item) =>
        item.id === req.params.productId
    );

    if (index === -1) {
      const error = new Error(
        'Product not found'
      );

      error.statusCode = 404;
      error.code =
        'PRODUCT_NOT_FOUND';

      return next(error);
    }

    products.splice(index, 1);

    res.status(204).send();
  }
);

module.exports = router;