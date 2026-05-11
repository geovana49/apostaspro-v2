import { createWorker } from 'tesseract.js';

export interface OCRResult {
    text: string;
    words: any[];
    lines: any[];
    blocks: any[];
}

/**
 * Hyper-Aggressive Local OCR Service
 */
class OCRService {
    private worker: any = null;
    private isBusy: boolean = false;
    private progressCallback: ((p: number) => void) | null = null;

    async getWorker() {
        if (!this.worker) {
            try {
                console.log('[OCR] Initializing Tesseract worker (por+eng)...');
                this.worker = await createWorker(['por', 'eng'], 1, {
                    logger: m => {
                        if (m.status === 'recognizing text' && this.progressCallback) {
                             this.progressCallback(Math.round(m.progress * 100));
                        }
                    },
                });
            } catch (err) {
                console.error('[OCR] Worker initialization failed:', err);
                throw err;
            }
        }
        return this.worker;
    }

    private async preprocess(imageInput: string | Blob | File | HTMLImageElement): Promise<string> {
        try {
            return new Promise((resolve) => {
                const img = new Image();
                
                const processImg = (source: HTMLImageElement | HTMLCanvasElement) => {
                    const canvas = document.createElement('canvas');
                    // FORCE a minimum width of 2500px for OCR (Tesseract loves large images)
                    const minWidth = 2500;
                    const scale = source.width < minWidth ? minWidth / source.width : 1;
                    
                    canvas.width = source.width * scale;
                    canvas.height = source.height * scale;
                    
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        resolve(typeof imageInput === 'string' ? imageInput : '');
                        return;
                    }

                    // OCR-optimized settings: Grayscale + Sharp Contrast
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.filter = 'grayscale(1) contrast(1.5) brightness(1.1)';
                    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
                    
                    // Return as Base64 string
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    resolve(dataUrl);
                };

                if (imageInput instanceof HTMLImageElement) {
                    if (imageInput.complete) {
                        processImg(imageInput);
                    } else {
                        imageInput.onload = () => processImg(imageInput);
                        imageInput.onerror = () => resolve('');
                    }
                } else if (typeof imageInput === 'string' && !imageInput.startsWith('blob:')) {
                    // It's already a URL/Base64
                    resolve(imageInput);
                } else {
                    const url = typeof imageInput === 'string' ? imageInput : URL.createObjectURL(imageInput as Blob);
                    img.onload = () => {
                        processImg(img);
                        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                    };
                    img.onerror = () => {
                        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
                        resolve('');
                    };
                    img.src = url;
                }
            });
        } catch (e) {
            console.error('[OCR Preprocess] Error:', e);
            return typeof imageInput === 'string' ? imageInput : '';
        }
    }

    async runOCR(imageInput: string | Blob | File | HTMLImageElement, onProgress?: (p: number) => void): Promise<OCRResult> {
        if (this.isBusy) {
            console.warn('[OCR] Busy, waiting...');
            await new Promise(r => setTimeout(r, 1000));
        }

        this.isBusy = true;
        this.progressCallback = onProgress || null;
        
        try {
            console.log('[OCR] Pre-processing image (Base64 + Scale)...');
            const processedBase64 = await this.preprocess(imageInput);
            
            if (!processedBase64) throw new Error('Falha no processamento da imagem');

            const worker = await this.getWorker();
            console.log('[OCR] Starting recognition...');
            const result = await worker.recognize(processedBase64);
            
            // Allow a tiny delay to ensure Tesseract finishes internal segmentation
            await new Promise(r => setTimeout(r, 100));

            const data = result.data;

            console.log(`[OCR] Result Summary:
                - Text length: ${data.text?.length || 0}
                - Lines: ${data.lines?.length || 0}
                - Words: ${data.words?.length || 0}
                - Blocks: ${data.blocks?.length || 0}
                - Confidence: ${data.confidence}%`);

            return {
                text: data.text || '',
                words: data.words || [],
                lines: data.lines || [],
                blocks: data.blocks || []
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
            const stakeKeywords = ['r$', '$', 'valor', 'aposta', 'total', 'pago', 'stake', 'simples', 'investimento', 'montante', 'importe'];
            const stakeRegex = new RegExp(`(?:${stakeKeywords.join('|')})[:\\s]*(\\d+[,.]\\d{2})`, 'i');
            const stakeMatch = textLower.match(stakeRegex);
            if (stakeMatch) {
                data.stake = parseFloat(stakeMatch[1].replace(',', '.'));
            } else {
                // Secondary fallback: find the strongest "Value-like" pattern
                const valuePatterns = textLower.match(/(\d+[,.]\d{2})/g) || [];
                const possibleStakes = valuePatterns.map(v => parseFloat(v.replace(',', '.'))).filter(v => v >= 1);
                if (possibleStakes.length > 0) {
                    // Usually the stake is one of the larger numbers that isn't the total return
                    data.stake = Math.min(...possibleStakes);
                }
            }

            // 3. Extract Odds (Better Number Hunting)
            const oddsKeywords = ['@', 'odd', 'cota[çtc]ao', 'multiplicador', 'x', 'odds', 'pre[çtc]o'];
            const oddsRegex = new RegExp(`(?:${oddsKeywords.join('|')})[:\\s]*(\\d+[.,]\\d{2,3})`, 'i');
            const oddsMatch = textLower.match(oddsRegex);
            if (oddsMatch) {
                data.odds = parseFloat(oddsMatch[1].replace(',', '.'));
            } else {
                const numbers = (textLower.match(/\d+[.,]\d{2,3}/g) || []).map(n => parseFloat(n.replace(',', '.')));
                const possibleOdds = numbers.find(n => n > 1.01 && n < 100 && n !== data.stake);
                if (possibleOdds) data.odds = possibleOdds;
            }

            // 4. Extract Date
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);

            if (textLower.includes('hoje')) {
                data.date = today.toISOString().split('T')[0];
            } else if (textLower.includes('ontem')) {
                data.date = yesterday.toISOString().split('T')[0];
            } else {
                const dateRegex = /(\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?)|(\d{1,2}\s+(de\s+)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez))/i;
                const dateMatch = textLower.match(dateRegex);
                if (dateMatch) {
                    let dateStr = dateMatch[0];
                    if (dateStr.includes('/') || dateStr.includes('-')) {
                        const sep = dateStr.includes('/') ? '/' : '-';
                        let parts = dateStr.split(sep);
                        let day = parts[0].padStart(2, '0');
                        let month = parts[1].padStart(2, '0');
                        let year = parts[2] || today.getFullYear().toString();
                        if (year.length === 2) year = '20' + year;
                        data.date = `${year}-${month}-${day}`;
                    }
                }
            }
            if (!data.date) data.date = today.toISOString().split('T')[0];

            // 5. Extract Market & Event (Heuristic context)
            const marketKeywords = [
                'resultado', 'ambas', 'gols', 'escanteios', 'vencedor', 'mais de', 'menos de', 'empate',
                'vence', 'casa', 'fora', 'draw', 'over', 'under', 'asian', 'handicap', 'final', 'vitoria',
                'cart[õo]es', 'escanteio', 'minutos', 'intervalo'
            ];

            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);

            // Look for patterns like "Team A x Team B" or "Team A vs Team B"
            const teamPairRegex = /([A-Z0-9].*)\s+(v|vs|x|-|para)\s+([A-Z0-9].*)/i;
            const possibleEvent = lines.find(l => teamPairRegex.test(l) && l.length < 60);
            if (possibleEvent) data.event = possibleEvent;

            let foundMarkets = lines.filter(l =>
                marketKeywords.some(kw => new RegExp(kw, 'i').test(l))
            );

            if (foundMarkets.length > 0) {
                data.market = foundMarkets.slice(0, 2).join(' / ');
                if (!data.event) {
                    const mIndex = lines.indexOf(foundMarkets[0]);
                    if (mIndex > 0) {
                        // Usually the event line is right above the market line
                        data.event = lines[mIndex - 1];
                    }
                }
            } else if (lines.length > 0) {
                // Fallback: use reasonable looking lines
                const reasonableLines = lines.filter(l =>
                    l.length > 8 &&
                    l.length < 50 &&
                    !l.toLowerCase().includes(data.bookmaker.toLowerCase()) &&
                    !/\d/.test(l.substring(0, 1)) // Shouldn't start with a number (likely stake/odds)
                );
                if (reasonableLines.length > 0) {
                    data.event = reasonableLines[0];
                    if (reasonableLines.length > 1) data.market = reasonableLines[1];
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
