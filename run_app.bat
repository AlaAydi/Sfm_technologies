@echo off
title Droppy Leak Detection Suite Launcher
echo ========================================================
echo        Droppy IA + Spring Boot + Angular 19 Suite
echo ========================================================
echo.

echo [1/3] Demarrage du microservice IA (FastAPI)
start "Droppy IA (FastAPI)" cmd /k "cd /d %~dp0 && .venv\Scripts\activate && uvicorn src.main:app --host 127.0.0.1 --port 8001"

timeout /t 3 /nobreak >nul

echo [2/3] Demarrage du backend Spring Boot...
start "Droppy Backend (Spring Boot)" cmd /k "cd /d %~dp0\core-service && ..\.mvn-bin\apache-maven-3.9.6\bin\mvn.cmd spring-boot:run"

timeout /t 10 /nobreak >nul

echo [3/3] Demarrage de l'interface Angular 19...
start "Droppy Frontend (Angular 19)" cmd /k "cd /d %~dp0\dashboard-angular && npx ng serve --port 4200"

echo.
echo ========================================================
echo [OK] Tous les modules ont ete lances !
echo - Swagger API FastAPI : http://127.0.0.1:8001/docs
echo - API Backend Spring Boot : http://127.0.0.1:8082/api/v1/droppy/anomalies
echo - Application Web Angular : http://localhost:4200
echo ========================================================
pause
