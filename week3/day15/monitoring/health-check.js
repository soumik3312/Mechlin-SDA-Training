// week3/day15/monitoring/health-check.js

const healthCheck = {
  async checkDatabase() {
    try {
      const mongoose = require('mongoose');
      const connection = mongoose.connection;

      return {
        status:
          connection.readyState === 1
            ? 'healthy'
            : 'unhealthy',

        message:
          connection.readyState === 1
            ? 'Connected'
            : 'Disconnected',

        details: {
          host: connection.host,
          port: connection.port,
          name: connection.name,
          readyState: connection.readyState,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: {
          error: error.stack,
        },
      };
    }
  },

  async checkRedis() {
    let client;

    try {
      const redis = require('redis');

      client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      await client.connect();
      await client.ping();

      return {
        status: 'healthy',
        message: 'Connected',
        details: {
          url: process.env.REDIS_URL || 'redis://localhost:6379',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: {
          error: error.stack,
        },
      };
    } finally {
      if (client) {
        try {
          if (client.isOpen) {
            await client.quit();
          }
        } catch (_) {
          // Ignore cleanup errors.
        }
      }
    }
  },

  async checkPostgreSQL() {
    let pool;

    try {
      const { Pool } = require('pg');

      pool = new Pool({
        connectionString:
          process.env.POSTGRES_URL ||
          'postgresql://postgres:password@localhost:5432/sda_training',
      });

      const client = await pool.connect();

      await client.query('SELECT NOW()');

      client.release();

      return {
        status: 'healthy',
        message: 'Connected',
        details: {
          url:
            process.env.POSTGRES_URL ||
            'postgresql://postgres:password@localhost:5432/sda_training',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        details: {
          error: error.stack,
        },
      };
    } finally {
      if (pool) {
        try {
          await pool.end();
        } catch (_) {
          // Ignore cleanup errors.
        }
      }
    }
  },

  async getSystemInfo() {
    const os = require('os');
    const processModule = require('process');

    return {
      status: 'healthy',

      uptime: processModule.uptime(),

      memory: processModule.memoryUsage(),

      cpu: {
        loadavg: os.loadavg(),
        cpus: os.cpus().length,
      },

      platform: os.platform(),

      arch: os.arch(),

      nodeVersion: processModule.version,
    };
  },

  async performHealthCheck() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkPostgreSQL(),
      this.getSystemInfo(),
    ]);

    const results = {
      database:
        checks[0].status === 'fulfilled'
          ? checks[0].value
          : {
              status: 'unhealthy',
              message: checks[0].reason?.message || 'Unknown error',
            },

      redis:
        checks[1].status === 'fulfilled'
          ? checks[1].value
          : {
              status: 'unhealthy',
              message: checks[1].reason?.message || 'Unknown error',
            },

      postgresql:
        checks[2].status === 'fulfilled'
          ? checks[2].value
          : {
              status: 'unhealthy',
              message: checks[2].reason?.message || 'Unknown error',
            },

      system:
        checks[3].status === 'fulfilled'
          ? checks[3].value
          : {
              status: 'unhealthy',
              message: checks[3].reason?.message || 'Unknown error',
            },
    };

    const overallStatus = Object.values(results).every(
      (check) => check.status === 'healthy'
    )
      ? 'healthy'
      : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results,
    };
  },
};

module.exports = healthCheck;