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
            env_check: GEMINI_KEY ? 'Key configured ✓' : 'Key MISSING ✗',
            instructions: "Use POST with {image: 'base64'} to analyze."
        });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { image } = req.body || {};
        if (!image) return res.status(400).json({ error: 'Nenhuma imagem recebida.' });
        if (!GEMINI_KEY) return res.status(500).json({ error: 'Chave do Gemini faltando na Vercel.' });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        // Strategy 1: Attempt via SDK with multiple models
        console.log("Strategy 1: SDK");
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"];

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent([
                    "Analise este print de aposta. Extraia dados como Casa, Odd e Valor.",
                    { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
                ]);
                const response = await result.response;
                return res.status(200).json({
                    description: `Sucesso via SDK (${modelName})`,
                    extractedText: response.text()
                });
            } catch (e) {
                console.warn(`SDK ${modelName} failed: ${e.message}`);
            }
        }

        // Strategy 2: Attempt via Direct REST API (Legacy/Version Fallback)
        console.log("Strategy 2: REST API (v1 and v1beta)");
        const apiVersions = ["v1", "v1beta"];
        for (const ver of apiVersions) {
            try {
                const url = `https://generativelanguage.googleapis.com/${ver}/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: "Analise este print de aposta. Extraia dados como Casa, Odd e Valor." },
                                { inlineData: { mimeType: "image/jpeg", data: base64Data } }
                            ]
                        }]
                    })
                });

                if (resp.ok) {
                    const data = await resp.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    return res.status(200).json({
                        description: `Sucesso via REST (${ver})`,
                        extractedText: text
                    });
                }
            } catch (e) {
                console.warn(`REST ${ver} failed: ${e.message}`);
            }
        }

        // ALL FAILED: Perform Final Diagnostic to help the developer
        const listResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`);
        const listData = listResp.ok ? await listResp.json() : { error: "Failed to list models" };
        const available = listData.models?.map(m => m.name.replace('models/', '')) || [];

        return res.status(500).json({
            error: "IA Indisponível (404). O seu projeto não parece ter acesso aos modelos padrão do Gemini.",
            available_models_for_your_key: available,
            diagnostic_tip: available.length > 0 ? `Tente usar um destes nomes: ${available.join(', ')}` : "Verifique se a API do Gemini está ativada no Google Cloud Console."
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
