const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');

const chatSchema = Joi.object({
  message: Joi.string().trim().min(1).max(10000).required()
});

const generationSchema = Joi.object({
  content_type: Joi.string().valid(
    'article',
    'blog-post',
    'social-media',
    'email',
    'product-description'
  ).required(),
  topic: Joi.string().trim().min(2).max(500).required(),
  tone: Joi.string().valid(
    'professional',
    'casual',
    'friendly',
    'formal',
    'creative'
  ).required(),
  length: Joi.string().valid('short', 'medium', 'long').required(),
  keywords: Joi.array().items(Joi.string().max(60)).max(12).default([])
});

function createAIRouter({ store, aiService, authenticate }) {
  const router = express.Router();

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      success: false,
      error: 'Too many AI requests. Try again in a minute.'
    }
  });

  router.use(authenticate);
  router.use(aiLimiter);

  router.post('/chat', async (req, res, next) => {
    try {
      const { error, value } = chatSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const result = await aiService.chat(value.message, req.user.id);
      await store.recordEvent(req.user.id, 'chat');

      return res.json({
        success: true,
        response: result.response,
        thread_id: result.thread_id,
        agent_type: result.agent_type,
        provider: result.metadata?.provider || 'ollama',
        model: result.metadata?.model || 'mistral:latest'
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/generate', async (req, res, next) => {
    try {
      const { error, value } = generationSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const result = await aiService.generateContent(value);
      await store.recordEvent(req.user.id, 'content_generation');

      return res.json({
        success: true,
        content: result.content,
        metadata: result.metadata
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/recommendations', async (req, res, next) => {
    try {
      const schema = Joi.object({
        user_profile: Joi.object({
          interests: Joi.alternatives().try(
            Joi.array().items(Joi.string().max(60)).max(20),
            Joi.string().max(500)
          ).default([]),
          experience: Joi.string().max(60).default('beginner')
        }).default({}),
        max_recommendations: Joi.number().integer().min(1).max(8).default(5)
      });

      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.details[0].message
        });
      }

      const result = await aiService.recommendations(
        value.user_profile,
        value.max_recommendations
      );

      await store.recordEvent(req.user.id, 'recommendations');

      return res.json({
        success: true,
        recommendations: result.recommendations,
        ranking_method: result.ranking_method
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createAIRouter };