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
    relativeBox?: { x: number; y: number; w: number; h: number }; // % relative to image or anchor
}

export interface BookmakerLayout {
    id: string;
    name: string;
    anchors: string[]; // Fixed texts that identify this bookmaker (e.g. Logo text)
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
        this.layouts = [
            {
                id: 'betano',
                name: 'Betano',
                anchors: ['betano', 'horário de login'],
                rules: [
                    { field: 'stake', anchor: 'aposta', regex: /\d+[.,]\d{2}/ },
                    { field: 'odds', anchor: 'odds super turbinadas', regex: /\d+[.,]\d{2}/ },
                    { field: 'market', anchor: 'resultado final' },
                    { field: 'event', anchor: 'v' } // Often "Team A v Team B"
                ]
            },
            {
                id: 'br4bet',
                name: 'Br4.bet',
                anchors: ['br4.bet', 'boletim de a'],
                rules: [
                    { field: 'stake', anchor: 'valor total de aposta', regex: /\d+[.,]\d{2}/ },
                    { field: 'odds', anchor: 'cotaes totais', regex: /\d+[.,]\d{2}/ },
                    { field: 'market', anchor: 'vencedor do encontro' }
                ]
            },
            {
                id: 'betnacional',
                name: 'BetNacional',
                anchors: ['betnacional', 'compartilhar'],
                rules: [
                    { field: 'stake', anchor: 'aposta', regex: /\d+[.,]\d{2}/ },
                    { field: 'odds', anchor: 'potencial ganho', regex: /\d+[.,]\d{2}/ },
                    { field: 'market', anchor: 'resultado final' }
                ]
            }
        ];
    }

    async runOCR(imageBuffer: string): Promise<OCRResult> {
        if (!this.worker) {
            this.worker = await createWorker('por'); // Portuguese
        }

        const { data } = await this.worker.recognize(imageBuffer);

        return {
            text: data.text,
            words: data.words.map(w => ({
                text: w.text,
                bbox: w.bbox,
                confidence: w.confidence
            }))
        };
    }

    /**
     * Deterministic extraction based on layout rules
     */
    async extractData(imageBase64: string): Promise<any> {
        const ocr = await this.runOCR(imageBase64);
        const text = ocr.text.toLowerCase();

        // 1. Identify Bookmaker
        const layout = this.layouts.find(l =>
            l.anchors.some(anchor => text.includes(anchor.toLowerCase()))
        );

        if (!layout) return null;

        const data: any = { bookmaker: layout.name, type: 'bet' };

        // 2. Apply Rules
        for (const rule of layout.rules) {
            if (rule.anchor) {
                const anchorIndex = text.indexOf(rule.anchor.toLowerCase());
                if (anchorIndex !== -1) {
                    // Simplistic matching: look for the nearest value after the anchor
                    const snippet = text.substring(anchorIndex, anchorIndex + 100);

                    if (rule.regex) {
                        const match = snippet.match(rule.regex);
                        if (match) data[rule.field] = parseFloat(match[0].replace(',', '.'));
                    } else {
                        // Text-based (like Market)
                        // Special rule for "Criar Aposta": join multiple markets with '+'
                        if (rule.field === 'market') {
                            const lines = data.text?.split('\n') || [];
                            const markets = lines.filter((l: string) =>
                                l.toLowerCase().includes('resultado') ||
                                l.toLowerCase().includes('ambas') ||
                                l.toLowerCase().includes('mais de')
                            );

                            if (markets.length > 1) {
                                data.market = markets.join(' + ');
                            } else {
                                data.market = rule.anchor; // Fallback to found anchor
                            }
                        }
                    }
                }
            }
        }

        return data;
    }
}

export const ocrService = new OCRService();
