const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(8).max(128).required()
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().max(254).required(),
  password: Joi.string().min(8).max(128).required()
});

function createAuthRouter({ store, jwtSecret, jwtExpiresIn }) {
  const router = express.Router();

  router.post('/register', async (req, res, next) => {
    try {
      const { error, value } = registerSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const email = value.email.toLowerCase();
      const existing = await store.findUserByEmail(email);

      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists.'
        });
      }

      const passwordHash = await bcrypt.hash(value.password, 12);
      const user = await store.createUser({
        name: value.name,
        email,
        passwordHash
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        jwtSecret,
        { expiresIn: jwtExpiresIn }
      );

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const { error, value } = loginSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const email = value.email.toLowerCase();
      const user = await store.findUserByEmail(email);

      if (!user || !(await bcrypt.compare(value.password, user.passwordHash))) {
        return res.status(401).json({
          success: false,
          error: 'Email or password is incorrect.'
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        jwtSecret,
        { expiresIn: jwtExpiresIn }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createAuthRouter };