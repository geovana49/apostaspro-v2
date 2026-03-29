const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
    // Liberar CORS para o Vercel conseguir enviar para o localhost
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            fs.writeFileSync('meus_avatars_premium.json', body, 'utf8');
            console.log('\n✅ [SUCESSO] Avatares foram recebidos e salvos em: meus_avatars_premium.json');
            res.writeHead(200);
            res.end('OK');
            process.exit(0);
        });
    }
});

server.listen(3100, () => {
    console.log('🚀 Coletor de Avatares ligado na porta 3100...');
    console.log('-> Por favor, cole o código no Console do seu navegador agora!');
});
