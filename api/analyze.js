import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;
    const OPENAI_KEY = process.env.VITE_OPENAI_API_KEY;

    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'online',
            gemini: !!GEMINI_KEY ? 'configurado' : 'ausente',
            openai: !!OPENAI_KEY ? 'configurado' : 'ausente'
        });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body || {};
        if (!image) return res.status(400).json({ error: 'Nenhuma imagem recebida.' });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        // --- STRATEGY 1: GOOGLE GEMINI (Multi-Model Fallback) ---
        if (GEMINI_KEY) {
            const genAI = new GoogleGenerativeAI(GEMINI_KEY);
            const models = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.0-flash"];

            for (const modelName of models) {
                try {
                    console.log(`[Proxy] Tentando Gemini: ${modelName}`);
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
                    });

                    const prompt = `Extraia os dados deste print de aposta esportiva (Bet). 
                    Campos: bookmaker (casa), stake (valor), odds (cotação), market (mercado), event (times/jogo), date (data DD/MM/AAAA). 
                    Retorne APENAS um JSON: {"bookmaker":"","stake":0,"odds":1.0,"market":"","event":"","date":"","type":"bet"}. 
                    Se for lucro/bônus use "type":"gain".`;

                    const result = await model.generateContent([
                        prompt,
                        { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
                    ]);

                    const text = result.response.text().replace(/```json\n?/, '').replace(/\n?```/, '').trim();
                    const data = JSON.parse(text);
                    return res.status(200).json({ source: `Gemini ${modelName}`, data });

                } catch (err) {
                    console.warn(`[Proxy] Gemini ${modelName} falhou: ${err.message}`);
                    // Continue to next model unless it's a fatal error unrelated to quota/model-not-found
                }
            }
        }

        // --- STRATEGY 2: OPENAI (Silent Fallback) ---
        if (OPENAI_KEY) {
            try {
                console.log(`[Proxy] Tentando OpenAI Fallback...`);
                const openai = new OpenAI({ apiKey: OPENAI_KEY });

                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini", // Very fast and reliable for vision
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: "Analise o print da aposta e retorne APENAS o JSON: {\"bookmaker\":\"\",\"stake\":0,\"odds\":1.0,\"market\":\"\",\"event\":\"\",\"date\":\"\",\"type\":\"bet\"}. Se for lucro use type=gain." },
                                { type: "image_url", image_url: { url: image } }
                            ],
                        },
                    ],
                    response_format: { type: "json_object" }
                });

                const data = JSON.parse(response.choices[0].message.content);
                return res.status(200).json({ source: "OpenAI GPT-4o-mini", data });

            } catch (err) {
                console.error(`[Proxy] OpenAI falhou: ${err.message}`);
            }
        }

        // --- FINAL FAILURE ---
        return res.status(500).json({
            error: "Todas as IAs falharam ou atingiram o limite (Erro 429). Por favor, aguarde 15 minutos e tente novamente."
        });

    } catch (error) {
        return res.status(500).json({ error: `Erro no servidor: ${error.message}` });
    }
}
