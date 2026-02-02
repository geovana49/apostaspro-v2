import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;

    if (req.method === 'GET') {
        if (!GEMINI_KEY) return res.status(500).json({ status: 'error', message: 'Key missing' });
        try {
            const genAI = new GoogleGenerativeAI(GEMINI_KEY);
            // Try the absolute lightest model for fastest health check
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
            const result = await model.generateContent("ping");
            return res.status(200).json({
                status: 'ok',
                model_used: 'gemini-1.5-flash-8b',
                message: 'A sua chave está ativa e liberada!'
            });
        } catch (e) {
            return res.status(500).json({ status: 'error', message: e.message });
        }
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body || {};
        if (!image) return res.status(400).json({ error: 'Nenhuma imagem recebida.' });
        if (!GEMINI_KEY) return res.status(500).json({ error: 'Chave do Gemini faltando na Vercel.' });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);

        // SWITCH TO 1.5-FLASH-8B: This model has the highest quota limits on the free tier.
        const modelName = "gemini-1.5-flash-8b";

        const prompt = `Analise este print de aposta e retorne APENAS um objeto JSON:
{
  "bookmaker": "Nome da Casa",
  "stake": 0.00,
  "odds": 0.00,
  "market": "Mercado",
  "event": "Time A vs Time B",
  "date": "DD/MM/AAAA",
  "type": "bet"
}`;

        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
            });

            const result = await model.generateContent([
                prompt,
                { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
            ]);

            let text = result.response.text();

            // Clean markdown blocks if present (Gemini sometimes adds them despite the config)
            text = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();

            return res.status(200).json({ source: modelName, data: JSON.parse(text) });

        } catch (error) {
            console.error(`Gemini Error (${modelName}):`, error.message);

            const isQuota = error.message?.includes('429');
            let userFriendlyMsg = `Erro na IA: ${error.message}`;

            if (isQuota) {
                userFriendlyMsg = 'O Google suspendeu temporariamente as requisições para a sua chave (Limite 429). Isso pode levar de 10 min a 1 hora para resetar. Tente novamente mais tarde.';
            }

            return res.status(isQuota ? 429 : 500).json({ error: userFriendlyMsg, quota_hit: isQuota });
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
