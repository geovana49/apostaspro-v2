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
        const { image, context } = req.body || {};
        if (!image) return res.status(400).json({ error: 'Nenhuma imagem recebida.' });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

        // --- ENHANCED PROMPT WITH CONTEXTUAL HISTORY (FEW-SHOT) ---
        let contextInfo = "";
        if (context && context.recent_bets && context.recent_bets.length > 0) {
            contextInfo = `\nEXEMPLOS DE APOSTAS RECENTES DO USUÁRIO (Baseie-se nestes padrões):\n${JSON.stringify(context.recent_bets)}\n`;
        }

        if (context && context.available_bookmakers) {
            contextInfo += `\nCASAS DE APOSTAS DISPONÍVEIS: ${context.available_bookmakers.join(', ')}\n`;
        }

        const prompt = `Analise este print de aposta esportiva com PRECISÃO TOTAL.
        ${contextInfo}
        
        REGRAS DE EXTRAÇÃO:
        1. Bookmaker: Identifique o nome da plataforma (ex: Bet365, Betano, Br4.bet, Betnacional, Sportingbet).
        2. Stake (VALOR): Procure o valor real apostado. NÃO confunda com "Ganho Potencial" ou "Retorno".
        3. Odds (COTAÇÃO): Procure o multiplicador decimal (ex: 1.50, 4.20).
        4. Evento: Os times ou jogo (ex: Corinthians vs Vasco).
        5. Mercado: O tipo da aposta (ex: Resultado Final, Ambas Marcam).
        6. Promoção: 
           - SE houver um ícone de "Presente" (gift) E o texto "100%", classifique a promoção como "Conversão Freebet".
           - SE NÃO houver presente mas houver indicação de bônus, pode ser "Freebet" ou "Super Odds".
        
        ESTRUTURA DE RESPOSTA (JSON PURO):
        {
          "bookmaker": "Nome da Casa",
          "stake": 0.00,
          "odds": 1.00,
          "market": "Nome do Mercado",
          "event": "Time A vs Time B",
          "date": "DD/MM/AAAA",
          "promotion": "Nenhuma" // ou "Conversão Freebet", "Freebet", "Super Odds"
        }

        PROIBIDO:
        - NÃO adicione textos como "Sucesso via gpt-4" ou "Análise concluída".
        - NÃO adicione blocos de código markdown (\`\`\`json).
        - Os campos "market" e "event" devem conter APENAS o nome do jogo/mercado, sem avisos de sucesso.`;

        // --- STRATEGY 1: GOOGLE GEMINI (Multi-Model Fallback) ---
        if (GEMINI_KEY) {
            const genAI = new GoogleGenerativeAI(GEMINI_KEY);
            const models = ["gemini-1.5-flash", "gemini-2.0-flash"];

            for (const modelName of models) {
                try {
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
                    });

                    const result = await model.generateContent([
                        prompt,
                        { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
                    ]);

                    const text = result.response.text().replace(/```json\n?/, '').replace(/\n?```/, '').trim();
                    const data = JSON.parse(text);

                    // Sanitize against any remaining hallucination
                    if (data.event?.includes('via gemini')) data.event = data.event.split('via')[0].trim();
                    if (data.market?.includes('via gemini')) data.market = data.market.split('via')[0].trim();

                    return res.status(200).json({ source: `Gemini ${modelName}`, data });

                } catch (err) {
                    console.warn(`[Proxy] Gemini ${modelName} falhou: ${err.message}`);
                }
            }
        }

        // --- STRATEGY 2: OPENAI (Silent Fallback) ---
        if (OPENAI_KEY) {
            try {
                const openai = new OpenAI({ apiKey: OPENAI_KEY });
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { type: "image_url", image_url: { url: image } }
                            ],
                        },
                    ],
                    response_format: { type: "json_object" }
                });

                const data = JSON.parse(response.choices[0].message.content);
                return res.status(200).json({ source: "OpenAI Fallback", data });

            } catch (err) {
                console.error(`[Proxy] OpenAI falhou: ${err.message}`);
            }
        }

        return res.status(500).json({
            error: "Todas as IAs falharam ou atingiram o limite (Erro 429). Por favor, aguarde 15 minutos."
        });

    } catch (error) {
        return res.status(500).json({ error: `Erro no servidor: ${error.message}` });
    }
}
