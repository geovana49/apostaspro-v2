@echo off
echo ==========================================
echo      CONFIGURACAO FIREBASE - APOSTAS PRO
echo ==========================================
echo.
echo Este script vai ajudar a instalar as ferramentas necessarias.
echo.

echo [1/3] Instalando Firebase Tools (Global)...
call npm install -g firebase-tools
if %errorlevel% neq 0 (
    echo Erro ao instalar firebase-tools. Verifique sua conexao ou permissoes.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Login no Firebase...
echo Uma janela do navegador vai abrir. Faca login com sua conta Google.
echo Se ja estiver logado, ele vai avisar.
pause
call firebase login

echo.
echo [3/3] Inicializando Projeto...
echo AGORA E IMPORTANTE:
echo O comando a seguir vai fazer perguntas. Responda assim:
echo.
echo 1. Are you ready to proceed? -> Y
echo 2. Select option -> Hosting: Configure files for Firebase Hosting
echo 3. Select project -> Use an existing project -> apostaspro
echo 4. Public directory? -> dist
echo 5. Single-page app? -> Y
echo 6. Automatic builds? -> N
echo.
pause
call firebase init hosting

echo.
echo ==========================================
echo      CONFIGURACAO CONCLUIDA!
echo ==========================================
echo Agora voce pode usar o arquivo 'deploy.bat' para colocar o site no ar.
pause
