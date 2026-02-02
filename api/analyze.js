export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'online',
            env_check: process.env.VITE_HF_API_KEY ? 'Key configured ✓' : 'Key MISSING ✗'
        });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body || {};
        const HF_API_KEY = process.env.VITE_HF_API_KEY;

        if (!image) return res.status(400).json({ error: 'Nenhuma imagem recebida.' });
        if (!HF_API_KEY) return res.status(500).json({ error: 'Token HF faltando na Vercel.' });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // New Endpoint Logic
        const hfRequest = async (model) => {
            // Trying the new router endpoint first, fallback to standard
            const endpoints = [
                `https://api-inference.huggingface.co/models/${model}`,
                `https://router.huggingface.co/hf-inference/models/${model}`
            ];

            for (const url of endpoints) {
                try {
                    const resp = await fetch(`${url}?wait_for_model=true`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${HF_API_KEY}` },
                        body: buffer
                    });
                    if (resp.ok) return await resp.json();
                    if (resp.status === 410) continue; // Try next endpoint
                    const err = await resp.text();
                    throw new Error(`HF ${resp.status}: ${err}`);
                } catch (e) {
                    if (url === endpoints[endpoints.length - 1]) throw e;
                }
            }
        };

        console.log('Starting AI analysis...');

        // Attempt OCR (Primary)
        const ocrData = await hfRequest('microsoft/trocr-base-printed');
        const text = Array.isArray(ocrData) ? ocrData[0]?.generated_text : ocrData.generated_text;

        // Optional Caption (Secondary - if fails, we still have text)
        let description = '';
        try {
            const capData = await hfRequest('Salesforce/blip-image-captioning-large');
            description = Array.isArray(capData) ? capData[0]?.generated_text : capData.generated_text;
        } catch (e) { console.warn('Caption failed but OCR succeeded.'); }

        return res.status(200).json({
            description: description || 'Transcrição automática',
            extractedText: text || ''
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
