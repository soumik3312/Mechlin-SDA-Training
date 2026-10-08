# Day 16: Docker & Compose

## 🎯 Learning Objectives

- Master Docker containerization and multi-service orchestration
- Build production-ready Docker images with optimization
- Implement Docker Compose for local development
- Create multi-service applications with proper networking
- Optimize Docker performance and security

## 📚 Theory & Concepts

### Docker Fundamentals

- **Containers**: Lightweight, portable application packaging
- **Images**: Immutable templates for containers
- **Dockerfile**: Instructions for building images
- **Registry**: Storage and distribution of images
- **Networking**: Container communication and networking

### Docker Compose

- **Multi-Service**: Orchestrating multiple containers
- **Networking**: Service discovery and communication
- **Volumes**: Persistent data storage
- **Environment**: Development environment setup
- **Scaling**: Horizontal scaling of services

### Best Practices

- **Image Optimization**: Minimal image size and layers
- **Security**: Secure container configuration
- **Performance**: Optimized container performance
- **Networking**: Proper service communication
- **Monitoring**: Container health and performance

---

# 🛠️ Hands-on Tasks

## Task 1: Create Production-Ready Dockerfile

The production Dockerfile uses a multi-stage build to optimize the final image.

### Multi-stage Builds

The Dockerfile contains:

1. `base` stage for the Node.js Alpine base image.
2. `deps` stage for production dependencies.
3. `builder` stage for installing dependencies and building the application.
4. `runner` stage for running the production application.

Benefits:

- Smaller production image
- Reduced build-time dependencies
- Better layer caching
- Cleaner production runtime
- Improved security

The production container:

- Uses `node:18-alpine`
- Creates a non-root `nodejs` user
- Copies the built application
- Copies production dependencies
- Creates required `logs` and `uploads` directories
- Runs as the non-root user
- Exposes port `3000`
- Configures a Docker health check
- Starts `dist/index.js`

## Task 2: Create Docker Compose Configuration

The Docker Compose configuration provides a multi-service application environment containing:

- `app`
- `mongodb`
- `postgresql`
- `redis`
- `nginx`
- `prometheus`
- `grafana`

### Application Service

The application service:

- Builds the production Docker image
- Exposes port `3000`
- Receives environment variables
- Depends on healthy MongoDB, PostgreSQL, and Redis services
- Mounts log storage
- Mounts upload storage
- Uses an application health check
- Uses the `app-network`

### MongoDB

MongoDB provides document database storage.

- Image: `mongo:5.0`
- Port: `27017`
- Persistent volume: `mongodb_data`
- Initialization script: `scripts/mongo-init.js`
- Health check enabled

### PostgreSQL

PostgreSQL provides relational database storage.

- Image: `postgres:13`
- Port: `5432`
- Persistent volume: `postgresql_data`
- Initialization script: `scripts/postgres-init.sql`
- Health check enabled

### Redis

Redis provides caching and in-memory data storage.

- Image: `redis:6.0-alpine`
- Port: `6379`
- Persistent volume: `redis_data`
- Health check enabled

### Nginx

Nginx provides reverse-proxy infrastructure.

- HTTP port: `80`
- HTTPS port: `443`
- API reverse proxy
- Authentication rate limiting
- Gzip compression
- Security headers
- Health endpoint
- Application upstream

### Prometheus

Prometheus provides monitoring and metrics collection.

- Port: `9090`
- Persistent volume: `prometheus_data`
- Application scraping
- Nginx scraping
- MongoDB scraping
- PostgreSQL scraping
- Redis scraping

### Grafana

Grafana provides monitoring visualization.

- Port: `3001`
- Persistent volume: `grafana_data`
- Depends on Prometheus

## Task 3: Create Nginx Configuration

The Nginx configuration provides:

- Reverse proxy
- Application upstream
- API routing
- Authentication rate limiting
- Gzip compression
- Health endpoint
- Static file handling
- Security headers
- HTTP configuration
- HTTPS configuration

The upstream application is:

```text
app:3000
```

General API rate limiting:

```text
10 requests/second
```

Login rate limiting:

```text
5 requests/minute
```

## Task 4: Create Monitoring Configuration

Prometheus is configured to monitor:

- Prometheus
- Application
- Nginx
- MongoDB
- PostgreSQL
- Redis

Global scrape interval:

```text
15 seconds
```

Application scrape interval:

```text
5 seconds
```

Application metrics path:

```text
/metrics
```

## Task 5: Create Docker Optimization Scripts

The Docker optimization script performs:

1. Docker resource cleanup.
2. Volume cleanup.
3. Network cleanup.
4. Optimized image build.
5. Image-size analysis.
6. Security scanning using Trivy.
7. Temporary performance testing.
8. Container statistics collection.
9. Performance-test container cleanup.

---

# 📦 Containerization Best Practices

## Image Optimization

- Use multi-stage builds.
- Use minimal base images.
- Install only required production dependencies.
- Reduce unnecessary image layers.
- Use Docker build cache effectively.
- Remove unnecessary build-time dependencies from the final image.

## Multi-stage Builds

Multi-stage Docker builds separate the build environment from the production runtime.

The project uses:

```text
base
  ↓
deps
  ↓
builder
  ↓
runner
```

The final `runner` stage contains only what is needed to run the application.

## Security

- Run containers as non-root users.
- Use minimal base images.
- Do not place secrets in Docker images.
- Use `.dockerignore`.
- Scan images for vulnerabilities.
- Keep dependencies and base images updated.
- Protect production credentials.

## Performance

- Keep production images small.
- Optimize Docker layers.
- Reuse build cache.
- Avoid unnecessary files in images.
- Monitor container CPU and memory usage.
- Remove unused Docker resources.

## Networking

Docker Compose creates:

```text
app-network
```

Services communicate using Docker service names.

Examples:

```text
mongodb:27017
postgresql:5432
redis:6379
app:3000
```

## Volumes

Persistent storage is configured for:

```text
mongodb_data
postgresql_data
redis_data
app_logs
app_uploads
nginx_logs
prometheus_data
grafana_data
```

## Monitoring

Docker health checks are configured for the application and infrastructure services.

Prometheus collects service metrics and Grafana provides visualization.

---

# 🔐 Security Configuration

The project applies several container security practices:

- Non-root application user
- Minimal Alpine runtime image
- `.dockerignore`
- Health checks
- Nginx security headers
- Rate limiting
- HTTPS support
- Separate production runtime stage
- Security scanning through Trivy

Sensitive files excluded by `.dockerignore` include:

```text
node_modules
.env
week3/day15
coverage
logs
uploads
```

---

# 🌐 Networking Architecture

```text
                    Nginx
                      |
                      v
                    App
             _________|_________
            |         |         |
            v         v         v
         MongoDB  PostgreSQL   Redis

                 |
                 v
             Prometheus
                 |
                 v
              Grafana
```

All services communicate through:

```text
app-network
```

---

# 💾 Persistent Storage Architecture

```text
MongoDB      → mongodb_data
PostgreSQL   → postgresql_data
Redis        → redis_data
Application  → app_logs
Application  → app_uploads
Nginx        → nginx_logs
Prometheus   → prometheus_data
Grafana      → grafana_data
```

---

# 🧪 Testing & Validation

## Docker Testing

- [ ] All containers start correctly
- [ ] Services communicate properly
- [ ] Health checks work
- [ ] Volumes are mounted correctly
- [ ] Networking works between services

## Performance Testing

- [ ] Images are optimized
- [ ] Startup time is acceptable
- [ ] Memory usage is reasonable
- [ ] CPU usage is efficient
- [ ] Network performance is good

## Security Testing

- [ ] Production application runs as non-root
- [ ] `.dockerignore` excludes sensitive files
- [ ] Secrets are not baked into images
- [ ] Image security scanning is performed
- [ ] Nginx security headers are enabled
- [ ] Rate limiting is configured

---

# 📊 Success Criteria

By the end of Day 16, you should have:

✅ **Docker Mastery**: Containerization and optimization

✅ **Multi-Service**: Docker Compose orchestration

✅ **Networking**: Service communication and discovery

✅ **Monitoring**: Container health and performance

✅ **Security**: Secure container configuration

---

# 📁 Day 16 File Structure

```text
.
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── healthcheck.js
├── nginx/
│   ├── nginx.conf
│   └── ssl/
├── monitoring/
│   └── prometheus.yml
├── scripts/
│   ├── docker-optimize.sh
│   ├── mongo-init.js
│   └── postgres-init.sql
└── week3/day16/
    ├── docs/
    │   └── docker-guide.md
    └── scripts/
        └── test-day16.ps1
```

---

# 🔄 Next Steps

1. **Commit your work**:

```bash
git add . && git commit -m "Complete Day 16: Docker & Compose"
```

2. **Create PR**: Submit pull request for code review.
3. **Prepare for Day 17**: Review Kubernetes concepts.
4. **Update progress**: Document your learning in the daily summary.

---

# 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Container Security](https://docs.docker.com/engine/security/)

---

**Ready for Day 17? Check out [Day 17: Kubernetes Basics](https://github.com/MechlinTech/Mechlin-SDA-Training/blob/main/week3/day17/README.md)!** 🚀