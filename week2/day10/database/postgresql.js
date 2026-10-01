const { Pool } = require('pg');

class PostgreSQLConnection {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const password = process.env.POSTGRES_PASSWORD;

      if (!password) {
        throw new Error(
          'POSTGRES_PASSWORD environment variable is not set'
        );
      }

      this.pool = new Pool({
        user: process.env.POSTGRES_USER || 'postgres',
        host: process.env.POSTGRES_HOST || 'localhost',
        database: process.env.POSTGRES_DB || 'sda_training',
        password,
        port: Number(process.env.POSTGRES_PORT) || 5432,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      const client = await this.pool.connect();

      await client.query('SELECT NOW()');

      client.release();

      this.isConnected = true;

      console.log('PostgreSQL connected successfully');

      this.pool.on('error', (error) => {
        console.error('PostgreSQL pool error:', error);
        this.isConnected = false;
      });
    } catch (error) {
      console.error('PostgreSQL connection failed:', error);

      if (this.pool) {
        await this.pool.end().catch(() => {});
        this.pool = null;
      }

      this.isConnected = false;

      throw error;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();

      this.pool = null;
      this.isConnected = false;

      console.log('PostgreSQL disconnected');
    }
  }

  async query(text, params = []) {
    if (!this.pool) {
      throw new Error('PostgreSQL connection is not initialized');
    }

    const start = Date.now();

    try {
      const result = await this.pool.query(text, params);

      const duration = Date.now() - start;

      console.log('PostgreSQL query executed', {
        duration,
        rows: result.rowCount,
      });

      return result;
    } catch (error) {
      console.error('PostgreSQL query failed:', error);
      throw error;
    }
  }

  async getClient() {
    if (!this.pool) {
      throw new Error('PostgreSQL connection is not initialized');
    }

    return this.pool.connect();
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      totalCount: this.pool?.totalCount || 0,
      idleCount: this.pool?.idleCount || 0,
      waitingCount: this.pool?.waitingCount || 0,
    };
  }
}

module.exports = new PostgreSQLConnection();