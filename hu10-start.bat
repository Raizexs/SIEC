@echo off
REM Quick Start Script for HU10 Testing with Docker
REM Uso: hu10-start.bat

echo.
echo ==========================================
echo   HU10 - Quick Start with Docker
echo ==========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker not found!
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker Compose not found!
    echo Please update Docker Desktop to include Compose
    pause
    exit /b 1
)

echo [1/3] Stopping previous containers...
docker-compose down >nul 2>&1

echo [2/3] Starting Docker services...
echo        - PostgreSQL 15 (Port 5432)
echo        - FastAPI Backend (Port 8000)
echo        - Vue.js Frontend (Port 5173)
echo.

docker-compose up -d

if %errorlevel% neq 0 (
    echo ERROR: Failed to start Docker services
    pause
    exit /b 1
)

echo.
echo [3/3] Waiting for services to initialize...
timeout /t 15 /nobreak

echo.
echo ==========================================
echo ✅ Services are ready!
echo ==========================================
echo.
echo 🌐 Frontend:  http://localhost:5173
echo 📡 API Docs:  http://localhost:8000/docs
echo 🗄️  Database:  localhost:5432
echo.
echo View logs:
echo   docker-compose logs -f
echo.
echo Stop services:
echo   docker-compose down
echo.
pause
