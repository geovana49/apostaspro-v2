// AI Service using Hugging Face Inference API for image analysis
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

const HF_API_KEY = import.meta.env.VITE_HF_API_KEY || '';

/**
 * Analyzes a bet screenshot using Hugging Face Vision Models
 * @param imageBase64 - Base64 encoded image (with or without data URI prefix)
 * @returns Structured bet information
 */
export async function analyzeImage(imageBase64: string): Promise<AIAnalysisResult> {
    console.log('[AI Service] Starting analysis via Proxy API...');

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageBase64 })
        });

        if (!response.ok) {
            const errorData = await response.json();
            // If the server provides a detailed diagnostic object, stringify it for the user
            const details = errorData.available_models_for_your_key
                ? `\nModelos disponíveis: ${JSON.stringify(errorData.available_models_for_your_key)}\nDica: ${errorData.diagnostic_tip}`
                : '';
            throw new Error((errorData.error || `Erro no servidor: ${response.status}`) + details);
        }

        const { description, extractedText } = await response.json();
        console.log('[AI Service] Proxy response received.');

        // Parse result using existing logic
        const parsedData = parseTextForBetInfo(extractedText, description);

        return {
            type: parsedData.type,
            confidence: parsedData.confidence,
            data: parsedData.data,
            rawText: extractedText,
            suggestions: []
        };

    } catch (error) {
        console.error('[AI Service] Analysis failed:', error);
        throw new Error(`Erro na IA: ${error instanceof Error ? error.message : 'Erro de conexão'}`);
    }
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
