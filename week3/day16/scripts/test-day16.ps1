$ErrorActionPreference = "Stop"

$dayRoot = Join-Path $PSScriptRoot ".."
$repoRoot = (Resolve-Path (Join-Path $dayRoot "..\..")).Path

Write-Host ""
Write-Host "============================================"
Write-Host "DAY 16 - DOCKER & COMPOSE TESTS"
Write-Host "============================================"
Write-Host ""

$passed = 0
$failed = 0

function Pass-Test {
    param([string]$Message)
    Write-Host "PASS: $Message"
    $script:passed++
}

function Fail-Test {
    param([string]$Message)
    Write-Host "FAIL: $Message"
    $script:failed++
}

function Assert-File {
    param([string]$RelativePath)

    $path = Join-Path $repoRoot $RelativePath

    if (Test-Path $path) {
        Pass-Test "Required file exists: $RelativePath"
    }
    else {
        Fail-Test "Required file missing: $RelativePath"
    }
}

# Required files
$requiredFiles = @(
    "Dockerfile",
    "docker-compose.yml",
    ".dockerignore",
    "healthcheck.js",
    "nginx/nginx.conf",
    "monitoring/prometheus.yml",
    "scripts/docker-optimize.sh",
    "scripts/mongo-init.js",
    "scripts/postgres-init.sql",
    "week3/day16/docs/docker-guide.md"
)

foreach ($file in $requiredFiles) {
    Assert-File $file
}

# Read configuration files
$dockerfile = Get-Content (Join-Path $repoRoot "Dockerfile") -Raw
$compose = Get-Content (Join-Path $repoRoot "docker-compose.yml") -Raw
$nginx = Get-Content (Join-Path $repoRoot "nginx/nginx.conf") -Raw
$prometheus = Get-Content (Join-Path $repoRoot "monitoring/prometheus.yml") -Raw
$guide = Get-Content (Join-Path $repoRoot "week3/day16/docs/docker-guide.md") -Raw
$dockerignore = Get-Content (Join-Path $repoRoot ".dockerignore") -Raw

# Dockerfile validation
$dockerChecks = @(
    @{ Name = "multi-stage build"; Pattern = "AS builder" },
    @{ Name = "production runner stage"; Pattern = "AS runner" },
    @{ Name = "production dependencies stage"; Pattern = "AS deps" },
    @{ Name = "non-root user"; Pattern = "USER nodejs" },
    @{ Name = "health check"; Pattern = "HEALTHCHECK" },
    @{ Name = "port 3000"; Pattern = "EXPOSE 3000" },
    @{ Name = "production start command"; Pattern = 'CMD ["node", "dist/index.js"]' }
)

foreach ($check in $dockerChecks) {
    if ($dockerfile -match [regex]::Escape($check.Pattern)) {
        Pass-Test "Dockerfile contains $($check.Name)"
    }
    else {
        Fail-Test "Dockerfile missing $($check.Name)"
    }
}

# Docker Compose service validation
$services = @(
    "app:",
    "mongodb:",
    "postgresql:",
    "redis:",
    "nginx:",
    "prometheus:",
    "grafana:"
)

foreach ($service in $services) {
    if ($compose -match "(?m)^\s*$([regex]::Escape($service))") {
        Pass-Test "Docker Compose contains service: $service"
    }
    else {
        Fail-Test "Docker Compose missing service: $service"
    }
}

# Docker Compose volume validation
$volumes = @(
    "mongodb_data:",
    "postgresql_data:",
    "redis_data:",
    "app_logs:",
    "app_uploads:",
    "nginx_logs:",
    "prometheus_data:",
    "grafana_data:"
)

foreach ($volume in $volumes) {
    if ($compose -match "(?m)^\s*$([regex]::Escape($volume))") {
        Pass-Test "Docker Compose contains volume: $volume"
    }
    else {
        Fail-Test "Docker Compose missing volume: $volume"
    }
}

# Docker Compose networking
if ($compose -match "app-network:") {
    Pass-Test "Docker Compose contains app-network"
}
else {
    Fail-Test "Docker Compose missing app-network"
}

if ($compose -match "condition: service_healthy") {
    Pass-Test "Docker Compose uses service health dependencies"
}
else {
    Fail-Test "Docker Compose missing service health dependencies"
}

# Nginx validation
if ($nginx -match "proxy_pass http://app_servers") {
    Pass-Test "Nginx reverse proxy configuration detected"
}
else {
    Fail-Test "Nginx reverse proxy configuration missing"
}

if ($nginx -match "upstream app_servers") {
    Pass-Test "Nginx upstream server configuration detected"
}
else {
    Fail-Test "Nginx upstream configuration missing"
}

if ($nginx -match "limit_req_zone") {
    Pass-Test "Nginx rate limiting configured"
}
else {
    Fail-Test "Nginx rate limiting missing"
}

if ($nginx -match "gzip on") {
    Pass-Test "Nginx gzip compression configured"
}
else {
    Fail-Test "Nginx gzip compression missing"
}

if ($nginx -match "X-Frame-Options") {
    Pass-Test "Nginx security headers configured"
}
else {
    Fail-Test "Nginx security headers missing"
}

if ($nginx -match "listen 443 ssl") {
    Pass-Test "Nginx HTTPS configuration detected"
}
else {
    Fail-Test "Nginx HTTPS configuration missing"
}

if ($nginx -match "location /health") {
    Pass-Test "Nginx health endpoint configured"
}
else {
    Fail-Test "Nginx health endpoint missing"
}

# Prometheus validation
if ($prometheus -match "job_name: 'prometheus'") {
    Pass-Test "Prometheus self-monitoring configured"
}
else {
    Fail-Test "Prometheus self-monitoring missing"
}

if ($prometheus -match "job_name: 'app'") {
    Pass-Test "Prometheus application monitoring configured"
}
else {
    Fail-Test "Prometheus application monitoring missing"
}

if ($prometheus -match "job_name: 'nginx'") {
    Pass-Test "Prometheus Nginx monitoring configured"
}
else {
    Fail-Test "Prometheus Nginx monitoring missing"
}

if ($prometheus -match "job_name: 'mongodb'") {
    Pass-Test "Prometheus MongoDB monitoring configured"
}
else {
    Fail-Test "Prometheus MongoDB monitoring missing"
}

if ($prometheus -match "job_name: 'postgresql'") {
    Pass-Test "Prometheus PostgreSQL monitoring configured"
}
else {
    Fail-Test "Prometheus PostgreSQL monitoring missing"
}

if ($prometheus -match "job_name: 'redis'") {
    Pass-Test "Prometheus Redis monitoring configured"
}
else {
    Fail-Test "Prometheus Redis monitoring missing"
}

# Docker ignore validation
$protectedPatterns = @(
    "node_modules",
    ".env",
    "week3/day15",
    "coverage"
)

foreach ($pattern in $protectedPatterns) {
    if ($dockerignore -match [regex]::Escape($pattern)) {
        Pass-Test ".dockerignore protects: $pattern"
    }
    else {
        Fail-Test ".dockerignore missing protection: $pattern"
    }
}

# Documentation validation
if ($guide -match "Containerization Best Practices") {
    Pass-Test "Docker documentation contains containerization best practices"
}
else {
    Fail-Test "Docker documentation missing containerization best practices"
}

if ($guide -match "Docker Compose") {
    Pass-Test "Docker documentation contains Docker Compose"
}
else {
    Fail-Test "Docker documentation missing Docker Compose"
}

if ($guide -match "Multi-stage Builds") {
    Pass-Test "Docker documentation contains multi-stage builds"
}
else {
    Fail-Test "Docker documentation missing multi-stage builds"
}

if ($guide -match "Security") {
    Pass-Test "Docker documentation contains security guidance"
}
else {
    Fail-Test "Docker documentation missing security guidance"
}

if ($guide -match "Networking") {
    Pass-Test "Docker documentation contains networking guidance"
}
else {
    Fail-Test "Docker documentation missing networking guidance"
}

if ($guide -match "Monitoring") {
    Pass-Test "Docker documentation contains monitoring guidance"
}
else {
    Fail-Test "Docker documentation missing monitoring guidance"
}

# Docker CLI validation
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Pass-Test "Docker CLI is available"

    try {
        $composeConfig = docker compose config 2>&1

        if ($LASTEXITCODE -eq 0) {
            Pass-Test "Docker Compose configuration is valid"
        }
        else {
            Write-Host "Docker Compose validation output:"
            Write-Host $composeConfig
            Fail-Test "Docker Compose configuration validation failed"
        }
    }
    catch {
        Fail-Test "Docker Compose validation could not be executed"
    }
}
else {
    Write-Host "INFO: Docker CLI not found; Docker runtime validation skipped"
}

Write-Host ""
Write-Host "============================================"
Write-Host "PASSED: $passed"
Write-Host "FAILED: $failed"
Write-Host "============================================"

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "DAY 16 DOCKER TESTS: SUCCESS"
    exit 0
}
else {
    Write-Host ""
    Write-Host "DAY 16 DOCKER TESTS: FAILED"
    exit 1
}