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
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent("ping");
            return res.status(200).json({
                status: 'ok',
                model_used: 'gemini-2.0-flash',
                message: 'A sua chave está ativa e respondendo perfeitamente!'
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

        // Multi-model fallback sequence for maximum reliability
        const modelNames = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b"];

        const prompt = `Analise este print de comprovante de aposta esportiva com precisão cirúrgica. 
        
        Você deve identificar e extrair os seguintes dados:
        1. Casa de Apostas: Nome da plataforma (Ex: Bet365, Betano, KTO, Sportingbet, Pixbet, etc).
        2. Stake: Valor total apostado em dinheiro.
        3. Odds: A cotação final da aposta (Ex: 1.50, 2.85).
        4. Mercado: O tipo da aposta (Ex: Resultado Final, Ambas Marcam, Escanteios, Mais de 2.5 gols).
        5. Evento: Os times ou atletas envolvidos (Ex: Flamengo x Palmeiras).
        6. Data: A data em que a aposta foi feita ou do evento (DD/MM/AAAA).

        Responda EXCLUSIVAMENTE um objeto JSON puro, sem formatação markdown, com esta estrutura:
        {
          "bookmaker": "Nome da Casa",
          "stake": 10.00,
          "odds": 1.50,
          "market": "Mercado Detectado",
          "event": "Time A vs Time B",
          "date": "DD/MM/AAAA",
          "type": "bet"
        }

        NOTAS IMPORTANTES:
        - Se for um comprovante de "Lucro", "Bônus" ou "Prêmio Extra", use "type": "gain".
        - Se for uma aposta comum, use "type": "bet".
        - Se um dado for numérico, retorne como número (float), não string.
        - Se não encontrar um dado, retorne string vazia ou 0.
        - NÃO adicione conversas, explicações ou blocos de código markdown (\`\`\`).`;

        let lastError = null;
        for (const modelName of modelNames) {
            try {
                console.log(`Trying model: ${modelName}`);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.1
                    }
                });

                const result = await model.generateContent([
                    prompt,
                    { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
                ]);

                let text = result.response.text();
                // Safety cleanup
                text = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();

                const parsedData = JSON.parse(text);
                return res.status(200).json({ source: modelName, data: parsedData });

            } catch (error) {
                console.error(`Error with model ${modelName}:`, error.message);
                lastError = error;
                // If it's a 429, we should probably stop or wait, but here we try the next model just in case it has a separate quota (sometimes happens with different tiers)
                if (error.message?.includes('404')) continue;
                if (error.message?.includes('429')) break;
            }
        }

        // If all models failed
        const isQuota = lastError?.message?.includes('429');
        const userFriendlyMsg = isQuota
            ? 'O Google limitou o uso da IA temporariamente. Por favor, aguarde alguns minutos antes de tentar novamente.'
            : `Erro na análise da IA: ${lastError?.message || 'Falha ao processar imagem'}`;

        return res.status(isQuota ? 429 : 500).json({ error: userFriendlyMsg });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
