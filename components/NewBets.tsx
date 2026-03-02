import React, { useState, useMemo } from 'react';
import {
    Search, Filter, Calendar, ChevronLeft, ChevronRight,
    ChevronDown, LayoutGrid, List, SlidersHorizontal, ArrowUpRight,
    ArrowDownRight, Minus, Plus, SearchX, BookOpen, Clock, CheckCircle2,
    XCircle, AlertCircle, Ban, Wallet, Activity, Building, RefreshCw, Layers as Infinity,
    Target, Trophy, StickyNote, Gift
} from 'lucide-react';
import { Bet, Bookmaker, StatusItem, AppSettings, User, PromotionItem } from '../types';
import { Card, Button, Input, Dropdown, MoneyDisplay, Badge, Modal } from './ui/UIComponents';
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
    const [selectedPromotion, setSelectedPromotion] = useState('all');
    const [selectedPeriod, setSelectedPeriod] = useState('all'); // Default to 'all' as requested
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [profitFilter, setProfitFilter] = useState('all'); // all, profit, loss
    const [minStake, setMinStake] = useState('');
    const [marketFilter, setMarketFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all'); // all, back, lay
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [selectedBetId, setSelectedBetId] = useState<string | null>(null);
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
    const isExcluded = (promotion?: string) => {
        if (!promotion) return false;
        const normalized = promotion.toLowerCase();
        return normalized.includes('parceiro') || normalized.includes('cpf');
    };

    const filteredBets = useMemo(() => {
        return bets.filter(bet => {
            const stats = calculateBetStats(bet);
            if (isExcluded(bet.promotionType)) return false;
            const matchesSearch = bet.event?.toLowerCase().includes(searchTerm.toLowerCase()) || bet.notes?.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;
            if (selectedStatus !== 'all' && bet.status !== selectedStatus) return false;
            if (selectedBookmaker !== 'all' && bet.mainBookmakerId !== selectedBookmaker) return false;
            if (selectedPromotion !== 'all' && bet.promotionType !== selectedPromotion) return false;
            if (profitFilter === 'profit' && stats.profit <= 0) return false;
            if (profitFilter === 'loss' && stats.profit >= 0) return false;
            if (minStake && stats.totalStake < parseFloat(minStake)) return false;
            if (marketFilter !== 'all') {
                const hasMarket = bet.coverages?.some(c => c.market?.trim() === marketFilter);
                if (!hasMarket) return false;
            }
            if (typeFilter !== 'all') {
                const targetType = typeFilter.toLowerCase();
                const hasType = bet.coverages?.some(c => c.market?.toLowerCase().includes(targetType));
                if (!hasType) return false;
            }
            const betDate = new Date(bet.date);
            if (selectedPeriod === 'month') {
                const sameMonth = betDate.getMonth() === currentDate.getMonth() && betDate.getFullYear() === currentDate.getFullYear();
                if (!sameMonth) return false;
            } else if (selectedPeriod === 'today') {
                const today = new Date();
                const isToday = betDate.getDate() === today.getDate() && betDate.getMonth() === today.getMonth() && betDate.getFullYear() === today.getFullYear();
                if (!isToday) return false;
            } else if (selectedPeriod === 'week') {
                const now = new Date();
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                if (betDate < oneWeekAgo) return false;
            } else if (selectedPeriod === 'custom_date') {
                const targetStr = new Date(selectedDate).toISOString().split('T')[0];
                const betStr = betDate.toISOString().split('T')[0];
                if (targetStr !== betStr) return false;
            }
            return true;
        });
    }, [bets, searchTerm, selectedStatus, selectedBookmaker, selectedPromotion, selectedPeriod, selectedDate, profitFilter, minStake, marketFilter, typeFilter, currentDate]);

    const getBookmaker = (id: string) => bookmakers.find(b => b.id === id);

    const filteredStats = useMemo(() => {
        return filteredBets.reduce((acc, bet) => {
            const stats = calculateBetStats(bet);
            return {
                totalProfit: acc.totalProfit + stats.profit,
                totalStake: acc.totalStake + stats.totalStake
            };
        }, { totalProfit: 0, totalStake: 0 });
    }, [filteredBets]);

    const renderStatusIcon = (status: string, color?: string) => {
        const style = color ? { color } : {};
        switch (status) {
            case 'Green':
            case 'Concluído':
            case 'Meio Green':
                return <CheckCircle2 size={14} style={style} />;
            case 'Red':
            case 'Meio Red':
                return <XCircle size={14} style={style} />;
            case 'Pendente':
                return <Clock size={14} style={style} />;
            case 'Anulada':
                return <Ban size={14} style={style} />;
            default:
                return <AlertCircle size={14} style={style} />;
        }
    };

    const selectedBetForModal = useMemo(() =>
        bets.find(b => b.id === selectedBetId),
        [bets, selectedBetId]);

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
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Promoção</label>
                        <Dropdown
                            value={selectedPromotion}
                            onChange={setSelectedPromotion}
                            isSearchable={true}
                            searchPlaceholder="Procurar promoção..."
                            options={[
                                { label: 'Todas as Promoções', value: 'all', icon: <Gift size={14} /> },
                                ...promotions.map(p => ({
                                    label: p.name,
                                    value: p.name,
                                    icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
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
                            isSearchable={true}
                            searchPlaceholder="Procurar casa..."
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
                                { label: 'Todo o Período (Desde o Início)', value: 'all', icon: <Infinity size={14} /> },
                                { label: 'Filtrar por Mês', value: 'month', icon: <Calendar size={14} /> },
                                { label: 'Data Específica', value: 'custom_date', icon: <Clock size={14} /> },
                                { label: 'Hoje', value: 'today', icon: <Clock size={14} /> },
                                { label: 'Últimos 7 dias', value: 'week', icon: <Activity size={14} /> }
                            ]}
                        />
                    </div>

                    {selectedPeriod === 'custom_date' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                            <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1 flex items-center gap-1">
                                <Calendar size={10} /> Selecionar Data
                            </label>
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="bg-[#05070e] border-primary/30 focus:border-primary/50 text-white"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Mercado</label>
                        <Dropdown
                            value={marketFilter}
                            onChange={setMarketFilter}
                            isSearchable={true}
                            searchPlaceholder="Procurar mercado..."
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
                                setSelectedPromotion('all');
                                setSelectedPeriod('all');
                                setSelectedDate(new Date().toISOString().split('T')[0]);
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

            {/* Financial Preview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-500">
                <div className="bg-[#0d1421] border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Total Investido (Filtro)</p>
                            <MoneyDisplay value={filteredStats.totalStake} className="text-lg font-bold text-white" />
                        </div>
                    </div>
                </div>
                <div className={`bg-[#0d1421] border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-primary/30 transition-all ${filteredStats.totalProfit >= 0 ? 'hover:border-primary/30' : 'hover:border-danger/30'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${filteredStats.totalProfit >= 0 ? 'bg-primary/10 text-primary' : 'bg-danger/10 text-danger'}`}>
                            {filteredStats.totalProfit >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Resultado Total (Filtro)</p>
                            <MoneyDisplay value={filteredStats.totalProfit} className={`text-xl font-black ${filteredStats.totalProfit >= 0 ? 'text-primary' : 'text-danger'}`} />
                        </div>
                    </div>
                    {filteredStats.totalStake > 0 && (
                        <div className={`px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-sm font-black ${filteredStats.totalProfit >= 0 ? 'text-primary' : 'text-danger'}`}>
                            {((filteredStats.totalProfit / filteredStats.totalStake) * 100).toFixed(1)}% ROI
                        </div>
                    )}
                </div>
            </div>

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
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
                        {filteredBets.map(bet => {
                            const stats = calculateBetStats(bet);
                            const roi = stats.totalStake > 0 ? (stats.profit / stats.totalStake) * 100 : 0;
                            const bookie = getBookmaker(bet.mainBookmakerId);
                            const date = new Date(bet.date);

                            // Sidebar and status color
                            const statusObj = statuses.find(s => s.name === bet.status);
                            const barColor = statusObj?.color || '#555';

                            // Promotion color
                            const promoObj = promotions.find(p => p.name === bet.promotionType);
                            const promoColor = promoObj?.color || '#17baa4';

                            return (
                                <Card
                                    key={bet.id}
                                    onClick={() => setSelectedBetId(bet.id)}
                                    className="group relative overflow-hidden bg-[#151b2e]/40 border-white/5 hover:border-primary/30 transition-all duration-300 cursor-pointer active:scale-[0.99] p-4 md:p-6 pl-24 min-h-[130px]"
                                >
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5"
                                        style={{ backgroundColor: barColor }}
                                    />

                                    <div className="flex items-center gap-5 w-full h-full">
                                        {/* LOGO - Always on the left, globally vertically centered */}
                                        <div className="w-10 h-10 flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shrink-0 pr-2">
                                            {bookie?.logo ? (
                                                <img src={bookie.logo} alt="" className="w-full h-full object-contain" />
                                            ) : (
                                                <BookOpen size={24} style={{ color: bookie?.color }} />
                                            )}
                                        </div>

                                        {/* REST OF CONTENT */}
                                        <div className="flex flex-col flex-1">

                                            {/* Title & Date */}
                                            <div>
                                                <h4 className="font-bold text-white text-base group-hover:text-white transition-colors whitespace-normal leading-tight">{bet.event}</h4>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-tighter mt-2">
                                                    <span>{date.toLocaleDateString('pt-BR')}</span>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                                                    <span className="truncate">{bookie?.name}</span>
                                                </div>
                                            </div>

                                            {/* Data Section */}
                                            <div className={`
                                                flex w-full mt-6
                                                ${viewMode === 'list' ? 'items-center justify-between border-t border-white/5 pt-6' : 'flex-col gap-6'}
                                            `}>
                                                {/* Financials Row */}
                                                <div className={`flex items-center ${viewMode === 'list' ? 'gap-20 flex-1' : 'w-full bg-white/5 p-3 rounded-xl justify-between flex-wrap gap-y-2'}`}>
                                                    <div className="space-y-1.5 min-w-[100px]">
                                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none">Investimento</p>
                                                        <MoneyDisplay value={stats.totalStake} className={`${viewMode === 'list' ? 'text-base' : 'text-sm'} font-bold text-white`} />
                                                    </div>
                                                    <div className={`${viewMode === 'list' ? 'space-y-1.5 min-w-[100px]' : 'space-y-1.5 text-right min-w-[100px]'}`}>
                                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none">Lucro Líquido</p>
                                                        <MoneyDisplay
                                                            value={stats.profit}
                                                            className={`${viewMode === 'list' ? 'text-base' : 'text-sm'} font-bold ${stats.profit >= 0 ? 'text-[#10b981]' : 'text-danger'}`}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Status & Badges Row */}
                                                <div className={`flex items-center ${viewMode === 'list' ? 'gap-10' : 'w-full justify-between gap-2 flex-wrap'}`}>
                                                    {/* ROI Box */}
                                                    <div className={`flex items-center gap-2 ${viewMode === 'list' ? 'px-4 py-2' : 'px-2 py-1'} rounded-xl bg-white/5 border border-white/5 ${roi >= 0 ? 'text-[#22d3ee]' : 'text-danger'} shrink-0 shadow-lg shadow-black/20`}>
                                                        <span className="text-[9px] font-black uppercase opacity-60 tracking-widest">ROI</span>
                                                        <span className={`${viewMode === 'list' ? 'text-base' : 'text-sm'} font-black leading-none`}>{roi.toFixed(1)}%</span>
                                                    </div>

                                                    {/* Badge Group */}
                                                    <div className={`flex items-center ${viewMode === 'list' ? 'gap-4' : 'gap-2 flex-wrap justify-end'}`}>
                                                        {/* Status Badge */}
                                                        <div
                                                            className={`flex items-center gap-2 ${viewMode === 'list' ? 'px-4 py-2' : 'px-2 py-1'} rounded-md bg-white/5 border w-fit shrink-0`}
                                                            style={{ borderColor: `${barColor}40`, color: barColor }}
                                                        >
                                                            {renderStatusIcon(bet.status, barColor)}
                                                            <span className="text-[10px] font-black uppercase tracking-tight">{bet.status}</span>
                                                        </div>

                                                        {/* Promotion Badge */}
                                                        {bet.promotionType && bet.promotionType !== 'Nenhuma' && (
                                                            <Badge
                                                                color={promoColor}
                                                                className={`text-[10px] ${viewMode === 'list' ? 'py-1.5 px-4' : 'py-1 px-2'} w-fit font-black uppercase tracking-wider bg-white/5 shrink-0`}
                                                            >
                                                                {bet.promotionType}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bet Details Modal */}
            <Modal
                isOpen={!!selectedBetId}
                onClose={() => setSelectedBetId(null)}
                title="Detalhes da Aposta"
                size="lg"
            >
                {selectedBetForModal && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 flex items-center justify-center shrink-0">
                                    {getBookmaker(selectedBetForModal.mainBookmakerId)?.logo ? (
                                        <img
                                            src={getBookmaker(selectedBetForModal.mainBookmakerId)?.logo}
                                            alt=""
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <Trophy size={24} className="text-primary" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white leading-tight">{selectedBetForModal.event}</h3>
                                    <p className="text-gray-500 text-xs font-medium uppercase tracking-widest">{new Date(selectedBetForModal.date).toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border w-fit ml-auto"
                                    style={{ borderColor: `${statuses.find(s => s.name === selectedBetForModal.status)?.color}40`, color: statuses.find(s => s.name === selectedBetForModal.status)?.color }}
                                >
                                    {renderStatusIcon(selectedBetForModal.status, statuses.find(s => s.name === selectedBetForModal.status)?.color)}
                                    <span className="text-[10px] font-black uppercase tracking-tight">{selectedBetForModal.status}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#05070e] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                                <div className="w-10 h-10 flex-shrink-0">
                                    {getBookmaker(selectedBetForModal.mainBookmakerId)?.logo && (
                                        <img
                                            src={getBookmaker(selectedBetForModal.mainBookmakerId)?.logo}
                                            alt=""
                                            className="w-full h-full object-contain"
                                        />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Casa de Aposta</p>
                                    <p className="text-white font-bold truncate">{getBookmaker(selectedBetForModal.mainBookmakerId)?.name || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="bg-[#05070e] p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Promoção</p>
                                {selectedBetForModal.promotionType && selectedBetForModal.promotionType !== 'Nenhuma' ? (
                                    <Badge
                                        color={promotions.find(p => p.name === selectedBetForModal.promotionType)?.color || '#17baa4'}
                                        className="text-[10px] py-1 px-3 w-fit font-black uppercase tracking-wider bg-white/5"
                                    >
                                        {selectedBetForModal.promotionType}
                                    </Badge>
                                ) : (
                                    <p className="text-gray-600 font-bold uppercase text-[10px]">Nenhuma</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Coberturas</p>
                            <div className="space-y-2">
                                {selectedBetForModal.coverages?.map((cov, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 group hover:bg-white/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 flex items-center justify-center shrink-0 overflow-hidden">
                                                {getBookmaker(cov.bookmakerId)?.logo ? (
                                                    <img
                                                        src={getBookmaker(cov.bookmakerId).logo}
                                                        alt=""
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-[#05070e] rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">
                                                        {cov.market?.substring(0, 1)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{cov.market}</p>
                                                <p className="text-[10px] text-gray-500">Odd: {cov.odd.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <MoneyDisplay value={cov.stake} className="text-sm font-bold text-white" />
                                            <p className={`text-[9px] font-bold uppercase ${cov.status === 'Green' ? 'text-primary' : 'text-danger'}`}>{cov.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedBetForModal.notes && (
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <StickyNote size={12} /> Notas da Aposta
                                </p>
                                <p className="text-gray-400 text-sm whitespace-pre-line leading-relaxed italic">"{selectedBetForModal.notes}"</p>
                            </div>
                        )}

                        <div className="pt-4 border-t border-white/5">
                            <Button onClick={() => setSelectedBetId(null)} className="w-full">Fechar</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default NewBets;
