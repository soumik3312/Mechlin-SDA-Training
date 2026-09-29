const express = require('express');
const orderService = require('../services/orderService');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.body);

    res.status(201).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await orderService.getAllOrders(req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/user/:userId', async (req, res, next) => {
  try {
    const result = await orderService.getOrdersByUser(req.params.userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:orderId', async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.orderId);

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:orderId/status', async (req, res, next) => {
  try {
    const { status } = req.body;

    const order = await orderService.updateOrderStatus(
      req.params.orderId,
      status,
    );

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:orderId/cancel', async (req, res, next) => {
  try {
    const order = await orderService.cancelOrder(req.params.orderId);

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;