@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title CoopGest - Validação Completa

echo.
echo ========================================================
echo   CoopGest - Validação Completa
echo ========================================================
echo.

set "ERROS=0"

echo [1/6] ESLint...
call npm run lint --silent
if %errorlevel% neq 0 ( echo FALHOU: lint & set "ERROS=1" ) else echo       OK

echo [2/6] TypeScript...
call npm run typecheck --silent
if %errorlevel% neq 0 ( echo FALHOU: typecheck & set "ERROS=1" ) else echo       OK

echo [3/6] Build frontend...
call npm run build --silent
if %errorlevel% neq 0 ( echo FALHOU: build & set "ERROS=1" ) else echo       OK

echo [4/6] npm audit (high+)...
call npm audit --audit-level=high --silent
if %errorlevel% neq 0 ( echo FALHOU: audit & set "ERROS=1" ) else echo       OK

echo [5/6] pytest...
py -m pytest -q
if %errorlevel% neq 0 ( echo FALHOU: pytest & set "ERROS=1" ) else echo       OK

echo [6/6] E2E Playwright...
call npm run e2e
if %errorlevel% neq 0 ( echo FALHOU: e2e & set "ERROS=1" ) else echo       OK

echo.
echo ========================================================
if "%ERROS%"=="0" (
    echo   TUDO OK - app pronta para release
) else (
    echo   ERROS ENCONTRADOS - ver output acima
)
echo ========================================================
echo.
pause
endlocal
