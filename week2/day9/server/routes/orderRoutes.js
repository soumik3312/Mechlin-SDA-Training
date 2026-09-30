const express = require('express');

const router = express.Router();

const orderService = require('../services/orderService');

const {
  authMiddleware,
  authorize,
} = require('../middleware/auth');

const {
  validateOrder,
  validateId,
  validatePagination,
} = require('../middleware/validation');

// All order routes require authentication

router.use(authMiddleware);

router.post(
  '/',
  validateOrder,
  async (req, res, next) => {
    try {
      const order = await orderService.createOrder(
        req.body,
        req.user.userId
      );

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/my-orders',
  async (req, res, next) => {
    try {
      const orders = await orderService.getOrdersByUser(
        req.user.userId
      );

      res.json({
        success: true,
        data: orders,
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
      const order = await orderService.getOrderById(
        req.params.id
      );

      if (
        order.userId !== req.user.userId &&
        req.user.role !== 'admin'
      ) {
        const error = new Error(
          'You do not have permission to access this order'
        );
        error.statusCode = 403;
        throw error;
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin order routes

router.get(
  '/',
  authorize('admin'),
  validatePagination,
  async (req, res, next) => {
    try {
      const orders = await orderService.getAllOrders();

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id/status',
  authorize('admin'),
  validateId,
  async (req, res, next) => {
    try {
      const order = await orderService.updateOrderStatus(
        req.params.id,
        req.body.status
      );

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/cancel',
  validateId,
  async (req, res, next) => {
    try {
      const existingOrder =
        await orderService.getOrderById(req.params.id);

      if (
        existingOrder.userId !== req.user.userId &&
        req.user.role !== 'admin'
      ) {
        const error = new Error(
          'You do not have permission to cancel this order'
        );
        error.statusCode = 403;
        throw error;
      }

      const order = await orderService.cancelOrder(
        req.params.id
      );

      res.json({
        success: true,
        message: 'Order cancelled successfully',
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;