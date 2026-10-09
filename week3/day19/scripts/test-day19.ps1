$ErrorActionPreference = "Stop"

$repoRoot = [System.IO.Path]::GetFullPath(
    (Join-Path $PSScriptRoot "..\..\..")
)

$appRoot = Join-Path $repoRoot "week3\day19\SDATrainingApp"
$failures = 0

function Pass([string]$message) {
    Write-Host "[PASS] $message" -ForegroundColor Green
}

function Fail([string]$message) {
    Write-Host "[FAIL] $message" -ForegroundColor Red
    $script:failures++
}

Write-Host "`n========== DAY 19 VALIDATION ==========" -ForegroundColor Cyan
Write-Host "Repository: $repoRoot"
Write-Host "App:        $appRoot"

$appFiles = @(
    "App.tsx",
    "index.js",
    "babel.config.js",
    "package.json",
    "tsconfig.json",
    "__tests__\App.test.tsx",
    "src\types\index.ts",
    "src\navigation\AppNavigator.tsx",
    "src\screens\LoginScreen.tsx",
    "src\screens\DashboardScreen.tsx",
    "src\screens\AnalyticsScreen.tsx",
    "src\screens\ProfileScreen.tsx",
    "src\screens\SettingsScreen.tsx",
    "src\services\apiService.ts",
    "src\services\offlineService.ts",
    "src\services\notificationService.ts",
    "src\store\index.ts",
    "src\store\hooks.ts",
    "src\store\slices\authSlice.ts",
    "src\store\slices\userSlice.ts",
    "src\store\slices\analyticsSlice.ts",
    "src\store\slices\offlineSlice.ts"
)

foreach ($relative in $appFiles) {
    $path = Join-Path $appRoot $relative

    if (-not (Test-Path $path -PathType Leaf)) {
        Fail "Missing file: $relative"
        continue
    }

    if ((Get-Item $path).Length -eq 0) {
        Fail "Empty file: $relative"
        continue
    }

    Pass "File exists and is non-empty: $relative"
}

$guidePath = Join-Path $repoRoot "week3\day19\docs\react-native-guide.md"

if ((Test-Path $guidePath -PathType Leaf) -and
    (Get-Item $guidePath).Length -gt 0) {
    Pass "React Native guide exists and is non-empty"
} else {
    Fail "Missing or empty React Native guide"
}

try {
    $package = Get-Content (Join-Path $appRoot "package.json") -Raw |
        ConvertFrom-Json

    $requiredDependencies = @(
        "@react-navigation/native",
        "@react-navigation/stack",
        "@react-navigation/bottom-tabs",
        "@reduxjs/toolkit",
        "react-redux",
        "@react-native-async-storage/async-storage",
        "@react-native-community/netinfo",
        "react-native-notify-kit",
        "react-native-reanimated",
        "react-native-worklets"
    )

    foreach ($dependency in $requiredDependencies) {
        if ($package.dependencies.PSObject.Properties.Name -contains $dependency) {
            Pass "Dependency declared: $dependency"
        } else {
            Fail "Dependency missing from package.json: $dependency"
        }
    }

    if ($package.dependencies.PSObject.Properties.Name -contains
        "react-native-push-notification") {
        Fail "Archived notification package is still declared"
    } else {
        Pass "Archived notification package removed"
    }
} catch {
    Fail "package.json validation failed: $($_.Exception.Message)"
}

Push-Location $appRoot

try {
    Write-Host "`n========== TYPESCRIPT ==========" -ForegroundColor Cyan

    & npm exec -- tsc --noEmit --pretty false
    $tsExit = $LASTEXITCODE

    if ($tsExit -eq 0) {
        Pass "TypeScript compilation"
    } else {
        Fail "TypeScript compilation failed (exit $tsExit)"
    }

    Write-Host "`n========== JEST ==========" -ForegroundColor Cyan

    & npm test -- --runInBand
    $jestExit = $LASTEXITCODE

    if ($jestExit -eq 0) {
        Pass "Jest tests"
    } else {
        Fail "Jest tests failed (exit $jestExit)"
    }
} catch {
    Fail "Test execution error: $($_.Exception.Message)"
} finally {
    Pop-Location
}

Write-Host "`n========== FINAL RESULT ==========" -ForegroundColor Cyan

if ($failures -eq 0) {
    Write-Host "DAY 19 LOCAL TESTS: SUCCESS" -ForegroundColor Green
    exit 0
}

Write-Host "DAY 19 LOCAL TESTS: FAILED ($failures failure(s))" -ForegroundColor Red
exit 1