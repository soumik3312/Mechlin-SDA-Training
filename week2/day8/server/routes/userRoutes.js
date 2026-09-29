const express = require('express');
const userService = require('../services/userService');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await userService.authenticateUser(email, password);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const result = await userService.getAllUsers(req.query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:userId', authenticate, async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:userId', authenticate, async (req, res, next) => {
  try {
    const user = await userService.updateUser(
      req.params.userId,
      req.body,
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

router.delete(
  '/:userId',
  authenticate,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const result = await userService.deleteUser(req.params.userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post('/:userId/logout', authenticate, async (req, res, next) => {
  try {
    const result = await userService.logout(req.params.userId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

