@echo off
title Arynoxtech Jwellery ERP - Client Demo
cd /d "%~dp0"
echo Launching Arynoxtech Jwellery ERP...
if exist "release\Arynoxtech Jwellery ERP-2.0.0-portable.exe" (
    start "" "release\Arynoxtech Jwellery ERP-2.0.0-portable.exe"
    echo App started successfully!
) else (
    echo ERROR: Portable EXE not found.
    echo Run "npm run pack" first to build it.
    pause
)
