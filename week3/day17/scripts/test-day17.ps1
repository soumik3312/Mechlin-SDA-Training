$ErrorActionPreference = "Stop"

$dayRoot = Join-Path $PSScriptRoot ".."
$repoRoot = (Resolve-Path (Join-Path $dayRoot "..\..")).Path
$k8sRoot = Join-Path $repoRoot "k8s"

Write-Host ""
Write-Host "============================================"
Write-Host "DAY 17 - KUBERNETES BASICS TESTS"
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

$requiredFiles = @(
    "k8s/namespace.yaml",
    "k8s/configmap.yaml",
    "k8s/secret.yaml",
    "k8s/deployment.yaml",
    "k8s/service.yaml",
    "k8s/ingress.yaml",
    "k8s/persistent-volume.yaml",
    "k8s/persistent-volume-claim.yaml",
    "k8s/mongodb-deployment.yaml",
    "k8s/postgresql-deployment.yaml",
    "k8s/redis-deployment.yaml",
    "k8s/prometheus-config.yaml",
    "k8s/monitoring.yaml",
    "week3/day17/docs/kubernetes-guide.md"
)

foreach ($file in $requiredFiles) {
    Assert-File $file
}

$checks = @(
    @{
        File = "k8s/namespace.yaml"
        Name = "Kubernetes namespace"
        Patterns = @("kind: Namespace", "name: sda-training")
    },
    @{
        File = "k8s/configmap.yaml"
        Name = "ConfigMap"
        Patterns = @("kind: ConfigMap", "name: sda-training-config", "NODE_ENV", "PORT")
    },
    @{
        File = "k8s/secret.yaml"
        Name = "Secret"
        Patterns = @("kind: Secret", "name: sda-training-secrets", "JWT_SECRET", "MONGODB_URI", "POSTGRES_URL", "REDIS_URL")
    },
    @{
        File = "k8s/deployment.yaml"
        Name = "Application Deployment"
        Patterns = @("kind: Deployment", "name: sda-training-app", "replicas: 3", "image: sda-training:latest", "containerPort: 3000", "livenessProbe", "readinessProbe")
    },
    @{
        File = "k8s/service.yaml"
        Name = "Application Service"
        Patterns = @("kind: Service", "name: sda-training-service", "type: ClusterIP", "port: 3000")
    },
    @{
        File = "k8s/ingress.yaml"
        Name = "Ingress"
        Patterns = @("kind: Ingress", "name: sda-training-ingress", "sda-training.com", "api.sda-training.com", "secretName: sda-training-tls")
    },
    @{
        File = "k8s/persistent-volume.yaml"
        Name = "Persistent Volumes"
        Patterns = @("kind: PersistentVolume", "app-logs-pv", "app-uploads-pv", "mongodb-data-pv", "postgresql-data-pv", "prometheus-data-pv")
    },
    @{
        File = "k8s/persistent-volume-claim.yaml"
        Name = "Persistent Volume Claims"
        Patterns = @("kind: PersistentVolumeClaim", "app-logs-pvc", "app-uploads-pvc", "mongodb-data-pvc", "postgresql-data-pvc", "prometheus-data-pvc")
    },
    @{
        File = "k8s/mongodb-deployment.yaml"
        Name = "MongoDB Deployment"
        Patterns = @("kind: Deployment", "name: mongodb", "image: mongo:5.0", "containerPort: 27017", "mongodb-data-pvc", "kind: Service", "mongodb-service")
    },
    @{
        File = "k8s/postgresql-deployment.yaml"
        Name = "PostgreSQL Deployment"
        Patterns = @("kind: Deployment", "name: postgresql", "image: postgres:13", "containerPort: 5432", "postgresql-data-pvc", "kind: Service", "postgresql-service")
    },
    @{
        File = "k8s/redis-deployment.yaml"
        Name = "Redis Deployment"
        Patterns = @("kind: Deployment", "name: redis", "image: redis:6.0-alpine", "containerPort: 6379", "kind: Service", "redis-service")
    },
    @{
        File = "k8s/prometheus-config.yaml"
        Name = "Prometheus ConfigMap"
        Patterns = @("kind: ConfigMap", "name: prometheus-config", "scrape_interval")
    },
    @{
        File = "k8s/monitoring.yaml"
        Name = "Prometheus Monitoring"
        Patterns = @("kind: Deployment", "name: prometheus", "image: prom/prometheus:latest", "containerPort: 9090", "prometheus-data-pvc", "kind: Service", "prometheus-service")
    }
)

foreach ($check in $checks) {
    $path = Join-Path $repoRoot $check.File
    $content = Get-Content $path -Raw
    $missing = @()

    foreach ($pattern in $check.Patterns) {
        if ($content -notmatch [regex]::Escape($pattern)) {
            $missing += $pattern
        }
    }

    if ($missing.Count -eq 0) {
        Pass-Test "$($check.Name) validated"
    }
    else {
        Fail-Test "$($check.Name) missing: $($missing -join ', ')"
    }
}

$guide = Get-Content (Join-Path $repoRoot "week3/day17/docs/kubernetes-guide.md") -Raw

$guideChecks = @(
    "Kubernetes Fundamentals",
    "Pods",
    "Deployments",
    "Services",
    "Ingress",
    "Persistent Storage",
    "Monitoring",
    "Resource Management",
    "Health Checks",
    "Security",
    "Scaling"
)

foreach ($term in $guideChecks) {
    if ($guide -match [regex]::Escape($term)) {
        Pass-Test "Kubernetes documentation contains: $term"
    }
    else {
        Fail-Test "Kubernetes documentation missing: $term"
    }
}

# Basic YAML syntax validation using Python + PyYAML when available.
if (Get-Command python -ErrorAction SilentlyContinue) {
    $yamlCheck = @'
import sys
from pathlib import Path
import yaml

root = Path(sys.argv[1])
files = sorted(root.glob("*.yaml"))

if not files:
    print("NO_YAML_FILES")
    sys.exit(1)

for path in files:
    with path.open("r", encoding="utf-8") as f:
        list(yaml.safe_load_all(f))
    print(f"YAML_VALID: {path.name}")
'@

    $tempScript = Join-Path $env:TEMP "day17_yaml_check.py"
    Set-Content -Path $tempScript -Value $yamlCheck -Encoding UTF8

    try {
        $yamlOutput = python $tempScript $k8sRoot 2>&1

        if ($LASTEXITCODE -eq 0) {
            foreach ($line in $yamlOutput) {
                if ($line -match "^YAML_VALID:") {
                    Pass-Test $line
                }
            }
        }
        else {
            Write-Host $yamlOutput
            Fail-Test "Kubernetes YAML syntax validation failed"
        }
    }
    finally {
        Remove-Item $tempScript -Force -ErrorAction SilentlyContinue
    }
}
else {
    Write-Host "INFO: Python not found; YAML parser validation skipped"
}

# Optional kubectl validation.
if (Get-Command kubectl -ErrorAction SilentlyContinue) {
    Pass-Test "kubectl CLI is available"

    try {
        kubectl apply --dry-run=client -f $k8sRoot | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Pass-Test "kubectl client-side manifest validation passed"
        }
        else {
            Fail-Test "kubectl manifest validation failed"
        }
    }
    catch {
        Fail-Test "kubectl manifest validation could not be executed"
    }
}
else {
    Write-Host "INFO: kubectl CLI not found; Kubernetes runtime validation skipped"
}

Write-Host ""
Write-Host "============================================"
Write-Host "PASSED: $passed"
Write-Host "FAILED: $failed"
Write-Host "============================================"

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "DAY 17 KUBERNETES TESTS: SUCCESS"
    exit 0
}
else {
    Write-Host ""
    Write-Host "DAY 17 KUBERNETES TESTS: FAILED"
    exit 1
}