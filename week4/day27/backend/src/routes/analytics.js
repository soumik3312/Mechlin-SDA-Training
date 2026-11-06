const express = require('express');

function createAnalyticsRouter({ store, authenticate }) {
  const router = express.Router();

  router.use(authenticate);

  router.get('/', async (req, res, next) => {
    try {
      const analytics = await store.getAnalytics(req.user.id);

      return res.json({
        success: true,
        analytics,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createAnalyticsRouter };