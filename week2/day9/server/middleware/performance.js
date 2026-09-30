const performanceMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationNs = endTime - startTime;
    const durationMs = Number(durationNs) / 1_000_000;

    console.log(
      JSON.stringify({
        type: 'performance',
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${durationMs.toFixed(2)}ms`,
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      })
    );
  });

  next();
};

module.exports = performanceMiddleware;