@echo off
echo ====================================================
echo Configurando CORS para Firebase Storage
echo ====================================================
echo.
echo Este script requer que voce tenha o Google Cloud SDK (gsutil) instalado.
echo.
echo 1. Va no Console do Firebase > Storage
echo 2. Copie a URL do seu bucket (ex: gs://minhasapostaspro.firebasestorage.app)
echo 3. Cole abaixo:
set /p BUCKET_URL="Digite a URL do Bucket: "
echo.
echo Aplicando configuracao do arquivo cors.json...
gsutil cors set cors.json %BUCKET_URL%
echo.
if %errorlevel% equ 0 (
    echo [SUCESSO] CORS configurado! Tente fazer o upload novamente no app.
) else (
    echo [ERRO] Falha ao configurar. Verifique se o gsutil esta no seu PATH e se voce esta logado (gcloud auth login).
)
pause
