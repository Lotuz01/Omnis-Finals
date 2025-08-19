@echo off
setlocal enabledelayedexpansion
title Iniciar Aplicativo Omnis

:: Diretório do projeto
cd /d "c:\Users\Lotuz\Desktop\OMNIS\Omnis-Finals"

:: Verificar e instalar dependências se necessário
if not exist node_modules (
    echo Instalando dependencias...
    call npm install
)

:: Verificar se o servidor já está rodando na porta 3000
powershell -command "if (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
if !errorlevel! EQU 0 (
    echo Servidor já em execução.
) else (
    echo Iniciando o servidor...
    start /b npm run dev
    call :waitForServer
)

goto :endWait

:waitForServer
    REM Aguardar o servidor iniciar com loop de verificação
    set /a attempts=0
    :waitloop
    timeout /t 2 >nul
    powershell -command "if (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
    if !errorlevel! EQU 0 goto :serverready
    set /a attempts+=1
    if !attempts! LSS 30 goto :waitloop
    echo Falha ao iniciar o servidor após 60 segundos. Encerrando...
    exit /b 1
    :serverready
    timeout /t 15 >nul
    :checkready
    powershell -command "try { Invoke-WebRequest -Uri http://localhost:3000/login -Method Head -UseBasicParsing | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
    if !errorlevel! EQU 0 goto :ready
    timeout /t 1 >nul
    goto :checkready
    :ready
    exit /b 0
:endWait

:: Abrir o Microsoft Edge em tela cheia na página de login e esperar fechamento
set "EDGE_PATH=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

:: Desabilitar Startup Boost e modo background para garantir que --start-fullscreen funcione
reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v StartupBoostEnabled /t REG_DWORD /d 0 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge" /v BackgroundModeEnabled /t REG_DWORD /d 0 /f >nul 2>&1

if exist !EDGE_PATH! (
    taskkill /f /im msedge.exe >nul 2>&1
    powershell -command "Start-Process -FilePath '!EDGE_PATH!' -ArgumentList '--kiosk','http://localhost:3000/login','--edge-kiosk-type=fullscreen'"

:monitor_browser
    timeout /t 5 >nul
    tasklist /fi "IMAGENAME eq msedge.exe" 2>NUL | find /I /N "msedge.exe">NUL
    if "%ERRORLEVEL%"=="0" goto monitor_browser
) else (
    echo Microsoft Edge não encontrado. Abrindo no navegador padrão.
    powershell -command "Start-Process -FilePath 'msedge' -ArgumentList '--new-window', 'http://localhost:3000/login'"

:monitor_browser_default
    timeout /t 5 >nul
    tasklist /fi "IMAGENAME eq msedge.exe" 2>NUL | find /I /N "msedge.exe">NUL
    if "%ERRORLEVEL%"=="0" goto monitor_browser_default
)

:: Fechar processos ao fechar o navegador
taskkill /f /im node.exe /t >nul 2>&1
taskkill /f /im cmd.exe /fi "WINDOWTITLE eq Iniciar Aplicativo Omnis" >nul 2>&1
exit