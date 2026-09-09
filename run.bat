@echo off
setlocal EnableExtensions
cd /d "%~dp0"
cd /d "%~dp0" || exit /b 1
title CoopGest - Menu

:menu
cls
echo.
echo ========================================================
echo   CoopGest - Menu Principal
echo ========================================================
echo.
echo   [1] Iniciar servidor
echo   [2] Backup local completo (BD + uploads)
echo   [3] Restore local completo
echo   [0] Sair
echo.
echo. 
set /p choice=Escolha uma opcao: 

if "%choice%"=="1" goto start_server
if "%choice%"=="2" goto backup_local
if "%choice%"=="3" goto restore_local
if "%choice%"=="0" goto end

echo Opcao invalida.
timeout /t 2 /nobreak >nul
goto menu

:check_python
py -V >nul 2>nul
if %errorlevel% neq 0 (
    echo ERRO: Python nao foi encontrado.
    echo Instale Python 3 e marque "Add Python to PATH".
    pause
    exit /b 1
)
exit /b 0

:start_server
call :check_python
if %errorlevel% neq 0 goto menu

echo.
echo [1/3] Python encontrado.
echo [2/3] A instalar/validar dependencias...
py -m pip install -r requirements.txt

echo.
echo [3/3] A iniciar o servidor CoopGest...
echo Nao feche esta janela enquanto estiver a usar o programa.
echo.
set "HOST=127.0.0.1"
set "PORT=8050"
start "Abrir CoopGest" /min cmd /c "timeout /t 3 >nul & start """" "http://%HOST%:%PORT%""
py wsgi.py

echo.
echo O servidor foi encerrado.
pause
goto menu

:backup_local
echo.
echo A preparar backup local completo...

set "BACKUP_ROOT=backups"
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%i"
set "BACKUP_DIR=backups\coopgest-full-%STAMP%"
set "BACKUP_DIR=%BACKUP_ROOT%\coopgest-full-%STAMP%"

if not exist "backups" mkdir "backups"
mkdir "%BACKUP_DIR%"
if not exist "%BACKUP_ROOT%" mkdir "%BACKUP_ROOT%"
mkdir "%BACKUP_DIR%" || (
    echo ERRO: Nao foi possivel criar a pasta de backup.
    pause
    goto menu
)

if exist "projetos.db" (
    copy /Y "projetos.db" "%BACKUP_DIR%\projetos.db" >nul
) else (
    echo AVISO: projetos.db nao encontrado.
)

if exist "uploads" (
    xcopy "uploads" "%BACKUP_DIR%\uploads\" /E /I /Y >nul
    xcopy "uploads" "%BACKUP_DIR%\uploads\" /E /I /Y /Q >nul
) else (
    echo AVISO: pasta uploads nao encontrada.
)

if exist ".env" (
    copy /Y ".env" "%BACKUP_DIR%\.env" >nul
)

echo.
echo Backup concluido em:
echo   %BACKUP_DIR%
pause
goto menu

:restore_local
echo.
echo AVISO: faça restore apenas com o servidor parado.
echo.
echo Pressione Enter para ver as pastas de backup disponiveis ou indique o caminho.
set /p SRC=Indique a pasta de backup (ex: backups\coopgest-full-20260421-120000): 

if "%SRC%"=="" (
    echo Nenhuma pasta indicada.
    pause
    goto menu
)

if not exist "%SRC%" (
    echo ERRO: pasta nao encontrada.
    pause
    goto menu
)

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "PRESTAMP=%%i"
set "PRE_DIR=backups\pre-restore-%PRESTAMP%"
set "PRE_DIR=%BACKUP_ROOT%\pre-restore-%PRESTAMP%"
mkdir "%PRE_DIR%"

if exist "projetos.db" copy /Y "projetos.db" "%PRE_DIR%\projetos.db" >nul
if exist "uploads" xcopy "uploads" "%PRE_DIR%\uploads\" /E /I /Y >nul
if exist "uploads" xcopy "uploads" "%PRE_DIR%\uploads\" /E /I /Y /Q >nul

if exist "%SRC%\projetos.db" (
    copy /Y "%SRC%\projetos.db" "projetos.db" >nul
) else (
    echo AVISO: projetos.db nao existe no backup.
)

if exist "%SRC%\uploads" (
    if exist "uploads" rmdir /S /Q "uploads"
    xcopy "%SRC%\uploads" "uploads\" /E /I /Y >nul
    xcopy "%SRC%\uploads" "uploads\" /E /I /Y /Q >nul
) else (
    echo AVISO: uploads nao existe no backup.
)

if exist "%SRC%\.env" (
    copy /Y "%SRC%\.env" ".env" >nul
)

echo.
echo Restore concluido.
echo Backup de seguranca antes do restore:
echo   %PRE_DIR%
pause
goto menu

:end
endlocal
exit /b 0
