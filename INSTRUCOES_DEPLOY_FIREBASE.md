# Como Colocar o Apostas Pro no Firebase Hosting

Este guia passo a passo ajudará você a colocar seu site online usando o Firebase Hosting do Google.

## Pré-requisitos

Você já tem o Node.js instalado (pois o projeto roda localmente).

## Passo 1: Instalar as Ferramentas do Firebase

Abra o terminal (Prompt de Comando ou PowerShell) na pasta do projeto e execute:

```bash
npm install -g firebase-tools
```

*Isso instala o comando `firebase` no seu computador.*

## Passo 2: Login no Google

Ainda no terminal, execute:

```bash
firebase login
```

1. O terminal perguntará se pode coletar dados de uso. Responda `Y` ou `n`.
2. Uma janela do navegador abrirá. Faça login com sua conta Google (a mesma que você usou para criar o projeto no Firebase Console).
3. Permita o acesso.

## Passo 3: Inicializar o Projeto

Execute:

```bash
firebase init hosting
```

O terminal fará algumas perguntas. Use as setas e Enter para responder:

1. **Are you ready to proceed?** -> `Y`
2. **Please select an option:** -> Selecione `Use an existing project` (Use um projeto existente).
3. **Select a default Firebase project for this directory:** -> Escolha o projeto `apostaspro` (ou o nome que você criou no console).
4. **What do you want to use as your public directory?** -> Digite `dist` e aperte Enter. (Importante: o Vite gera a pasta `dist`, não `public` ou `build`).
5. **Configure as a single-page app (rewrite all urls to /index.html)?** -> `Y` (Sim).
6. **Set up automatic builds and deploys with GitHub?** -> `N` (Não, por enquanto).
7. **File dist/index.html already exists. Overwrite?** -> `N` (Não, se perguntar).

## Passo 4: Construir o Projeto (Build)

Antes de enviar, precisamos gerar a versão otimizada do site. Execute:

```bash
npm run build
```

*Isso criará/atualizará a pasta `dist` com os arquivos finais.*

## Passo 5: Enviar para o Ar (Deploy)

Finalmente, execute:

```bash
firebase deploy
```

O terminal mostrará um link "Hosting URL" (algo como `https://seu-projeto.web.app`).
**Pronto! Seu site está online.**

---

## Comandos Úteis para o Futuro

Sempre que você fizer alterações no código e quiser atualizar o site online:

1. `npm run build`
2. `firebase deploy`
