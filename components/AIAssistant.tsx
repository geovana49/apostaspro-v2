import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Input, Modal, Select } from './ui/UIComponents';
import {
    Upload, Image as ImageIcon, Sparkles, CheckCircle2, XCircle, Edit3,
    Link as LinkIcon, Loader2, AlertCircle, TrendingUp, DollarSign, Calendar,
    Home, Trophy, ChevronRight, History, Clock
} from 'lucide-react';
import { analyzeImage, extractBookmakerFromURL, isGeminiConfigured, AIAnalysisResult, BookmakerExtraction } from '../services/aiService';
import { Bookmaker, Bet, ExtraGain, StatusItem, OriginItem, AIAnalysisHistory } from '../types';
import TeachAIModal from './TeachAIModal';

interface AIAssistantProps {
    bookmakers: Bookmaker[];
    statuses: StatusItem[];
    origins: OriginItem[];
    onSaveBet: (bet: Omit<Bet, 'id'>) => void;
    onSaveGain: (gain: Omit<ExtraGain, 'id' | 'status'>) => void;
    onSaveBookmaker: (bookmaker: Omit<Bookmaker, 'id'>) => void;
    currentUserId: string | null;
}

type AnalysisState = 'idle' | 'uploading' | 'analyzing' | 'result' | 'error';

const AIAssistant: React.FC<AIAssistantProps> = ({
    bookmakers,
    statuses,
    origins,
    onSaveBet,
    onSaveGain,
    onSaveBookmaker,
    currentUserId
}) => {
    // Image Analysis State
    const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    // Bookmaker Extraction State
    const [bookmakerUrl, setBookmakerUrl] = useState('');
    const [extractedBookmaker, setExtractedBookmaker] = useState<BookmakerExtraction | null>(null);
    const [isExtractingBookmaker, setIsExtractingBookmaker] = useState(false);

    // History
    const [history, setHistory] = useState<AIAnalysisHistory[]>([]);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isTeachModalOpen, setIsTeachModalOpen] = useState(false);
    const [editedData, setEditedData] = useState<any>(null);

    // Chat State
    const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis');
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if Gemini is configured
    const geminiConfigured = isGeminiConfigured();

    // Scroll to bottom of chat
    useEffect(() => {
        if (activeTab === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages, activeTab]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAnalysisState('uploading');
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
                setAnalysisState('idle');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyzeImage = async () => {
        if (!selectedImage) return;

        setAnalysisState('analyzing');
        setAnalysisError(null);

        try {
            const result = await analyzeImage(selectedImage);
            setAnalysisResult(result);
            setAnalysisState('result');

            // Add to history
            const historyItem: AIAnalysisHistory = {
                id: Date.now().toString(),
                timestamp: new Date(),
                imageUrl: selectedImage,
                type: result.type,
                status: 'confirmed',
                confidence: result.confidence
            };
            setHistory(prev => [historyItem, ...prev.slice(0, 4)]);
        } catch (error: any) {
            setAnalysisError(error.message || 'Erro ao analisar imagem');
            setAnalysisState('error');
        }
    };

    const handleConfirmResult = () => {
        if (!analysisResult) return;
        saveData(analysisResult.data, analysisResult.type);
    };

    const saveData = (data: any, type: 'bet' | 'gain') => {
        const bookmaker = bookmakers.find(b =>
            b.name.toLowerCase().includes(data.bookmaker?.toLowerCase() || '')
        );

        if (type === 'bet') {
            const bet: Omit<Bet, 'id'> = {
                date: data.date || new Date().toISOString().split('T')[0],
                event: data.match || 'Evento Desconhecido',
                mainBookmakerId: bookmaker?.id || bookmakers[0]?.id || '',
                status: statuses.find(s => s.name === 'Pendente')?.name || 'Pendente',
                coverages: [
                    {
                        id: Date.now().toString(), // Temporary ID for the coverage
                        bookmakerId: bookmaker?.id || bookmakers[0]?.id || '',
                        market: data.market || data.description || 'Mercado Padrão',
                        odd: Number(data.odds) || 1.0,
                        stake: Number(data.value) || 0,
                        status: statuses.find(s => s.name === 'Pendente')?.name || 'Pendente'
                    }
                ],
                notes: `Adicionado via IA - Confiança: ${(analysisResult?.confidence || 0) * 100}%`
            };
            onSaveBet(bet);
        } else {
            const gain: Omit<ExtraGain, 'id' | 'status'> = {
                date: data.date || new Date().toISOString().split('T')[0],
                amount: Number(data.value) || 0,
                origin: data.description || 'Bônus',
                bookmakerId: bookmaker?.id || '',
                notes: `Adicionado via IA - Confiança: ${(analysisResult?.confidence || 0) * 100}%`
            };
            onSaveGain(gain);
        }
        resetAnalysisState();
    };

    const handleEditResult = () => {
        if (!analysisResult) return;
        setEditedData({ ...analysisResult.data, type: analysisResult.type });
        setIsEditModalOpen(true);
    };

    const handleSaveMapping = (mappedData: any) => {
        if (!analysisResult) return;

        setAnalysisResult({
            ...analysisResult,
            data: {
                ...analysisResult.data,
                ...mappedData
            },
            confidence: 1.0, // Manual mapping is 100% confident
            source: 'Manual (Mapeado pelo Usuário)',
            analysisType: 'local' // Treat as local since no cloud AI was used for these specific fields
        });
        setIsTeachModalOpen(false);
    };

    const handleSaveEdited = () => {
        if (!editedData) return;
        saveData(editedData, editedData.type);
        setIsEditModalOpen(false);
    };

    const handleCancelResult = () => {
        resetAnalysisState();
    };

    const resetAnalysisState = () => {
        setAnalysisState('idle');
        setSelectedImage(null);
        setAnalysisResult(null);
        setAnalysisError(null);
    };

    const handleExtractBookmaker = async () => {
        if (!bookmakerUrl.trim()) return;

        setIsExtractingBookmaker(true);
        try {
            const extracted = await extractBookmakerFromURL(bookmakerUrl);
            setExtractedBookmaker(extracted);
        } catch (error: any) {
            alert('Erro ao extrair casa de apostas: ' + error.message);
        } finally {
            setIsExtractingBookmaker(false);
        }
    };

    const handleAddBookmaker = () => {
        if (!extractedBookmaker) return;

        const newBookmaker: Omit<Bookmaker, 'id'> = {
            name: extractedBookmaker.name,
            siteUrl: extractedBookmaker.domain,
            logo: extractedBookmaker.logo,
            color: '#3b82f6'
        };

        onSaveBookmaker(newBookmaker);
        setBookmakerUrl('');
        setExtractedBookmaker(null);
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;

        const userMessage = chatInput;
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setIsSendingMessage(true);

        try {
            const { sendMessageToCoach } = await import('../services/aiService');
            const response = await sendMessageToCoach(userMessage, chatMessages);

            setChatMessages(prev => [...prev, { role: 'model', text: response }]);
        } catch (error: any) {
            console.error('Erro no Chat:', error);
            setChatMessages(prev => [...prev, { role: 'model', text: `❌ Erro: ${error.message || 'Erro desconhecido'}` }]);
        } finally {
            setIsSendingMessage(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!geminiConfigured) {
        return (
            <div className="p-6 space-y-6">
                <Card className="p-8">
                    <div className="text-center space-y-4">
                        <AlertCircle size={48} className="mx-auto text-yellow-500" />
                        <h2 className="text-2xl font-bold text-white">⚙️ Configuração Necessária</h2>
                        <p className="text-gray-400">
                            Para usar o Coach IA, você precisa configurar sua chave da API do Google Gemini.
                        </p>
                        <div className="bg-[#0d1121] p-4 rounded-xl text-left space-y-2">
                            <p className="text-sm text-gray-300">
                                <strong>1.</strong> Acesse: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google AI Studio</a>
                            </p>
                            <p className="text-sm text-gray-300">
                                <strong>2.</strong> Crie uma API Key gratuita
                            </p>
                            <p className="text-sm text-gray-300">
                                <strong>3.</strong> Crie um arquivo <code className="bg-black/30 px-2 py-1 rounded">.env</code> na raiz do projeto
                            </p>
                            <p className="text-sm text-gray-300">
                                <strong>4.</strong> Adicione: <code className="bg-black/30 px-2 py-1 rounded">VITE_GEMINI_API_KEY=sua-chave-aqui</code>
                            </p>
                            <p className="text-sm text-gray-300">
                                <strong>5.</strong> Reinicie o servidor (<code className="bg-black/30 px-2 py-1 rounded">npm run dev</code>)
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl">
                    <Sparkles size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Coach IA</h1>
                    <p className="text-sm text-gray-400">Automação inteligente para suas apostas e ganhos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Column: Analysis & Chat */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Tabs */}
                    <div className="flex gap-2 p-1 bg-[#0d1121] rounded-lg border border-white/5 w-fit">
                        <button
                            onClick={() => setActiveTab('analysis')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'analysis' ? 'bg-primary text-[#090c19] shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            📸 Analisar Imagem
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-primary text-[#090c19] shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            💬 Chat com Coach
                        </button>
                    </div>

                    {/* Section 1: Image Analysis */}
                    {activeTab === 'analysis' && (
                        <Card className="p-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="flex items-center gap-2 mb-4">
                                <ImageIcon size={20} className="text-primary" />
                                <h2 className="text-lg font-bold text-white">Analisar Screenshot</h2>
                            </div>

                            {!selectedImage ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-all group"
                                >
                                    <Upload size={48} className="mx-auto text-gray-500 group-hover:text-primary transition-colors mb-4" />
                                    <p className="text-white font-medium mb-2">Clique para enviar uma imagem</p>
                                    <p className="text-sm text-gray-500">Arraste ou clique para selecionar</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageSelect}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#0d1121]">
                                        <img src={selectedImage} alt="Screenshot" className="w-full h-auto max-h-80 object-contain mx-auto" />
                                    </div>

                                    {analysisState === 'analyzing' && (
                                        <div className="flex items-center justify-center gap-3 p-4 bg-purple-600/10 rounded-xl border border-purple-600/20">
                                            <Loader2 size={20} className="animate-spin text-purple-500" />
                                            <span className="text-white font-medium">A IA está analisando...</span>
                                        </div>
                                    )}

                                    {analysisState === 'error' && (
                                        <div className="p-4 bg-red-600/10 rounded-xl border border-red-600/20">
                                            <p className="text-red-500 font-medium">❌ {analysisError}</p>
                                        </div>
                                    )}

                                    {analysisState === 'result' && analysisResult && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resultado da Análise</span>
                                                        <span className="text-[10px] text-primary/70 font-medium">Extraído via {analysisResult.source || 'IA'}</span>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-lg font-bold text-sm flex items-center gap-2 ${analysisResult.type === 'bet' ? 'bg-blue-600/20 text-blue-400' :
                                                        analysisResult.type === 'gain' ? 'bg-green-600/20 text-green-400' :
                                                            'bg-gray-600/20 text-gray-400'
                                                        }`}>
                                                        {analysisResult.type === 'bet' ? <Trophy size={14} /> : <DollarSign size={14} />}
                                                        {analysisResult.type === 'bet' ? 'Aposta Detectada' :
                                                            analysisResult.type === 'gain' ? 'Ganho Extra Detectado' : 'Desconhecido'}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    {analysisResult.data.bookmaker && (
                                                        <div className="bg-[#0d1121] p-3 rounded-lg border border-white/5">
                                                            <span className="text-xs text-gray-500 block mb-1">Casa de Apostas</span>
                                                            <div className="flex items-center gap-2">
                                                                <Home size={14} className="text-primary" />
                                                                <span className="text-white font-medium">{analysisResult.data.bookmaker}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {analysisResult.data.value !== undefined && (
                                                        <div className="bg-[#0d1121] p-3 rounded-lg border border-white/5">
                                                            <span className="text-xs text-gray-500 block mb-1">Valor</span>
                                                            <div className="flex items-center gap-2">
                                                                <DollarSign size={14} className="text-green-400" />
                                                                <span className="text-white font-medium">R$ {analysisResult.data.value.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {analysisResult.data.odds && (
                                                        <div className="bg-[#0d1121] p-3 rounded-lg border border-white/5">
                                                            <span className="text-xs text-gray-500 block mb-1">Odds</span>
                                                            <div className="flex items-center gap-2">
                                                                <TrendingUp size={14} className="text-yellow-400" />
                                                                <span className="text-white font-medium">@{analysisResult.data.odds}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {analysisResult.data.date && (
                                                        <div className="bg-[#0d1121] p-3 rounded-lg border border-white/5">
                                                            <span className="text-xs text-gray-500 block mb-1">Data</span>
                                                            <div className="flex items-center gap-2">
                                                                <Calendar size={14} className="text-blue-400" />
                                                                <span className="text-white font-medium">{analysisResult.data.date}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {analysisResult.data.description && (
                                                    <div className="mt-3 p-3 bg-[#0d1121] rounded-lg border border-white/5">
                                                        <span className="text-xs text-gray-500 block mb-1">Descrição / Mercado</span>
                                                        <p className="text-sm text-gray-300">{analysisResult.data.description}</p>
                                                    </div>
                                                )}

                                                <div className="mt-3 pt-3 border-t border-white/10">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1">
                                                            <span className="text-[10px] text-gray-500 block mb-1">Nível de Confiança (IA):</span>
                                                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${analysisResult.confidence >= 0.7 ? 'bg-green-500' :
                                                                        analysisResult.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                                                                        }`}
                                                                    style={{ width: `${analysisResult.confidence * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-white self-end">{(analysisResult.confidence * 100).toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {analysisResult.analysisType === 'partial' && (
                                                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
                                                    <AlertCircle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
                                                    <div className="flex-1">
                                                        <p className="text-xs text-yellow-200 font-medium">Layout Desconhecido</p>
                                                        <p className="text-[10px] text-yellow-500/80">O OCR genérico foi utilizado. Se os dados estiverem incorretos, você pode ensinar a IA.</p>
                                                    </div>
                                                    <button
                                                        className="text-[10px] font-bold text-primary hover:underline uppercase"
                                                        onClick={() => setIsTeachModalOpen(true)}
                                                    >
                                                        Mapear
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex gap-3">
                                                <Button variant="neutral" onClick={handleCancelResult} className="flex-1">
                                                    <XCircle size={16} /> Cancelar
                                                </Button>
                                                <Button variant="outline" onClick={handleEditResult} className="flex-1">
                                                    <Edit3 size={16} /> Editar
                                                </Button>
                                                <Button onClick={handleConfirmResult} className="flex-1 bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20">
                                                    <CheckCircle2 size={16} /> Confirmar
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {analysisState === 'idle' && (
                                        <div className="flex gap-2">
                                            <Button variant="neutral" onClick={() => setSelectedImage(null)} className="flex-1">
                                                <XCircle size={16} /> Remover Imagem
                                            </Button>
                                            <Button onClick={handleAnalyzeImage} className="flex-1">
                                                <Sparkles size={16} /> Analisar com IA
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Section 2: Chat */}
                    {activeTab === 'chat' && (
                        <Card className="flex flex-col h-[600px] animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#151b2e] rounded-t-xl">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                                    <Sparkles size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-white">Coach IA</h2>
                                    <p className="text-xs text-green-400 flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Online
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#090c19]/50">
                                {chatMessages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 opacity-50">
                                        <Sparkles size={48} />
                                        <p className="text-center max-w-xs">
                                            Olá! Sou seu Coach de apostas. Pergunte sobre estratégias, gestão de banca ou dúvidas sobre o app.
                                        </p>
                                    </div>
                                ) : (
                                    chatMessages.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`
                                                max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                                                ${msg.role === 'user'
                                                    ? 'bg-primary text-[#090c19] rounded-tr-none font-medium'
                                                    : 'bg-[#1e293b] text-gray-200 rounded-tl-none border border-white/5'
                                                }
                                            `}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))
                                )}
                                {isSendingMessage && (
                                    <div className="flex justify-start">
                                        <div className="bg-[#1e293b] rounded-2xl rounded-tl-none px-4 py-3 border border-white/5 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="p-4 border-t border-white/10 bg-[#151b2e] rounded-b-xl">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Digite sua mensagem..."
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="flex-1"
                                        disabled={isSendingMessage}
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!chatInput.trim() || isSendingMessage}
                                        className="px-4"
                                    >
                                        {isSendingMessage ? <Loader2 size={20} className="animate-spin" /> : <ChevronRight size={20} />}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    {/* Bookmaker Extraction */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Home size={20} className="text-primary" />
                            <h2 className="text-lg font-bold text-white">Adicionar Casa</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Link (ex: bet365.com)"
                                    value={bookmakerUrl}
                                    onChange={(e) => setBookmakerUrl(e.target.value)}
                                    className="flex-1"
                                />
                                <Button onClick={handleExtractBookmaker} disabled={!bookmakerUrl.trim() || isExtractingBookmaker} className="px-3">
                                    {isExtractingBookmaker ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                </Button>
                            </div>

                            {extractedBookmaker && (
                                <div className="p-4 bg-[#0d1121] rounded-xl border border-white/10 animate-in fade-in zoom-in-95">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden">
                                            {extractedBookmaker.logo ?
                                                <img src={extractedBookmaker.logo} alt={extractedBookmaker.name} className="w-full h-full object-cover" /> :
                                                <span className="text-xs font-bold">{extractedBookmaker.name.substring(0, 2)}</span>
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white truncate">{extractedBookmaker.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{extractedBookmaker.domain}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="neutral" size="sm" onClick={() => setExtractedBookmaker(null)} className="flex-1">Cancelar</Button>
                                        <Button size="sm" onClick={handleAddBookmaker} className="flex-1">Adicionar</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* History */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <History size={20} className="text-primary" />
                            <h2 className="text-lg font-bold text-white">Histórico</h2>
                        </div>

                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    <Clock size={24} className="mx-auto mb-2 opacity-50" />
                                    <p>Nenhuma análise recente</p>
                                </div>
                            ) : (
                                history.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 p-3 bg-[#0d1121] rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/20 flex-shrink-0">
                                            <img src={item.imageUrl} alt="Thumb" className="w-full h-full object-cover opacity-70" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.type === 'bet' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                                                    }`}>
                                                    {item.type === 'bet' ? 'APOSTA' : 'GANHO'}
                                                </span>
                                                <span className="text-xs text-gray-500">{item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="flex items-center gap-1 mt-1">
                                                <div className={`w-1.5 h-1.5 rounded-full ${item.confidence > 0.7 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                <span className="text-xs text-gray-400">Confiança: {(item.confidence * 100).toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Editar Dados Extraídos"
            >
                {editedData && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Data"
                                type="date"
                                value={editedData.date || ''}
                                onChange={e => setEditedData({ ...editedData, date: e.target.value })}
                            />
                            <Input
                                label="Valor (R$)"
                                type="number"
                                value={editedData.value || ''}
                                onChange={e => setEditedData({ ...editedData, value: e.target.value })}
                            />
                        </div>

                        <Input
                            label="Casa de Apostas (Nome)"
                            value={editedData.bookmaker || ''}
                            onChange={e => setEditedData({ ...editedData, bookmaker: e.target.value })}
                        />

                        {editedData.type === 'bet' ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Odds"
                                        type="number"
                                        step="0.01"
                                        value={editedData.odds || ''}
                                        onChange={e => setEditedData({ ...editedData, odds: e.target.value })}
                                    />
                                    <Input
                                        label="Esporte"
                                        value={editedData.sport || ''}
                                        onChange={e => setEditedData({ ...editedData, sport: e.target.value })}
                                    />
                                </div>
                                <Input
                                    label="Partida / Evento"
                                    value={editedData.match || ''}
                                    onChange={e => setEditedData({ ...editedData, match: e.target.value })}
                                />
                                <Input
                                    label="Mercado"
                                    value={editedData.market || ''}
                                    onChange={e => setEditedData({ ...editedData, market: e.target.value })}
                                />
                            </>
                        ) : (
                            <Input
                                label="Origem / Descrição"
                                value={editedData.description || ''}
                                onChange={e => setEditedData({ ...editedData, description: e.target.value })}
                            />
                        )}

                        <div className="flex gap-3 pt-4">
                            <Button variant="neutral" onClick={() => setIsEditModalOpen(false)} className="flex-1">Cancelar</Button>
                            <Button onClick={handleSaveEdited} className="flex-1">Salvar Alterações</Button>
                        </div>
                    </div>
                )}
            </Modal>
            {/* Manual Mapping Modal (Teach AI) */}
            <TeachAIModal
                isOpen={isTeachModalOpen}
                onClose={() => setIsTeachModalOpen(false)}
                image={selectedImage}
                words={analysisResult?.words}
                onSaveMapping={handleSaveMapping}
            />
        </div>
    );
};

export default AIAssistant;
