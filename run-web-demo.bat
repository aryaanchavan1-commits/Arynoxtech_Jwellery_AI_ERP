@echo off
title Arynoxtech Jwellery ERP - Web Demo
cd /d "%~dp0"
echo Starting Web Demo...
echo Open http://localhost:8080 in your browser
echo.
echo Accounts:
echo   superadmin / super@123 - Full access (White + Black)
echo   admin / admin@123     - White Account (Legal/GST books)
echo   black / black@123     - Black Account (Actual business)
echo.
start http://localhost:8080
npx http-server dist/web-demo -p 8080 -c-1
pause
