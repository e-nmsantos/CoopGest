@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title CoopGest - Build de Distribuicao

echo.
echo ========================================================
echo   CoopGest - Build de Distribuicao Windows
echo ========================================================
echo.

:: Verificar Python
py -V >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: Python nao encontrado.
    pause
    exit /b 1
)

:: Verificar Node.js / npm
npm --version >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: Node.js / npm nao encontrado.
    pause
    exit /b 1
)

:: Data e versao
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%i"
set "VERSION=CoopGest-Windows-%STAMP%"
set "OUT_DIR=release\%VERSION%"

echo [1/6] A criar pasta de release: %OUT_DIR%
if not exist "release" mkdir "release"
mkdir "%OUT_DIR%"

echo [2/6] A compilar frontend (npm run build)...
npm run build --silent
if %errorlevel% neq 0 (
    echo ERRO: Build do frontend falhou.
    rmdir /S /Q "%OUT_DIR%"
    pause
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

:: Pasta do package coopgest
if exist "%OUT_DIR%\coopgest" rmdir /S /Q "%OUT_DIR%\coopgest"
xcopy "coopgest" "%OUT_DIR%\coopgest\" /E /I /Y /Q >nul

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

for %%f in ("%OUT_DIR%\app.py" "%OUT_DIR%\wsgi.py" "%OUT_DIR%\requirements.txt" "%OUT_DIR%\coopgest_windows.py") do (
    for /f "skip=1 tokens=*" %%h in ('certutil -hashfile "%%f" SHA256 2^>nul') do (
        if not "%%h"=="CertUtil: -hashfile command completed successfully." (
            echo %%h  %%~nxf >> "%CHECKSUM_FILE%"
            goto :next_%%~nxf
        )
    )
    :next_%%~nxf
)

echo [5/6] A criar arquivo ZIP...
set "ZIP_FILE=release\%VERSION%.zip"
powershell -NoProfile -Command "Compress-Archive -Path '%OUT_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"
if %errorlevel% neq 0 (
    echo AVISO: Nao foi possivel criar ZIP automaticamente.
    echo        Compacte manualmente a pasta %OUT_DIR%
) else (
    echo       ZIP criado: %ZIP_FILE%
    :: Checksum do ZIP
    for /f "skip=1 tokens=*" %%h in ('certutil -hashfile "%ZIP_FILE%" SHA256 2^>nul') do (
        if not "%%h"=="CertUtil: -hashfile command completed successfully." (
            echo. >> "%CHECKSUM_FILE%"
            echo --- ZIP --->> "%CHECKSUM_FILE%"
            echo %%h  %VERSION%.zip >> "%CHECKSUM_FILE%"
            goto :zip_done
        )
    )
    :zip_done
)

echo [6/6] A validar com py -m compileall...
py -m compileall -q "%OUT_DIR%\coopgest" "%OUT_DIR%\app.py" "%OUT_DIR%\wsgi.py"
if %errorlevel% neq 0 (
    echo AVISO: compileall reportou erros Python.
) else (
    echo       Python OK.
)

echo.
echo ========================================================
echo   Build concluido com sucesso!
echo ========================================================
echo.
echo   Pasta:    %OUT_DIR%
if exist "%ZIP_FILE%" echo   ZIP:      %ZIP_FILE%
echo   Checksums: %CHECKSUM_FILE%
echo.
pause
endlocal
