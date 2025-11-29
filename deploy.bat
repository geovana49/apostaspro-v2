@echo off
echo ==========================================
echo      DEPLOY AUTOMATICO - APOSTAS PRO
echo ==========================================
echo.

echo [1/2] Gerando versao de producao (Build)...
call npm run build
if %errorlevel% neq 0 (
    echo Erro no build. Verifique o console.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Enviando para o Firebase Hosting...
call firebase deploy
if %errorlevel% neq 0 (
    echo Erro no deploy. Verifique se voce esta logado (firebase login) e se o projeto foi iniciado (firebase init).
    pause
    exit /b %errorlevel%
)

echo.
echo ==========================================
echo      SUCESSO! SITE ONLINE
echo ==========================================
pause
