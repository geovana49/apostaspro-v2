@echo off
echo ===================================================
echo   ATUALIZAR GITHUB - APOSTAS PRO
echo ===================================================
echo.
echo Salvando suas alteracoes e enviando para o GitHub...
echo.

git add .
set /p msg="Digite uma mensagem sobre o que mudou (ou aperte Enter para 'Atualizacao'): "
if "%msg%"=="" set msg=Atualizacao

git commit -m "%msg%"
git push

echo.
echo ===================================================
echo   SUCESSO!
echo   Tudo atualizado no seu GitHub.
echo ===================================================
pause
