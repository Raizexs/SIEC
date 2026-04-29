@echo off
REM Script para ejecutar el backend SIEC
REM Asegúrate de que las dependencias estén instaladas: python -m pip install -r requirements.txt

cd /d "%~dp0"
echo.
echo ========================================
echo SIEC Backend - FastAPI Server
echo ========================================
echo.
echo Iniciando servidor en http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
