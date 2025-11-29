@echo off
echo Parando servidores antigos...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo Iniciando ApostasPro em modo discreto...
echo.

:: Inicia o servidor minimizado
start /min cmd /k "npm run dev"

:: Aguarda 5 segundos para o servidor subir
timeout /t 5 >nul

:: O navegador abre automaticamente pelo Vite (open: true)

echo.
echo Servidor rodando em segundo plano!
echo Voce pode fechar esta janela se quiser, mas nao a janela minimizada.
echo.
timeout /t 3 >nul
exit
