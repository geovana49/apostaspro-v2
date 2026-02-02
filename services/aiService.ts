// AI Service using OpenAI GPT-4o-mini for image analysis
export interface AIAnalysisResult {
    type: 'bet' | 'gain' | 'unknown';
    confidence: number; // 0-1
    data: {
        bookmaker?: string;
        value?: number;
        odds?: number;
        date?: string;
        origin?: string;
        status?: string;
        description?: string;
        match?: string;
        market?: string;
        sport?: string;
    };
    rawText?: string;
    suggestions?: string[];
}

export interface BookmakerExtraction {
    name: string;
    domain: string;
    logo?: string;
    confidence: number;
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

/**
 * Analyzes a bet screenshot using OpenAI GPT-4o-mini
 * @param imageBase64 - Base64 encoded image (with or without data URI prefix)
 * @returns Structured bet information
 */
export async function analyzeImage(imageBase64: string): Promise<AIAnalysisResult> {
    if (!OPENAI_API_KEY) {
        throw new Error('API Key da OpenAI não configurada. Configure VITE_OPENAI_API_KEY no arquivo .env');
    }

    try {
        // Extract mime type and data
        const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
        const mimeType = matches ? matches[1] : 'image/jpeg';
        const base64Data = matches ? matches[2] : imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const prompt = `Você é um assistente que analisa screenshots de apostas esportivas e ganhos/bônus.

Analise esta imagem e identifique:
1. Se é uma APOSTA (bet slip) ou GANHO EXTRA (bonus, cashback, freebet)
2. Extraia os seguintes dados (se disponíveis):
   - Casa de apostas (nome)
   - Valor apostado ou ganho (número)
   - Odds/cotação (se for aposta)
   - Data (formato DD/MM/YYYY ou YYYY-MM-DD)
   - Descrição/evento
   - Status (verde=ganhou, vermelho=perdeu, amarelo=pendente)

Responda APENAS em JSON neste formato exato:
{
  "type": "bet" ou "gain" ou "unknown",
  "confidence": 0.0 a 1.0,
  "data": {
    "bookmaker": "nome da casa",
    "value": número,
    "odds": número (só para apostas),
    "date": "DD/MM/YYYY",
    "description": "descrição",
    "status": "Green" ou "Red" ou "Yellow"
  },
  "rawText": "todo texto visível na imagem"
}

Se não conseguir identificar algo, omita o campo.`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Data}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '{}';

        // Parse JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        const result = JSON.parse(jsonStr);

        // Validate and return
        return {
            type: result.type || 'unknown',
            confidence: result.confidence || 0.5,
            data: result.data || {},
            rawText: result.rawText || '',
            suggestions: result.suggestions || []
        };

    } catch (error) {
        console.error('Error analyzing image with OpenAI:', error);
        throw new Error(`Erro ao analisar imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
}

/**
 * Extract bookmaker information from text
 */
export function extractBookmaker(text: string): BookmakerExtraction | null {
    const bookmakers = [
        { name: 'Bet365', domain: 'bet365.com', keywords: ['bet365', 'bet 365'] },
        { name: 'Betano', domain: 'betano.com', keywords: ['betano'] },
        { name: 'Sportingbet', domain: 'sportingbet.com', keywords: ['sportingbet', 'sporting bet'] },
        { name: 'KTO', domain: 'kto.com', keywords: ['kto'] },
        { name: 'Novibet', domain: 'novibet.com', keywords: ['novibet', 'novi bet'] },
        { name: 'Betfair', domain: 'betfair.com', keywords: ['betfair', 'bet fair'] },
        { name: '1xBet', domain: '1xbet.com', keywords: ['1xbet', '1x bet'] },
        { name: 'Pixbet', domain: 'pixbet.com', keywords: ['pixbet', 'pix bet'] }
    ];

    const lowerText = text.toLowerCase();

    for (const bookie of bookmakers) {
        for (const keyword of bookie.keywords) {
            if (lowerText.includes(keyword)) {
                return {
                    name: bookie.name,
                    domain: bookie.domain,
                    confidence: 0.9
                };
            }
        }
    }

    return null;
}
