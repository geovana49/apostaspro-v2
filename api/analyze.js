import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;

    if (req.method === 'GET') {
        let availableModels = [];
        let error = null;
        if (GEMINI_KEY) {
            try {
                const genAI = new GoogleGenerativeAI(GEMINI_KEY);
                // Using the listModels method to see what's actually available
                const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`);
                if (listResponse.ok) {
                    const data = await listResponse.json();
                    availableModels = data.models?.map(m => m.name) || [];
                } else {
                    error = `HTTP ${listResponse.status}: ${await listResponse.text()}`;
                }
            } catch (e) {
                error = e.message;
            }
        }
        return res.status(200).json({
            status: 'online',
            model_proxy: 'Gemini Resilient Diagnostics',
            env_check: GEMINI_KEY ? 'Key configured ✓' : 'Key MISSING ✗',
            api_available_models: availableModels,
            error: error
        });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body || {};

        if (!image) return res.status(400).json({ error: 'Nenhuma imagem recebida.' });
        if (!GEMINI_KEY) return res.status(500).json({ error: 'Chave do Gemini faltando na Vercel (VITE_GEMINI_API_KEY).' });

        const genAI = new GoogleGenerativeAI(GEMINI_KEY);

        // Some environments require 'models/' prefix, others don't. We'll try both.
        const modelNames = [
            "gemini-1.5-flash",
            "models/gemini-1.5-flash",
            "gemini-1.5-flash-8b",
            "models/gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            "gemini-2.0-flash-exp"
        ];

        let lastError = null;
        let text = null;
        let usedModel = null;

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const prompt = "Analise este print de aposta. Extraia: Casa de Apostas, Valor Apostado (Stake), ODD, Evento/Jogo e Mercado. Se for um bônus ou lucro, identifique também. Retorne APENAS um texto curto com os dados encontrados.";

        for (const modelName of modelNames) {
            try {
                console.log(`Diagnostic: Testing ${modelName}`);
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
                // If it's a 404, we continue to the next one
                if (error.message?.includes('404')) continue;
                // If it's another error (like quota or safety), we might want to know
                console.warn(`Model ${modelName} failed with: ${error.message}`);
            }
        }

        if (!text) {
            throw new Error(`Infelizmente todos os modelos de IA (1.5 Flash, 8b, Pro, 2.0) retornaram 'Não Encontrado' (404). Isso geralmente indica um problema com a permissão da Chave de API ou restrição regional da Vercel. Erro técnico: ${lastError?.message}`);
        }

        return res.status(200).json({
            description: `Análise via ${usedModel}`,
            extractedText: text
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: `Erro na IA: ${error.message}` });
    }
}
