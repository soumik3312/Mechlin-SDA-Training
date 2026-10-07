$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

$passed = 0
$failed = 0

function Test-Pass {
    param([string]$Message)
    Write-Host "PASS: $Message" -ForegroundColor Green
    $script:passed++
}

function Test-Fail {
    param([string]$Message)
    Write-Host "FAIL: $Message" -ForegroundColor Red
    $script:failed++
}

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if ($Condition) {
        Test-Pass $Message
    }
    else {
        Test-Fail $Message
    }
}

Write-Host ""
Write-Host "============================================"
Write-Host "DAY 15 - DEVOPS ENVIRONMENT TESTS"
Write-Host "============================================"
Write-Host ""

# -------------------------------------------------
# Required files
# -------------------------------------------------

$requiredFiles = @(
    "config/environments.js",
    "config/secrets.js",
    "infrastructure/docker-compose.yml",
    "monitoring/health-check.js",
    "docs/environment-management.md",
    "docs/devops-guide.md",
    ".env.example",
    ".gitignore"
)

foreach ($file in $requiredFiles) {
    $path = Join-Path $root $file

    Assert-True `
        (Test-Path $path) `
        "Required file exists: $file"
}

# -------------------------------------------------
# JavaScript syntax
# -------------------------------------------------

$jsFiles = @(
    "config/environments.js",
    "config/secrets.js",
    "monitoring/health-check.js"
)

foreach ($file in $jsFiles) {
    $path = Join-Path $root $file

    node --check $path

    Assert-True `
        ($LASTEXITCODE -eq 0) `
        "JavaScript syntax valid: $file"
}

# -------------------------------------------------
# Environment configuration
# -------------------------------------------------

Push-Location $root

try {

    $environmentOutput = node -e @"
const config = require('./config/environments');

const names = Object.keys(config.environments);

if (names.length !== 3) {
  console.error('Expected 3 environments');
  process.exit(1);
}

for (const name of ['development', 'staging', 'production']) {
  if (!config.environments[name]) {
    console.error('Missing environment:', name);
    process.exit(1);
  }
}

if (config.environments.development.name !== 'development') {
  process.exit(1);
}

if (config.environments.staging.name !== 'staging') {
  process.exit(1);
}

if (config.environments.production.name !== 'production') {
  process.exit(1);
}

process.stdout.write('ENVIRONMENT_CONFIG_VALID');
"@ 2>&1

    Write-Host $environmentOutput

    Assert-True `
        ($LASTEXITCODE -eq 0 -and $environmentOutput -match "ENVIRONMENT_CONFIG_VALID") `
        "Development/staging/production configuration validated"

    # -------------------------------------------------
    # Environment selection
    # -------------------------------------------------

    $envSelection = node -e @"
process.env.NODE_ENV = 'staging';

const { getEnvironment } = require('./config/environments');

const environment = getEnvironment();

if (environment.name !== 'staging') {
  process.exit(1);
}

process.stdout.write(environment.name);
"@ 2>&1

    Write-Host $envSelection

    Assert-True `
        ($LASTEXITCODE -eq 0 -and $envSelection -match "staging") `
        "NODE_ENV correctly selects staging configuration"

    # -------------------------------------------------
    # Secrets encryption/decryption
    # -------------------------------------------------

    $secretTest = node -e @"
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const secrets = require('./config/secrets');

const original = 'Day15-Secret-Value';

const encrypted = secrets.encrypt(original);

if (!encrypted.encrypted || !encrypted.iv || !encrypted.authTag) {
  process.exit(1);
}

const decrypted = secrets.decrypt(encrypted);

if (decrypted !== original) {
  process.exit(1);
}

process.stdout.write('SECRETS_ENCRYPTION_VALID');
"@ 2>&1

    Write-Host $secretTest

    Assert-True `
        ($LASTEXITCODE -eq 0 -and $secretTest -match "SECRETS_ENCRYPTION_VALID") `
        "AES-256-GCM secret encryption/decryption works"

    # -------------------------------------------------
    # Secret validation
    # -------------------------------------------------

    $validationTest = node -e @"
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost/test';
process.env.POSTGRES_PASSWORD = 'test-password';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const secrets = require('./config/secrets');

if (secrets.validateSecrets() !== true) {
  process.exit(1);
}

process.stdout.write('SECRET_VALIDATION_VALID');
"@ 2>&1

    Write-Host $validationTest

    Assert-True `
        ($LASTEXITCODE -eq 0 -and $validationTest -match "SECRET_VALIDATION_VALID") `
        "Required secret validation works"

    # -------------------------------------------------
    # Health module loading
    # -------------------------------------------------

    $healthLoad = node -e @"
const healthCheck = require('./monitoring/health-check');

const methods = [
  'checkDatabase',
  'checkRedis',
  'checkPostgreSQL',
  'getSystemInfo',
  'performHealthCheck'
];

for (const method of methods) {
  if (typeof healthCheck[method] !== 'function') {
    process.exit(1);
  }
}

process.stdout.write('HEALTH_MODULE_VALID');
"@ 2>&1

    Write-Host $healthLoad

    Assert-True `
        ($LASTEXITCODE -eq 0 -and $healthLoad -match "HEALTH_MODULE_VALID") `
        "Monitoring health-check module validated"

}
finally {
    Pop-Location
}

# -------------------------------------------------
# Docker Compose YAML checks
# -------------------------------------------------

$composePath = Join-Path $root "infrastructure/docker-compose.yml"
$composeContent = Get-Content $composePath -Raw

foreach ($service in @("app:", "mongodb:", "postgresql:", "redis:", "nginx:")) {
    Assert-True `
        ($composeContent.Contains($service)) `
        "Docker Compose contains service: $service"
}

foreach ($volume in @("mongodb_data:", "postgresql_data:", "redis_data:")) {
    Assert-True `
        ($composeContent.Contains($volume)) `
        "Docker Compose contains volume: $volume"
}

# -------------------------------------------------
# Documentation checks
# -------------------------------------------------

$environmentDocs = Get-Content `
    (Join-Path $root "docs/environment-management.md") `
    -Raw

$devopsDocs = Get-Content `
    (Join-Path $root "docs/devops-guide.md") `
    -Raw

Assert-True `
    ($environmentDocs.Contains("Development Environment")) `
    "Environment documentation contains development environment"

Assert-True `
    ($environmentDocs.Contains("Staging Environment")) `
    "Environment documentation contains staging environment"

Assert-True `
    ($environmentDocs.Contains("Production Environment")) `
    "Environment documentation contains production environment"

Assert-True `
    ($devopsDocs.Contains("Secrets Management")) `
    "DevOps documentation contains secrets management"

Assert-True `
    ($devopsDocs.Contains("Monitoring")) `
    "DevOps documentation contains monitoring"

# -------------------------------------------------
# Secret protection checks
# -------------------------------------------------

$gitignore = Get-Content `
    (Join-Path $root ".gitignore") `
    -Raw

Assert-True `
    ($gitignore.Contains(".env")) `
    ".env is protected by .gitignore"

Assert-True `
    ($gitignore.Contains("*.key")) `
    "Key files are protected by .gitignore"

# -------------------------------------------------
# Final result
# -------------------------------------------------

Write-Host ""
Write-Host "============================================"
Write-Host "PASSED: $passed"
Write-Host "FAILED: $failed"
Write-Host "============================================"
Write-Host ""

if ($failed -gt 0) {
    Write-Host "DAY 15 DEVOPS TESTS: FAILED" -ForegroundColor Red
    exit 1
}

Write-Host "DAY 15 DEVOPS TESTS: SUCCESS" -ForegroundColor Green
exit 0