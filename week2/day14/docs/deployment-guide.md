# Deployment Guide

## Production Deployment

### Prerequisites

- Node.js 18+
- MongoDB 5.0+
- PostgreSQL 13+
- Redis 6.0+
- Docker (optional)
- Nginx (optional)

> The Day 14 integration implementation uses an in-memory application store for integration testing. MongoDB, PostgreSQL, and Redis are included here as production deployment prerequisites consistent with the broader SDA architecture.

## Environment Setup

### Clone Repository

```bash
git clone https://github.com/your-org/sda-training.git
cd sda-training
```

### Install Dependencies

```bash
npm ci
```

### Environment Configuration

Create the production environment file:

```bash
cp .env.example .env
```

Configure:

```text
NODE_ENV=production
PORT=3000
JWT_SECRET=<strong-production-secret>
JWT_EXPIRES_IN=15m
MONGODB_URI=<mongodb-connection-string>
POSTGRES_URL=<postgresql-connection-string>
REDIS_URL=<redis-connection-string>
```

## Database Setup

### MongoDB

```bash
mongod --dbpath /data/db
```

### PostgreSQL

```bash
createdb sda_training
psql sda_training < migrations/init.sql
```

### Redis

```bash
redis-server
```

## Application Deployment

Install production dependencies:

```bash
npm ci --omit=dev
```

Start the application:

```bash
npm start
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Build Image

```bash
docker build -t sda-training-api .
```

### Run Container

```bash
docker run -d \
  --name sda-training-api \
  -p 3000:3000 \
  --env-file .env \
  sda-training-api
```

## Docker Compose

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://mongo:27017/sda-training
      POSTGRES_URL: postgresql://postgres:password@postgres:5432/sda_training
      REDIS_URL: redis://redis:6379
    depends_on:
      - mongo
      - postgres
      - redis

  mongo:
    image: mongo:5.0
    volumes:
      - mongo_data:/data/db

  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: sda_training
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6.0-alpine

volumes:
  mongo_data:
  postgres_data:
```

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;

        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
    }
}
```

## SSL Configuration

Install Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
```

Obtain an SSL certificate:

```bash
sudo certbot --nginx -d your-domain.com
```

## Monitoring Setup

Install PM2:

```bash
npm install -g pm2
```

Start the application:

```bash
pm2 start server/index.js --name "sda-training-api"
```

Install log rotation:

```bash
pm2 install pm2-logrotate
```

Configure startup:

```bash
pm2 startup
pm2 save
```

## Health Monitoring

Health endpoint:

```text
GET /health
```

Metrics endpoint:

```text
GET /metrics
```

The monitoring system provides:

- Uptime
- Memory usage
- Request count
- Error rate
- Request metrics
- Process information

## Backup Strategy

### MongoDB Backup

```bash
mongodump --db sda_training --out /backup/mongodb
```

### PostgreSQL Backup

```bash
pg_dump sda_training > /backup/postgresql/sda_training.sql
```

### Automated Backup Example

```bash
#!/bin/bash

DATE=$(date +%Y%m%d_%H%M%S)

mongodump \
  --db sda_training \
  --out /backup/mongodb_$DATE

pg_dump sda_training \
  > /backup/postgresql_$DATE.sql
```

## Security Checklist

- Environment variables secured
- Database connections encrypted
- API authentication configured
- API rate limiting configured
- CORS properly configured
- SSL certificate installed
- Firewall rules configured
- Regular security updates
- Backup strategy implemented
- Monitoring and alerting configured
- Log rotation configured
- Production JWT secret configured

## Deployment Verification

After deployment verify:

```text
GET /health
GET /metrics
POST /api/v1/auth/login
GET /api/v1/products
GET /api/v1/orders
GET /api/v1/analytics
```

## Rollback

Keep the previous application version available.

A rollback should:

1. Stop the current deployment.
2. Restore the previous application version.
3. Verify health.
4. Verify critical API endpoints.
5. Review application logs.
6. Confirm data consistency.

## Production Readiness

The integration review provides the following readiness areas:

```text
Application integration: PASS
Authentication: PASS
API communication: PASS
Monitoring: PASS
Logging: PASS
Health checks: PASS
Error handling: PASS
Performance validation: PASS
Security validation: PASS
Deployment documentation: PASS
```