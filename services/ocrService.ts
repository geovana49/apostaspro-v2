import { createWorker } from 'tesseract.js';

export interface OCRResult {
    text: string;
    words: Array<{
        text: string;
        bbox: { x0: number; y0: number; x1: number; y1: number };
        confidence: number;
    }>;
}

/**
 * Hyper-Aggressive Local OCR Service
 * Designed to extract data without ANY cloud help whenever possible.
 */
class OCRService {
    private worker: any = null;
    private isBusy: boolean = false;

    async getWorker() {
        if (!this.worker) {
            try {
                console.log('[OCR v2.2] Initializing Tesseract worker (por+eng)...');
                this.worker = await createWorker('por+eng', 1, {
                    logger: m => console.log('[Tesseract Progress]', m.status, Math.round(m.progress * 100) + '%'),
                    workerPath: 'https://unpkg.com/tesseract.js@v5.1.0/dist/worker.min.js',
                    corePath: 'https://unpkg.com/tesseract.js-core@v5.1.0/tesseract-core.wasm.js',
                });
                console.log('[OCR v2.2] Worker ready (por+eng).');
            } catch (err) {
                console.warn('[OCR v2.2] por+eng failed, falling back to basic por...', err);
                try {
                    this.worker = await createWorker('por');
                    console.log('[OCR v2.2] Worker ready (basic por).');
                } catch (err2) {
                    console.error('[OCR v2.2] All workers failed:', err2);
                    throw err2;
                }
            }
        }
        return this.worker;
    }

    async runOCR(imageBuffer: string): Promise<OCRResult> {
        if (this.isBusy) {
            await new Promise(r => setTimeout(r, 1000));
        }

        this.isBusy = true;
        try {
            const worker = await this.getWorker();
            console.log('[OCR] Processing image. Source length:', imageBuffer.length);
            const result = await worker.recognize(imageBuffer);
            const data = result.data;

            console.log(`[OCR] Recognition complete. Conf: ${data.confidence}%. Text length: ${data.text.length}`);
            if (data.text.length < 5) {
                console.warn('[OCR] Warning: Very little text found. Raw:', data.text);
            }

            return {
                text: data.text,
                words: data.words.map((w: any) => ({
                    text: w.text,
                    bbox: w.bbox,
                    confidence: w.confidence
                }))
            };
        } finally {
            this.isBusy = false;
        }
    }

    /**
     * Extracts data using a "Heuristic Pattern Matcher"
     * Doesn't care about the house, just looks for common patterns in ANY bet.
     */
    async extractData(imageBase64: string): Promise<any> {
        try {
            console.log('[OCR] Starting Heuristic Extraction...');
            const ocr = await this.runOCR(imageBase64);
            const text = ocr.text;
            const textLower = text.toLowerCase();

            if (!text || text.trim().length < 2) {
                console.warn('[OCR] Not enough text found in image.');
                return text ? { raw: text, type: 'bet' } : null;
            }

            const data: any = {
                type: 'bet',
                source: 'Local OCR',
                raw: text
            };

            // 1. Detect Bookmaker (Word Hunt Strategy)
            const houses = [
                'betano', 'bet365', 'br4', 'nacional', 'sportingbet', 'kto', 'novibet', 'pixbet', 'estrela',
                'superbet', 'parimatch', 'betway', 'dafabet', '1xbet', 'betfair', 'rivalo', 'playpix', 'shark', 'galera', 'r7', 'r7.bet'
            ];

            let foundHouse = houses.find(h => textLower.includes(h));
            if (!foundHouse) {
                const textWords = textLower.split(/\s+/);
                foundHouse = houses.find(h => textWords.some(w => w.includes(h) || h.includes(w) && w.length > 3));
            }
            data.bookmaker = foundHouse ? (foundHouse.includes('r7') ? 'R7.BET' : (foundHouse.charAt(0).toUpperCase() + foundHouse.slice(1))) : 'Casa Automática';

            // 2. Extract Stake (Permissive Regex)
            const stakeRegex = /(?:r\$|\$|valor|aposta|total|pago|stake|simples|investimento)[:\s]*(\d+[,.]\d{2})/i;
            const stakeMatch = textLower.match(stakeRegex);
            if (stakeMatch) {
                data.stake = parseFloat(stakeMatch[1].replace(',', '.'));
            }

            // 3. Extract Odds (Better Number Hunting)
            const oddsRegex = /(?:@|odd|cota[çtc]ao|multiplicador|x|odds)[:\s]*(\d+[.,]\d{2,3})/i;
            const oddsMatch = textLower.match(oddsRegex);
            if (oddsMatch) {
                data.odds = parseFloat(oddsMatch[1].replace(',', '.'));
            } else {
                const numbers = (textLower.match(/\d+[.,]\d{2,3}/g) || []).map(n => parseFloat(n.replace(',', '.')));
                const possibleOdds = numbers.find(n => n > 1.05 && n < 50 && n !== data.stake);
                if (possibleOdds) data.odds = possibleOdds;
            }

            // 4. Extract Date
            const dateRegex = /(\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?)|(\d{1,2}\s+(de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez))/i;
            const dateMatch = textLower.match(dateRegex);
            if (dateMatch) {
                let dateStr = dateMatch[0];
                const now = new Date();
                if (dateStr.includes('/') || dateStr.includes('-')) {
                    const sep = dateStr.includes('/') ? '/' : '-';
                    let parts = dateStr.split(sep);
                    let day = parts[0].padStart(2, '0');
                    let month = parts[1].padStart(2, '0');
                    let year = parts[2] || now.getFullYear().toString();
                    if (year.length === 2) year = '20' + year;
                    data.date = `${year}-${month}-${day}`;
                }
            } else {
                data.date = new Date().toISOString().split('T')[0];
            }

            // 5. Extract Market & Event (Heuristic context)
            const marketKeywords = [
                'resultado', 'ambas', 'gols', 'escanteios', 'vencedor', 'mais de', 'menos de', 'empate',
                'vence', 'casa', 'fora', 'draw', 'over', 'under', 'asian', 'handicap', 'final'
            ];

            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
            const teamPairRegex = /([A-Z0-9][a-z0-9]+\s?)+ (v|vs|x|-) ([A-Z0-9][a-z0-9]+\s?)+/i;
            const possibleEvent = lines.find(l => teamPairRegex.test(l));
            if (possibleEvent) data.event = possibleEvent;

            let foundMarkets = lines.filter(l =>
                marketKeywords.some(kw => l.toLowerCase().includes(kw))
            );

            if (foundMarkets.length > 0) {
                data.market = foundMarkets.slice(0, 2).join(' / ');
                if (!data.event) {
                    const mIndex = lines.indexOf(foundMarkets[0]);
                    if (mIndex > 0) data.event = lines[mIndex - 1];
                }
            } else if (lines.length > 0) {
                const reasonableLines = lines.filter(l => l.length > 8 && l.length < 60 && !l.toLowerCase().includes(data.bookmaker.toLowerCase()));
                if (reasonableLines.length > 0) {
                    data.market = reasonableLines[0];
                }
            }

            if (text && text.trim().length >= 1) {
                console.log('[OCR] Extraction Result (Heuristic):', data);
                return data;
            }

            console.warn('[OCR] No significant text found after extraction.');
            return text ? { raw: text, type: 'bet' } : null;

        } catch (error) {
            console.error('[OCR Service] Error during extraction:', error);
            return null;
        }
    }
}

export const ocrService = new OCRService();
