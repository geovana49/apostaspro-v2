import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User as UserIcon, Loader2, Sparkles, AlertCircle, Info } from 'lucide-react';
import { Bet, ExtraGain, Bookmaker, StatusItem } from '../types';
import { Button, Input, Card } from './ui/UIComponents';

interface CoachProps {
  bets: Bet[];
  gains: ExtraGain[];
  bookmakers: Bookmaker[];
  statuses: StatusItem[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

// Extend Window interface for marked
declare global {
  interface Window {
    marked: {
      parse: (text: string) => string;
    };
  }
}

const Coach: React.FC<CoachProps> = ({ bets, gains, bookmakers, statuses }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Olá! Sou seu Coach de Apostas. Analiso seus dados para encontrar padrões e dar dicas. O que você gostaria de saber sobre sua banca hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Gemini Setup ---
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!apiKey) {
      setApiKeyError(true);
      setMessages(prev => [...prev, { role: 'model', text: '⚠️ Erro de Configuração: API Key não encontrada. Verifique suas variáveis de ambiente.', isError: true }]);
      return;
    }

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey });

      // Prepare Context Data
      const contextData = {
        summary: "User's betting portfolio data.",
        bookmakers: bookmakers.map(b => ({ id: b.id, name: b.name })),
        bets: bets.slice(0, 50).map(b => ({ // Limit context size if needed
          date: b.date,
          event: b.event,
          bookmaker: bookmakers.find(bk => bk.id === b.mainBookmakerId)?.name,
          status: b.status,
          profit: b.coverages.reduce((acc, c) => {
            if (c.status === 'Green') return acc + (c.stake * c.odd) - c.stake;
            if (c.status === 'Red') return acc - c.stake;
            return acc;
          }, 0).toFixed(2)
        })),
        recentGains: gains.slice(0, 20)
      };

      const systemPrompt = `
        You are an expert Sports Betting Coach and Data Analyst named 'Coach Pro'.
        Your tone is professional, encouraging, but strictly analytical when discussing numbers.
        
        CONTEXT DATA (JSON):
        ${JSON.stringify(contextData)}

        INSTRUCTIONS:
        1. Answer the user's question based strictly on the provided data.
        2. If the user asks about general betting concepts, explain them clearly.
        3. Identify patterns (e.g., "You are losing money on Bet365 but winning on Pinnacle").
        4. Use Markdown for formatting (bold, lists).
        5. Keep answers concise (max 150 words) unless detailed analysis is requested.
        6. Language: Portuguese (Brazil).
      `;

      // Use the 'gemini-2.5-flash' model for text chat
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userMessage,
        config: {
          systemInstruction: systemPrompt,
        }
      });

      const responseText = response.text || "Desculpe, não consegui analisar os dados agora.";

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'Ocorreu um erro ao consultar o Coach. Tente novamente.', isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Render Markdown safely
  const renderMessageText = (text: string) => {
    if (window.marked && window.marked.parse) {
      return { __html: window.marked.parse(text) };
    }
    return { __html: text }; // Fallback
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4 max-w-4xl mx-auto">
      {/* Intro Card */}
      <Card className="bg-gradient-to-r from-[#151b2e] to-[#0d1121] border-white/10 p-4 flex items-center gap-4 shrink-0">
        <div className="p-3 bg-primary/10 rounded-full border border-primary/20 animate-pulse-slow">
          <Bot size={24} className="text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-white text-lg">Coach IA</h3>
          <p className="text-sm text-textMuted">Inteligência Artificial analisando sua gestão de banca.</p>
        </div>
      </Card>

      {/* Chat Area */}
      <div className="flex-1 bg-[#0d1121] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-inner relative">
        {apiKeyError && (
          <div className="absolute top-0 left-0 right-0 bg-danger/10 text-danger p-2 text-xs font-bold text-center border-b border-danger/20 flex items-center justify-center gap-2">
            <AlertCircle size={12} />
            API Key não configurada no código.
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm
                            ${msg.role === 'user' ? 'bg-secondary text-[#090c19]' : 'bg-primary text-[#090c19]'}
                        `}>
                {msg.role === 'user' ? <UserIcon size={16} /> : <Sparkles size={16} />}
              </div>

              <div className={`
                            p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm
                            ${msg.role === 'user'
                  ? 'bg-white/10 text-white rounded-tr-none'
                  : `bg-[#151b2e] text-gray-200 border border-white/5 rounded-tl-none ${msg.isError ? 'border-danger/50 text-danger' : ''}`
                }
                        `}>
                {msg.role === 'model' ? (
                  <div
                    className="prose prose-invert prose-sm max-w-none [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4"
                    dangerouslySetInnerHTML={renderMessageText(msg.text)}
                  />
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-1">
                <Loader2 size={16} className="animate-spin" />
              </div>
              <div className="bg-[#151b2e] p-3 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#151b2e] border-t border-white/5">
          <div className="flex items-center gap-2 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Pergunte sobre seus lucros, padrões..."
              className="pr-12 py-3 bg-[#090c19] border-white/10 focus:border-primary/50"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-[#090c19] rounded-lg hover:bg-primaryDark disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="mt-2 flex justify-center">
            <p className="text-[10px] text-gray-600 flex items-center gap-1">
              <Info size={10} /> O Coach pode cometer erros. Verifique os dados importantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Coach;