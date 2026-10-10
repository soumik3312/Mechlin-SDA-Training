$ErrorActionPreference = "Stop"

$dayRoot = Join-Path $PSScriptRoot ".."
$repoRoot = (Resolve-Path (Join-Path $dayRoot "..\..")).Path

Write-Host ""
Write-Host "============================================"
Write-Host "DAY 18 - CI/CD PIPELINE TESTS"
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
    ".github/workflows/ci-cd.yml",
    ".github/workflows/deploy-staging.yml",
    ".github/workflows/security.yml",
    ".github/workflows/performance.yml",
    ".github/workflows/monitoring.yml",
    ".zap/rules.tsv",
    "lighthouse.config.js",
    "artillery.config.yml",
    "k6-load-test.js",
    "week3/day18/docs/cicd-guide.md"
)

foreach ($file in $requiredFiles) {
    Assert-File $file
}

$workflowFiles = @(
    ".github/workflows/ci-cd.yml",
    ".github/workflows/deploy-staging.yml",
    ".github/workflows/security.yml",
    ".github/workflows/performance.yml",
    ".github/workflows/monitoring.yml"
)

foreach ($file in $workflowFiles) {
    $path = Join-Path $repoRoot $file
    $content = Get-Content $path -Raw

    if ($content -match "(?m)^name:") {
        Pass-Test "$file contains workflow name"
    }
    else {
        Fail-Test "$file missing workflow name"
    }

    if ($content -match "(?m)^on:") {
        Pass-Test "$file contains workflow trigger"
    }
    elseif ($content -match "(?m)^on\s*:") {
        Pass-Test "$file contains workflow trigger"
    }
    else {
        Fail-Test "$file missing workflow trigger"
    }

    if ($content -match "(?m)^jobs:") {
        Pass-Test "$file contains jobs"
    }
    else {
        Fail-Test "$file missing jobs"
    }
}

$ci = Get-Content (Join-Path $repoRoot ".github/workflows/ci-cd.yml") -Raw

$ciChecks = @(
    @{ Name = "Node.js 18"; Pattern = 'NODE_VERSION: "18"' },
    @{ Name = "MongoDB service"; Pattern = "mongodb:" },
    @{ Name = "PostgreSQL service"; Pattern = "postgresql:" },
    @{ Name = "Redis service"; Pattern = "redis:" },
    @{ Name = "npm CI"; Pattern = "npm ci" },
    @{ Name = "linting"; Pattern = "npm run lint" },
    @{ Name = "type checking"; Pattern = "npm run type-check" },
    @{ Name = "unit testing"; Pattern = "npm run test:unit" },
    @{ Name = "integration testing"; Pattern = "npm run test:integration" },
    @{ Name = "security audit"; Pattern = "npm audit" },
    @{ Name = "Trivy"; Pattern = "aquasecurity/trivy-action" },
    @{ Name = "CodeQL initialization"; Pattern = "github/codeql-action/init@v3" },
    @{ Name = "CodeQL analysis"; Pattern = "github/codeql-action/analyze@v3" },
    @{ Name = "Docker Buildx"; Pattern = "docker/setup-buildx-action@v3" },
    @{ Name = "Docker login"; Pattern = "docker/login-action@v3" },
    @{ Name = "Docker build"; Pattern = "docker/build-push-action@v5" },
    @{ Name = "staging deployment"; Pattern = "deploy-staging:" },
    @{ Name = "production deployment"; Pattern = "deploy-production:" },
    @{ Name = "rollback"; Pattern = "rollback:" },
    @{ Name = "rollout status"; Pattern = "kubectl rollout status" }
)

foreach ($check in $ciChecks) {
    if ($ci -match [regex]::Escape($check.Pattern)) {
        Pass-Test "CI/CD workflow contains $($check.Name)"
    }
    else {
        Fail-Test "CI/CD workflow missing $($check.Name)"
    }
}

$staging = Get-Content (Join-Path $repoRoot ".github/workflows/deploy-staging.yml") -Raw

$stagingChecks = @(
    @{ Name = "staging environment"; Pattern = "environment: staging" },
    @{ Name = "KUBE_CONFIG_STAGING"; Pattern = "KUBE_CONFIG_STAGING" },
    @{ Name = "Kubernetes deployment"; Pattern = "kubectl apply -f k8s/" },
    @{ Name = "image update"; Pattern = "kubectl set image" },
    @{ Name = "rollout validation"; Pattern = "kubectl rollout status" },
    @{ Name = "health smoke test"; Pattern = "curl -f http://localhost:3000/health" }
)

foreach ($check in $stagingChecks) {
    if ($staging -match [regex]::Escape($check.Pattern)) {
        Pass-Test "Staging workflow contains $($check.Name)"
    }
    else {
        Fail-Test "Staging workflow missing $($check.Name)"
    }
}

$security = Get-Content (Join-Path $repoRoot ".github/workflows/security.yml") -Raw

$securityChecks = @(
    @{ Name = "Trivy scanner"; Pattern = "aquasecurity/trivy-action" },
    @{ Name = "CodeQL"; Pattern = "github/codeql-action" },
    @{ Name = "Snyk"; Pattern = "snyk/actions/node" },
    @{ Name = "OWASP ZAP"; Pattern = "zaproxy/action-baseline" },
    @{ Name = "Dependency-Check"; Pattern = "dependency-check/Dependency-Check_Action" }
)

foreach ($check in $securityChecks) {
    if ($security -match [regex]::Escape($check.Pattern)) {
        Pass-Test "Security workflow contains $($check.Name)"
    }
    else {
        Fail-Test "Security workflow missing $($check.Name)"
    }
}

$performance = Get-Content (Join-Path $repoRoot ".github/workflows/performance.yml") -Raw

$performanceChecks = @(
    @{ Name = "Lighthouse"; Pattern = "treosh/lighthouse-ci-action" },
    @{ Name = "Artillery"; Pattern = "artillery run" },
    @{ Name = "K6"; Pattern = "k6-load-test.js" },
    @{ Name = "health verification"; Pattern = "curl -f http://localhost:3000/health" }
)

foreach ($check in $performanceChecks) {
    if ($performance -match [regex]::Escape($check.Pattern)) {
        Pass-Test "Performance workflow contains $($check.Name)"
    }
    else {
        Fail-Test "Performance workflow missing $($check.Name)"
    }
}

$monitoring = Get-Content (Join-Path $repoRoot ".github/workflows/monitoring.yml") -Raw

$monitoringChecks = @(
    @{ Name = "scheduled monitoring"; Pattern = 'cron: "*/5 * * * *"' },
    @{ Name = "pod monitoring"; Pattern = "kubectl get pods" },
    @{ Name = "service monitoring"; Pattern = "kubectl get services" },
    @{ Name = "resource monitoring"; Pattern = "kubectl top pods" },
    @{ Name = "log monitoring"; Pattern = "kubectl logs" },
    @{ Name = "Slack alerting"; Pattern = "action-slack" }
)

foreach ($check in $monitoringChecks) {
    if ($monitoring -match [regex]::Escape($check.Pattern)) {
        Pass-Test "Monitoring workflow contains $($check.Name)"
    }
    else {
        Fail-Test "Monitoring workflow missing $($check.Name)"
    }
}

$guide = Get-Content (Join-Path $repoRoot "week3/day18/docs/cicd-guide.md") -Raw

$guideChecks = @(
    "CI/CD Fundamentals",
    "GitHub Actions",
    "Pipeline Stages",
    "Environment Promotion",
    "Rollback",
    "Security",
    "Performance Testing",
    "Monitoring",
    "Fast Feedback",
    "Secrets"
)

foreach ($term in $guideChecks) {
    if ($guide -match [regex]::Escape($term)) {
        Pass-Test "CI/CD documentation contains: $term"
    }
    else {
        Fail-Test "CI/CD documentation missing: $term"
    }
}

# YAML syntax validation
if (Get-Command python -ErrorAction SilentlyContinue) {
    $yamlCheck = @'
import sys
from pathlib import Path
import yaml

root = Path(sys.argv[1])
files = list(root.glob("**/*.yml")) + list(root.glob("**/*.yaml"))
files = sorted(set(files))

if not files:
    print("NO_YAML_FILES")
    sys.exit(1)

for path in files:
    with path.open("r", encoding="utf-8") as f:
        list(yaml.safe_load_all(f))
    print(f"YAML_VALID: {path.relative_to(root)}")
'@

    $tempScript = Join-Path $env:TEMP "day18_yaml_check.py"
    Set-Content -Path $tempScript -Value $yamlCheck -Encoding UTF8

    try {
        $yamlOutput = python $tempScript $repoRoot 2>&1

        if ($LASTEXITCODE -eq 0) {
            foreach ($line in $yamlOutput) {
                if ($line -match "^YAML_VALID:") {
                    Pass-Test $line
                }
            }
        }
        else {
            Write-Host $yamlOutput
            Fail-Test "YAML syntax validation failed"
        }
    }
    finally {
        Remove-Item $tempScript -Force -ErrorAction SilentlyContinue
    }
}
else {
    Write-Host "INFO: Python not found; YAML syntax validation skipped"
}

# Basic JavaScript syntax checks
$jsFiles = @(
    "lighthouse.config.js",
    "k6-load-test.js"
)

if (Get-Command node -ErrorAction SilentlyContinue) {
    foreach ($file in $jsFiles) {
        $path = Join-Path $repoRoot $file

        node --check $path 2>$null

        if ($LASTEXITCODE -eq 0) {
            Pass-Test "JavaScript syntax valid: $file"
        }
        else {
            Fail-Test "JavaScript syntax invalid: $file"
        }
    }
}
else {
    Write-Host "INFO: Node.js not found; JavaScript syntax validation skipped"
}

Write-Host ""
Write-Host "============================================"
Write-Host "PASSED: $passed"
Write-Host "FAILED: $failed"
Write-Host "============================================"

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "DAY 18 CI/CD TESTS: SUCCESS"
    exit 0
}
else {
    Write-Host ""
    Write-Host "DAY 18 CI/CD TESTS: FAILED"
    exit 1
}