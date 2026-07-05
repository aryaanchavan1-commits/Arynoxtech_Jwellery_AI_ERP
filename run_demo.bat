@echo off
title Arynoxtech Jwellery ERP - DEMO
cd /d "%~dp0"

:: Check if portable exe exists - use it as a shortcut
if exist "release\Arynoxtech Jwellery ERP-2.0.0-portable.exe" (
    echo ============================================
    echo   Arynoxtech Jwellery ERP - DEMO MODE
    echo   Quick showcase of the best Jewellery ERP
    echo ============================================
    echo.
    echo Launching Demo...
    start "" "node_modules\electron\dist\electron.exe" "%~dp0demo.js"
    exit /b
)

:: Check dependencies
if not exist "node_modules" (
    echo Installing dependencies (first time setup)...
    call npm install --legacy-peer-deps
)

:: Build frontend
if not exist "dist\renderer\bundle.js" (
    echo Building frontend...
    call npx webpack --config webpack.config.js --mode production
)

echo ============================================
echo   Arynoxtech Jwellery ERP - DEMO MODE
echo   Quick showcase of the best Jewellery ERP
echo ============================================
echo.
echo Launching Demo...
start "" "node_modules\electron\dist\electron.exe" "%~dp0demo.js"
