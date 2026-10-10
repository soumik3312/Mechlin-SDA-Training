# Day 18: CI/CD Pipeline

## 🎯 Learning Objectives

- Master CI/CD concepts and GitHub Actions
- Implement automated testing and deployment
- Create multi-environment deployment pipelines
- Set up automated security scanning and code quality checks
- Implement rollback and recovery procedures

## 📚 Theory & Concepts

### CI/CD Fundamentals

- **Continuous Integration**: Automated testing and building
- **Continuous Deployment**: Automated deployment to environments
- **Pipeline Stages**: Build, test, deploy, monitor
- **Environment Promotion**: Dev → Staging → Production
- **Rollback Strategies**: Quick recovery from failures

### GitHub Actions

- **Workflows**: Automated CI/CD processes
- **Jobs**: Parallel execution units
- **Steps**: Individual tasks within jobs
- **Secrets**: Secure environment variables
- **Artifacts**: Build outputs and dependencies

### Best Practices

- **Fast Feedback**: Quick test execution
- **Security**: Secure secrets and permissions
- **Monitoring**: Pipeline health and performance
- **Documentation**: Clear pipeline documentation
- **Maintenance**: Regular pipeline updates

---

# 🛠️ Hands-on Tasks

## Task 1: Create GitHub Actions Workflow

The primary CI/CD workflow is:

```text
.github/workflows/ci-cd.yml
```

The pipeline contains:

```text
Test
  |
  v
Security
  |
  v
Build & Push
  |
  +---- Develop → Staging
  |
  +---- Main → Production
  |
  v
Monitoring / Rollback
```

### Pipeline Triggers

The main workflow runs for:

- Pushes to `main`
- Pushes to `develop`
- Pull requests targeting `main`
- Pull requests targeting `develop`

### Pipeline Environment

The workflow uses:

```text
NODE_VERSION=18
REGISTRY=ghcr.io
IMAGE_NAME=${{ github.repository }}
```

### Test Job

The test job runs on:

```text
ubuntu-latest
```

It provides service containers for:

- MongoDB
- PostgreSQL
- Redis

The testing process includes:

1. Checkout source code.
2. Configure Node.js.
3. Install dependencies.
4. Run linting.
5. Run type checking when available.
6. Run unit tests when available.
7. Run integration tests when available.
8. Run an npm security audit.
9. Upload test results as an artifact.

The test services use:

```text
MongoDB: 27017
PostgreSQL: 5432
Redis: 6379
```

### Security Job

The security job runs after the test job.

Security checks include:

- Trivy filesystem vulnerability scanning
- SARIF result upload
- CodeQL JavaScript analysis

### Build Job

The build job runs for push events after testing and security checks pass.

It:

1. Checks out the source.
2. Configures Docker Buildx.
3. Authenticates with GitHub Container Registry.
4. Generates Docker image metadata.
5. Builds the Docker image.
6. Pushes the image to GHCR.
7. Uses GitHub Actions build cache.

The image registry is:

```text
ghcr.io
```

### Staging Deployment

The staging deployment runs when code is pushed to:

```text
develop
```

The deployment:

1. Checks out the repository.
2. Configures `kubectl`.
3. Loads the staging Kubernetes configuration.
4. Applies the Kubernetes manifests.
5. Updates the application image.
6. Waits for the rollout.
7. Runs deployment smoke checks.

The Kubernetes namespace is:

```text
sda-training
```

The deployment uses:

```text
ghcr.io/<repository>:<commit-sha>
```

### Production Deployment

The production deployment runs when code is pushed to:

```text
main
```

It follows the same process as staging but uses the production environment and Kubernetes credentials.

Production deployment includes:

- Kubernetes manifest deployment
- Application image update
- Rollout status verification
- Pod checks
- Service checks
- Ingress checks
- Optional Slack notification

### Rollback

The rollback job provides recovery when deployment failures occur.

The rollback command is:

```bash
kubectl rollout undo deployment/sda-training-app -n sda-training
```

After rollback, the workflow waits for the application rollout to complete.

---

# Task 2: Create Environment-Specific Workflows

The staging deployment workflow is:

```text
.github/workflows/deploy-staging.yml
```

It supports:

- Push to `develop`
- Manual `workflow_dispatch`

The environment is:

```text
staging
```

The Kubernetes namespace is:

```text
sda-training
```

The workflow performs:

- Kubernetes configuration
- Manifest deployment
- Image update
- Rollout validation
- Pod/service/Ingress checks
- Health endpoint smoke testing

The application health endpoint is:

```text
/health
```

A smoke test is performed through Kubernetes port forwarding.

---

# Task 3: Create Security Scanning Workflow

The security workflow is:

```text
.github/workflows/security.yml
```

It runs on:

- Push to `main`
- Push to `develop`
- Pull requests
- Weekly scheduled execution

## Trivy

Trivy scans the filesystem for vulnerabilities.

Results are exported in SARIF format:

```text
trivy-results.sarif
```

The SARIF report is uploaded to GitHub security results.

## CodeQL

CodeQL analyzes JavaScript source code for security problems.

The workflow initializes CodeQL and then performs the analysis.

## Snyk

Snyk is configured to run when:

```text
SNYK_TOKEN
```

is available.

The configured threshold is:

```text
high
```

## OWASP ZAP

OWASP ZAP performs a baseline security scan against:

```text
http://localhost:3000
```

The rules file is:

```text
.zap/rules.tsv
```

## Dependency Check

OWASP Dependency-Check produces a SARIF report:

```text
dependency-check-report.sarif
```

The result is uploaded to GitHub security results.

---

# Task 4: Create Performance Testing Workflow

The performance workflow is:

```text
.github/workflows/performance.yml
```

It runs on:

- Push to `main`
- Push to `develop`
- Manual workflow dispatch

The workflow:

1. Checks out source code.
2. Installs Node.js dependencies.
3. Starts the application.
4. Verifies the health endpoint.
5. Runs Lighthouse CI.
6. Runs Artillery load testing.
7. Runs K6 load testing.
8. Generates performance results.

## Lighthouse

The Lighthouse configuration is:

```text
lighthouse.config.js
```

The target endpoint is:

```text
http://localhost:3000/health
```

## Artillery

Artillery configuration is:

```text
artillery.config.yml
```

The load test contains:

- Warm-up phase
- Load phase
- Health endpoint requests

## K6

The K6 test is:

```text
k6-load-test.js
```

The test checks:

```text
GET /health
```

and verifies HTTP status `200`.

---

# Task 5: Create Monitoring and Alerting

The monitoring workflow is:

```text
.github/workflows/monitoring.yml
```

It runs every:

```text
5 minutes
```

It also supports manual execution.

Monitoring checks include:

- Pod health
- Pod descriptions
- Services
- Ingress
- Resource usage
- Application logs

Resource commands include:

```bash
kubectl top pods -n sda-training
kubectl top nodes
```

Application logs are retrieved using:

```bash
kubectl logs -l app=sda-training -n sda-training --tail=100
```

Slack alerting can be enabled using:

```text
SLACK_WEBHOOK
```

---

# 🔐 GitHub Actions Secrets

The workflows may use the following GitHub Actions secrets:

```text
KUBE_CONFIG_STAGING
KUBE_CONFIG_PRODUCTION
SLACK_WEBHOOK
SNYK_TOKEN
```

Secrets should be configured through GitHub repository/environment settings and should never be hard-coded into workflow files.

---

# 🌍 Environment Promotion

The CI/CD promotion model is:

```text
Developer
    |
    v
Pull Request
    |
    v
Tests
    |
    v
Security
    |
    v
Build
    |
    v
develop
    |
    v
Staging
    |
    v
Validation
    |
    v
main
    |
    v
Production
```

This keeps staging and production deployment separated.

---

# 🔄 Rollback Strategy

The deployment uses Kubernetes rollout history.

Normal deployment:

```bash
kubectl rollout status deployment/sda-training-app -n sda-training
```

Rollback:

```bash
kubectl rollout undo deployment/sda-training-app -n sda-training
```

The rollback process restores the previous Deployment revision.

---

# 📦 CI/CD Artifacts

The test workflow uploads:

```text
test-results/
```

Security workflows produce:

```text
trivy-results.sarif
dependency-check-report.sarif
```

Performance workflows upload Lighthouse and performance artifacts.

Artifacts provide useful information for debugging failed pipelines and reviewing historical test results.

---

# 🔒 Security Best Practices

- Store secrets in GitHub Actions secrets.
- Never commit Kubernetes credentials.
- Never hard-code production credentials.
- Use least-privilege workflow permissions.
- Run vulnerability scans.
- Run CodeQL analysis.
- Run dependency security checks.
- Protect production environments.
- Require appropriate approvals for production deployments.
- Keep workflow dependencies maintained.
- Avoid exposing secrets in logs.

---

# ⚡ Fast Feedback

CI/CD should provide quick feedback by:

- Running automated tests early.
- Running quality checks before deployment.
- Using dependency caching.
- Using Docker Buildx caching.
- Uploading artifacts for failed jobs.
- Separating independent checks into jobs where practical.

---

# 📊 Monitoring

Pipeline and deployment monitoring should track:

- Workflow status
- Test failures
- Security scan results
- Deployment status
- Pod health
- Service health
- Resource usage
- Application logs
- Performance results

---

# 🧪 Testing & Validation

## Pipeline Testing

- [ ] All pipeline stages work correctly
- [ ] Tests run successfully
- [ ] Security scanning works
- [ ] Docker image builds successfully
- [ ] Docker image is pushed successfully
- [ ] Staging deployment works
- [ ] Production deployment works
- [ ] Rollback works
- [ ] Monitoring works

## Performance Testing

- [ ] Pipeline execution time is acceptable
- [ ] Resource usage is reasonable
- [ ] Tests run efficiently
- [ ] Deployment is fast
- [ ] Monitoring is responsive
- [ ] Lighthouse completes
- [ ] Artillery load test completes
- [ ] K6 load test completes

## Security Testing

- [ ] Trivy scan runs
- [ ] CodeQL analysis runs
- [ ] Snyk scan runs when configured
- [ ] OWASP ZAP scan runs
- [ ] Dependency-Check runs
- [ ] Secrets are stored outside source code
- [ ] Workflow permissions are restricted

---

# 📁 Day 18 File Structure

```text
.github/
└── workflows/
    ├── ci-cd.yml
    ├── deploy-staging.yml
    ├── security.yml
    ├── performance.yml
    └── monitoring.yml

.zap/
└── rules.tsv

lighthouse.config.js
artillery.config.yml
k6-load-test.js

week3/day18/
├── docs/
│   └── cicd-guide.md
└── scripts/
    └── test-day18.ps1
```

---

# 📊 Success Criteria

By the end of Day 18, you should have:

✅ **CI/CD Mastery**: Automated testing and deployment

✅ **Security Scanning**: Comprehensive security checks

✅ **Performance Testing**: Load and performance testing

✅ **Monitoring**: Health checks and alerting

✅ **Documentation**: Complete pipeline documentation

---

# ✅ Day 18 Validation Checklist

```text
[ ] Main CI/CD workflow created
[ ] Automated testing configured
[ ] Unit testing configured
[ ] Integration testing configured
[ ] Code quality checks configured
[ ] Security audit configured
[ ] Trivy scanning configured
[ ] CodeQL configured
[ ] Docker build and push configured
[ ] Staging deployment configured
[ ] Production deployment configured
[ ] Rollback configured
[ ] Environment-specific workflow created
[ ] Snyk support configured
[ ] OWASP ZAP configured
[ ] Dependency-Check configured
[ ] Lighthouse configured
[ ] Artillery configured
[ ] K6 configured
[ ] Monitoring workflow configured
[ ] Slack alerting support configured
[ ] CI/CD documentation completed
```

---

# 🔄 Next Steps

1. Commit the Day 18 implementation:

```bash
git add . && git commit -m "Complete Day 18: CI/CD Pipeline"
```

2. Create a pull request for code review.
3. Prepare for Day 19: React Native.
4. Update the daily training progress.

---

# 📚 Additional Resources

- [GitHub Actions](https://docs.github.com/en/actions)
- [CI/CD Best Practices](https://docs.github.com/en/actions/learn-github-actions)
- [Security Scanning](https://docs.github.com/en/code-security)
- [Performance Testing](https://docs.github.com/en/actions/learn-github-actions)

---

**Ready for Day 19? Check out [Day 19: React Native](https://github.com/MechlinTech/Mechlin-SDA-Training/blob/main/week3/day19/README.md)!** 🚀