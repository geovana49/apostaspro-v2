import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
    HelpCircle, ChevronDown, Check, Trash2, Share2, History, Users, ClipboardList,
    Target, Zap, TrendingUp, BookOpen, X, Calculator, ArrowRight, Lightbulb, Info,
    Lock, Unlock, Copy, AlertCircle, CheckCircle
} from 'lucide-react';
import {
    calculateArb, parseBR, formatBRL, formatOdd,
    HouseInput
} from '../utils/arbCalc';

// =============================================
//  TYPES
// =============================================
export interface HouseState {
    annotation: string;
    odd: string;
    stake: string;
    commission: string;
    increase: string;
    isFreebet: boolean;
    isLay: boolean;
    isFixed: boolean;
    distribution: boolean; // true = standard; false = "Zerar"
    // UI Helpers
    showCommission: boolean;
    showIncrease: boolean;
}

type RoundingStep = 0.01 | 1 | 5;

const DEFAULT_HOUSE = (): HouseState => ({
    annotation: '',
    odd: '',
    stake: '',
    commission: '',
    increase: '',
    isFreebet: false,
    isLay: false,
    isFixed: false,
    distribution: true,
    showCommission: false,
    showIncrease: false
});

const ROUNDING_OPTIONS: { label: string; value: RoundingStep }[] = [
    { label: 'R$ 0,01', value: 0.01 },
    { label: 'R$ 1,00', value: 1 },
    { label: 'R$ 5,00', value: 5 },
];

// =============================================
//  TABS
// =============================================
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

// =============================================
//  TUTORIAL MODAL
// =============================================
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
            <button className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/30 transition-colors" onClick={() => setOpen(!open)}>
                <h4 className="font-semibold text-white flex items-center gap-2">
                    <span className={iconColor}>{icon}</span>{title}
                </h4>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="px-4 pb-4 text-sm text-gray-300 space-y-2 border-t border-gray-700/50 pt-3">{children}</div>
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
                                <button onClick={onClose} className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">
                                    <X className="w-4 h-4" /> Fechar
                                </button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-2 bg-gray-900/50 p-2 mb-6 rounded-lg">
                                <button onClick={() => setTutorialTab('arbpro')} className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${tutorialTab === 'arbpro' ? 'bg-purple-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                                    <Target className="w-4 h-4" /> ARB PRO
                                </button>
                                <button onClick={() => setTutorialTab('freepro')} className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${tutorialTab === 'freepro' ? 'bg-cyan-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                                    <Zap className="w-4 h-4" /> FREE PRO
                                </button>
                            </div>
                            {tutorialTab === 'arbpro' && (
                                <div className="space-y-4">
                                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                                        <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2"><Target className="w-5 h-5" /> O que é a ARB PRO?</h3>
                                        <p className="text-gray-300 mt-2">A calculadora ARB PRO é usada para calcular <strong>arbitragem (surebet)</strong> entre múltiplas casas de apostas. Ela encontra a distribuição ideal de stakes para garantir lucro independente do resultado.</p>
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
                                            <ol className="space-y-2">
                                                <li><span className="text-purple-400 font-bold">1.</span> Selecione o número de casas de apostas (2, 3 ou 4)</li>
                                                <li><span className="text-purple-400 font-bold">2.</span> Insira a ODD de cada casa no campo correspondente</li>
                                                <li><span className="text-purple-400 font-bold">3.</span> Digite o valor do stake na Casa 1 (a de promo)</li>
                                                <li><span className="text-purple-400 font-bold">4.</span> Os stakes das demais casas são calculados automaticamente</li>
                                                <li><span className="text-purple-400 font-bold">5.</span> Confira o ROI e o lucro estimado na seção Resultados</li>
                                            </ol>
                                        </AccordionItem>
                                        <AccordionItem icon={<Lightbulb className="w-4 h-4" />} title="Dicas avançadas" iconColor="text-yellow-400">
                                            <ul className="space-y-1.5">
                                                <li>• Use <strong className="text-white">FIXAR STAKE</strong> para travar o valor de uma casa específica</li>
                                                <li>• Use <strong className="text-white">ZERAR</strong> para cobrir apenas o investimento numa casa, jogando o lucro para as outras</li>
                                                <li>• <strong className="text-white">LAY</strong> permite calcular a responsabilidade em Exchanges (como Betfair)</li>
                                                <li>• Arredondamento de R$1,00 ajuda a disfarçar padrões nas casas</li>
                                            </ul>
                                        </AccordionItem>
                                    </div>
                                </div>
                            )}
                            {tutorialTab === 'freepro' && (
                                <div className="space-y-4">
                                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                                        <h3 className="text-lg font-bold text-cyan-300 flex items-center gap-2"><Zap className="w-5 h-5" /> O que é a FREE PRO?</h3>
                                        <p className="text-gray-300 mt-2">A calculadora FREE PRO especializada em <strong>converter freebets em dinheiro real</strong>. Ela calcula o stake ideal no lay para garantir um retorno fixo sobre a freebet recebida.</p>
                                    </div>
                                    <div className="space-y-3">
                                        <AccordionItem icon={<Calculator className="w-4 h-4" />} title="Quando usar?" iconColor="text-cyan-400">
                                            <ul className="space-y-1.5">
                                                <li>• Quando receber uma freebet de boas-vindas ou promoção</li>
                                                <li>• Para converter qualquer crédito de apostas em dinheiro real</li>
                                            </ul>
                                        </AccordionItem>
                                        <AccordionItem icon={<ArrowRight className="w-4 h-4" />} title="Passo a passo" iconColor="text-cyan-400">
                                            <ol className="space-y-2">
                                                <li><span className="text-cyan-400 font-bold">1.</span> Insira o valor da sua freebet</li>
                                                <li><span className="text-cyan-400 font-bold">2.</span> Digite a ODD do back (na casa de apostas)</li>
                                                <li><span className="text-cyan-400 font-bold">3.</span> Digite a ODD do lay (na exchange)</li>
                                                <li><span className="text-cyan-400 font-bold">4.</span> Insira a comissão da exchange</li>
                                                <li><span className="text-cyan-400 font-bold">5.</span> A calculadora mostra o lucro líquido garantido</li>
                                            </ol>
                                        </AccordionItem>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    return ReactDOM.createPortal(content, document.body);
};

// =============================================
//  HOUSE CARD
// =============================================
interface HouseCardProps {
    index: number;
    house: HouseState;
    computedStake: number;
    responsibility: number;
    profitIfWin: number;
    finalOdd: number;
    isArb: boolean;
    onChange: (h: HouseState) => void;
}

const HouseCard: React.FC<HouseCardProps> = ({ index, house, computedStake, responsibility, profitIfWin, isArb, finalOdd, onChange }) => {
    const isAnchor = house.isFixed;
    const update = (patch: Partial<HouseState>) => onChange({ ...house, ...patch });

    // Ensure odd is derived properly for display if user hasn't typed anything yet
    // but calculator has computed finalOdd. However, standard approach is:
    // user types odd -> calc derives final. If user hasn't typed, final is 0.

    // Toggle Helpers
    const toggleCommission = () => update({
        commission: house.commission ? '' : '0',
        showCommission: !house.showCommission
    });
    const toggleIncrease = () => update({
        increase: house.increase ? '' : '0',
        showIncrease: !house.showIncrease
    });

    return (
        <div className={`bg-[#0d1421] border rounded-xl p-5 transition-all ${isAnchor ? 'border-purple-500/60 shadow-md shadow-purple-500/10' : 'border-[#1e3a5f] hover:border-cyan-500/30'}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-white font-bold text-lg" contentEditable suppressContentEditableWarning
                    onBlur={e => update({ annotation: e.currentTarget.textContent || '' })}>
                    {house.annotation || `Casa ${index + 1}`} {index === 0 && !house.annotation && <span className="text-purple-400 text-sm font-normal">(Promo)</span>}
                </span>
                {isAnchor && <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1"><Lock className="w-3 h-3" /> Fixada</span>}
            </div>

            {/* ODD + Final ODD */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">ODD</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="2,00"
                        value={house.odd}
                        onChange={e => update({ odd: e.target.value })}
                        className={`w-full bg-[#0a0f1e] border border-[#1e3a5f] rounded-lg px-3 py-2.5 text-white text-lg font-medium focus:border-cyan-500 focus:outline-none ${!house.odd || parseBR(house.odd) < 1.01 ? '' : ''}`}
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">ODD Final</label>
                    <div className="w-full bg-[#0a0f1e]/50 border border-[#1e3a5f] rounded-lg px-3 py-2.5 text-cyan-400 text-lg font-medium font-mono">
                        {finalOdd > 0 ? formatOdd(finalOdd) : '—'}
                    </div>
                </div>
            </div>

            {/* Stake + Type Toggle */}
            <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase block mb-1">
                    {isAnchor ? 'Stake (edite aqui)' : 'Stake (auto-calculado)'}
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                        {isAnchor ? (
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="100,00"
                                value={house.stake}
                                onChange={e => update({ stake: e.target.value })}
                                className="w-full bg-[#0a0f1e] border rounded-lg pl-9 pr-3 py-2.5 text-white text-lg font-medium focus:outline-none border-purple-500/60 focus:border-purple-400 font-mono"
                            />
                        ) : (
                            <div className="w-full bg-[#0a0f1e]/50 border border-[#1e3a5f] rounded-lg pl-9 pr-3 py-2.5 text-white text-lg font-medium font-mono">
                                {computedStake > 0 ? formatBRL(computedStake).replace('R$', '').trim() : '—'}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => update({ isLay: !house.isLay })}
                        className={`inline-flex items-center justify-center h-11 px-3 font-bold uppercase text-sm rounded-lg transition-colors w-20 
                        ${house.isLay ? 'bg-pink-500 hover:bg-pink-600 text-white' : 'bg-cyan-400 hover:bg-cyan-500 text-black'}`}
                    >
                        {house.isLay ? 'LAY' : 'BACK'}
                    </button>
                </div>
            </div>

            {/* Conditional Fields */}
            {(house.showCommission || house.commission !== '') && (
                <div className="mb-3 animate-in fade-in zoom-in-95">
                    <label className="text-xs text-gray-500 uppercase block mb-1">Comissão (%)</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={house.commission}
                        onChange={e => update({ commission: e.target.value })}
                        className="w-full bg-[#0a0f1e] border border-yellow-500/40 rounded-lg px-3 py-2 text-yellow-300 text-sm focus:border-yellow-400 focus:outline-none placeholder-gray-600"
                    />
                </div>
            )}

            {(house.showIncrease || house.increase !== '') && (
                <div className="mb-3 animate-in fade-in zoom-in-95">
                    <label className="text-xs text-gray-500 uppercase block mb-1">Aumento de Odd (%)</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={house.increase}
                        onChange={e => update({ increase: e.target.value })}
                        className="w-full bg-[#0a0f1e] border border-green-500/40 rounded-lg px-3 py-2 text-green-300 text-sm focus:border-green-400 focus:outline-none placeholder-gray-600"
                    />
                </div>
            )}

            {house.isLay && (
                <div className="mb-4 animate-in fade-in zoom-in-95">
                    <label className="text-xs text-gray-500 uppercase block mb-1">Responsabilidade</label>
                    <div className="w-full bg-[#0a0f1e]/50 border border-pink-500/30 rounded-lg px-3 py-2 text-pink-300 text-sm font-mono">
                        {responsibility > 0 ? formatBRL(responsibility) : '—'}
                    </div>
                </div>
            )}

            {/* Toggles */}
            <div className="flex flex-wrap gap-x-3 gap-y-2 mb-4 text-xs font-semibold uppercase tracking-wide">
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-white transition-colors" title="Zerar Lucro nesta casa (apenas cobrir a aposta)">
                    <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${!house.distribution ? 'bg-red-500 border-red-500' : 'border-gray-600'}`}
                        onClick={() => update({ distribution: !house.distribution })}>
                        {!house.distribution && <Check className="w-3 h-3 text-white" />}
                    </div>
                    ZERAR
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-white transition-colors">
                    <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${(house.showCommission || house.commission !== '') ? 'bg-yellow-500 border-yellow-500' : 'border-gray-600'}`}
                        onClick={toggleCommission}>
                        {(house.showCommission || house.commission !== '') && <Check className="w-3 h-3 text-white" />}
                    </div>
                    COMISSÃO
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-white transition-colors">
                    <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${house.isFreebet ? 'bg-purple-500 border-purple-500' : 'border-gray-600'}`}
                        onClick={() => update({ isFreebet: !house.isFreebet })}>
                        {house.isFreebet && <Check className="w-3 h-3 text-white" />}
                    </div>
                    FREEBET
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-400 hover:text-white transition-colors">
                    <div className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-colors ${(house.showIncrease || house.increase !== '') ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}
                        onClick={toggleIncrease}>
                        {(house.showIncrease || house.increase !== '') && <Check className="w-3 h-3 text-white" />}
                    </div>
                    AUMENTO
                </label>
            </div>

            {/* Fix Stake Button */}
            <button
                onClick={() => onChange({ ...house, isFixed: !house.isFixed })}
                className={`w-full rounded-md text-sm transition-all border shadow-sm h-9 px-4 py-2 font-bold uppercase flex items-center justify-center gap-2 ${isAnchor ? 'border-purple-500 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20' : 'border-[#1e3a5f] text-gray-400 hover:border-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10'}`}
            >
                {isAnchor ? <><Lock className="w-3.5 h-3.5" /> STAKE FIXADO</> : <><Unlock className="w-3.5 h-3.5" /> FIXAR STAKE</>}
            </button>
        </div>
    );
};

// =============================================
//  ARB PRO TAB
// =============================================
const ArbProTab: React.FC = () => {
    const [numHouses, setNumHouses] = useState(3);
    const [rounding, setRounding] = useState<RoundingStep>(0.01);
    const [copied, setCopied] = useState(false);

    // Initialize houses
    const [houses, setHouses] = useState<HouseState[]>([
        { ...DEFAULT_HOUSE(), isFixed: true },
        DEFAULT_HOUSE(),
        DEFAULT_HOUSE(),
        DEFAULT_HOUSE(),
        DEFAULT_HOUSE(),
        DEFAULT_HOUSE(),
    ]);

    const activeHouses = houses.slice(0, numHouses);

    // Build Inputs
    const houseInputs: HouseInput[] = useMemo(() => {
        return activeHouses.map((h) => ({
            odd: parseBR(h.odd),
            stake: parseBR(h.stake),
            commission: parseBR(h.commission),
            increase: parseBR(h.increase),
            isFreebet: h.isFreebet,
            isLay: h.isLay,
            isFixed: h.isFixed,
            distribution: h.distribution, // "Zerar" logic
        }));
    }, [activeHouses]);

    // Calculate
    const arbResult = useMemo(() => {
        return calculateArb(houseInputs, rounding);
    }, [houseInputs, rounding]);

    const updateHouse = (index: number, updated: HouseState) => {
        setHouses(prev => {
            const next = [...prev];
            // If fixing this house, unfix others
            if (updated.isFixed && !prev[index].isFixed) {
                next.forEach((h, i) => { next[i] = { ...h, isFixed: false }; });
            }
            next[index] = updated;
            // Ensure one fixed
            const anyFixed = next.slice(0, numHouses).some(h => h.isFixed);
            if (!anyFixed) next[0] = { ...next[0], isFixed: true };
            return next;
        });
    };

    const clearAll = () => {
        setHouses(prev => prev.map((_, i) => ({
            ...DEFAULT_HOUSE(),
            isFixed: i === 0
        })));
    };

    const copyResults = () => {
        const lines = activeHouses.map((h, i) => {
            const stake = i === 0 || h.isFixed ? parseBR(h.stake) : arbResult.results[i]?.computedStake;
            return `Casa ${i + 1}: Stake R$${stake?.toFixed(2) || '—'} | ODD ${h.odd}`;
        });
        lines.push(`Total Investido: ${formatBRL(arbResult.totalInvested)}`);
        lines.push(`Lucro: ${formatBRL(arbResult.minProfit)} | ROI: ${arbResult.roi.toFixed(2)}%`);
        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="border-l-4 border-purple-500 pl-4 py-1">
                <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold text-purple-400">ARB PRO</h2>
                    {arbResult.totalInvested > 0 && (
                        <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${arbResult.isArb ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                            {arbResult.isArb ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                            ROI {arbResult.roi.toFixed(2)}%
                        </span>
                    )}
                </div>
                <p className="text-gray-400 text-sm mt-1">Stakes otimizados para garantir lucro em qualquer resultado (Arbitragem/Surebet)</p>
            </div>

            {/* Global Configs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0d1421] border border-[#1e3a5f] rounded-lg p-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block font-bold">Número de Casas</label>
                    <div className="relative">
                        <select value={numHouses} onChange={e => setNumHouses(Number(e.target.value))} className="flex h-9 w-full rounded-md border border-[#1e3a5f] bg-[#0a0f1e] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none cursor-pointer">
                            {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Casas</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>
                <div className="bg-[#0d1421] border border-[#1e3a5f] rounded-lg p-4">
                    <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block font-bold">Arredondamento</label>
                    <div className="relative">
                        <select value={rounding} onChange={e => setRounding(Number(e.target.value) as RoundingStep)} className="flex h-9 w-full rounded-md border border-[#1e3a5f] bg-[#0a0f1e] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 appearance-none cursor-pointer">
                            {ROUNDING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Houses Grid */}
            <div className={`grid gap-4 ${numHouses === 2 ? 'grid-cols-1 md:grid-cols-2' : numHouses === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
                {activeHouses.map((house, i) => (
                    <HouseCard
                        key={i}
                        index={i}
                        house={house}
                        computedStake={arbResult.results[i]?.computedStake ?? 0}
                        responsibility={arbResult.results[i]?.responsibility ?? 0}
                        profitIfWin={arbResult.results[i]?.profitIfWin ?? 0}
                        finalOdd={arbResult.results[i]?.finalOdd ?? 0}
                        isArb={arbResult.isArb}
                        onChange={updated => updateHouse(i, updated)}
                    />
                ))}
            </div>

            {/* Results Table */}
            {arbResult.totalInvested > 0 && (
                <div className="bg-[#0d1421] border border-[#1e3a5f] rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-6 text-lg">Resultados</h3>
                    {/* Stats */}
                    <div className="flex flex-wrap items-center justify-center gap-8 mb-8 py-6 border-b border-[#1e3a5f]">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-white">{formatBRL(arbResult.totalInvested)}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Total Investido</p>
                        </div>
                        <div className="text-center">
                            <p className="text-3xl font-bold text-white">{formatBRL(arbResult.targetReturn)}</p>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Retorno (Aprox)</p>
                        </div>
                        <div className="text-center">
                            <p className={`text-3xl font-bold ${arbResult.minProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatBRL(arbResult.minProfit)}
                            </p>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Lucro</p>
                        </div>
                        <div className="text-center">
                            <p className={`text-3xl font-bold ${arbResult.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {arbResult.roi > 0 ? '+' : ''}{arbResult.roi.toFixed(2)}%
                            </p>
                            <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">ROI</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gradient-to-r from-cyan-600/80 to-cyan-700/80 text-white uppercase text-xs font-bold shadow-sm">
                                    <th className="text-left py-3 px-3 rounded-tl-lg">Casa</th>
                                    <th className="text-center py-3 px-3">Odd Final</th>
                                    <th className="text-center py-3 px-3">Stake</th>
                                    <th className="text-center py-3 px-3">Respons.</th>
                                    <th className="text-center py-3 px-3">Info</th>
                                    <th className="text-right py-3 px-3 rounded-tr-lg">Lucro</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeHouses.map((house, i) => {
                                    const res = arbResult.results[i];
                                    if (!res) return null;
                                    const displayStake = res.computedStake;
                                    const profit = res.profitIfWin;
                                    const profitClass = profit >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold';

                                    return (
                                        <tr key={i} className={`border-b border-[#1e3a5f] hover:bg-[#1e3a5f]/20 transition-colors ${!house.distribution ? 'opacity-50' : ''}`}>
                                            <td className="py-4 px-3 text-white font-medium">
                                                Casa {i + 1}
                                                {house.annotation && <div className="text-xs text-orange-400 mt-0.5 font-normal">{house.annotation}</div>}
                                            </td>
                                            <td className="py-4 px-3 text-center text-cyan-400 font-mono">
                                                {res.finalOdd.toFixed(2)}
                                            </td>
                                            <td className="py-4 px-3 text-center text-white font-mono font-medium">
                                                {formatBRL(displayStake)}
                                            </td>
                                            <td className="py-4 px-3 text-center font-mono text-gray-400">
                                                {res.responsibility > 0 ? formatBRL(res.responsibility) : '—'}
                                            </td>
                                            <td className="py-4 px-3 text-center">
                                                <div className="flex flex-wrap justify-center gap-1">
                                                    {house.isLay && <span className="text-[10px] bg-pink-500 text-white px-1.5 py-0.5 rounded font-bold">LAY</span>}
                                                    {house.isFreebet && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">FB</span>}
                                                    {!house.distribution && <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded">ZERAR</span>}
                                                    {house.isFixed && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">FIX</span>}
                                                </div>
                                            </td>
                                            <td className={`py-4 px-3 text-right ${profitClass} font-mono`}>
                                                {formatBRL(profit)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-wrap justify-center gap-4">
                <button onClick={copyResults} className="flex items-center justify-center gap-2 text-sm transition-colors shadow h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-lg active:scale-95 duration-200">
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'COPIADO!' : 'COPIAR'}
                </button>
                <button onClick={clearAll} className="flex items-center justify-center gap-2 text-sm transition-colors border shadow-sm h-10 border-[#1e3a5f] bg-[#0d1421] text-gray-300 hover:bg-[#1e3a5f] font-bold px-6 py-2.5 rounded-lg hover:text-white">
                    <Trash2 className="w-4 h-4" /> LIMPAR
                </button>
            </div>
        </div>
    );
};

// =============================================
//  MAIN COMPONENT
// =============================================
const Calculators: React.FC = () => {
    const [activeTab, setActiveTab] = useState('arb-pro');
    const [showTutorial, setShowTutorial] = useState(false);

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
                            <p className="text-gray-400 text-xs sm:text-sm mt-1 hidden sm:block">Ferramentas profissionais para maximizar seus lucros</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowTutorial(true)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors shadow h-9 px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white gap-2 text-xs sm:text-sm"
                    >
                        <BookOpen className="w-4 h-4" /> Tutorial
                    </button>
                </div>

                {/* Main Container */}
                <div className="rounded-xl border text-card-foreground bg-gradient-to-br from-[#1a1f35] to-[#0d1425] border-gray-800/50 shadow-2xl overflow-hidden">
                    <div className="p-3 sm:p-4 md:p-6">
                        {/* Tabs */}
                        <div className="flex items-center rounded-lg text-muted-foreground bg-gray-900/50 p-2 sm:p-3 mb-6 overflow-x-auto gap-1.5 no-scrollbar">
                            {TABS.map((tab, i) => (
                                <React.Fragment key={tab.id}>
                                    {i === 2 && <div className="w-[3px] h-[22px] bg-gray-500/60 rounded-sm mx-1 self-center shrink-0" />}
                                    <button
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`justify-center whitespace-nowrap transition-all text-xs sm:text-sm font-medium px-2 sm:px-4 py-1.5 sm:py-2 rounded flex items-center gap-1 shrink-0 ${activeTab === tab.id ? `${tab.color} text-white shadow-md` : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {tab.label}
                                        <HelpCircle className="w-3 h-3 opacity-50 hidden sm:block" />
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="mt-2">
                            {activeTab === 'arb-pro' ? (
                                <ArbProTab />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95">
                                    <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5 text-3xl">
                                        {TABS.find(t => t.id === activeTab)?.icon || '🧮'}
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-300 mb-2">{TABS.find(t => t.id === activeTab)?.label}</h3>
                                    <p className="text-gray-500 max-w-md text-center">Calculadora em desenvolvimento.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                    <Check className="text-green-400 w-5 h-5 shrink-0" />
                    <p className="text-sm text-green-300">
                        <strong>Dica:</strong> Para operações em Exchange (Betfair), use o botão <strong>LAY</strong> — a calculadora ajustará automaticamente a responsabilidade.
                    </p>
                </div>
            </div>
        </>
    );
};

export default Calculators;
