export default async function handler(req, res) {
    // 1. Better Header Handling for CORS (just in case)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. GET diagnostic
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'online',
            message: 'ApostasPro AI Proxy is active. Use POST to analyze images.',
            env_check: process.env.VITE_HF_API_KEY ? 'Key configured ✓' : 'Key MISSING ✗'
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image } = req.body || {};
        const HF_API_KEY = process.env.VITE_HF_API_KEY;

        if (!image) {
            return res.status(400).json({ error: 'Nenhuma imagem recebida pela API.' });
        }

        if (!HF_API_KEY) {
            return res.status(500).json({ error: 'Token VITE_HF_API_KEY não encontrado nas variáveis de ambiente da Vercel.' });
        }

        // Prepare buffer
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        console.log('Calling Hugging Face Models...');

        // Use a single robust model for OCR to avoid timeouts (10s Vercel limit)
        const ocrResponse = await fetch(
            'https://api-inference.huggingface.co/models/microsoft/trocr-base-printed?wait_for_model=true',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_API_KEY}`,
                    'Content-Type': 'application/octet-stream'
                },
                body: buffer
            }
        );

        if (!ocrResponse.ok) {
            const errorMsg = await ocrResponse.text();
            return res.status(ocrResponse.status).json({ error: `IA falhou (${ocrResponse.status}): ${errorMsg}` });
        }

        const ocrData = await ocrResponse.json();

        // HF can return an array or an object depending on the model
        const text = Array.isArray(ocrData) ? ocrData[0]?.generated_text : ocrData.generated_text;

        return res.status(200).json({
            description: 'Transcrição direta da imagem',
            extractedText: text || ''
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            error: 'Erro interno no Proxy da IA',
            details: error.message
        });
    }
}
