@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title CoopGest - Build de Distribuicao
set "PYTHONUTF8=1"

echo.
echo ========================================================
echo   CoopGest - Build de Distribuicao Windows
echo ========================================================
echo.

:: Verificar Python
py -3.13 -V >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: Python nao encontrado.
    if /I not "%~1"=="--no-pause" pause
    exit /b 1
)
echo       Python 3.13 encontrado.

:: Verificar Node.js / npm
call npm.cmd --version >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: Node.js / npm nao encontrado.
    if /I not "%~1"=="--no-pause" pause
    exit /b 1
)
echo       Node.js / npm encontrado.

:: Data e versao
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%i"
set "VERSION=CoopGest-Windows-%STAMP%"
set "OUT_DIR=release\%VERSION%"

echo [1/6] A criar pasta de release: %OUT_DIR%
if not exist "release" mkdir "release"
mkdir "%OUT_DIR%"

echo [2/6] A compilar frontend (npm run build)...
call npm.cmd run build --silent
if %errorlevel% neq 0 (
    echo ERRO: Build do frontend falhou.
    rmdir /S /Q "%OUT_DIR%"
    if /I not "%~1"=="--no-pause" pause
    exit /b 1
)
echo       Frontend compilado com sucesso.

echo [3/6] A copiar ficheiros...

:: Backend
copy /Y "app.py"             "%OUT_DIR%\app.py"              >nul
copy /Y "wsgi.py"            "%OUT_DIR%\wsgi.py"             >nul
copy /Y "requirements.txt"   "%OUT_DIR%\requirements.txt"    >nul
copy /Y "arrancar.bat"       "%OUT_DIR%\arrancar.bat"        >nul
copy /Y "run.bat"            "%OUT_DIR%\run.bat"             >nul
copy /Y "coopgest_windows.py" "%OUT_DIR%\coopgest_windows.py" >nul
copy /Y "INSTRUCOES_PROFESSOR_WINDOWS.md" "%OUT_DIR%\INSTRUCOES.md" >nul
copy /Y "ATTRIBUTIONS.md"    "%OUT_DIR%\ATTRIBUTIONS.md"     >nul 2>nul
for %%F in (template_*.json) do if exist "%%F" copy /Y "%%F" "%OUT_DIR%\%%F" >nul

:: Pasta do package coopgest
if exist "%OUT_DIR%\coopgest" rmdir /S /Q "%OUT_DIR%\coopgest"
xcopy "coopgest" "%OUT_DIR%\coopgest\" /E /I /Y /Q >nul
for /d /r "%OUT_DIR%" %%d in (__pycache__ .pytest_cache) do if exist "%%d" rmdir /S /Q "%%d"
del /S /Q "%OUT_DIR%\*.pyc" "%OUT_DIR%\*.pyo" >nul 2>nul

:: Frontend compilado (dist/)
if exist "%OUT_DIR%\dist" rmdir /S /Q "%OUT_DIR%\dist"
xcopy "dist" "%OUT_DIR%\dist\" /E /I /Y /Q >nul

:: Pasta de templates se existir
if exist "templates" (
    xcopy "templates" "%OUT_DIR%\templates\" /E /I /Y /Q >nul
)

:: Pasta de uploads (estrutura vazia)
if not exist "%OUT_DIR%\uploads" mkdir "%OUT_DIR%\uploads"

echo [4/6] A gerar checksums SHA-256...
set "CHECKSUM_FILE=%OUT_DIR%\checksums.txt"
echo CoopGest %VERSION% - SHA-256 Checksums > "%CHECKSUM_FILE%"
echo Gerado em: %STAMP% >> "%CHECKSUM_FILE%"
echo. >> "%CHECKSUM_FILE%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path '%OUT_DIR%' -File -Recurse | Where-Object { $_.Name -ne 'checksums.txt' } | Sort-Object FullName | ForEach-Object { $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName; $rel = Resolve-Path -LiteralPath $_.FullName -Relative; ('{0}  {1}' -f $hash.Hash.ToLowerInvariant(), $rel) } | Add-Content -LiteralPath '%CHECKSUM_FILE%'"
if %errorlevel% neq 0 (
    echo AVISO: Nao foi possivel gerar checksums de todos os ficheiros.
)

echo [5/6] A criar arquivo ZIP...
set "ZIP_FILE=release\%VERSION%.zip"
powershell -NoProfile -Command "Compress-Archive -Path '%OUT_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"
if %errorlevel% neq 0 (
    echo AVISO: Nao foi possivel criar ZIP automaticamente.
    echo        Compacte manualmente a pasta %OUT_DIR%
) else (
    echo       ZIP criado: %ZIP_FILE%
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath '%ZIP_FILE%').Hash.ToLowerInvariant(); $line = ($hash + '  %VERSION%.zip'); Set-Content -LiteralPath '%ZIP_FILE%.sha256' -Value $line -Encoding UTF8; Add-Content -LiteralPath '%CHECKSUM_FILE%' -Value ''; Add-Content -LiteralPath '%CHECKSUM_FILE%' -Value '--- ZIP ---'; Add-Content -LiteralPath '%CHECKSUM_FILE%' -Value $line"
)

echo [6/6] A validar com py -3.13 -m compileall...
py -3.13 -m compileall -q "%OUT_DIR%\coopgest" "%OUT_DIR%\app.py" "%OUT_DIR%\wsgi.py"
if %errorlevel% neq 0 (
    echo AVISO: compileall reportou erros Python.
) else (
    echo       Python OK.
)
for /d /r "%OUT_DIR%" %%d in (__pycache__ .pytest_cache) do if exist "%%d" rmdir /S /Q "%%d"
del /S /Q "%OUT_DIR%\*.pyc" "%OUT_DIR%\*.pyo" >nul 2>nul

echo.
echo ========================================================
echo   Build concluido com sucesso!
echo ========================================================
echo.
echo   Pasta:    %OUT_DIR%
if exist "%ZIP_FILE%" echo   ZIP:      %ZIP_FILE%
echo   Checksums: %CHECKSUM_FILE%
echo.
if /I not "%~1"=="--no-pause" pause
endlocal
