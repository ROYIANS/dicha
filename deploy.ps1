#Requires -Version 5.1
<#
.SYNOPSIS
  One-click self-hosted deploy for vidorra (Docker Compose).

.EXAMPLE
  .\deploy.ps1
  .\deploy.ps1 -Rebuild
  .\deploy.ps1 -Down
#>
param(
    [switch]$Rebuild,
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
    docker compose down
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

$composeArgs = @('compose', 'up', '-d', '--remove-orphans')
if ($Rebuild -or -not (docker compose ps -q api 2>$null)) {
    $composeArgs += '--build'
}

Write-Step "Building images and starting stack…"
& docker @composeArgs
if ($LASTEXITCODE -ne 0) { Fail "docker compose up failed" }

Write-Step "Waiting for services…"
$deadline = (Get-Date).AddMinutes(3)
while ((Get-Date) -lt $deadline) {
    $ps = docker compose ps --format json 2>$null
    if ($ps -match '"Health":"unhealthy"') {
        docker compose ps
        Fail "Unhealthy service. Run: docker compose logs"
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
Write-Host "  .\deploy.ps1 -Logs      # follow logs"
Write-Host "  docker compose ps       # service status"
Write-Host "  .\deploy.ps1 -Down      # stop stack"
Write-Host "  .\deploy.ps1 -Rebuild   # force rebuild images"
