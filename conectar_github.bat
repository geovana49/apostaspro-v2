@echo off
setlocal
echo ===================================================
echo   CONECTAR AO GITHUB - APOSTAS PRO
echo ===================================================
echo.
echo Verificando instalacao do Git e GitHub CLI...
echo.

:: Verifica Git
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Git nao encontrado. Instalando via Winget...
    winget install --id Git.Git -e --source winget
    echo.
    echo [IMPORTANTE] Apos a instalacao, feche esta janela e abra o arquivo novamente para reconhecer o Git.
    pause
    exit
) else (
    echo [OK] Git ja esta instalado.
)

:: Verifica GitHub CLI
gh --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] GitHub CLI nao encontrado. Instalando via Winget...
    winget install --id GitHub.cli -e --source winget
    echo.
    echo [IMPORTANTE] Apos a instalacao, feche esta janela e abra o arquivo novamente para reconhecer o GitHub CLI.
    pause
    exit
) else (
    echo [OK] GitHub CLI ja esta instalado.
)

echo.
echo ===================================================
echo   CONFIGURANDO REPOSITORIO
echo ===================================================
echo.

if not exist ".git" (
    echo Inicializando repositorio Git...
    git init
    git branch -M main
    git add .
    git commit -m "Upload inicial Apostas Pro"
)

echo.
echo ===================================================
echo   AUTENTICACAO GITHUB
echo ===================================================
echo.
echo Agora voce precisa fazer login no GitHub.
echo 1. Selecione 'GitHub.com'
echo 2. Selecione 'HTTPS'
echo 3. Selecione 'Login with a web browser'
echo.
gh auth login

echo.
echo ===================================================
echo   CRIANDO E ENVIANDO CODIGO
echo ===================================================
echo.
echo Criando repositorio 'apostaspro-v2' no seu GitHub...
gh repo create apostaspro-v2 --public --source=. --remote=origin --push

echo.
echo ===================================================
echo   SUCESSO!
echo   Seu codigo esta no GitHub.
echo ===================================================
pause
