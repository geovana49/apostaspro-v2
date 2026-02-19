import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
    HelpCircle, ChevronDown, Check, Trash2, Share2, History, Users, ClipboardList,
    Target, Zap, Gift, ShieldAlert, TrendingUp, AlertTriangle, Divide,
    BookOpen, X, Calculator, ArrowRight, Lightbulb, Info
} from 'lucide-react';

const TABS = [
    { id: 'arb-pro', label: 'ARB PRO', icon: '🎯', color: 'bg-purple-500', activeColor: 'text-purple-400' },
    { id: 'free-pro', label: 'FREE PRO', icon: '⚡', color: 'bg-cyan-500', activeColor: 'text-cyan-400' },
    { id: 'surebet', label: 'Surebet', color: 'bg-orange-500', activeColor: 'text-orange-400' },
    { id: 'freebet-triplo', label: '2 Back & 1 Lay', color: 'bg-blue-500', activeColor: 'text-blue-400' },
    { id: 'freebet-3back', label: '3 Back', color: 'bg-emerald-500', activeColor: 'text-emerald-400' },
    { id: 'freebet-lay', label: 'Freebet Lay', color: 'bg-purple-500', activeColor: 'text-purple-400' },
    { id: 'shark', label: 'Aposta Segura', color: 'bg-green-500', activeColor: 'text-green-400' },
    { id: 'odd-aumento', label: 'Odd Aumento', color: 'bg-yellow-500', activeColor: 'text-yellow-400' },
    { id: 'lay-sem', label: 'Lay s/ Freebet', color: 'bg-red-500', activeColor: 'text-red-400' },
    { id: 'handicap', label: 'HA Tabela', color: 'bg-teal-500', activeColor: 'text-teal-400' },
    { id: 'multipla-lay', label: 'Múltipla + Lay', color: 'bg-pink-500', activeColor: 'text-pink-400' },
    { id: 'multipla-freebet-lay', label: '🎁 Múltipla FB + Lay', color: 'bg-yellow-500', activeColor: 'text-yellow-400' }
];

// --- Tutorial Modal ---
interface AccordionItemProps {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
    iconColor?: string;
}
const AccordionItem: React.FC<AccordionItemProps> = ({ icon, title, children, iconColor = 'text-purple-400' }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="bg-gray-800/50 rounded-lg overflow-hidden">
            <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/30 transition-colors"
                onClick={() => setOpen(!open)}
            >
                <h4 className="font-semibold text-white flex items-center gap-2">
                    <span className={iconColor}>{icon}</span>
                    {title}
                </h4>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="px-4 pb-4 text-sm text-gray-300 space-y-2 border-t border-gray-700/50 pt-3">
                    {children}
                </div>
            )}
        </div>
    );
};

const TutorialModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [tutorialTab, setTutorialTab] = useState<'arbpro' | 'freepro'>('arbpro');

    const content = (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
            <div className="min-h-screen py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="rounded-xl border bg-gradient-to-br from-[#1a1f35] to-[#0d1425] border-gray-700">
                        {/* Header */}
                        <div className="flex flex-col space-y-1.5 p-6 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
                                        <BookOpen className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-semibold tracking-tight text-2xl text-white">Tutorial das Calculadoras</div>
                                        <p className="text-gray-400 text-sm">Aprenda a usar ARB PRO e FREE PRO como um profissional</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
                                >
                                    <X className="w-4 h-4" /> Fechar
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6">
                            {/* Tab Switcher */}
                            <div className="grid grid-cols-2 gap-2 bg-gray-900/50 p-2 mb-6 rounded-lg">
                                <button
                                    onClick={() => setTutorialTab('arbpro')}
                                    className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${tutorialTab === 'arbpro' ? 'bg-purple-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Target className="w-4 h-4" /> ARB PRO
                                </button>
                                <button
                                    onClick={() => setTutorialTab('freepro')}
                                    className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${tutorialTab === 'freepro' ? 'bg-cyan-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    <Zap className="w-4 h-4" /> FREE PRO
                                </button>
                            </div>

                            {/* ARB PRO Tab */}
                            {tutorialTab === 'arbpro' && (
                                <div className="space-y-4">
                                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                                        <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
                                            <Target className="w-5 h-5" /> O que é a ARB PRO?
                                        </h3>
                                        <p className="text-gray-300 mt-2">
                                            A calculadora ARB PRO é usada para calcular <strong>arbitragem (surebet)</strong> entre múltiplas casas de apostas. Ela encontra a distribuição ideal de stakes para garantir lucro independente do resultado.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <AccordionItem icon={<Calculator className="w-4 h-4" />} title="Quando usar?">
                                            <ul className="space-y-1.5">
                                                <li>• Quando encontrar odds divergentes em 2 ou mais casas para o mesmo evento</li>
                                                <li>• Quando tiver uma promoção de odds aumentadas numa casa e odds normais em outra</li>
                                                <li>• Quando quiser garantir lucro independente do resultado do jogo</li>
                                            </ul>
                                        </AccordionItem>

                                        <AccordionItem icon={<ArrowRight className="w-4 h-4" />} title="Passo a passo">
                                            <ol className="space-y-2 list-none">
                                                <li><span className="text-purple-400 font-bold">1.</span> Selecione o número de casas de apostas (2, 3 ou 4)</li>
                                                <li><span className="text-purple-400 font-bold">2.</span> Insira a ODD de cada casa no campo correspondente</li>
                                                <li><span className="text-purple-400 font-bold">3.</span> Digite o valor do stake na Casa 1 (a de promo)</li>
                                                <li><span className="text-purple-400 font-bold">4.</span> Os stakes das demais casas serão calculados automaticamente</li>
                                                <li><span className="text-purple-400 font-bold">5.</span> Confira o ROI e o lucro estimado na seção Resultados</li>
                                            </ol>
                                        </AccordionItem>

                                        <AccordionItem icon={<TrendingUp className="w-4 h-4" />} title="Exemplo prático">
                                            <div className="space-y-2">
                                                <p>Imagine um jogo de futebol onde:</p>
                                                <div className="bg-gray-900/50 rounded-lg p-3 space-y-1 font-mono text-xs">
                                                    <div className="flex justify-between"><span className="text-gray-400">Casa 1 (Promo) — Time A ganha:</span> <span className="text-green-400">ODD 3.20</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-400">Casa 2 — Empate:</span> <span className="text-cyan-400">ODD 3.50</span></div>
                                                    <div className="flex justify-between"><span className="text-gray-400">Casa 3 — Time B ganha:</span> <span className="text-purple-400">ODD 2.80</span></div>
                                                </div>
                                                <p>Com odds altas o suficiente, a ARB PRO calcula os stakes ideais para que você lucre em qualquer resultado.</p>
                                            </div>
                                        </AccordionItem>

                                        <AccordionItem icon={<Lightbulb className="w-4 h-4" />} title="Dicas avançadas" iconColor="text-yellow-400">
                                            <ul className="space-y-1.5">
                                                <li>• Use <strong className="text-white">FIXAR STAKE</strong> para travar o valor de uma casa específica</li>
                                                <li>• Ative <strong className="text-white">COMISSÃO</strong> se a casa cobra comissão sobre os ganhos</li>
                                                <li>• Ative <strong className="text-white">FREEBET</strong> quando o stake for uma aposta grátis (o cálculo muda)</li>
                                                <li>• Use <strong className="text-white">AUMENTO DE ODD</strong> para registrar a odd original antes do boost</li>
                                                <li>• Arredondamento de R$1,00 ou R$5,00 ajuda a disfarçar padrões</li>
                                            </ul>
                                        </AccordionItem>
                                    </div>
                                </div>
                            )}

                            {/* FREE PRO Tab */}
                            {tutorialTab === 'freepro' && (
                                <div className="space-y-4">
                                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                                        <h3 className="text-lg font-bold text-cyan-300 flex items-center gap-2">
                                            <Zap className="w-5 h-5" /> O que é a FREE PRO?
                                        </h3>
                                        <p className="text-gray-300 mt-2">
                                            A calculadora FREE PRO é especializada em <strong>converter freebets em dinheiro real</strong>. Ela calcula o stake ideal no lay (Betfair/Smarkets) para garantir um retorno fixo sobre a freebet recebida.
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <AccordionItem icon={<Calculator className="w-4 h-4" />} title="Quando usar?" iconColor="text-cyan-400">
                                            <ul className="space-y-1.5">
                                                <li>• Quando receber uma freebet de boas-vindas ou promoção</li>
                                                <li>• Para converter qualquer tipo de crédito de apostas em dinheiro real</li>
                                                <li>• Quando quiser saber exatamente quanto vai receber da sua freebet</li>
                                            </ul>
                                        </AccordionItem>
                                        <AccordionItem icon={<ArrowRight className="w-4 h-4" />} title="Passo a passo" iconColor="text-cyan-400">
                                            <ol className="space-y-2">
                                                <li><span className="text-cyan-400 font-bold">1.</span> Insira o valor da sua freebet</li>
                                                <li><span className="text-cyan-400 font-bold">2.</span> Digite a ODD do back (na casa de apostas)</li>
                                                <li><span className="text-cyan-400 font-bold">3.</span> Digite a ODD do lay (na exchange)</li>
                                                <li><span className="text-cyan-400 font-bold">4.</span> Insira a comissão da exchange (geralmente 2% a 5%)</li>
                                                <li><span className="text-cyan-400 font-bold">5.</span> A calculadora mostra o lucro líquido garantido</li>
                                            </ol>
                                        </AccordionItem>
                                    </div>
                                </div>
                            )}

                            {/* Footer Extras */}
                            <div className="mt-6 pt-6 border-t border-gray-700">
                                <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Info className="w-5 h-5 text-purple-400" />
                                        <h4 className="font-bold text-white">Funcionalidades extras</h4>
                                    </div>
                                    <ul className="text-sm text-gray-300 space-y-1">
                                        <li>• <strong>Copiar:</strong> Copia os resultados para a área de transferência</li>
                                        <li>• <strong>Aplicar em Operação:</strong> Preenche automaticamente o formulário de nova operação</li>
                                        <li>• <strong>Exportar CSV:</strong> Baixa os dados em formato planilha</li>
                                        <li>• <strong>Histórico:</strong> Os últimos 5 cálculos ficam salvos automaticamente</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return ReactDOM.createPortal(content, document.body);
};

// --- Main Component ---
const Calculators: React.FC = () => {
    const [activeTab, setActiveTab] = useState('arb-pro');
    const [numHouses, setNumHouses] = useState(3);
    const [rounding, setRounding] = useState('0.01');
    const [showTutorial, setShowTutorial] = useState(false);

    const houses = [
        { id: 1, name: 'Casa 1 (Promo)', odd: '2.00', finalOdd: '2.00', stake: '100,00', profit: '-R$ 86,15' },
        { id: 2, name: 'Casa 2', odd: '2.10', finalOdd: '2.10', stake: '95,24', profit: '-R$ 86,15' },
        { id: 3, name: 'Casa 3', odd: '2.20', finalOdd: '2.20', stake: '90,91', profit: '-R$ 86,15' },
    ];

    return (
        <>
            {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}

            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center text-xl sm:text-3xl shadow-lg shrink-0">
                            🧮
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Calculadoras</h1>
                            <p className="text-gray-400 text-xs sm:text-sm mt-1 hidden sm:block">Cálculos em tempo real com precisão garantida</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowTutorial(true)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 shadow hover:bg-primary/90 h-9 px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white gap-2 text-xs sm:text-sm"
                    >
                        <BookOpen className="w-4 h-4" />
                        Tutorial
                    </button>
                </div>

                {/* Info Banner */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-300">
                        💡 <strong>Funcionalidades:</strong> Todos os cálculos atualizam em tempo real. Use <strong>Copiar</strong> para área de transferência, <strong>Aplicar em Operação</strong> para preencher formulário automaticamente, ou <strong>Exportar</strong> para CSV.
                    </p>
                </div>

                {/* Main Container */}
                <div className="rounded-xl border text-card-foreground bg-gradient-to-br from-[#1a1f35] to-[#0d1425] border-gray-800/50 shadow-2xl overflow-hidden">
                    <div className="p-3 sm:p-4 md:p-6">
                        {/* Scrollable Tabs */}
                        <div className="flex items-center rounded-lg text-muted-foreground bg-gray-900/50 p-2 sm:p-3 mb-6 overflow-x-auto gap-1.5 no-scrollbar">
                            {TABS.map((tab, i) => (
                                <React.Fragment key={tab.id}>
                                    {i === 2 && (
                                        <div className="w-[3px] h-[22px] bg-gray-500/60 rounded-sm mx-1 self-center shrink-0" />
                                    )}
                                    <button
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`justify-center whitespace-nowrap transition-all focus-visible:outline-none text-xs sm:text-sm font-medium px-2 sm:px-4 py-1.5 sm:py-2 rounded flex items-center gap-1 shrink-0 ${activeTab === tab.id
                                            ? `${tab.color} text-white shadow-md`
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {tab.label}
                                        <HelpCircle className="w-3 h-3 opacity-50 hidden sm:block" />
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="mt-2">
                            {activeTab === 'arb-pro' ? (
                                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                                    {/* ARB PRO Header */}
                                    <div className="border-l-4 border-purple-500 pl-4 py-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h2 className="text-2xl font-bold text-purple-400">ARB PRO</h2>
                                            <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-green-500/20 text-green-400 border-green-500/30">
                                                Auto-Equilibrar
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-sm mt-1">Sistema avançado de arbitragem com cálculo automático e distribuição inteligente de stakes</p>
                                    </div>

                                    {/* Configs */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-[#0d1421] border border-[#1e3a5f] rounded-lg p-4">
                                            <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block font-bold">Número de Casas</label>
                                            <div className="relative">
                                                <select
                                                    value={numHouses}
                                                    onChange={(e) => setNumHouses(Number(e.target.value))}
                                                    className="flex h-9 w-full rounded-md border border-[#1e3a5f] bg-[#0a0f1e] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 hover:border-cyan-500 transition-colors appearance-none cursor-pointer"
                                                >
                                                    <option value={2}>2 Casas</option>
                                                    <option value={3}>3 Casas</option>
                                                    <option value={4}>4 Casas</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="bg-[#0d1421] border border-[#1e3a5f] rounded-lg p-4">
                                            <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block font-bold">Arredondamento</label>
                                            <div className="relative">
                                                <select
                                                    value={rounding}
                                                    onChange={(e) => setRounding(e.target.value)}
                                                    className="flex h-9 w-full rounded-md border border-[#1e3a5f] bg-[#0a0f1e] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 hover:border-cyan-500 transition-colors appearance-none cursor-pointer"
                                                >
                                                    <option value="0.01">R$ 0,01</option>
                                                    <option value="1.00">R$ 1,00</option>
                                                    <option value="5.00">R$ 5,00</option>
                                                </select>
                                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Houses */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <h3 className="text-cyan-400 font-semibold uppercase tracking-wider">Casas de Apostas</h3>
                                            <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                                {numHouses}/{numHouses} preenchidas
                                            </span>
                                        </div>
                                        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                                            {Array.from({ length: numHouses }).map((_, index) => (
                                                <div key={index} className="bg-[#0d1421] border rounded-xl p-5 transition-all border-[#1e3a5f] hover:border-cyan-500/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-white font-bold text-lg">Casa {index + 1} {index === 0 && '(Promo)'}</span>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Anotação (casa, parceiro, etc.)"
                                                        className="w-full bg-[#0a0f1e]/50 border border-[#1e3a5f]/50 rounded-lg px-3 py-1.5 text-xs text-orange-400 font-bold placeholder-gray-600 focus:border-cyan-500/50 focus:outline-none mb-4"
                                                    />
                                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                                        <div>
                                                            <label className="text-xs text-gray-500 uppercase block mb-1">ODD</label>
                                                            <input
                                                                type="text"
                                                                className="w-full bg-[#0a0f1e] border border-[#1e3a5f] rounded-lg px-3 py-2.5 text-white text-lg font-medium focus:border-cyan-500 focus:outline-none"
                                                                placeholder="2,00"
                                                                defaultValue={(2.00 + (index * 0.10)).toFixed(2)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500 uppercase block mb-1">ODD Final</label>
                                                            <div className="w-full bg-[#0a0f1e]/50 border border-[#1e3a5f] rounded-lg px-3 py-2.5 text-gray-400 text-lg">
                                                                {(2.00 + (index * 0.10)).toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mb-4">
                                                        <label className="text-xs text-gray-500 uppercase block mb-1">Stake</label>
                                                        <div className="flex gap-2">
                                                            <div className="relative flex-1">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                                                                <input
                                                                    type="text"
                                                                    className="w-full bg-[#0a0f1e] border rounded-lg pl-9 pr-3 py-2.5 text-white text-lg font-medium focus:outline-none border-[#1e3a5f] focus:border-cyan-500"
                                                                    placeholder="100,00"
                                                                    defaultValue={index === 0 ? "100" : ""}
                                                                />
                                                            </div>
                                                            <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors shadow py-2 h-11 px-4 font-bold uppercase text-sm rounded-lg bg-cyan-400 hover:bg-cyan-500 text-black">
                                                                BACK
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-sm">
                                                        <label className="flex items-center gap-1.5 text-gray-300 cursor-pointer">
                                                            <div className="w-4 h-4 border border-gray-600 rounded-sm" /> ZERAR
                                                        </label>
                                                        <label className="flex items-center gap-1.5 text-gray-300 cursor-pointer">
                                                            <div className="w-4 h-4 border border-gray-600 rounded-sm" /> COMISSÃO
                                                        </label>
                                                        <label className="flex items-center gap-1.5 text-gray-300 cursor-pointer">
                                                            <div className="w-4 h-4 border border-gray-600 rounded-sm" /> FREEBET
                                                        </label>
                                                    </div>
                                                    <div className="mb-4">
                                                        <label className="flex items-center gap-1.5 text-sm cursor-pointer text-gray-300">
                                                            <div className="w-4 h-4 border border-gray-600 rounded-sm" /> AUMENTO DE ODD
                                                        </label>
                                                    </div>
                                                    <button className="w-full rounded-md text-sm transition-colors border bg-transparent shadow-sm h-9 px-4 py-2 font-bold uppercase border-[#1e3a5f] text-gray-400 hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10">
                                                        FIXAR STAKE
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Results */}
                                    <div className="bg-[#0d1421] border border-[#1e3a5f] rounded-xl p-6">
                                        <h3 className="text-white font-semibold mb-6 text-lg">Resultados</h3>
                                        <div className="flex flex-wrap items-center justify-center gap-8 mb-8 py-6 border-b border-[#1e3a5f]">
                                            <div className="text-center">
                                                <p className="text-3xl font-bold text-white">R$&nbsp;286,15</p>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Total Investido</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-3xl font-bold text-red-400">-30.11%</p>
                                                <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">ROI Médio</p>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gradient-to-r from-cyan-600/80 to-cyan-700/80">
                                                        <th className="text-left py-3 px-3 text-white uppercase text-xs font-bold">Casa</th>
                                                        <th className="text-center py-3 px-3 text-white uppercase text-xs font-bold">ODD</th>
                                                        <th className="text-center py-3 px-3 text-white uppercase text-xs font-bold">Comissão</th>
                                                        <th className="text-center py-3 px-3 text-white uppercase text-xs font-bold">Stake</th>
                                                        <th className="text-center py-3 px-3 text-white uppercase text-xs font-bold">Responsabilidade</th>
                                                        <th className="text-right py-3 px-3 text-white uppercase text-xs font-bold">Lucro</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {houses.map((house) => (
                                                        <tr key={house.id} className="border-b border-[#1e3a5f] hover:bg-[#1e3a5f]/20">
                                                            <td className="py-4 px-3 text-white font-medium">{house.name}</td>
                                                            <td className="py-4 px-3 text-center text-gray-300">{house.odd}</td>
                                                            <td className="py-4 px-3 text-center text-gray-400">—</td>
                                                            <td className="py-4 px-3 text-center text-white">R$&nbsp;{house.stake}</td>
                                                            <td className="py-4 px-3 text-center text-cyan-400">—</td>
                                                            <td className="py-4 px-3 text-right font-bold text-red-400">{house.profit}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap justify-center gap-4">
                                        <button className="flex items-center justify-center gap-2 text-sm transition-colors shadow h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-lg">
                                            <ClipboardList className="w-4 h-4" /> PRÉ-REGISTRO
                                        </button>
                                        <button className="flex items-center justify-center gap-2 text-sm transition-colors shadow h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold px-6 py-2.5 rounded-lg">
                                            <Users className="w-4 h-4" /> MULTI
                                        </button>
                                        <button className="flex items-center justify-center gap-2 text-sm transition-colors border shadow-sm h-10 border-[#1e3a5f] bg-[#0d1421] text-gray-300 hover:bg-[#1e3a5f] font-bold px-6 py-2.5 rounded-lg">
                                            <Trash2 className="w-4 h-4" /> LIMPAR DADOS
                                        </button>
                                        <button className="flex items-center justify-center gap-2 text-sm transition-colors border shadow-sm h-10 border-[#1e3a5f] bg-[#0d1421] text-cyan-400 hover:bg-[#1e3a5f] hover:text-cyan-300 font-bold px-6 py-2.5 rounded-lg">
                                            <Share2 className="w-4 h-4" /> COMPARTILHAR
                                        </button>
                                        <button className="flex items-center justify-center gap-2 text-sm transition-colors border shadow-sm h-10 border-[#1e3a5f] bg-[#0d1421] text-gray-300 hover:bg-[#1e3a5f] font-bold px-6 py-2.5 rounded-lg">
                                            <History className="w-4 h-4" /> HISTÓRICO (0)
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95">
                                    <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5 text-3xl">
                                        {TABS.find(t => t.id === activeTab)?.icon || '🧮'}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-300 mb-2">
                                        {TABS.find(t => t.id === activeTab)?.label}
                                    </h3>
                                    <p className="text-gray-500 max-w-md text-center">
                                        Esta calculadora estará disponível em breve. Estamos trabalhando para trazer as melhores ferramentas para você.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Hint */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                    <Check className="text-green-400 w-5 h-5 shrink-0" />
                    <p className="text-sm text-green-300">
                        <strong>Dica:</strong> Todas as calculadoras salvam automaticamente o histórico dos últimos 5 cálculos. Os valores ficam disponíveis mesmo após fechar o navegador.
                    </p>
                </div>
            </div>
        </>
    );
};

export default Calculators;
