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

        // Robust request function that won't kill the process on a single failure
        const hfRequest = async (model) => {
            const url = `https://api-inference.huggingface.co/models/${model}`;
            try {
                const resp = await fetch(`${url}?wait_for_model=true`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${HF_API_KEY}` },
                    body: buffer,
                    signal: AbortSignal.timeout(15000)
                });
                if (resp.ok) return await resp.json();
                console.warn(`Model ${model} failed with status ${resp.status}`);
                return null;
            } catch (e) {
                console.warn(`Model ${model} request failed: ${e.message}`);
                return null;
            }
        };

        console.log('Starting parallel vision analysis...');

        // Try multiple models in parallel - if any work, we are good!
        const [blipData, gptData] = await Promise.all([
            hfRequest('Salesforce/blip-image-captioning-large'),
            hfRequest('nlpconnect/vit-gpt2-image-captioning')
        ]);

        const description = Array.isArray(blipData) ? blipData[0]?.generated_text : blipData?.generated_text;
        const gptText = Array.isArray(gptData) ? gptData[0]?.generated_text : gptData?.generated_text;

        const finalDescription = description || 'Transcrição automática';
        const finalExtractedText = gptText || description || '';

        if (!description && !gptText) {
            return res.status(503).json({ error: 'Nenhum modelo de IA disponível no momento. Tente novamente em instantes.' });
        }

        return res.status(200).json({
            description: finalDescription,
            extractedText: finalExtractedText
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Erro inesperado no servidor da IA.' });
    }
}
