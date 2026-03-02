import React, { useState, useMemo } from 'react';
import {
    Search, Filter, Calendar, ChevronLeft, ChevronRight,
    ChevronDown, LayoutGrid, List, SlidersHorizontal, ArrowUpRight,
    ArrowDownRight, Minus, Plus, SearchX, BookOpen, Clock, CheckCircle2,
    XCircle, AlertCircle, Ban, Wallet, Activity, Building, RefreshCw, Layers as Infinity,
    Target
} from 'lucide-react';
import { Bet, Bookmaker, StatusItem, AppSettings, User, PromotionItem } from '../types';
import { Card, Button, Input, Dropdown, MoneyDisplay, Badge } from './ui/UIComponents';
import { calculateBetStats } from '../utils/betCalculations';

interface NewBetsProps {
    bets: Bet[];
    bookmakers: Bookmaker[];
    statuses: StatusItem[];
    promotions: PromotionItem[];
    settings: AppSettings;
    currentUser: User | null;
}

const NewBets: React.FC<NewBetsProps> = ({ bets, bookmakers, statuses, promotions, settings, currentUser }) => {
    // Basic Filtering State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedBookmaker, setSelectedBookmaker] = useState('all');
    const [selectedPeriod, setSelectedPeriod] = useState('month'); // month, week, today, all
    const [profitFilter, setProfitFilter] = useState('all'); // all, profit, loss
    const [minStake, setMinStake] = useState('');
    const [marketFilter, setMarketFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all'); // all, back, lay
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [currentDate, setCurrentDate] = useState(new Date());

    // --- Dynamic Data Extraction ---
    const allMarkets = useMemo(() => {
        const markets = new Set<string>();
        bets.forEach(bet => {
            bet.coverages?.forEach(c => {
                if (c.market) markets.add(c.market.trim());
            });
        });
        return Array.from(markets).sort();
    }, [bets]);

    // Navigation for period (currently month-based for consistency, but can be expanded)
    const changeMonth = (direction: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // --- Advanced Filtering Logic ---
    const filteredBets = useMemo(() => {
        // 1. Exclude "Parceiro / CPF" robustly
        const isExcluded = (promotion?: string) => {
            if (!promotion) return false;
            const normalized = promotion.toLowerCase();
            return normalized.includes('parceiro') || normalized.includes('cpf');
        };

        return bets.filter(bet => {
            // Stats for filtering
            const stats = calculateBetStats(bet);

            // Exclusion logic (Promotion-based)
            if (isExcluded(bet.promotionType)) return false;

            // Search filter
            const matchesSearch =
                bet.event?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                bet.notes?.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            // Status filter
            if (selectedStatus !== 'all' && bet.status !== selectedStatus) return false;

            // Bookmaker filter
            if (selectedBookmaker !== 'all' && bet.mainBookmakerId !== selectedBookmaker) return false;

            // Profit filter
            if (profitFilter === 'profit' && stats.profit <= 0) return false;
            if (profitFilter === 'loss' && stats.profit >= 0) return false;

            // Min Stake filter
            if (minStake && stats.totalStake < parseFloat(minStake)) return false;

            // Market filter
            if (marketFilter !== 'all') {
                const hasMarket = bet.coverages?.some(c => c.market?.trim() === marketFilter);
                if (!hasMarket) return false;
            }

            // Type filter (Back/Lay)
            if (typeFilter !== 'all') {
                const targetType = typeFilter.toLowerCase();
                const hasType = bet.coverages?.some(c => c.market?.toLowerCase().includes(targetType));
                if (!hasType) return false;
            }

            // Period filter
            const betDate = new Date(bet.date);
            if (selectedPeriod === 'month') {
                const sameMonth = betDate.getMonth() === currentDate.getMonth() &&
                    betDate.getFullYear() === currentDate.getFullYear();
                if (!sameMonth) return false;
            } else if (selectedPeriod === 'today') {
                const today = new Date();
                const isToday = betDate.getDate() === today.getDate() &&
                    betDate.getMonth() === today.getMonth() &&
                    betDate.getFullYear() === today.getFullYear();
                if (!isToday) return false;
            } else if (selectedPeriod === 'week') {
                const now = new Date();
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                if (betDate < oneWeekAgo) return false;
            }

            return true;
        });
    }, [bets, searchTerm, selectedStatus, selectedBookmaker, selectedPeriod, profitFilter, minStake, marketFilter, typeFilter, currentDate]);

    const getBookmaker = (id: string) => bookmakers.find(b => b.id === id);

    const renderStatusIcon = (status: string) => {
        switch (status) {
            case 'Green': return <CheckCircle2 size={14} className="text-primary" />;
            case 'Red': return <XCircle size={14} className="text-danger" />;
            case 'Pendente': return <Clock size={14} className="text-amber-500" />;
            case 'Anulada': return <Ban size={14} className="text-gray-500" />;
            default: return <AlertCircle size={14} className="text-blue-500" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-20">
            {/* Header section with specific Pro styling */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 shadow-[0_0_15px_rgba(23,186,164,0.1)]">
                        <SlidersHorizontal className="text-primary w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Filtros Avançados</h1>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mt-0.5">Análise detalhada de apostas</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-[#0d1421] p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-[#090c19] shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                    >
                        <List size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-[#090c19] shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}
                    >
                        <LayoutGrid size={18} />
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <Card className="p-5 bg-[#0d1421] border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Buscar Evento</label>
                        <Input
                            placeholder="Ex: Real Madrid, UEFA..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            icon={<Search size={16} />}
                            className="bg-[#05070e] border-white/5 focus:border-primary/50"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Status da Aposta</label>
                        <Dropdown
                            value={selectedStatus}
                            onChange={setSelectedStatus}
                            options={[
                                { label: 'Todos Status', value: 'all', icon: <Infinity size={14} /> },
                                ...statuses.map(s => ({
                                    label: s.name,
                                    value: s.name,
                                    icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                                }))
                            ]}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Resultado Financeiro</label>
                        <Dropdown
                            value={profitFilter}
                            onChange={setProfitFilter}
                            options={[
                                { label: 'Todos Resultados', value: 'all', icon: <Activity size={14} /> },
                                { label: 'Apenas Lucro (Green)', value: 'profit', icon: <ArrowUpRight size={14} className="text-primary" /> },
                                { label: 'Apenas Prejuízo (Red)', value: 'loss', icon: <ArrowDownRight size={14} className="text-danger" /> }
                            ]}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Investimento Mínimo</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">R$</span>
                            <Input
                                type="number"
                                placeholder="0,00"
                                value={minStake}
                                onChange={e => setMinStake(e.target.value)}
                                className="pl-9 bg-[#05070e] border-white/5 focus:border-primary/50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Casa de Aposta</label>
                        <Dropdown
                            value={selectedBookmaker}
                            onChange={setSelectedBookmaker}
                            options={[
                                { label: 'Todas as Casas', value: 'all', icon: <Building size={14} /> },
                                ...bookmakers.map(b => ({
                                    label: b.name,
                                    value: b.id,
                                    icon: <div className="w-4 h-4 rounded bg-white/10 flex items-center justify-center text-[8px] font-bold text-white overflow-hidden">
                                        {b.logo ? <img src={b.logo} className="w-full h-full object-contain" /> : b.name.substring(0, 2)}
                                    </div>
                                }))
                            ]}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Período Temporal</label>
                        <Dropdown
                            value={selectedPeriod}
                            onChange={setSelectedPeriod}
                            options={[
                                { label: 'Este Mês', value: 'month', icon: <Calendar size={14} /> },
                                { label: 'Hoje', value: 'today', icon: <Clock size={14} /> },
                                { label: 'Últimos 7 dias', value: 'week', icon: <Activity size={14} /> },
                                { label: 'Histórico Total', value: 'all', icon: <Infinity size={14} /> }
                            ]}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Mercado</label>
                        <Dropdown
                            value={marketFilter}
                            onChange={setMarketFilter}
                            options={[
                                { label: 'Todos os Mercados', value: 'all', icon: <Target size={14} /> },
                                ...allMarkets.map(m => ({ label: m, value: m }))
                            ]}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Tipo de Aposta</label>
                        <Dropdown
                            value={typeFilter}
                            onChange={setTypeFilter}
                            options={[
                                { label: 'Todos os Tipos', value: 'all', icon: <Activity size={14} /> },
                                { label: 'Apenas Back', value: 'back', icon: <ArrowUpRight size={14} className="text-primary" /> },
                                { label: 'Apenas Lay', value: 'lay', icon: <ArrowDownRight size={14} className="text-danger" /> }
                            ]}
                        />
                    </div>

                    <div className="flex items-end lg:col-span-3 xl:col-span-4">
                        <Button
                            variant="outline"
                            className="w-full h-11 border-white/5 hover:bg-white/5 text-gray-400 hover:text-white gap-2 text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedStatus('all');
                                setSelectedBookmaker('all');
                                setSelectedPeriod('month');
                                setProfitFilter('all');
                                setMinStake('');
                                setMarketFilter('all');
                                setTypeFilter('all');
                            }}
                        >
                            <RefreshCw size={14} />
                            Limpar Todos os Filtros
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Date Navigation for Month View */}
            {selectedPeriod === 'month' && (
                <div className="flex items-center justify-between bg-[#151b2e] p-3 rounded-2xl border border-white/5 shadow-lg">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-primary">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-primary" />
                        <span className="font-bold text-white uppercase tracking-wider">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </span>
                    </div>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-primary">
                        <ChevronRight size={24} />
                    </button>
                </div>
            )}

            {/* Results Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        Resultados encontrados
                        <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-md text-xs font-mono">{filteredBets.length}</span>
                    </div>
                </div>

                {filteredBets.length === 0 ? (
                    <div className="bg-[#0d1421]/50 border-2 border-dashed border-white/5 rounded-3xl p-20 text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-gray-700">
                            <SearchX size={48} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xl font-bold text-white">Nenhuma aposta encontrada</p>
                            <p className="text-gray-500">Tente ajustar seus filtros para encontrar o que procura.</p>
                        </div>
                        <Button variant="outline" className="mt-2" onClick={() => {
                            setSearchTerm('');
                            setSelectedStatus('all');
                            setSelectedBookmaker('all');
                            setSelectedPeriod('month');
                        }}>Limpar Filtros</Button>
                    </div>
                ) : (
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
                        {filteredBets.map(bet => {
                            const stats = calculateBetStats(bet);
                            const roi = stats.totalStake > 0 ? (stats.profit / stats.totalStake) * 100 : 0;
                            const bookie = getBookmaker(bet.mainBookmakerId);
                            const date = new Date(bet.date);

                            return (
                                <Card
                                    key={bet.id}
                                    className={`
                                        group relative overflow-hidden bg-[#151b2e]/40 border-white/5 hover:border-primary/30 transition-all duration-300
                                        ${viewMode === 'grid' ? 'p-5 flex flex-col' : 'p-4 flex flex-row items-center gap-6'}
                                    `}
                                >
                                    {/* Left Border Accent based on status */}
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5"
                                        style={{ backgroundColor: statuses.find(s => s.name === bet.status)?.color || '#555' }}
                                    />

                                    {/* Content Grouping */}
                                    <div className={`flex items-center gap-4 ${viewMode === 'grid' ? 'mb-4' : 'flex-none w-1/3'}`}>
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shrink-0"
                                            style={{ backgroundColor: `${bookie?.color || '#333'}20`, border: `1px solid ${bookie?.color || '#333'}40` }}
                                        >
                                            {bookie?.logo ? (
                                                <img src={bookie.logo} alt="" className="w-full h-full object-contain p-2" />
                                            ) : (
                                                <BookOpen size={20} style={{ color: bookie?.color }} />
                                            )}
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <h4 className="font-bold text-white group-hover:text-primary transition-colors truncate">{bet.event}</h4>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                                <span>{date.toLocaleDateString('pt-BR')}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-700" />
                                                <span className="truncate">{bookie?.name}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle Section: Financials */}
                                    <div className={`flex items-center justify-between ${viewMode === 'grid' ? 'mb-4 bg-white/5 p-3 rounded-xl' : 'flex-1 border-x border-white/5 px-6'}`}>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Investimento</p>
                                            <MoneyDisplay value={stats.totalStake} className="text-sm font-bold text-white" />
                                        </div>
                                        <div className="space-y-1 text-right">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Lucro Líquido</p>
                                            <MoneyDisplay
                                                value={stats.profit}
                                                className={`text-sm font-bold ${stats.profit >= 0 ? 'text-primary' : 'text-danger'}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Final Section: Status & Actions */}
                                    <div className={`flex items-center justify-between gap-4 ${viewMode === 'list' ? 'flex-none w-[180px]' : ''}`}>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                                                {renderStatusIcon(bet.status)}
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-300">{bet.status}</span>
                                            </div>
                                            {bet.promotionType && bet.promotionType !== 'Nenhuma' && (
                                                <span className="text-[9px] text-primary font-bold uppercase tracking-tighter self-end">{bet.promotionType}</span>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <div className={`flex flex-col items-end ${roi >= 0 ? 'text-primary' : 'text-danger'}`}>
                                                <span className="text-[10px] font-bold uppercase opacity-50">ROI</span>
                                                <span className="text-sm font-black">{roi.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewBets;
