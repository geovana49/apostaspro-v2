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
                console.log('[OCR v2.2] Initializing Tesseract worker...');
                this.worker = await createWorker('por');
                console.log('[OCR v2.2] Worker ready.');
            } catch (err) {
                console.error('[OCR v2.2] Tesseract init failed:', err);
                throw err;
            }
        }
        return this.worker;
    }

    async runOCR(imageBuffer: string): Promise<OCRResult> {
        if (this.isBusy) {
            // Wait a bit or throw
            await new Promise(r => setTimeout(r, 1000));
        }

        this.isBusy = true;
        try {
            const worker = await this.getWorker();
            const result = await worker.recognize(imageBuffer);
            const data = result.data;

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

            if (!text || text.length < 10) {
                console.warn('[OCR] Not enough text found in image.');
                return null;
            }

            const data: any = {
                type: 'bet',
                source: 'Local OCR',
                raw: text
            };

            // 1. Detect Bookmaker (More comprehensive list and fuzzy matching)
            const houses = [
                'betano', 'bet365', 'br4', 'nacional', 'sportingbet', 'kto', 'novibet', 'pixbet', 'estrela',
                'superbet', 'parimatch', 'betway', 'dafabet', '1xbet', 'betfair', 'rivalo', 'playpix', 'shark', 'galera'
            ];
            const foundHouse = houses.find(h => textLower.includes(h));
            data.bookmaker = foundHouse ? foundHouse.charAt(0).toUpperCase() + foundHouse.slice(1) : 'Casa Automática';

            // 2. Extract Stake (Improved regex to catch multiple formats)
            const stakeRegex = /(?:r\$|\$|valor|aposta|total|pago|stake)[:\s]*(\d+[,.]\d{2})/i;
            const stakeMatch = textLower.match(stakeRegex);
            if (stakeMatch) {
                data.stake = parseFloat(stakeMatch[1].replace(',', '.'));
            }

            // 3. Extract Odds (Broader detection)
            const oddsRegex = /(?:@|odd|cota[çtc]ao|multiplicador|x|odds)[:\s]*(\d+[.,]\d{2,3})/i;
            const oddsMatch = textLower.match(oddsRegex);
            if (oddsMatch) {
                data.odds = parseFloat(oddsMatch[1].replace(',', '.'));
            } else {
                const numbers = (textLower.match(/\d+[.,]\d{2}/g) || []).map(n => parseFloat(n.replace(',', '.')));
                const possibleOdds = numbers.find(n => n > 1.05 && n < 50 && n !== data.stake);
                if (possibleOdds) data.odds = possibleOdds;
            }

            // 4. Extract Date (Support for dots, dashes, and varied formats)
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
                data.date = new Date().toISOString().split('T')[0]; // Default to today instead of failing
            }

            // 5. Extract Market (Aggressive fallback)
            const marketKeywords = [
                'resultado', 'ambas', 'gols', 'escanteios', 'vencedor', 'mais de', 'menos de', 'empate',
                'vence', 'casa', 'fora', 'draw', 'over', 'under', 'asian', 'handicap'
            ];
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);

            let foundMarkets = lines.filter(l =>
                marketKeywords.some(kw => l.toLowerCase().includes(kw))
            );

            if (foundMarkets.length === 0 && lines.length > 0) {
                // FALLBACK: Pick the longest line between 10-50 chars (usually the event/market name)
                const reasonableLines = lines.filter(l => l.length > 10 && l.length < 60);
                if (reasonableLines.length > 0) {
                    data.market = reasonableLines[0];
                }
            } else if (foundMarkets.length > 0) {
                data.market = foundMarkets.slice(0, 2).join(' / ');
            }

            // 6. Extract Event (Try to find something that looks like Team vs Team)
            const vsRegex = /([A-Z][a-z]+\s?)+ (v|vs|x) ([A-Z][a-z]+\s?)+/;
            const vsMatch = text.match(vsRegex);
            if (vsMatch) {
                data.event = vsMatch[0];
            }

            // Final check: provide as much as we have, even if only raw text
            if (text && text.length > 2) {
                console.log('[OCR] Extraction Result (Heuristic):', data);
                return data;
            }

            console.warn('[OCR] No text found at all.');
            return null;

        } catch (error) {
            console.error('[OCR Service] Error during extraction:', error);
            return null;
        }
    }
}

export const ocrService = new OCRService();
