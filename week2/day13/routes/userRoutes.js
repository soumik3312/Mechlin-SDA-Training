const express = require('express');

const User = require('../models/User');

const {
  authenticate
} = require('../middleware/auth');

const {
  requirePermission
} = require('../middleware/rbac');

const {
  AppError
} = require('../middleware/errorHandler');

const router = express.Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a paginated list of users with optional filtering.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, moderator]
 *         description: Filter by role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/',
  authenticate,
  requirePermission('users:read'),
  async (req, res, next) => {
    try {
      const page = Math.max(
        Number(req.query.page) || 1,
        1
      );

      const limit = Math.min(
        Math.max(
          Number(req.query.limit) || 10,
          1
        ),
        100
      );

      const role =
        req.query.role || undefined;

      const isActive =
        req.query.isActive === undefined
          ? undefined
          : req.query.isActive === 'true';

      const search =
        req.query.search || undefined;

      const result =
        User.listUsers({
          page,
          limit,
          role,
          isActive,
          search
        });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.get(
  '/:id',
  authenticate,
  requirePermission('users:read'),
  async (req, res, next) => {
    try {
      const user =
        User.findById(req.params.id);

      if (!user) {
        throw new AppError(
          'User not found',
          404,
          'USER_NOT_FOUND'
        );
      }

      res.json({
        success: true,
        data: User.sanitizeUser(user)
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated User
 *               email:
 *                 type: string
 *                 format: email
 *                 example: updated@example.com
 *               role:
 *                 type: string
 *                 enum: [user, admin, moderator]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.put(
  '/:id',
  authenticate,
  requirePermission('users:write'),
  async (req, res, next) => {
    try {
      const user =
        User.findById(req.params.id);

      if (!user) {
        throw new AppError(
          'User not found',
          404,
          'USER_NOT_FOUND'
        );
      }

      const updated =
        User.updateUser(
          req.params.id,
          req.body
        );

      res.json({
        success: true,
        message: 'User updated successfully',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('users:delete'),
  async (req, res, next) => {
    try {
      const user =
        User.findById(req.params.id);

      if (!user) {
        throw new AppError(
          'User not found',
          404,
          'USER_NOT_FOUND'
        );
      }

      User.deleteUser(
        req.params.id
      );

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;