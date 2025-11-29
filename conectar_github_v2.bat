@echo off
setlocal
echo ===================================================
echo   CONECTAR AO GITHUB - APOSTAS PRO V2
echo ===================================================
echo.

:: Verifica Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Git nao encontrado!
    echo.
    echo Por favor, instale o Git primeiro:
    echo https://git-scm.com/download/win
    echo.
    echo Apos instalar, REINICIE o computador e rode este script novamente.
    pause
    exit
)

:: Verifica GitHub CLI
gh --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] GitHub CLI nao encontrado!
    echo.
    echo Por favor, instale o GitHub CLI:
    echo https://cli.github.com/
    echo.
    echo Apos instalar, REINICIE o computador e rode este script novamente.
    pause
    exit
)

echo [OK] Git e GitHub CLI instalados!
echo.
echo ===================================================
echo   PASSO 1: LOGIN NO GITHUB
echo ===================================================
echo.
echo Vou abrir o navegador para voce fazer login.
echo.
echo IMPORTANTE:
echo 1. Um codigo vai aparecer aqui
echo 2. Copie o codigo
echo 3. Cole no navegador que vai abrir
echo 4. Autorize o acesso
echo.
pause

gh auth login --web

echo.
echo ===================================================
echo   PASSO 2: INICIALIZAR REPOSITORIO LOCAL
echo ===================================================
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
echo ===================================================
echo   PASSO 3: CRIAR REPOSITORIO NO GITHUB
echo ===================================================
echo.
echo Criando 'apostaspro-v2' no seu GitHub...
echo.

gh repo create apostaspro-v2 --public --source=. --remote=origin --push

echo.
echo ===================================================
echo   CONCLUIDO!
echo ===================================================
echo.
echo Se tudo deu certo, seu repositorio esta em:
echo https://github.com/geovana49/apostaspro-v2
echo.
pause
