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
            console.log('[OCR] Initializing Tesseract worker (local)...');
            this.worker = await createWorker('por'); // Portuguese + digits
            console.log('[OCR] Worker ready.');
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

            // 1. Detect Bookmaker (Simple keyword match)
            const houses = ['betano', 'bet365', 'br4', 'nacional', 'sportingbet', 'kto', 'novibet', 'pixbet', 'estrela'];
            data.bookmaker = houses.find(h => textLower.includes(h)) || 'Casa Automática';

            // 2. Extract Stake (Look for R$, $, Valor, Aposta)
            // Pattern: Currency symbol or keyword followed by money (0,00)
            const stakeRegex = /(?:r\$|\$|valor|aposta|total)[:\s]*(\d+[,.]\d{2})/i;
            const stakeMatch = textLower.match(stakeRegex);
            if (stakeMatch) {
                data.stake = parseFloat(stakeMatch[1].replace(',', '.'));
            }

            // 3. Extract Odds (Look for @, Odd, Cotação, or standard 1.xx / 2.xx patterns)
            const oddsRegex = /(?:@|odd|cota[çtc]ao|multiplicador|x)[:\s]*(\d+[.,]\d{2,3})/i;
            const oddsMatch = textLower.match(oddsRegex);
            if (oddsMatch) {
                data.odds = parseFloat(oddsMatch[1].replace(',', '.'));
            } else {
                // Generic odds hunt: find decimal numbers that AREN'T the stake
                const allNumbers = textLower.match(/\d+[.,]\d{2,3}/g);
                if (allNumbers) {
                    const numbers = allNumbers.map(n => parseFloat(n.replace(',', '.')));
                    // Usually stake is higher than odds, or odds is first small decimal
                    const possibleOdds = numbers.find(n => n > 1.01 && n < 100 && n !== data.stake);
                    if (possibleOdds) data.odds = possibleOdds;
                }
            }

            // 4. Extract Date
            const dateRegex = /(\d{1,2}\/\d{1,2}(\/\d{2,4})?)|hoje|ontem/i;
            const dateMatch = textLower.match(dateRegex);
            if (dateMatch) {
                let dateStr = dateMatch[0];
                const now = new Date();
                if (dateStr.includes('hoje')) {
                    data.date = now.toISOString().split('T')[0];
                } else if (dateStr.includes('ontem')) {
                    const yesterday = new Date(now);
                    yesterday.setDate(now.getDate() - 1);
                    data.date = yesterday.toISOString().split('T')[0];
                } else if (dateStr.includes('/')) {
                    let parts = dateStr.split('/');
                    let day = parts[0].padStart(2, '0');
                    let month = parts[1].padStart(2, '0');
                    let year = parts[2] || now.getFullYear().toString();
                    if (year.length === 2) year = '20' + year;
                    data.date = `${year}-${month}-${day}`;
                }
            }

            // 5. Extract Market (Look for lines containing common keywords)
            const marketKeywords = ['resultado', 'ambas', 'gols', 'escanteios', 'vencedor', 'mais de', 'menos de', 'empate', 'vence'];
            const lines = text.split('\n');
            const foundMarkets = lines.filter(l =>
                l.length > 5 && marketKeywords.some(kw => l.toLowerCase().includes(kw))
            );

            if (foundMarkets.length > 1) {
                data.market = foundMarkets.map(m => m.trim()).join(' + ');
            } else if (foundMarkets.length === 1) {
                data.market = foundMarkets[0].trim();
            }

            // Final check: if we found AT LEAST some data, don't return null
            if (data.stake || data.odds || data.market) {
                console.log('[OCR] Extraction Success:', data);
                return data;
            }

            console.warn('[OCR] Could not extract meaningful data patterns.');
            return null;

        } catch (error) {
            console.error('[OCR Service] Error during extraction:', error);
            return null;
        }
    }
}

export const ocrService = new OCRService();
