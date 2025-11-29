@echo off
echo ==========================================
echo      DEPLOY DIRETO VERCEL - APOSTAS PRO
echo ==========================================
echo.
echo Este script vai enviar seu site DIRETAMENTE do seu computador para a Vercel.
echo Isso resolve o problema de contas do GitHub trocadas.
echo.
echo [1/2] Preparando para enviar...
echo Voce precisara fazer login na Vercel se for a primeira vez.
echo.

call npx vercel --prod

echo.
echo ==========================================
echo      PROCESSO FINALIZADO
echo ==========================================
echo Se apareceu "Production: https://...", seu site esta atualizado!
pause
