# Quick Start Script for HU10 Testing with Docker
# Usage: .\hu10-start.ps1

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   HU10 - Quick Start with Docker" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
try {
    docker --version | Out-Null
} catch {
    Write-Host "ERROR: Docker not found!" -ForegroundColor Red
    Write-Host "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Docker Compose is available
try {
    docker-compose --version | Out-Null
} catch {
    Write-Host "ERROR: Docker Compose not found!" -ForegroundColor Red
    Write-Host "Please update Docker Desktop to include Compose"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[1/3] Stopping previous containers..." -ForegroundColor Yellow
docker-compose down *> $null

Write-Host "[2/3] Starting Docker services..." -ForegroundColor Yellow
Write-Host "        - PostgreSQL 15 (Port 5432)" -ForegroundColor Gray
Write-Host "        - FastAPI Backend (Port 8000)" -ForegroundColor Gray
Write-Host "        - Vue.js Frontend (Port 5173)" -ForegroundColor Gray
Write-Host ""

docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start Docker services" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[3/3] Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "✅ Services are ready!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend:  " -ForegroundColor Cyan -NoNewLine
Write-Host "http://localhost:5173" -ForegroundColor Green
Write-Host "📡 API Docs:  " -ForegroundColor Cyan -NoNewLine
Write-Host "http://localhost:8000/docs" -ForegroundColor Green
Write-Host "🗄️  Database:  " -ForegroundColor Cyan -NoNewLine
Write-Host "localhost:5432" -ForegroundColor Green
Write-Host ""
Write-Host "View logs:" -ForegroundColor Yellow
Write-Host "   docker-compose logs -f" -ForegroundColor Gray
Write-Host ""
Write-Host "Stop services:" -ForegroundColor Yellow
Write-Host "   docker-compose down" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
