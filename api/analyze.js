import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;

    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'online',
            model_proxy: 'Gemini Final Alignment',
            env_check: GEMINI_KEY ? 'Key configured ✓' : 'Key MISSING ✗'
        });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body || {};
        if (!image) return res.status(400).json({ error: 'Nenhuma imagem recebida.' });
        if (!GEMINI_KEY) return res.status(500).json({ error: 'Chave do Gemini faltando na Vercel.' });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        // The user's diagnostics confirmed these models are available for their key
        const modelNamesToTry = [
            "gemini-2.0-flash",
            "gemini-2.5-flash",
            "gemini-flash-latest",
            "gemini-2.0-flash-lite"
        ];

        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        let text = null;
        let usedModel = null;
        let lastError = null;

        const prompt = "Analise este print de aposta. Extraia: Casa de Apostas, Valor Apostado (Stake), ODD, Evento/Jogo e Mercado. Se for um bônus ou lucro, identifique também. Retorne APENAS um texto curto com os dados encontrados.";

        for (const modelName of modelNamesToTry) {
            try {
                console.log(`Final Attempt: Trying ${modelName}`);
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
                if (text) {
                    usedModel = modelName;
                    break;
                }
            } catch (error) {
                lastError = error;
                console.warn(`Model ${modelName} failed: ${error.message}`);
            }
        }

        if (!text) {
            throw new Error(`Infelizmente a IA retornou erro mesmo com os nomes sugeridos pelo Google. Erro: ${lastError?.message}`);
        }

        return res.status(200).json({
            description: `Sucesso via ${usedModel}`,
            extractedText: text
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: `Erro na IA: ${error.message}` });
    }
}
