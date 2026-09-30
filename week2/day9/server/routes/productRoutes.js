const express = require('express');

const router = express.Router();

const productService = require('../services/productService');

const {
  authMiddleware,
  authorize,
} = require('../middleware/auth');

const {
  validateProduct,
  validateId,
  validatePagination,
} = require('../middleware/validation');

// Public product listing

router.get(
  '/',
  validatePagination,
  async (req, res, next) => {
    try {
      const {
        page,
        limit,
        sort,
        order,
        category,
        search,
      } = req.query;

      const filters = {
        category,
        search,
      };

      const options = {
        page,
        limit,
        sort,
        order,
      };

      const result = await productService.getAllProducts(
        filters,
        options
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  validateId,
  async (req, res, next) => {
    try {
      const product = await productService.getProductById(
        req.params.id
      );

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Protected management routes

router.use(authMiddleware);
router.use(authorize('admin'));

router.post(
  '/',
  validateProduct,
  async (req, res, next) => {
    try {
      const product = await productService.createProduct(
        req.body
      );

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  validateId,
  validateProduct,
  async (req, res, next) => {
    try {
      const product = await productService.updateProduct(
        req.params.id,
        req.body
      );

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  validateId,
  async (req, res, next) => {
    try {
      await productService.deleteProduct(req.params.id);

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id/stock',
  validateId,
  async (req, res, next) => {
    try {
      const product = await productService.updateStock(
        req.params.id,
        req.body.stock
      );

      res.json({
        success: true,
        message: 'Product stock updated successfully',
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;