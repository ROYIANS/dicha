#Requires -Version 5.1
<#
.SYNOPSIS
  One-click self-hosted deploy for dicha (Docker Compose).

.DESCRIPTION
  Images are built in CI (GitHub Actions) and pushed to GHCR on every push to main.
  This script pulls those prebuilt images and (re)starts the stack — no local build.

  Safe to run repeatedly:
  - First run: creates .env, pulls images, starts stack (empty DB volume).
  - Later runs: pulls latest images, recreates services (DB volume kept).
  - Use -Fresh to wipe volumes too (blank database).
  - Use -Build to build images locally instead of pulling from GHCR.

.EXAMPLE
  .\deploy.ps1
  .\deploy.ps1 -Fresh
  .\deploy.ps1 -Down
#>
param(
    [switch]$Fresh,
    [switch]$Down,
    [switch]$Logs,
    [switch]$Build
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Write-Step([string]$Message) {
    Write-Host "▸ $Message" -ForegroundColor Green
}

function Write-WarnStep([string]$Message) {
    Write-Host "▸ $Message" -ForegroundColor Yellow
}

function Fail([string]$Message) {
    Write-Host "✗ $Message" -ForegroundColor Red
    exit 1
}

function Test-EnvFile {
    $lineNo = 0
    foreach ($line in Get-Content '.env') {
        $lineNo += 1
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }

        if ($trimmed -match '^(DICHA_ADMIN_(BACKUP_COMMAND|RESTART_API_COMMAND|RESTART_AI_GATEWAY_COMMAND|CLEAR_CACHE_COMMAND))\s*=(.*)$') {
            $key = $Matches[1]
            $value = $Matches[3].Trim()
            if ($value -and -not $value.StartsWith("'") -and ($value -match '\s|\$|\(')) {
                Fail ".env line ${lineNo}: ${key} must wrap command values in single quotes."
            }
        }
    }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker is not installed. See https://docs.docker.com/get-docker/"
}

try {
    docker compose version | Out-Null
} catch {
    Fail "Docker Compose v2 plugin not found (need 'docker compose')."
}

if ($Down) {
    Write-Step "Stopping dicha stack…"
    docker compose down --remove-orphans
    exit 0
}

if ($Logs) {
    docker compose logs -f
    exit 0
}

if (-not (Test-Path '.env')) {
    if (Test-Path '.env.example') {
        Copy-Item '.env.example' '.env'
        Write-WarnStep "Created .env from .env.example — change POSTGRES_PASSWORD before production."
    } else {
        Fail "Missing .env and .env.example"
    }
}

Test-EnvFile

# Load .env for display (docker compose reads it automatically)
$envLines = Get-Content '.env' | Where-Object { $_ -match '^\s*[^#]' -and $_ -match '=' }
foreach ($line in $envLines) {
    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) {
        Set-Item -Path "Env:$($parts[0].Trim())" -Value $parts[1].Trim().Trim('"').Trim("'")
    }
}

$webPort = if ($env:WEB_PORT) { $env:WEB_PORT } else { '8080' }
$adminPort = if ($env:ADMIN_PORT) { $env:ADMIN_PORT } else { '8081' }

if ($Fresh) {
    Write-WarnStep "Fresh deploy: removing containers and volumes (database will be wiped)…"
    docker compose down -v --remove-orphans
} else {
    Write-Step "Stopping existing containers (keeping database volume)…"
    docker compose down --remove-orphans
}

Write-Step "Removing dangling images from previous builds…"
docker image prune -f | Out-Null

if ($Build) {
    Write-Step "Building api + ai-gateway + web + admin images locally (no cache)…"
    docker compose build --no-cache
    if ($LASTEXITCODE -ne 0) { Fail "docker compose build failed" }
} else {
    $prefix = if ($env:IMAGE_PREFIX) { $env:IMAGE_PREFIX } else { 'ghcr.io/royians/dicha' }
    $tag = if ($env:IMAGE_TAG) { $env:IMAGE_TAG } else { 'latest' }
    Write-Step "Pulling prebuilt images from $prefix (tag: $tag)…"
    docker compose pull api ai-gateway web admin
    if ($LASTEXITCODE -ne 0) { Fail "docker compose pull failed" }
}

Write-Step "Starting stack with recreated containers…"
docker compose up -d --force-recreate --remove-orphans
if ($LASTEXITCODE -ne 0) { Fail "docker compose up failed" }

Write-Step "Waiting for services…"
$deadline = (Get-Date).AddMinutes(5)
while ((Get-Date) -lt $deadline) {
    $ps = docker compose ps --format json 2>$null
    if ($ps -match '"Health":"unhealthy"') {
        docker compose ps
        Fail "Unhealthy service. Run: .\deploy.ps1 -Logs"
    }
    if ($ps -notmatch '"Health":"starting"') { break }
    Start-Sleep -Seconds 3
}

Write-Host ""
Write-Step "dicha is up."
Write-Host "  App:    http://localhost:${webPort}/"
Write-Host "  Admin:  http://localhost:${adminPort}/"
Write-Host "  API:    http://localhost:${webPort}/api/health"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  .\deploy.ps1            # pull latest images + redeploy (keeps DB)"
Write-Host "  .\deploy.ps1 -Build     # build images locally instead of pulling"
Write-Host "  .\deploy.ps1 -Fresh     # wipe DB + redeploy from scratch"
Write-Host "  .\deploy.ps1 -Logs      # follow logs"
Write-Host "  .\deploy.ps1 -Down      # stop stack"
