# Day 17: Kubernetes Basics

## 🎯 Learning Objectives

- Master Kubernetes fundamentals and cluster management
- Deploy applications using Pods, Deployments, and Services
- Implement service discovery and load balancing
- Create persistent storage with Volumes and Persistent Volumes
- Set up monitoring and logging in Kubernetes

---

# 📚 Theory & Concepts

## Kubernetes Fundamentals

### Cluster

A Kubernetes cluster contains the control plane and worker nodes responsible for running workloads.

### Pods

Pods are the smallest deployable units in Kubernetes. A Pod contains one or more containers that share networking and storage resources.

### Deployments

Deployments manage replicated Pods and maintain the desired number of application instances.

### Services

Services provide stable network access to Pods and enable service discovery and load balancing.

### Namespaces

Namespaces provide logical resource isolation inside a Kubernetes cluster.

---

# Core Components

## API Server

The API Server provides the main interface to the Kubernetes control plane.

## etcd

`etcd` stores Kubernetes cluster state and configuration.

## Scheduler

The Scheduler decides where Pods should run.

## Controller Manager

The Controller Manager continuously works to maintain the desired cluster state.

## kubelet

The kubelet runs on worker nodes and manages containers and Pods.

---

# Networking

## Service Discovery

Kubernetes provides DNS-based service discovery.

Examples:

```text
sda-training-service
mongodb-service
postgresql-service
redis-service
prometheus-service
```

## Load Balancing

Kubernetes Services distribute traffic across matching Pods.

The application Deployment runs:

```text
3 replicas
```

and the `sda-training-service` distributes traffic across those replicas.

## Ingress

Ingress provides externally accessible HTTP/HTTPS routing to Kubernetes Services.

This project uses an Nginx Ingress configuration.

## Network Policies

Network Policies can be used to restrict which Pods can communicate with one another.

## CNI

The Container Network Interface (CNI) provides the networking layer for Kubernetes Pods.

---

# 🛠️ Hands-on Tasks

## Task 1: Create Kubernetes Manifests

The Day 17 Kubernetes manifests are stored in:

```text
k8s/
```

The implementation includes:

- Namespace
- ConfigMap
- Secret
- Application Deployment
- Application Service
- Ingress
- Persistent Volumes
- Persistent Volume Claims
- MongoDB Deployment and Service
- PostgreSQL Deployment and Service
- Redis Deployment and Service
- Prometheus ConfigMap
- Prometheus Deployment and Service

---

## Namespace

File:

```text
k8s/namespace.yaml
```

Namespace:

```text
sda-training
```

Labels:

```text
app: sda-training
environment: production
```

The namespace isolates the Day 17 application resources.

---

## ConfigMap

File:

```text
k8s/configmap.yaml
```

Configuration values include:

- `NODE_ENV`
- `PORT`
- `API_BASE_URL`
- `LOG_LEVEL`
- `CORS_ORIGIN`

The ConfigMap contains non-sensitive configuration values.

---

## Secret

File:

```text
k8s/secret.yaml
```

Sensitive values are stored through a Kubernetes Secret.

Configured keys include:

```text
JWT_SECRET
MONGODB_URI
POSTGRES_URL
REDIS_URL
MONGO_ROOT_PASSWORD
POSTGRES_PASSWORD
```

The repository version uses development/training-only credentials. Real production secrets must not be committed to source control.

---

# Application Deployment

File:

```text
k8s/deployment.yaml
```

The application Deployment provides:

```text
replicas: 3
```

This provides three application Pods.

The application container:

```text
image: sda-training:latest
containerPort: 3000
```

## Environment Configuration

Configuration is read from:

```text
sda-training-config
```

Sensitive values are read from:

```text
sda-training-secrets
```

## Resource Requests and Limits

Requests:

```text
memory: 256Mi
cpu: 250m
```

Limits:

```text
memory: 512Mi
cpu: 500m
```

## Liveness Probe

The application uses:

```text
GET /health
```

The liveness probe starts after 30 seconds and runs every 10 seconds.

## Readiness Probe

The application uses:

```text
GET /health
```

The readiness probe starts after 5 seconds and runs every 5 seconds.

## Persistent Application Volumes

The application mounts:

```text
/app/logs
/app/uploads
```

through:

```text
app-logs-pvc
app-uploads-pvc
```

---

# Application Service

File:

```text
k8s/service.yaml
```

Service:

```text
sda-training-service
```

Type:

```text
ClusterIP
```

Port:

```text
3000
```

The selector targets:

```text
app: sda-training
component: app
```

This provides internal service discovery and load balancing across the three application Pods.

---

# Ingress

File:

```text
k8s/ingress.yaml
```

The Ingress provides HTTP/HTTPS routing.

Configured hosts:

```text
sda-training.com
api.sda-training.com
```

TLS secret:

```text
sda-training-tls
```

The configuration also includes:

- Nginx rewrite
- SSL redirect
- Forced SSL redirect
- Rate limiting
- Cert-manager issuer configuration

The application routes are:

```text
/
 /api
```

Both routes forward traffic to:

```text
sda-training-service:3000
```

---

# Task 2: Create Services and Ingress

The Kubernetes networking architecture is:

```text
External Client
      |
      v
   Ingress
      |
      v
sda-training-service
      |
      +----------+----------+
      |          |          |
      v          v          v
    App-1      App-2      App-3
```

This provides:

- Service discovery
- Internal load balancing
- External routing
- HTTPS support

---

# Task 3: Create Persistent Storage

The project uses:

- Persistent Volumes
- Persistent Volume Claims

## Persistent Volumes

File:

```text
k8s/persistent-volume.yaml
```

Configured application PVs:

```text
app-logs-pv
app-uploads-pv
```

Application capacities:

```text
app-logs-pv: 10Gi
app-uploads-pv: 50Gi
```

The local implementation uses `hostPath` for local Kubernetes development.

Storage class:

```text
local-static
```

The deployment-oriented architecture also defines storage for:

```text
MongoDB
PostgreSQL
Prometheus
```

---

# Persistent Volume Claims

File:

```text
k8s/persistent-volume-claim.yaml
```

Configured PVCs:

```text
app-logs-pvc
app-uploads-pvc
mongodb-data-pvc
postgresql-data-pvc
prometheus-data-pvc
```

PVCs request storage from the matching Persistent Volumes.

---

# Task 4: Create Database Deployments

## MongoDB

File:

```text
k8s/mongodb-deployment.yaml
```

MongoDB configuration:

```text
Image: mongo:5.0
Port: 27017
Replicas: 1
```

Persistent storage:

```text
mongodb-data-pvc
```

Health checks use:

```text
mongosh
```

with:

```javascript
db.adminCommand('ping')
```

Service:

```text
mongodb-service
```

MongoDB is therefore discoverable from the application through:

```text
mongodb-service:27017
```

---

## PostgreSQL

File:

```text
k8s/postgresql-deployment.yaml
```

PostgreSQL configuration:

```text
Image: postgres:13
Port: 5432
Replicas: 1
```

Persistent storage:

```text
postgresql-data-pvc
```

Health checks use:

```text
pg_isready -U postgres
```

Service:

```text
postgresql-service
```

PostgreSQL is discoverable through:

```text
postgresql-service:5432
```

---

## Redis

Redis is included so the application has a complete in-cluster cache dependency.

Configuration:

```text
Image: redis:6.0-alpine
Port: 6379
Replicas: 1
```

Health checks use:

```text
redis-cli ping
```

Service:

```text
redis-service
```

The application can connect through:

```text
redis-service:6379
```

---

# Task 5: Create Monitoring and Logging

## Prometheus

Prometheus provides metrics collection.

Files:

```text
k8s/prometheus-config.yaml
k8s/monitoring.yaml
```

Deployment:

```text
prometheus
```

Service:

```text
prometheus-service
```

Port:

```text
9090
```

Persistent storage:

```text
prometheus-data-pvc
```

Prometheus monitors configured targets including:

- Prometheus
- Application
- MongoDB
- PostgreSQL
- Redis

---

# Kubernetes Architecture

```text
                     Internet
                        |
                        v
                     Ingress
                        |
                        v
             sda-training-service
                        |
             +----------+----------+
             |          |          |
             v          v          v
           App-1      App-2      App-3
             |
       +-----+-----+------+
       |           |      |
       v           v      v
    MongoDB    PostgreSQL Redis
       |           |       |
       +-----------+-------+
                   |
                   v
              Prometheus
```

---

# Configuration Flow

```text
ConfigMap
   |
   +---- NODE_ENV
   +---- PORT
   +---- API_BASE_URL
   +---- LOG_LEVEL
   +---- CORS_ORIGIN
   |
   v
Application Pod

Secret
   |
   +---- JWT_SECRET
   +---- MONGODB_URI
   +---- POSTGRES_URL
   +---- REDIS_URL
   |
   v
Application Pod
```

---

# Persistent Storage Flow

```text
Persistent Volume
       |
       v
Persistent Volume Claim
       |
       v
Kubernetes Pod
       |
       +---- /app/logs
       |
       +---- /app/uploads
```

Database storage follows the same PV/PVC pattern.

---

# Kubernetes Best Practices

## Resource Management

Use CPU and memory requests and limits.

Example:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

This helps Kubernetes schedule workloads and control resource consumption.

## Health Checks

Use:

- Liveness probes
- Readiness probes

Liveness probes determine whether an application needs to be restarted.

Readiness probes determine whether an application is ready to receive traffic.

## Security

Use:

- Kubernetes Secrets
- RBAC
- Network Policies
- TLS
- Least-privilege access
- Separate namespaces

## Monitoring

Use:

- Prometheus
- Metrics
- Health checks
- Logging
- Resource monitoring

## Scaling

Deployments can scale Pods horizontally.

Example:

```text
replicas: 3
```

The application can later be scaled further when required.

---

# Service Discovery

Kubernetes Services provide stable DNS names.

Examples:

```text
sda-training-service
mongodb-service
postgresql-service
redis-service
prometheus-service
```

Fully qualified internal names can follow Kubernetes DNS conventions.

The application does not need to know Pod IP addresses directly.

---

# Load Balancing

The application Service distributes traffic between Pods matching:

```yaml
app: sda-training
component: app
```

With:

```text
3 replicas
```

the Service provides a stable access point while Kubernetes distributes traffic across the application Pods.

---

# Namespaces

All Day 17 application resources use:

```text
sda-training
```

This separates them from resources belonging to other applications or workloads.

---

# Health Checks

## Application

```text
GET /health
```

## MongoDB

```text
db.adminCommand('ping')
```

## PostgreSQL

```text
pg_isready -U postgres
```

## Redis

```text
redis-cli ping
```

## Prometheus

```text
/-/ready
/-/healthy
```

---

# 🧪 Testing & Validation

## Kubernetes Testing

The following should be validated:

- [ ] All Pods start correctly
- [ ] Services work properly
- [ ] Ingress routes traffic correctly
- [ ] Persistent Volumes work
- [ ] Persistent Volume Claims bind correctly
- [ ] Health checks work
- [ ] ConfigMap values are injected
- [ ] Secret values are injected
- [ ] Application replicas are configured
- [ ] Service discovery works
- [ ] Monitoring is deployed

## Performance Testing

The following should be validated:

- [ ] Pod startup time is acceptable
- [ ] Resource usage is within limits
- [ ] Network performance is good
- [ ] Storage performance is acceptable
- [ ] Monitoring works correctly

---

# 📊 Success Criteria

By the end of Day 17, you should have:

✅ **Kubernetes Mastery**: Cluster management and deployment

✅ **Service Discovery**: Network access and load balancing

✅ **Persistent Storage**: Data persistence and volumes

✅ **Monitoring**: Health checks and metrics

✅ **Security**: Network policies and RBAC

---

# 📁 Day 17 File Structure

```text
k8s/
├── namespace.yaml
├── configmap.yaml
├── secret.yaml
├── deployment.yaml
├── service.yaml
├── ingress.yaml
├── persistent-volume.yaml
├── persistent-volume-claim.yaml
├── mongodb-deployment.yaml
├── postgresql-deployment.yaml
├── redis-deployment.yaml
├── prometheus-config.yaml
└── monitoring.yaml

week3/day17/
├── docs/
│   └── kubernetes-guide.md
└── scripts/
    └── test-day17.ps1
```

---

# 🔄 Deployment Workflow

```text
Namespace
    |
    v
ConfigMap + Secrets
    |
    v
Persistent Volumes + Claims
    |
    v
Database Deployments
    |
    v
Application Deployment
    |
    v
Services
    |
    v
Ingress
    |
    v
Prometheus Monitoring
```

---

# 🔄 Next Steps

1. Commit the completed Day 17 implementation:

```bash
git add . && git commit -m "Complete Day 17: Kubernetes Basics"
```

2. Create a pull request for code review.
3. Prepare for Day 18: CI/CD Pipeline.
4. Update the training progress documentation.

---

# 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/)
- [Kubernetes Security](https://kubernetes.io/docs/concepts/security/)
- [Kubernetes Monitoring](https://kubernetes.io/docs/tasks/debug-application-cluster/resource-usage-monitoring/)

---

**Ready for Day 18? Check out [Day 18: CI/CD Pipeline](https://github.com/MechlinTech/Mechlin-SDA-Training/blob/main/week3/day18/README.md)!** 🚀