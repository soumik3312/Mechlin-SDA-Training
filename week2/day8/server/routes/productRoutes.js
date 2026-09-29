const express = require('express');
const productService = require('../services/productService');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await productService.getAllProducts(req.query);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:productId', async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.productId);
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:productId', async (req, res, next) => {
  try {
    const product = await productService.updateProduct(
      req.params.productId,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:productId', async (req, res, next) => {
  try {
    const result = await productService.deleteProduct(req.params.productId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:productId/stock', async (req, res, next) => {
  try {
    const { quantity } = req.body;

    const product = await productService.updateStock(
      req.params.productId,
      quantity,
    );

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;