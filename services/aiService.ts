// AI Service v2.1 - Hybrid OCR + AI Fallback
import { ocrService } from './ocrService';
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
    suggestions?: string[];
}

export interface BookmakerExtraction {
    name: string;
    domain: string;
    logo?: string;
    confidence: number;
}

const HF_API_KEY = import.meta.env.VITE_HF_API_KEY || '';

const analysisCache = new Map<string, AIAnalysisResult>();

/**
 * Analyzes a bet screenshot using Hugging Face Vision Models
 * @param imageBase64 - Base64 encoded image (with or without data URI prefix)
 * @param context - Optional context of recent bets to improve accuracy
 * @returns Structured bet information
 */
export async function analyzeImage(imageBase64: string, context?: any): Promise<AIAnalysisResult> {
    // 0. Try Deterministic Local OCR First (Zero Cost, No Limits)
    let localData: any = null;
    try {
        console.log('[AI v2.1] Attempting Local OCR extraction...');
        localData = await ocrService.extractData(imageBase64);

        // If we found HIGH QUALITY data (Stake AND Odds), return immediately!
        if (localData && localData.stake && localData.odds) {
            console.log('[AI Service] Local OCR High-Quality Success:', localData);
            return {
                type: 'bet',
                confidence: 1.0,
                data: {
                    bookmaker: localData.bookmaker || 'Casa via OCR',
                    value: localData.stake,
                    odds: localData.odds,
                    market: localData.market || 'Mercado via OCR',
                    match: localData.event || 'Evento via OCR',
                    date: localData.date || normalizeDate(),
                    promotionType: localData.promotion || 'Nenhuma'
                },
                rawText: JSON.stringify(localData),
                suggestions: ['Processado Localmente (Instantâneo)']
            };
        }
    } catch (e) {
        console.warn('[AI Service] Local OCR failed, falling back to AI Proxy:', e);
    }

    console.log('[AI Service] Local OCR insufficient or partial. Activating AI Proxy...');

    // Basic deduplication: Check session cache first
    if (analysisCache.has(imageBase64)) {
        console.log('[AI Service] Returning cached analysis for identical image.');
        return analysisCache.get(imageBase64)!;
    }

    console.log('[AI Service] Starting analysis via Proxy API with context:', !!context);

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageBase64,
                    context: context // Passing recent bets/bookmakers for few-shot learning
                })
            });

            if (!response.ok) {
                const errorData = await response.json();

                // If it's a 429 on the first try, wait 3s and retry
                if (response.status === 429 && attempts === 0) {
                    console.warn('[AI Service] Quota hit (429). Retrying in 3s...');
                    attempts++;
                    await new Promise(r => setTimeout(r, 3000));
                    continue;
                }

                throw new Error(errorData.error || `Erro no servidor: ${response.status}`);
            }

            const { data } = await response.json();
            if (!data) throw new Error("A IA respondeu mas os dados vieram vazios ou mal formatados.");

            console.log('[AI Service] Proxy structured response received:', data);

            // Helper to clean hallucinations like "Sucesso via..."
            const clean = (val: string) => val?.replace(/Sucesso via.*/gi, '').trim() || '';

            // Map the structured data directly
            const result: AIAnalysisResult = {
                type: data.type === 'gain' ? 'gain' : 'bet',
                confidence: 0.95,
                data: {
                    bookmaker: clean(data.bookmaker),
                    value: data.stake,
                    odds: data.odds,
                    date: normalizeDate(data.date),
                    description: clean(data.market),
                    market: clean(data.market),
                    match: clean(data.event),
                    status: 'Yellow',
                    promotionType: data.promotion || 'Nenhuma'
                },
                rawText: JSON.stringify(data),
                suggestions: []
            };

            // Cache for future identical requests in this session
            analysisCache.set(imageBase64, result);
            return result;

        } catch (error) {
            console.error(`[AI Service] Attempt ${attempts + 1} failed:`, error);

            // --- RECOVERY MODE: If AI fails perfectly but we have SOME OCR data, use it! ---
            if (localData) {
                console.log('[AI Service] AI Failed, but recovering via Partial Local OCR.');
                // Try to get a decent match/market from raw text if missing
                const rawLines = localData.raw?.split('\n').filter((l: string) => l.length > 5) || [];
                return {
                    type: 'bet',
                    confidence: 0.5,
                    data: {
                        bookmaker: localData.bookmaker || (rawLines[0]?.substring(0, 20)) || 'Casa Automática',
                        value: localData.stake || 0,
                        odds: localData.odds || 1.0,
                        market: localData.market || (rawLines[1]?.substring(0, 40)) || 'Mercado via OCR',
                        match: localData.event || (rawLines[2]?.substring(0, 40)) || 'Evento via OCR',
                        date: localData.date || normalizeDate(),
                        promotionType: 'Nenhuma'
                    },
                    rawText: localData.raw || JSON.stringify(localData),
                    suggestions: ['⚠️ Limite de IA atingido - Dados originais carregados (Verifique!)']
                };
            }

            if (attempts >= maxAttempts - 1) {
                console.warn('[AI Service] All methods failed. Returning blank scaffold.');
                return {
                    type: 'bet',
                    confidence: 0,
                    data: {
                        bookmaker: 'Casa (Preencha)',
                        value: 0,
                        odds: 1.0,
                        market: 'Preencha',
                        match: 'Preencha',
                        date: normalizeDate(),
                    },
                    suggestions: ['⚠️ Não foi possível extrair dados automaticamente. Por favor, preencha manualmente.']
                };
            }
            attempts++;
            await new Promise(r => setTimeout(r, 2000));
        }
    }

    // Final safety return
    return {
        type: 'bet',
        confidence: 0,
        data: { date: normalizeDate() },
        suggestions: ['Erro inesperado. Tente preencher manualmente.']
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
