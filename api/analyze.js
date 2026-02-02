import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;

    if (req.method === 'GET') {
        return res.status(200).json({ status: 'online', model_proxy: 'Gemini Quota Optimized' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body || {};
        if (!image) return res.status(400).json({ error: 'Nenhuma imagem recebida.' });
        if (!GEMINI_KEY) return res.status(500).json({ error: 'Chave do Gemini faltando na Vercel.' });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        const genAI = new GoogleGenerativeAI(GEMINI_KEY);

        // Optimized model sequence: use the most stable/modern ones first to avoid wasting quota on retries
        const modelNamesToTry = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];

        const prompt = `Analise este print de aposta. Identifique os dados principais e retorne APENAS um objeto JSON com esta estrutura exata:
{
  "bookmaker": "Nome da Casa (ex: Bet365)",
  "stake": 10.00,
  "odds": 1.50,
  "market": "Mercado (ex: Acima de 2.5 Gols)",
  "event": "Time A vs Time B",
  "date": "Data (DD/MM/AAAA)",
  "type": "bet"
}
Se for um lucro ou bônus, use "type": "gain".
NÃO adicione nenhum texto antes ou depois do JSON.`;

        let aiResult = null;
        let usedModel = null;
        let lastError = null;

        for (const modelName of modelNamesToTry) {
            try {
                console.log(`Quota Guard: Trying ${modelName}...`);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.1 // Lower temperature for more consistent JSON
                    }
                });

                const result = await model.generateContent([
                    prompt,
                    { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
                ]);

                const response = await result.response;
                const text = response.text();
                if (text) {
                    aiResult = JSON.parse(text);
                    usedModel = modelName;
                    break;
                }
            } catch (error) {
                lastError = error;
                console.warn(`Model ${modelName} failed or quota hit: ${error.message}`);
                // If it's a 429 (quota), we might as well stop or try ONE fallback
                if (error.message?.includes('429')) break;
            }
        }

        if (!aiResult) {
            const errorMsg = lastError?.message || 'Erro desconhecido';
            const userFriendlyMsg = errorMsg.includes('429')
                ? 'Limite de uso da IA atingido por hoje ou muitas tentativas rápidas. Por favor, aguarde 1 minuto e tente novamente.'
                : `Falha na extração de dados: ${errorMsg}`;
            throw new Error(userFriendlyMsg);
        }

        return res.status(200).json({
            source: usedModel,
            data: aiResult
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
