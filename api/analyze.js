import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;

    // Diagnostic GET to check key health with a confirmed model
    if (req.method === 'GET') {
        if (!GEMINI_KEY) return res.status(500).json({ status: 'error', message: 'Key missing' });
        try {
            const genAI = new GoogleGenerativeAI(GEMINI_KEY);
            // Using 2.0-flash as it was confirmed in your diagnostic list
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent("ping");
            return res.status(200).json({
                status: 'ok',
                model_used: 'gemini-2.0-flash',
                message: 'A sua chave está ativa e respondendo perfeitamente!'
            });
        } catch (e) {
            return res.status(500).json({ status: 'error', message: e.message, hint: 'Tente verificar se o modelo gemini-2.0-flash está habilitado no seu console.' });
        }
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body || {};
        if (!image) return res.status(400).json({ error: 'Nenhuma imagem recebida.' });
        if (!GEMINI_KEY) return res.status(500).json({ error: 'Chave do Gemini faltando na Vercel.' });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);

        // We are using the model that SHOWED UP in your diagnostic list:
        const modelName = "gemini-2.0-flash";

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

            const text = result.response.text();
            return res.status(200).json({ source: modelName, data: JSON.parse(text) });

        } catch (error) {
            console.error(`Gemini Error (${modelName}):`, error.message);

            const isQuota = error.message?.includes('429');
            const is404 = error.message?.includes('404');

            let userFriendlyMsg = `Erro na IA: ${error.message}`;
            if (isQuota) userFriendlyMsg = 'Limite de uso atingido. Aguarde 1 minuto.';
            if (is404) userFriendlyMsg = `O modelo ${modelName} não foi encontrado na sua conta. Verifique o link de diagnóstico (GET).`;

            return res.status(500).json({ error: userFriendlyMsg });
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
