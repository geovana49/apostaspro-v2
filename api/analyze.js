import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;

    if (req.method === 'GET') {
        return res.status(200).json({ status: 'online', model_proxy: 'Gemini JSON Proxy' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body || {};
        if (!image) return res.status(400).json({ error: 'Nenhuma imagem recebida.' });
        if (!GEMINI_KEY) return res.status(500).json({ error: 'Chave do Gemini faltando na Vercel.' });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const modelNamesToTry = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"];

        // Stronger prompt for structured JSON
        const prompt = `Analise este print de aposta e extraia os dados exatamente no formato JSON abaixo:
{
  "bookmaker": "Nome da Casa de Apostas",
  "stake": 0.00,
  "odds": 0.00,
  "market": "Mercado da aposta (ex: Vencedor do Jogo)",
  "event": "Nome do Jogo/Evento",
  "date": "Data se houver (DD/MM/AAAA)",
  "type": "bet" ou "gain" (se for ganho/lucro puro)
}
Retorne APENAS o JSON, sem explicações.`;

        let aiResult = null;
        let usedModel = null;
        let lastError = null;

        for (const modelName of modelNamesToTry) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: { responseMimeType: "application/json" } // Force JSON output
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
                console.warn(`Model ${modelName} failed: ${error.message}`);
            }
        }

        if (!aiResult) {
            throw new Error(`Falha na extração: ${lastError?.message}`);
        }

        // Return structured data
        return res.status(200).json({
            source: usedModel,
            data: aiResult
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: `Erro na IA: ${error.message}` });
    }
}
