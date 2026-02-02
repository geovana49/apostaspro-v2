// AI Service using Google Gemini API for image analysis and automation
import { GoogleGenerativeAI } from '@google/generative-ai';

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

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Initialize the Gemini API client
let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

/**
 * Analyzes an image (screenshot) to extract bet or gain information
 */
export async function analyzeImage(imageBase64: string): Promise<AIAnalysisResult> {
    if (!genAI) {
        throw new Error('API Key do Gemini não configurada. Configure VITE_GEMINI_API_KEY no arquivo .env');
    }

    try {
        // Get the generative model (vision model for images)
        // Using pinned version 'gemini-1.5-flash-001' to avoid alias resolution issues.
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });

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

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            }
        ]);

        const response = await result.response;
        const textResponse = response.text();

        // Parse JSON from response
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('IA não retornou um JSON válido');
        }

        const parsedResult: AIAnalysisResult = JSON.parse(jsonMatch[0]);

        // Add suggestions based on confidence
        if (parsedResult.confidence < 0.5) {
            parsedResult.suggestions = ['⚠️ Confiança baixa. Revise os dados antes de salvar.'];
        } else if (parsedResult.confidence < 0.7) {
            parsedResult.suggestions = ['ℹ️ Alguns dados podem precisar de correção.'];
        }

        return parsedResult;
    } catch (error: any) {
        console.error('Error analyzing image:', error);
        throw error;
    }
}

/**
 * Extracts bookmaker information from a URL
 */
export async function extractBookmakerFromURL(url: string): Promise<BookmakerExtraction> {
    try {
        // Normalize URL
        const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
        const urlObj = new URL(normalizedUrl);
        const domain = urlObj.hostname.replace('www.', '');

        // Extract name (first part before TLD)
        const nameParts = domain.split('.');
        const name = nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);

        // Try to get logo from Google's favicon service
        const logo = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

        return {
            name,
            domain,
            logo,
            confidence: 1.0
        };
    } catch (error) {
        console.error('Error extracting bookmaker from URL:', error);
        throw new Error('URL inválida');
    }
}

/**
 * Sends a message to the AI Coach and gets a response
 */
export async function sendMessageToCoach(message: string, history: { role: 'user' | 'model', text: string }[] = []): Promise<string> {
    if (!genAI) {
        throw new Error('API Key do Gemini não configurada');
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // System instruction
        const systemInstruction = `Você é o Coach IA do ApostasPro, um especialista em apostas esportivas e gestão de banca.
Seu objetivo é ajudar o usuário a analisar suas apostas, dar dicas de gestão de banca e explicar conceitos de apostas.
Seja direto, profissional e use emojis ocasionalmente.
Responda em português do Brasil.
Não dê conselhos financeiros irresponsáveis. Sempre incentive o jogo responsável.`;

        // Simple prompt combining system instruction with user message
        const fullPrompt = systemInstruction + "\n\nUsuário: " + message;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text() || 'Desculpe, não consegui processar sua mensagem.';
    } catch (error) {
        console.error('Error sending message to coach:', error);
        throw error;
    }
}

/**
 * Validates if the Gemini API key is configured
 */
export function isGeminiConfigured(): boolean {
    return Boolean(GEMINI_API_KEY);
}
