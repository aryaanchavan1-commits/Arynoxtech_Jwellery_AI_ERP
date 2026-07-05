@echo off
title Arynoxtech Jwellery ERP - Demo Mode
echo ============================================
echo   Arynoxtech Jwellery ERP - DEMO
echo   The Best Jewellery Store Management Software
echo ============================================
echo.
echo Launching Demo...
cd /d "%~dp0.."
npx electron demo.js
pause
