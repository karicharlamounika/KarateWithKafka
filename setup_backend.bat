@echo off
echo Setting up the backend environment...
cd backend
echo Installing backend dependencies...
call npm install

echo Starting backend.
start "" npm run start-backend

cd ..

setlocal enabledelayedexpansion
set RETRIES=5
set WAIT=2

for /L %%i in (1,1,%RETRIES%) do (
    powershell -Command "try {Invoke-WebRequest -Uri 'http://localhost:5000/health' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0} catch {exit 1}"
    if !errorlevel! == 0 (
        echo Backend is running!
        exit /b 0
    ) else (
        echo Backend not ready yet. Retrying in %WAIT% seconds...
        timeout /t %WAIT% >nul
    )
)
echo Backend did not start in time.
exit /b 1