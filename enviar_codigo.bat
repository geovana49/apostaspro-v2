@echo off
echo ===================================================
echo   ENVIAR CODIGO PARA O GITHUB
echo ===================================================
echo.
echo Preparando arquivos...
git add .
git commit -m "Upload inicial Apostas Pro v2"
echo.
echo Enviando para o GitHub...
git push -u origin main
echo.
echo ===================================================
echo   CONCLUIDO!
echo ===================================================
echo.
echo Seu codigo esta em: https://github.com/geovana49/apostaspro-v2
echo.
pause
