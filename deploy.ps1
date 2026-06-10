#Requires -Version 5.1
<#
.SYNOPSIS
  One-click self-hosted deploy for vidorra (Docker Compose).

.DESCRIPTION
  Safe to run repeatedly:
  - First run: creates .env, builds images, starts stack (empty DB volume).
  - Later runs: stops containers, rebuilds without cache, recreates services (DB volume kept).
  - Use -Fresh to wipe volumes too (blank database).

.EXAMPLE
  .\deploy.ps1
  .\deploy.ps1 -Fresh
  .\deploy.ps1 -Down
#>
param(
    [switch]$Fresh,
    [switch]$Down,
    [switch]$Logs
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

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker is not installed. See https://docs.docker.com/get-docker/"
}

try {
    docker compose version | Out-Null
} catch {
    Fail "Docker Compose v2 plugin not found (need 'docker compose')."
}

if ($Down) {
    Write-Step "Stopping vidorra stack…"
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

# Load .env for display (docker compose reads it automatically)
$envLines = Get-Content '.env' | Where-Object { $_ -match '^\s*[^#]' -and $_ -match '=' }
foreach ($line in $envLines) {
    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) {
        Set-Item -Path "Env:$($parts[0].Trim())" -Value $parts[1].Trim().Trim('"')
    }
}

$webPort = if ($env:WEB_PORT) { $env:WEB_PORT } else { '8080' }

if ($Fresh) {
    Write-WarnStep "Fresh deploy: removing containers and volumes (database will be wiped)…"
    docker compose down -v --remove-orphans
} else {
    Write-Step "Stopping existing containers (keeping database volume)…"
    docker compose down --remove-orphans
}

Write-Step "Removing dangling images from previous builds…"
docker image prune -f | Out-Null

Write-Step "Building api + web images (no cache)…"
docker compose build --no-cache
if ($LASTEXITCODE -ne 0) { Fail "docker compose build failed" }

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
Write-Step "vidorra is up."
Write-Host "  App:  http://localhost:${webPort}/"
Write-Host "  API:  http://localhost:${webPort}/api/health"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  .\deploy.ps1            # upgrade redeploy (keeps DB)"
Write-Host "  .\deploy.ps1 -Fresh     # wipe DB + redeploy from scratch"
Write-Host "  .\deploy.ps1 -Logs      # follow logs"
Write-Host "  .\deploy.ps1 -Down      # stop stack"
