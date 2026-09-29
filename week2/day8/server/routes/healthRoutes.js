const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Day 8 Node.js service is healthy',
    timestamp: new Date().toISOString(),
    processId: process.pid,
    uptime: process.uptime(),
  });
});

router.get('/metrics', (req, res) => {
  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    success: true,
    metrics: {
      processId: process.pid,
      uptime: process.uptime(),
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;