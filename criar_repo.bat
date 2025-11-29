@echo off
echo ===================================================
echo   CRIAR REPOSITORIO - APOSTAS PRO V2
echo ===================================================
echo.
echo Verificando se ja existe repositorio local...
echo.

if not exist ".git" (
    echo Criando repositorio Git local...
    git init
    git branch -M main
    git add .
    git commit -m "Upload inicial Apostas Pro v2"
    echo [OK] Repositorio local criado!
) else (
    echo [OK] Repositorio local ja existe!
)

echo.
echo Criando 'apostaspro-v2' no GitHub e enviando codigo...
echo.

gh repo create apostaspro-v2 --public --source=. --remote=origin --push

echo.
echo ===================================================
echo   PRONTO!
echo ===================================================
echo.
echo Acesse: https://github.com/geovana49/apostaspro-v2
echo.
pause
