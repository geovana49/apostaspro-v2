import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
    HelpCircle, ChevronDown, Check, Trash2, History as HistoryIcon,
    Target, Zap, TrendingUp, BookOpen, X, Calculator, ArrowRight, Lightbulb,
    Eye, EyeOff
} from 'lucide-react';
import {
    calculateArb, parseBR, formatBRL, formatOdd,
    HouseInput
} from '../utils/arbCalc';

// =============================================
//  TYPES
// =============================================
export interface HouseState {
    id: string; // for stable keys
    annotation: string;
    odd: string;
    stake: string;
    commission: string;
    increase: string;
    isFreebet: boolean;
    isLay: boolean;
    isFixed: boolean;
    distribution: boolean; // if false, profit is fixed (targetProfit)
    targetProfit: string;  // user-entered target profit string
    // UI Helpers
    showCommission: boolean;
    showIncrease: boolean;
    isProfitFixed: boolean; // toggle if user wants a specific profit
}

export interface CalculationHistory {
    id: string;
    timestamp: number;
    numHouses: number;
    rounding: number;
    houses: HouseState[];
    roi: number;
    totalInvested: number;
}

type RoundingStep = 0.01 | 0.1 | 0.5 | 1;

const DEFAULT_HOUSE = (i: number): HouseState => ({
    id: Math.random().toString(36).substr(2, 9),
    annotation: '',
    odd: '',
    stake: '',
    commission: '',
    increase: '',
    isFreebet: false,
    isLay: false,
    isFixed: i === 0,
    distribution: true,
    targetProfit: '',
    showCommission: false,
    showIncrease: false,
    isProfitFixed: false
});

const ROUNDING_OPTIONS: { label: string; value: RoundingStep }[] = [
    { label: 'R$ 0,01', value: 0.01 },
    { label: 'R$ 0,10', value: 0.1 },
    { label: 'R$ 0,50', value: 0.5 },
    { label: 'R$ 1,00', value: 1 }
];

const TABS = [
    { id: 'arb-pro', label: 'ARB PRO', icon: '🎯', color: 'bg-emerald-500', activeColor: 'text-emerald-400' }
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
            <div className="min-h-screen py-8 px-4 flex items-center justify-center">
                <div className="max-w-4xl w-full">
                    <div className="rounded-xl border bg-[#0d1425] border-gray-700 shadow-2xl">
                        <div className="flex flex-col space-y-1.5 p-6 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
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
                            {/* Tutorial Tab Selection removed as there is only ARB PRO now */}

                            {/* ARB PRO */}
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
    showProfits: boolean;
    onChange: (h: HouseState) => void;
}

const HouseCard: React.FC<HouseCardProps> = ({ index, house, computedStake, responsibility, profitIfWin, finalOdd, showProfits, onChange }) => {
    const isAnchor = house.isFixed;
    const update = (patch: Partial<HouseState>) => onChange({ ...house, ...patch });

    const toggleCommission = () => update({
        commission: house.commission ? '' : '0',
        showCommission: !house.showCommission
    });
    const toggleIncrease = () => update({
        increase: house.increase ? '' : '0',
        showIncrease: !house.showIncrease
    });

    const label = `Casa ${index + 1}${house.annotation ? ` - ${house.annotation}` : ''}`;

    return (
        <div className={`bg-[#0d1421]/60 border rounded-xl p-5 transition-all ${isAnchor ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/5' : 'border-[#1e3a5f]/50 hover:border-emerald-500/30'}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4 gap-2">
                <div className="flex flex-col min-w-0">
                    <span className="text-white font-bold text-[15px] flex items-center gap-1.5 truncate">
                        {label}
                    </span>
                    {index === 0 && !house.annotation && (
                        <span className="text-purple-400 text-[9px] font-black uppercase tracking-wider mt-0.5">
                            (Promo)
                        </span>
                    )}
                </div>
                {showProfits && (
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <label className="text-[9px] text-white uppercase font-black tracking-widest whitespace-nowrap">Lucro (Editar)</label>
                        <div className="relative group/profit">
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder={formatBRL(profitIfWin).replace('R$', '').trim()}
                                value={house.targetProfit}
                                onChange={e => update({ targetProfit: e.target.value, isProfitFixed: e.target.value !== '', distribution: e.target.value === '' })}
                                className={`bg-transparent text-right font-black text-sm focus:outline-none transition-all w-[90px] ${house.isProfitFixed ? 'text-emerald-400 border-b border-emerald-500/30 font-mono placeholder:text-emerald-400/50' : profitIfWin >= 0 ? 'text-green-400 placeholder:text-green-400/50' : 'text-red-500 placeholder:text-red-500/50'}`}
                            />
                            {house.isProfitFixed && (
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2">
                                    <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Note Input */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Anotação (casa, parceiro, etc.)"
                    value={house.annotation}
                    onChange={e => update({ annotation: e.target.value })}
                    className="w-full bg-[#0a0f1e]/80 border border-[#1e3a5f]/50 rounded-lg px-3 py-2 text-gray-300 text-sm focus:border-emerald-500/50 focus:outline-none placeholder-gray-600 transition-colors"
                />
            </div>

            {/* ODD Layout */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-wider block mb-1">ODD</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="2,00"
                        value={house.odd}
                        onChange={e => update({ odd: e.target.value })}
                        className="w-full bg-[#0a0f1e] border border-[#1e3a5f] rounded-lg px-3 py-2.5 text-white text-lg font-bold focus:border-emerald-500 focus:outline-none transition-colors border-opacity-50"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-wider block mb-1">ODD FINAL</label>
                    <div className="w-full bg-[#0a0f1e]/60 border border-[#1e3a5f]/50 rounded-lg px-3 py-2.5 text-gray-400 text-lg font-bold font-mono min-h-[46px] flex items-center">
                        {finalOdd > 0 ? formatOdd(finalOdd) : '0.00'}
                    </div>
                </div>
            </div>

            {/* STAKE + BACK/LAY */}
            <div className="mb-4">
                <label className="text-[10px] text-gray-500 uppercase font-black tracking-wider block mb-1">STAKE</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-mono">R$</span>
                        {isAnchor ? (
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={house.stake}
                                onChange={e => update({ stake: e.target.value })}
                                className="w-full bg-[#0a0f1e] border border-emerald-500/40 rounded-lg pl-9 pr-3 py-2.5 text-white text-lg font-bold focus:outline-none focus:border-emerald-400/60 font-mono transition-colors"
                            />
                        ) : (
                            <div className="w-full bg-[#0a0f1e]/60 border border-[#1e3a5f]/50 rounded-lg pl-9 pr-3 py-2.5 text-white/80 text-lg font-bold font-mono min-h-[46px] flex items-center">
                                {computedStake > 0 ? formatBRL(computedStake).replace('R$', '').trim() : '0,00'}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => update({ isLay: !house.isLay })}
                        className={`inline-flex items-center justify-center h-[46px] px-4 font-black uppercase text-sm rounded-lg transition-all duration-200 shadow-sm
                        ${house.isLay ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-emerald-400 text-[#0d1421] hover:bg-emerald-500'}`}
                    >
                        {house.isLay ? 'LAY' : 'BACK'}
                    </button>
                </div>
            </div>

            {/* Checkboxes Grouped */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${!house.distribution && !house.isProfitFixed ? 'bg-red-500 border-red-500' : 'border-[#1e3a5f] bg-[#0a0f1e]'}`}
                        onClick={() => update({ distribution: !house.distribution, isProfitFixed: false, targetProfit: '' })}>
                        {!house.distribution && !house.isProfitFixed && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={!house.distribution && !house.isProfitFixed ? 'text-white' : 'group-hover:text-gray-300'}>ZERAR</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${house.showCommission ? 'bg-yellow-500 border-yellow-500' : 'border-[#1e3a5f] bg-[#0a0f1e]'}`}
                        onClick={toggleCommission}>
                        {house.showCommission && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={house.showCommission ? 'text-white' : 'group-hover:text-gray-300'}>COMISSÃO</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${house.isFreebet ? 'bg-purple-500 border-purple-500' : 'border-[#1e3a5f] bg-[#0a0f1e]'}`}
                        onClick={() => update({ isFreebet: !house.isFreebet })}>
                        {house.isFreebet && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={house.isFreebet ? 'text-white' : 'group-hover:text-gray-300'}>FREEBET</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group w-full">
                    <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${house.showIncrease ? 'bg-green-500 border-green-500' : 'border-[#1e3a5f] bg-[#0a0f1e]'}`}
                        onClick={toggleIncrease}>
                        {house.showIncrease && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={house.showIncrease ? 'text-white' : 'group-hover:text-gray-300'}>AUMENTO DE ODD</span>
                </label>
            </div>

            {/* Conditional Commission/Increase */}
            {(house.showCommission || house.commission !== '') && (
                <div className="mb-4 animate-in fade-in slide-in-from-top-1">
                    <label className="text-[10px] text-yellow-500/70 uppercase font-black tracking-widest block mb-1">Comissão (%)</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={house.commission}
                        onChange={e => update({ commission: e.target.value })}
                        className="w-full bg-yellow-500/5 border border-yellow-500/30 rounded-lg px-3 py-2 text-yellow-500 text-sm font-bold focus:border-yellow-500/50 focus:outline-none"
                    />
                </div>
            )}

            {(house.showIncrease || house.increase !== '') && (
                <div className="mb-4 animate-in fade-in slide-in-from-top-1">
                    <label className="text-[10px] text-green-500/70 uppercase font-black tracking-widest block mb-1">Bônus de ODD (%)</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={house.increase}
                        onChange={e => update({ increase: e.target.value })}
                        className="w-full bg-green-500/5 border border-green-500/30 rounded-lg px-3 py-2 text-green-500 text-sm font-bold focus:border-green-500/50 focus:outline-none"
                    />
                </div>
            )}

            {/* Responsibility for Lay */}
            {house.isLay && (
                <div className="mb-4 animate-in fade-in zoom-in-95">
                    <label className="text-[10px] text-pink-500/70 uppercase font-black tracking-widest block mb-1">Responsabilidade</label>
                    <div className="w-full bg-pink-500/5 border border-pink-500/20 rounded-lg px-3 py-2.5 text-pink-400 text-sm font-bold font-mono">
                        {responsibility > 0 ? formatBRL(responsibility) : 'R$ 0,00'}
                    </div>
                </div>
            )}

            {/* FIX STAKE BUTTON */}
            <button
                onClick={() => onChange({ ...house, isFixed: !house.isFixed })}
                className={`w-full rounded-lg text-xs transition-all h-10 font-black uppercase tracking-widest flex items-center justify-center gap-2 border ${isAnchor ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-[#1e3a5f]/20 border-[#1e3a5f]/50 text-gray-500 hover:text-gray-300 hover:border-[#1e3a5f]'}`}
            >
                {isAnchor ? 'STAKE FIXADO' : 'FIXAR STAKE'}
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
    const [history, setHistory] = useState<CalculationHistory[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showProfits, setShowProfits] = useState(true);

    // Initialize houses
    const [houses, setHouses] = useState<HouseState[]>(() => {
        return Array.from({ length: 10 }).map((_, i) => DEFAULT_HOUSE(i));
    });

    // Load History
    useEffect(() => {
        const saved = localStorage.getItem('arb_history');
        if (saved) {
            try {
                setHistory(JSON.parse(saved));
            } catch (e) { }
        }
    }, []);

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
            distribution: h.distribution,
            targetProfit: h.isProfitFixed ? parseBR(h.targetProfit) : null
        }));
    }, [activeHouses]);

    // Calculate
    const arbResult = useMemo(() => {
        return calculateArb(houseInputs, rounding);
    }, [houseInputs, rounding]);

    // Auto-save history
    useEffect(() => {
        if (arbResult.totalInvested > 1 && arbResult.roi !== 0) {
            const timer = setTimeout(() => {
                const newCalc: CalculationHistory = {
                    id: Date.now().toString(),
                    timestamp: Date.now(),
                    numHouses,
                    rounding,
                    houses: activeHouses,
                    roi: arbResult.roi,
                    totalInvested: arbResult.totalInvested
                };

                setHistory(prev => {
                    const updated = [newCalc, ...prev.filter(h => JSON.stringify(h.houses) !== JSON.stringify(activeHouses))].slice(0, 5);
                    localStorage.setItem('arb_history', JSON.stringify(updated));
                    return updated;
                });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [arbResult.totalInvested, arbResult.roi, activeHouses, numHouses, rounding]);

    const updateHouse = (index: number, updated: HouseState) => {
        setHouses(prev => {
            const next = [...prev];
            // If fixing stake, disable profit fixed for this house
            if (updated.isFixed && !prev[index].isFixed) {
                next.forEach((h, i) => { next[i] = { ...h, isFixed: false }; });
                updated.isProfitFixed = false;
                updated.targetProfit = '';
            }
            // If fixing profit, disable fixed stake for this house
            if (updated.isProfitFixed && !prev[index].isProfitFixed) {
                updated.isFixed = false;
                updated.distribution = true;
            }

            next[index] = updated;
            const anyFixed = next.slice(0, numHouses).some(h => h.isFixed);
            if (!anyFixed) {
                // Find first non-profit-fixed house to anchor
                const anchorIdx = next.slice(0, numHouses).findIndex(h => !h.isProfitFixed);
                if (anchorIdx >= 0) next[anchorIdx].isFixed = true;
                else next[0].isFixed = true;
            }
            return next;
        });
    };

    const loadHistoryItem = (item: CalculationHistory) => {
        setNumHouses(item.numHouses);
        setRounding(item.rounding as RoundingStep);
        setHouses(prev => {
            const next = [...prev];
            item.houses.forEach((h, i) => { next[i] = h; });
            return next;
        });
        setShowHistory(false);
    };

    const clearAll = () => {
        setHouses(prev => prev.map((_, i) => DEFAULT_HOUSE(i)));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Title */}
            <div className="border-l-[5px] border-emerald-500 pl-5 py-2 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-white tracking-tight">ARB PRO</h2>
                        {arbResult.totalInvested > 0 && (
                            <div className="bg-green-500/20 border border-green-500/30 rounded px-2 py-0.5 flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                                <span className="text-[11px] font-black text-green-400 uppercase tracking-widest">ROI {arbResult.roi.toFixed(2)}%</span>
                            </div>
                        )}
                    </div>
                    <p className="text-gray-500 text-sm font-medium mt-1">Gere lucros consistentes usando arbitragem profissional.</p>
                </div>
                <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                    <button
                        onClick={() => setShowProfits(!showProfits)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showProfits ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}
                    >
                        {showProfits ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter text-center leading-none">
                        {showProfits ? 'Ocultar Lucros' : 'Mostrar Lucros'}
                    </span>
                </div>
            </div>

            {/* Config Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0d1421]/40 border border-[#1e3a5f]/30 rounded-xl p-5 shadow-sm">
                    <label className="text-[11px] text-gray-500 uppercase font-black tracking-widest mb-3 block">Células de Cálculo</label>
                    <div className="relative group">
                        <select
                            value={numHouses}
                            onChange={e => setNumHouses(Number(e.target.value))}
                            className="w-full bg-[#0a0f1e] text-white font-bold h-11 px-4 rounded-lg border border-[#1e3a5f]/50 appearance-none focus:outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
                        >
                            {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} Casas</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-hover:text-emerald-400 transition-colors" />
                    </div>
                </div>
                <div className="bg-[#0d1421]/40 border border-[#1e3a5f]/30 rounded-xl p-5 shadow-sm">
                    <label className="text-[11px] text-gray-500 uppercase font-black tracking-widest mb-3 block">Arredondamento</label>
                    <div className="relative group">
                        <select
                            value={rounding}
                            onChange={e => setRounding(Number(e.target.value) as RoundingStep)}
                            className="w-full bg-[#0a0f1e] text-white font-bold h-11 px-4 rounded-lg border border-[#1e3a5f]/50 appearance-none focus:outline-none focus:border-emerald-500/50 transition-all cursor-pointer"
                        >
                            {ROUNDING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-hover:text-emerald-400 transition-colors" />
                    </div>
                </div>
            </div>

            {/* Houses Grid */}
            <div className={`grid gap-5 ${numHouses === 2 ? 'grid-cols-1 md:grid-cols-2' : numHouses === 3 ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'}`}>
                {activeHouses.map((house, i) => (
                    <HouseCard
                        key={house.id}
                        index={i}
                        house={house}
                        computedStake={arbResult.results[i]?.computedStake ?? 0}
                        responsibility={arbResult.results[i]?.responsibility ?? 0}
                        profitIfWin={arbResult.results[i]?.profitIfWin ?? 0}
                        finalOdd={arbResult.results[i]?.finalOdd ?? 0}
                        showProfits={showProfits}
                        onChange={updated => updateHouse(i, updated)}
                    />
                ))}
            </div>

            {/* Results Section */}
            <div className="bg-[#0d1421]/80 border border-[#1e3a5f]/40 rounded-2xl overflow-hidden shadow-2xl">
                <div className="pt-16 px-8 pb-8">
                    {/* Spaced summary stats */}
                    <div className="flex flex-col md:flex-row items-center justify-around gap-16 mb-12 pb-12 border-b border-[#1e3a5f]/10">
                        <div className="text-center group">
                            <div className="text-4xl font-black text-white mb-2 transition-transform group-hover:scale-105 duration-300">
                                {formatBRL(arbResult.totalInvested)}
                            </div>
                            <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.25em]">TOTAL INVESTIDO</div>
                        </div>
                        <div className="text-center group">
                            <div className={`text-4xl font-black mb-2 transition-transform group-hover:scale-105 duration-300 ${arbResult.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {arbResult.roi > 0 ? '+' : ''}{arbResult.roi.toFixed(2)}%
                            </div>
                            <div className="text-[10px] text-gray-500 font-black uppercase tracking-[0.25em]">ROI MÉDIO</div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-xl">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-emerald-500/10 text-emerald-400/80 uppercase text-[10px] font-black tracking-[0.15em] border-b border-emerald-500/20">
                                    <th className="text-left py-4 px-6">CASA</th>
                                    <th className="text-center py-4 px-6">ODD</th>
                                    <th className="text-center py-4 px-6">COMISSÃO</th>
                                    <th className="text-center py-4 px-6">STAKE</th>
                                    <th className="text-center py-4 px-6">RESPONSABILIDADE</th>
                                    {showProfits && <th className="text-right py-4 px-6">LUCRO</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e3a5f]/10">
                                {activeHouses.map((house, i) => {
                                    const res = arbResult.results[i];
                                    if (!res) return null;
                                    return (
                                        <tr key={house.id} className={`hover:bg-white/[0.02] transition-colors ${(!house.distribution && !house.isProfitFixed) ? 'opacity-40' : ''}`}>
                                            <td className="py-5 px-6 font-black text-white text-sm">
                                                Casa {i + 1} {house.annotation && <span className="text-gray-500 font-medium ml-2">- {house.annotation}</span>}
                                            </td>
                                            <td className="py-5 px-6 text-center font-mono text-cyan-400 text-sm font-bold">
                                                {res.finalOdd.toFixed(2)}
                                            </td>
                                            <td className="py-5 px-6 text-center text-yellow-500/80 text-xs font-bold">
                                                {house.commission ? `${house.commission}%` : '—'}
                                            </td>
                                            <td className="py-5 px-6 text-center font-black text-white/90 text-sm font-mono">
                                                {formatBRL(res.computedStake)}
                                            </td>
                                            <td className="py-5 px-6 text-center font-black text-pink-400/80 text-sm font-mono uppercase tracking-tighter">
                                                {res.responsibility > 0 ? formatBRL(res.responsibility) : '—'}
                                            </td>
                                            {showProfits && (
                                                <td className={`py-5 px-6 text-right font-black ${res.profitIfWin >= 0 ? 'text-green-400' : 'text-red-600'} text-sm font-mono`}>
                                                    {formatBRL(res.profitIfWin)}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-center gap-4 py-6 border-t border-[#1e3a5f]/10">
                <button
                    onClick={clearAll}
                    className="flex items-center gap-2 bg-[#0d1421] border border-[#1e3a5f]/40 hover:border-red-500/40 hover:text-red-400 transition-all px-6 h-12 rounded-xl text-[11px] font-black uppercase tracking-wider text-gray-400 shadow-sm"
                >
                    <Trash2 className="w-4 h-4" /> LIMPAR DADOS
                </button>
                <div className="relative">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`flex items-center gap-2 border transition-all px-6 h-12 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-sm ${showHistory ? 'bg-emerald-500 text-[#0d1421] border-emerald-500' : 'bg-[#0d1421] border-[#1e3a5f]/40 text-gray-400 hover:text-white hover:border-[#1e3a5f]'}`}
                    >
                        <HistoryIcon className="w-4 h-4" /> HISTÓRICO ({history.length})
                    </button>
                    {showHistory && (
                        <div className="absolute bottom-full mb-3 right-0 w-80 bg-[#0d1425] border border-gray-700/50 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
                            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                                <span className="text-[11px] font-black text-white uppercase tracking-widest">Cálculos Recentes</span>
                                <button onClick={() => setShowHistory(false)}><X className="w-4 h-4 text-gray-500" /></button>
                            </div>
                            <div className="max-h-80 overflow-y-auto no-scrollbar">
                                {history.length === 0 ? (
                                    <div className="p-8 text-center text-gray-600 text-[10px] font-black uppercase tracking-widest">Vazio</div>
                                ) : (
                                    <div className="divide-y divide-gray-800">
                                        {history.map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => loadHistoryItem(item)}
                                                className="p-4 hover:bg-white/[0.03] cursor-pointer transition-colors group flex items-start justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-white font-bold text-xs">{item.numHouses} Casas</span>
                                                        <span className={`text-[10px] font-bold ${item.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>{item.roi.toFixed(2)}% ROI</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                                        {new Date(item.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} • {formatBRL(item.totalInvested)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
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

            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-emerald-500/20 border border-white/10 ring-4 ring-white/5">
                            <Calculator className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Calculadoras</h1>
                            <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.2em] mt-0.5">Maximize seus ganhos em apostas</p>
                        </div>
                    </div>
                </div>

                {/* Main Container */}
                <div className="rounded-3xl border text-card-foreground bg-gradient-to-br from-[#12192c] to-[#040815] border-[#1e3a5f]/40 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                    <div className="p-4 sm:p-8">
                        {/* Tabs Navigation */}
                        <div className="flex items-center bg-[#0a0f1e]/80 p-1.5 mb-10 rounded-2xl w-fit border border-[#1e3a5f]/30">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === tab.id ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
                                >
                                    {activeTab === tab.id && (
                                        <div className={`absolute inset-0 rounded-xl ${tab.color} opacity-90 shadow-xl`} />
                                    )}
                                    <span className="relative z-10 flex items-center gap-2">
                                        {tab.label}
                                        <HelpCircle className="w-3.5 h-3.5 opacity-40 hover:opacity-100 cursor-help" onClick={(e) => { e.stopPropagation(); setShowTutorial(true); }} />
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Calculations Content */}
                        <div className="mt-2 min-h-[600px]">
                            <ArbProTab />
                        </div>
                    </div>
                </div>

                {/* Footer Tip */}
                <div className="bg-[#0d1421]/90 border border-green-500/20 rounded-2xl p-6 flex items-start gap-4 shadow-xl border-l-[6px] border-l-green-500/60">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20">
                        <Check className="text-green-400 w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-400 leading-relaxed font-medium">
                            <strong className="text-white uppercase text-[10px] tracking-[0.2em] block mb-1 font-black">Estratégia de Exchange:</strong>
                            Ao operar na Betfair, ative o botão <span className="text-pink-400 font-black">LAY</span>. A calculadora gerenciará a <span className="text-pink-300">Responsabilidade</span> automaticamente para blindar sua aposta.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Calculators;
