@echo off
echo ===================================================
echo   ATUALIZAR GITHUB - README PROFISSIONAL
echo ===================================================
echo.
echo Enviando README.md para o GitHub...
cd "C:\Users\ADM\Desktop\Apostas Pro"
git add README.md
git commit -m "Adicionar README profissional com descricao do projeto"
git push
echo.
echo ===================================================
echo   CONCLUIDO!
echo ===================================================
echo.
echo Acesse: https://github.com/geovana49/apostaspro-v2
echo.
pause
