@echo off
title Arynoxtech Jwellery ERP Management System
cd /d "%~dp0"

echo ============================================
echo   Arynoxtech Jwellery ERP Management System
echo   Version 2.0.0 - 2026
echo   The Best Jewellery Store Management Software
echo ============================================
echo.

:: Check for portable EXE as first preference
if exist "release\Arynoxtech Jwellery ERP-2.0.0-portable.exe" (
    echo [Quick Launch] Found portable EXE - launching directly...
    start "" "release\Arynoxtech Jwellery ERP-2.0.0-portable.exe"
    exit /b 0
)

:: Check node_modules
if not exist "node_modules" (
    echo [1/3] Installing dependencies (first run setup)...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo ERROR: npm install failed. Check your internet connection.
        pause
        exit /b 1
    )
)

:: Build webpack bundle
if not exist "dist\renderer\bundle.js" (
    echo [2/3] Building frontend...
    call npx webpack --config webpack.config.js --mode production
    if errorlevel 1 (
        echo ERROR: Frontend build failed.
        pause
        exit /b 1
    )
)

:: Launch with electron
echo [3/3] Starting application...
start "" /MIN "node_modules\electron\dist\electron.exe" . --no-sandbox
if errorlevel 1 (
    echo ERROR: Failed to launch Electron. Try running: npm start
    pause
    exit /b 1
)

echo Application launched successfully!
echo You can close this window.
