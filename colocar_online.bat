@echo off
echo ===================================================
echo   DEPLOYMENT ONLINE - APOSTAS PRO
echo ===================================================
echo.
echo Este script vai colocar seu site na internet usando a Vercel.
echo.
echo 1. Se for a primeira vez, vai pedir para fazer LOGIN (Email/Github).
echo 2. Aceite as configuracoes padrao (apenas aperte ENTER).
echo.
echo Iniciando...
echo.
cmd /c "npx vercel deploy --prod"
echo.
echo ===================================================
echo   FIM DO PROCESSO
echo   Se tudo deu certo, o link do seu site apareceu acima!
echo ===================================================
pause
