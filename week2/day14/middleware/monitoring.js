const winston = require('winston');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

const logsDirectory =
  path.resolve(__dirname, '../logs');

fs.mkdirSync(logsDirectory, {
  recursive: true
});

const logger =
  winston.createLogger({
    level: 'info',

    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({
        stack: true
      }),
      winston.format.json()
    ),

    defaultMeta: {
      service: 'sda-training-api'
    },

    transports: [
      new winston.transports.File({
        filename: path.join(
          logsDirectory,
          'error.log'
        ),
        level: 'error'
      }),

      new winston.transports.File({
        filename: path.join(
          logsDirectory,
          'combined.log'
        )
      }),

      new winston.transports.Console({
        format:
          winston.format.simple()
      })
    ]
  });

class MonitoringService {
  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
  }

  recordRequest(
    req,
    res,
    duration
  ) {
    const metric = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      timestamp:
        new Date().toISOString(),
      userAgent:
        req.get('User-Agent') || null,
      ip: req.ip || null,
      userId:
        req.user?.id || null
    };

    logger.info(
      'Request processed',
      metric
    );

    this.updateMetrics(metric);
  }

  recordError(
    error,
    req
  ) {
    const errorMetric = {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      timestamp:
        new Date().toISOString(),
      userId:
        req.user?.id || null
    };

    logger.error(
      'Request error',
      errorMetric
    );
  }

  updateMetrics(metric) {
    const key =
      `${metric.method}:${metric.url}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        count: 0,
        totalDuration: 0,
        errors: 0,
        lastRequest: null
      });
    }

    const stats =
      this.metrics.get(key);

    stats.count += 1;
    stats.totalDuration +=
      metric.duration;

    stats.lastRequest =
      metric.timestamp;

    if (metric.statusCode >= 400) {
      stats.errors += 1;
    }
  }

  getMetrics() {
    const uptime =
      Date.now() - this.startTime;

    const memoryUsage =
      process.memoryUsage();

    return {
      uptime,
      memory: {
        rss: memoryUsage.rss,
        heapTotal:
          memoryUsage.heapTotal,
        heapUsed:
          memoryUsage.heapUsed,
        external:
          memoryUsage.external
      },
      requestMetrics:
        Object.fromEntries(
          this.metrics
        ),
      process: {
        pid: process.pid,
        version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  calculateErrorRate() {
    const stats =
      Array.from(
        this.metrics.values()
      );

    const totalRequests =
      stats.reduce(
        (sum, item) =>
          sum + item.count,
        0
      );

    const totalErrors =
      stats.reduce(
        (sum, item) =>
          sum + item.errors,
        0
      );

    return totalRequests > 0
      ? (totalErrors / totalRequests) * 100
      : 0;
  }

  getHealthStatus() {
    const metrics =
      this.getMetrics();

    const memoryUsagePercent =
      metrics.memory.heapTotal > 0
        ? (
            metrics.memory.heapUsed /
            metrics.memory.heapTotal
          ) * 100
        : 0;

    return {
      status:
        memoryUsagePercent > 90
          ? 'unhealthy'
          : 'healthy',

      uptime: metrics.uptime,

      memoryUsage:
        memoryUsagePercent,

      requestCount:
        Array.from(
          this.metrics.values()
        ).reduce(
          (sum, stat) =>
            sum + stat.count,
          0
        ),

      errorRate:
        this.calculateErrorRate()
    };
  }
}

const monitoringService =
  new MonitoringService();

const monitoringMiddleware =
  (req, res, next) => {
    const start =
      performance.now();

    res.on('finish', () => {
      const duration =
        performance.now() -
        start;

      monitoringService.recordRequest(
        req,
        res,
        duration
      );
    });

    res.on('error', (error) => {
      monitoringService.recordError(
        error,
        req
      );
    });

    next();
  };

const healthCheck =
  (req, res) => {
    res.json(
      monitoringService
        .getHealthStatus()
    );
  };

const metrics =
  (req, res) => {
    res.json(
      monitoringService
        .getMetrics()
    );
  };

module.exports = {
  logger,
  monitoringService,
  monitoringMiddleware,
  healthCheck,
  metrics
};