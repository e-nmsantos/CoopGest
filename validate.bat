@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title CoopGest - Validacao Completa
set "PYTHONUTF8=1"

echo.
echo ========================================================
echo   CoopGest - Validacao Completa
echo ========================================================
echo.

echo [1/7] Build frontend...
call npm.cmd run build --silent
if %errorlevel% neq 0 goto fail

echo [2/7] ESLint...
call npm.cmd run lint --silent
if %errorlevel% neq 0 goto fail

echo [3/7] TypeScript...
call npm.cmd run typecheck --silent
if %errorlevel% neq 0 goto fail

echo [4/7] npm audit high+...
call npm.cmd audit --audit-level=high
if %errorlevel% neq 0 goto fail

echo [5/7] Python compileall...
py -3.13 -m compileall -q app.py coopgest tests
if %errorlevel% neq 0 goto fail

echo [6/7] pytest...
py -3.13 -m pytest -q
if %errorlevel% neq 0 goto fail

echo [7/7] Playwright E2E...
call npm.cmd run e2e
if %errorlevel% neq 0 goto fail

echo.
echo ========================================================
echo   TUDO OK - app pronta para release
echo ========================================================
echo.
if /I not "%~1"=="--no-pause" pause
exit /b 0

:fail
echo.
echo ========================================================
echo   ERRO - ver output acima
echo ========================================================
echo.
if /I not "%~1"=="--no-pause" pause
exit /b 1
