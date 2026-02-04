import { createWorker } from 'tesseract.js';

export interface OCRResult {
    text: string;
    words: Array<{
        text: string;
        bbox: { x0: number; y0: number; x1: number; y1: number };
        confidence: number;
    }>;
}

export interface ExtractionRule {
    field: 'stake' | 'odds' | 'market' | 'event' | 'date' | 'bookmaker';
    anchor?: string; // Search for this text first
    regex?: RegExp; // Pattern to look for
}

export interface BookmakerLayout {
    id: string;
    name: string;
    anchors: string[]; // Fixed texts that identify this bookmaker
    rules: ExtractionRule[];
}

/**
 * Local OCR Service using Tesseract.js
 * No external API calls, 100% deterministic based on visual rules.
 */
class OCRService {
    private worker: Tesseract.Worker | null = null;
    private layouts: BookmakerLayout[] = [];

    constructor() {
        this.initializeDefaultLayouts();
    }

    private initializeDefaultLayouts() {
        // Shared date regex for most houses
        const dateRegex = /(\d{1,2}\/\d{1,2}(\/\d{2,4})?)|hoje|ontem/i;

        this.layouts = [
            {
                id: 'betano',
                name: 'Betano',
                anchors: ['betano', 'horário de login'],
                rules: [
                    { field: 'stake', anchor: 'aposta', regex: /\d+[.,]\d{2}/ },
                    { field: 'odds', anchor: 'odds super turbinadas', regex: /\d+[.,]\d{2}/ },
                    { field: 'market', anchor: 'resultado final' },
                    { field: 'event', anchor: 'v' },
                    { field: 'date', regex: dateRegex }
                ]
            },
            {
                id: 'br4bet',
                name: 'Br4.bet',
                anchors: ['br4.bet', 'boletim de a'],
                rules: [
                    { field: 'stake', anchor: 'valor total de aposta', regex: /\d+[.,]\d{2}/ },
                    { field: 'odds', anchor: 'cotaes totais', regex: /\d+[.,]\d{2}/ },
                    { field: 'market', anchor: 'vencedor do encontro' },
                    { field: 'date', regex: dateRegex }
                ]
            },
            {
                id: 'betnacional',
                name: 'BetNacional',
                anchors: ['betnacional', 'compartilhar'],
                rules: [
                    { field: 'stake', anchor: 'aposta', regex: /\d+[.,]\d{2}/ },
                    { field: 'odds', anchor: 'potencial ganho', regex: /\d+[.,]\d{2}/ },
                    { field: 'market', anchor: 'resultado final' },
                    { field: 'date', regex: dateRegex }
                ]
            }
        ];
    }

    async runOCR(imageBuffer: string): Promise<OCRResult> {
        if (!this.worker) {
            this.worker = await createWorker('por'); // Portuguese
        }

        const result = await this.worker.recognize(imageBuffer);
        const data = result.data;

        return {
            text: data.text,
            words: data.words.map((w: any) => ({
                text: w.text,
                bbox: w.bbox,
                confidence: w.confidence
            }))
        };
    }

    async extractData(imageBase64: string): Promise<any> {
        try {
            const ocr = await this.runOCR(imageBase64);
            const text = ocr.text.toLowerCase();

            // 1. Identify Bookmaker
            const layout = this.layouts.find(l =>
                l.anchors.some(anchor => text.includes(anchor.toLowerCase()))
            );

            if (!layout) return null;

            const data: any = { bookmaker: layout.name, type: 'bet' };

            // 2. Process Rules
            for (const rule of layout.rules) {
                // Handle Market specifically for "Criar Aposta" (+) logic
                if (rule.field === 'market') {
                    const lines = ocr.text.split('\n');
                    const marketKeywords = [
                        'resultado', 'ambas', 'mais de', 'menos de', 'vencedor',
                        'escanteios', 'total', 'handicap', 'empate', 'gols'
                    ];
                    const detectedMarkets: string[] = [];

                    for (const line of lines) {
                        const l = line.toLowerCase().trim();
                        // Look for lines that look like a market selection
                        if (l.length > 5 && marketKeywords.some(kw => l.includes(kw))) {
                            if (!detectedMarkets.some(m => m.toLowerCase() === l)) {
                                detectedMarkets.push(line.trim());
                            }
                        }
                    }

                    if (detectedMarkets.length > 1) {
                        data.market = detectedMarkets.join(' + ');
                    } else if (detectedMarkets.length === 1) {
                        data.market = detectedMarkets[0];
                    } else {
                        data.market = rule.anchor || 'Mercado';
                    }
                    continue;
                }

                // Handle Date specifically
                if (rule.field === 'date' && rule.regex) {
                    const match = text.match(rule.regex);
                    if (match) {
                        const dateVal = match[0].toLowerCase();
                        const now = new Date();

                        if (dateVal.includes('hoje')) {
                            data.date = now.toISOString().split('T')[0];
                        } else if (dateVal.includes('ontem')) {
                            const yesterday = new Date(now);
                            yesterday.setDate(now.getDate() - 1);
                            data.date = yesterday.toISOString().split('T')[0];
                        } else if (dateVal.includes('/')) {
                            let [day, month, year] = dateVal.split('/');
                            if (!year) year = now.getFullYear().toString();
                            if (year.length === 2) year = '20' + year;
                            data.date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                        }
                    }
                    continue;
                }

                // Handle Numeric/Anchor rules (Stake, Odds, Event)
                if (rule.anchor) {
                    const anchorPos = text.indexOf(rule.anchor.toLowerCase());
                    if (anchorPos !== -1) {
                        const snippet = text.substring(anchorPos, anchorPos + 100);
                        if (rule.regex) {
                            const match = snippet.match(rule.regex);
                            if (match) data[rule.field] = parseFloat(match[0].replace(',', '.'));
                        } else {
                            data[rule.field] = rule.anchor;
                        }
                    }
                }
            }

            return data;
        } catch (error) {
            console.error('[OCR Service] Extraction failed:', error);
            return null;
        }
    }
}

export const ocrService = new OCRService();
