// AI Service v3.0 - Gemini Vision Primary + OCR Fallback
import { ocrService, OCRResult } from './ocrService';
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
        promotionType?: string;
    };
    rawText?: string;
    source?: string;
    analysisType?: 'local' | 'remote' | 'partial';
    suggestions?: string[];
    words?: OCRResult['words'];
}

export interface BookmakerExtraction {
    name: string;
    domain: string;
    logo?: string;
    confidence: number;
}

const HF_API_KEY = (import.meta as any).env.VITE_HF_API_KEY || '';
const GEMINI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY || '';

const analysisCache = new Map<string, AIAnalysisResult>();

/**
 * Analyzes a bet screenshot using Gemini Vision API (primary) + OCR (fallback)
 */
export async function analyzeImage(imageBase64: string, context?: any): Promise<AIAnalysisResult> {
    // Cache check
    const cacheKey = imageBase64.substring(0, 100);
    if (analysisCache.has(cacheKey)) {
        console.log('[AI v3.0] Returning cached analysis.');
        return analysisCache.get(cacheKey)!;
    }

    // ---- PRIMARY: Gemini Vision API ----
    if (GEMINI_API_KEY) {
        try {
            console.log('[AI v3.0] Trying Gemini Vision API...');

            // Strip data URI prefix if present
            const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            const mimeType = imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

            const prompt = `Você é um especialista em apostas esportivas brasileiras. Analise este print de tela de uma casa de apostas.

IDENTIFIQUE A CASA DE APOSTAS usando QUALQUER pista visual disponível:
- Nome visível no app/site (Bet365, Betano, KTO, Sportingbet, Pixbet, Novibet, etc.)
- URL na barra de endereço (bet365.com, betano.com, kto.com, etc.)
- Logo/ícone da casa (cor, formato, símbolo)
- Watermark ou rodapé da página
- Qualquer texto de marca registrada

EXTRAIA os dados VISÍVEIS no print:

Retorne SOMENTE um JSON válido neste formato exato (use null para campos não visíveis):
{
  "bookmaker": "nome da casa de apostas ou null",
  "event": "nome do evento/partida (ex: Flamengo x Vasco) ou null",
  "market": "mercado da aposta (ex: Resultado Final, Ambas Marcam) ou null",
  "odds": número_decimal ou null,
  "stake": valor_em_reais como número ou null,
  "date": "data no formato DD/MM/YYYY ou null",
  "status": "Green se ganhou, Red se perdeu, Pendente se em aberto, ou null"
}

Responda APENAS com o JSON, sem explicações.`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                { inline_data: { mime_type: mimeType, data: base64Data } }
                            ]
                        }],
                        generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
                    })
                }
            );

            if (response.ok) {
                const geminiData = await response.json();
                const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
                console.log('[AI v3.0] Gemini raw response:', rawText);

                // Parse JSON from response (handle markdown code blocks)
                const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) ||
                                  rawText.match(/```\s*([\s\S]*?)\s*```/) ||
                                  [null, rawText];
                const jsonStr = jsonMatch[1]?.trim() || rawText.trim();

                const parsed = JSON.parse(jsonStr);

                const result: AIAnalysisResult = {
                    type: 'bet',
                    confidence: 0.92,
                    data: {
                        bookmaker: parsed.bookmaker || undefined,
                        value: parsed.stake || undefined,
                        odds: parsed.odds || undefined,
                        date: parsed.date ? normalizeDate(parsed.date) : undefined,
                        match: parsed.event || undefined,
                        market: parsed.market || undefined,
                        status: parsed.status || undefined,
                    },
                    rawText,
                    source: 'Gemini Vision',
                    analysisType: 'remote',
                    suggestions: ['✨ Extraído via Gemini Vision AI']
                };

                analysisCache.set(cacheKey, result);
                return result;
            }
        } catch (geminiError) {
            console.warn('[AI v3.0] Gemini failed:', geminiError);
        }
    }

    // ---- FALLBACK: Local OCR ----
    try {
        console.log('[AI v3.0] Falling back to Local OCR...');
        const localData = await ocrService.extractData(imageBase64);

        if (localData && (localData.stake || localData.odds)) {
            return {
                type: 'bet',
                confidence: 0.6,
                data: {
                    bookmaker: localData.bookmaker || undefined,
                    value: localData.stake || undefined,
                    odds: localData.odds || undefined,
                    market: localData.market || undefined,
                    match: localData.event || undefined,
                    date: localData.date ? normalizeDate(localData.date) : undefined,
                },
                source: 'OCR Local',
                analysisType: 'local',
                rawText: localData.raw,
                suggestions: ['Dados extraídos via OCR - verifique os valores']
            };
        }
    } catch (ocrError) {
        console.warn('[AI v3.0] OCR also failed:', ocrError);
    }

    // ---- TOTAL FAILURE ----
    return {
        type: 'unknown',
        confidence: 0,
        data: {},
        source: 'Erro',
        analysisType: 'partial',
        suggestions: ['Não foi possível extrair dados. Configure VITE_GEMINI_API_KEY ou preencha manualmente.']
    };
}

/**
 * Parse extracted text to find bet information
 */
function parseTextForBetInfo(text: string, description: string): {
    type: 'bet' | 'gain' | 'unknown';
    confidence: number;
    data: AIAnalysisResult['data'];
} {
    const lowerText = text.toLowerCase();
    const lowerDesc = description.toLowerCase();

    // Detect bookmaker
    const bookmaker = extractBookmaker(text + ' ' + description);

    // Detect type
    let type: 'bet' | 'gain' | 'unknown' = 'unknown';
    if (lowerText.includes('aposta') || lowerText.includes('bet') || lowerDesc.includes('bet')) {
        type = 'bet';
    } else if (lowerText.includes('ganho') || lowerText.includes('bonus') || lowerText.includes('cashback')) {
        type = 'gain';
    }

    // Extract numbers (potential odds/values)
    const numbers = text.match(/\d+[.,]\d+|\d+/g) || [];
    const potentialOdds = numbers.find(n => {
        const num = parseFloat(n.replace(',', '.'));
        return num >= 1.01 && num <= 100;
    });
    const potentialValue = numbers.find(n => {
        const num = parseFloat(n.replace(',', '.'));
        return num >= 1 && num <= 100000;
    });

    // Extract date
    const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    const date = dateMatch ? `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}` : undefined;

    // Detect status from colors (would need color analysis, defaulting to unknown)
    const status = 'Yellow'; // Pending by default

    return {
        type,
        confidence: bookmaker ? 0.7 : 0.5,
        data: {
            bookmaker: bookmaker?.name,
            value: potentialValue ? parseFloat(potentialValue.replace(',', '.')) : undefined,
            odds: potentialOdds ? parseFloat(potentialOdds.replace(',', '.')) : undefined,
            date,
            description: description || text.substring(0, 100),
            status
        }
    };
}

/**
 * Normalizes date from AI (DD/MM/YYYY) to standard YYYY-MM-DD for form
 */
export function normalizeDate(dateStr?: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // Check for DD/MM/YYYY
    const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (ddmmyyyy) {
        let [_, day, month, year] = ddmmyyyy;
        if (year.length === 2) year = '20' + year;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Check for YYYY-MM-DD
    const yyyymmdd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (yyyymmdd) return dateStr;

    return new Date().toISOString().split('T')[0];
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

// Check if API keys are configured
export const isGeminiConfigured = () => {
    return HF_API_KEY !== ''; // In this v2.1, we use HF but the UI expects this name
};

// Alias for compatibility
export const extractBookmakerFromURL = extractBookmaker;

// Simple Coach Message Handler (Placeholder or basic implementation)
export const sendMessageToCoach = async (message: string, history: any[]) => {
    // For now, return a simple response or use HF if possible
    return "Como seu Coach de Apostas, posso ajudar a analisar seus reds e sugerir gestões de banca. No momento, estou focado em ler seus prints com perfeição! 🤖📈";
};
