import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'online',
            model: 'Gemini Hybrid Proxy',
            env_check: process.env.VITE_GEMINI_API_KEY ? 'Key configured ✓' : 'Key MISSING ✗'
        });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body || {};
        const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;

        if (!image) return res.status(400).json({ error: 'Nenhuma imagem recebida.' });
        if (!GEMINI_KEY) return res.status(500).json({ error: 'Chave do Gemini faltando na Vercel (VITE_GEMINI_API_KEY).' });

        const genAI = new GoogleGenerativeAI(GEMINI_KEY);

        // Attempt multiple model names to solve 404 version issues
        const modelNames = ["gemini-1.5-flash-latest", "gemini-1.5-flash", "gemini-1.5-pro"];
        let lastError = null;
        let text = null;

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const prompt = "Analise este print de aposta. Extraia: Casa de Apostas, Valor Apostado (Stake), ODD, Evento/Jogo e Mercado. Se for um bônus ou lucro, identifique também. Retorne APENAS um texto curto com os dados encontrados.";

        for (const modelName of modelNames) {
            try {
                console.log(`Trying Gemini model: ${modelName}...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            data: base64Data,
                            mimeType: "image/jpeg"
                        }
                    }
                ]);

                const response = await result.response;
                text = response.text();
                if (text) break; // Success!
            } catch (error) {
                console.warn(`Failed with ${modelName}:`, error.message);
                lastError = error;
            }
        }

        if (!text) {
            throw new Error(`Todos os modelos falharam (Gemini 1.5 Flash/Pro). Erro final: ${lastError?.message}`);
        }

        return res.status(200).json({
            description: "Análise inteligente Gemini 1.5",
            extractedText: text
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: `Erro na análise do Gemini: ${error.message}` });
    }
}
