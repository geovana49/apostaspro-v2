@echo off
cd /d "%~dp0"
echo ==========================================
echo      BUILDING APOSTAS PRO
echo ==========================================
echo.
echo Gerando versao de producao...
echo.
cmd /c npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERRO NO BUILD!
    pause
    exit /b %errorlevel%
)
echo.
echo ==========================================
echo      BUILD CONCLUIDO COM SUCESSO!
echo ==========================================
pause
