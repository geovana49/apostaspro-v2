@echo off
echo ===================================================
echo   CONFIGURAR GIT E ENVIAR PARA GITHUB
echo ===================================================
echo.
echo Configurando seu nome e email no Git...
git config --global user.email "siteapps77@gmail.com"
git config --global user.name "geovana49"
echo [OK] Configuracao concluida!
echo.
echo Preparando arquivos para envio...
git add .
git commit -m "Upload inicial Apostas Pro v2"
echo.
echo Enviando para o GitHub...
git push -u origin main
echo.
echo ===================================================
echo   SUCESSO!
echo ===================================================
echo.
echo Seu codigo esta em: https://github.com/geovana49/apostaspro-v2
echo.
pause
