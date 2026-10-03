const redis = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries >= 10) {
              return new Error(
                'Redis retry limit exceeded'
              );
            }

            return Math.min(retries * 200, 3000);
          },
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('Redis connected successfully');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        console.error('Redis connection error:', error.message);
      });

      this.client.on('end', () => {
        this.isConnected = false;
      });

      await this.client.connect();

      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;

      if (this.client) {
        try {
          await this.client.quit();
        } catch (_) {}
      }

      this.client = null;

      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      try {
        if (this.client.isOpen) {
          await this.client.quit();
        }
      } catch (_) {}

      this.client = null;
      this.isConnected = false;

      console.log('Redis disconnected');
    }
  }

  async get(key) {
    try {
      if (!this.isConnected || !this.client) {
        return null;
      }

      const value = await this.client.get(key);

      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error.message);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      await this.client.setEx(
        key,
        ttl,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.error('Redis set error:', error.message);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      await this.client.del(key);

      return true;
    } catch (error) {
      console.error('Redis delete error:', error.message);
      return false;
    }
  }

  async flush() {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      await this.client.flushAll();

      return true;
    } catch (error) {
      console.error('Redis flush error:', error.message);
      return false;
    }
  }

  generateKey(prefix, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join('|');

    return sortedParams
      ? `${prefix}:${sortedParams}`
      : prefix;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isOpen: this.client?.isOpen || false,
    };
  }
}

const cacheService = new CacheService();

const cache = (ttl = 3600, keyGenerator = null) => {
  return async (req, res, next) => {
    try {
      const cacheKey = keyGenerator
        ? keyGenerator(req)
        : cacheService.generateKey(
            req.path,
            req.query
          );

      const cachedData = await cacheService.get(cacheKey);

      if (cachedData !== null) {
        res.set('X-Cache', 'HIT');

        return res.json(cachedData);
      }

      const originalJson = res.json.bind(res);

      res.json = (data) => {
        void cacheService.set(
          cacheKey,
          data,
          ttl
        );

        res.set('X-Cache', 'MISS');

        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error(
        'Cache middleware error:',
        error.message
      );

      next();
    }
  };
};

module.exports = {
  CacheService,
  cacheService,
  cache,
};