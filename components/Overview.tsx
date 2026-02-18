import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, Trophy, Wallet, Activity, Calendar, Infinity, Filter, DollarSign, Target, Eye, EyeOff, StickyNote, Copy, ChevronDown } from 'lucide-react';
import { Card, Dropdown, Input, MoneyDisplay } from './ui/UIComponents';
import { Bet, ExtraGain, AppSettings, Bookmaker } from '../types';
import { calculateBetStats } from '../utils/betCalculations';

interface OverviewProps {
    bets: Bet[];
    gains: ExtraGain[];
    settings: AppSettings;
    setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
    bookmakers: Bookmaker[]; // Added bookmakers prop
}

const Overview: React.FC<OverviewProps> = ({ bets, gains, settings, setSettings, bookmakers }) => {
    const [period, setPeriod] = useState('month');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [expandedBookmaker, setExpandedBookmaker] = useState<string | null>(null); // For Top 3 expansion


    // Period Options with Icons
    const periodOptions = [
        { label: 'Hoje', value: 'today', icon: <Calendar size={16} /> },
        { label: 'Esta Semana', value: 'week', icon: <Calendar size={16} /> },
        { label: 'Este Mês', value: 'month', icon: <Calendar size={16} /> },
        { label: 'Mês Passado', value: 'last-month', icon: <Calendar size={16} /> },
        { label: 'Selecionar Mês', value: 'specific-month', icon: <Calendar size={16} /> },
        { label: 'Personalizado', value: 'custom', icon: <Calendar size={16} /> },
        { label: 'Todo o Período', value: 'all', icon: <Infinity size={16} /> },
    ];

    // --- Filtering Logic ---
    const getFilteredBets = () => {
        const now = new Date(); // Local time

        return bets.filter(bet => {
            // Parse YYYY-MM-DD string or ISO string to local Date components 
            const dateStr = bet.date.includes('T') ? bet.date.split('T')[0] : bet.date;
            const [y, m, d] = dateStr.split('-').map(Number);
            const betDate = new Date(y, m - 1, d); // Local midnight
            const betDay = new Date(y, m - 1, d);
            const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            switch (period) {
                case 'today':
                    return betDay.getTime() === currentDay.getTime();
                case 'week':
                    const oneWeekAgo = new Date(currentDay);
                    oneWeekAgo.setDate(currentDay.getDate() - 7);
                    return betDay >= oneWeekAgo && betDay <= currentDay;
                case 'month':
                    return betDate.getMonth() === now.getMonth() && betDate.getFullYear() === now.getFullYear();
                case 'last-month':
                    // Safe last month calculation
                    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    return betDate.getMonth() === lastMonthDate.getMonth() && betDate.getFullYear() === lastMonthDate.getFullYear();
                case 'specific-month':
                    if (!selectedMonth) return true;
                    const [year, month] = selectedMonth.split('-').map(Number);
                    return betDate.getMonth() === month - 1 && betDate.getFullYear() === year;
                case 'custom':
                    if (!startDate && !endDate) return true;
                    // Fix custom range parsing too
                    const startRaw = startDate ? startDate.split('-').map(Number) : [2000, 1, 1];
                    const startDay = new Date(startRaw[0], startRaw[1] - 1, startRaw[2]);

                    const endRaw = endDate ? endDate.split('-').map(Number) : [2100, 1, 1];
                    const endDay = new Date(endRaw[0], endRaw[1] - 1, endRaw[2]);

                    return betDay >= startDay && betDay <= endDay;
                case 'all':
                default:
                    return true;
            }
        });
    };

    const getFilteredGains = () => {
        const now = new Date();

        return gains.filter(gain => {
            // Parse YYYY-MM-DD string or ISO string to local Date components 
            const dateStr = gain.date.includes('T') ? gain.date.split('T')[0] : gain.date;
            const [y, m, d] = dateStr.split('-').map(Number);
            const gainDate = new Date(y, m - 1, d);
            const gainDay = new Date(y, m - 1, d);
            const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            switch (period) {
                case 'today':
                    return gainDay.getTime() === currentDay.getTime();
                case 'week':
                    const oneWeekAgo = new Date(currentDay);
                    oneWeekAgo.setDate(currentDay.getDate() - 7);
                    return gainDay >= oneWeekAgo && gainDay <= currentDay;
                case 'month':
                    return gainDate.getMonth() === now.getMonth() && gainDate.getFullYear() === now.getFullYear();
                case 'last-month':
                    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    return gainDate.getMonth() === lastMonthDate.getMonth() && gainDate.getFullYear() === lastMonthDate.getFullYear();
                case 'specific-month':
                    if (!selectedMonth) return true;
                    const [year, month] = selectedMonth.split('-').map(Number);
                    return gainDate.getMonth() === month - 1 && gainDate.getFullYear() === year;
                case 'custom':
                    if (!startDate && !endDate) return true;
                    const startRaw = startDate ? startDate.split('-').map(Number) : [2000, 1, 1];
                    const startDay = new Date(startRaw[0], startRaw[1] - 1, startRaw[2]);

                    const endRaw = endDate ? endDate.split('-').map(Number) : [2100, 1, 1];
                    const endDay = new Date(endRaw[0], endRaw[1] - 1, endRaw[2]);

                    return gainDay >= startDay && gainDay <= endDay;
                default:
                    return true;
            }
        });
    };

    const filteredBets = getFilteredBets();
    const filteredGains = getFilteredGains();

    // Helper to get dynamic label for the selected period
    const getPeriodLabel = () => {
        const now = new Date();
        const getMonthName = (date: Date) => date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        switch (period) {
            case 'today': return 'de Hoje';
            case 'week': return 'desta Semana';
            case 'month': return `de ${now.toLocaleDateString('pt-BR', { month: 'long' })}`;
            case 'last-month':
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                return `de ${lastMonth.toLocaleDateString('pt-BR', { month: 'long' })}`;
            case 'specific-month':
                if (!selectedMonth) return 'do Mês Selecionado';
                const [year, month] = selectedMonth.split('-').map(Number);
                const specDate = new Date(year, month - 1, 1);
                return `de ${specDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
            case 'custom': return 'do Período Personalizado';
            case 'all': return 'de Todo o Período';
            default: return 'do Período';
        }
    };

    // Calculate metrics
    // --- Calculations ---
    // --- Calculations ---
    const calculateMetrics = () => {
        // Total staked in the period, including pending bets. For the "Total Apostado" card.
        const totalStakedInPeriod = filteredBets.reduce((acc, bet) => {
            const { totalStake } = calculateBetStats(bet);
            return acc + totalStake;
        }, 0);

        const resolvedBets = filteredBets
            .filter(b => !['Pendente', 'Rascunho'].includes(b.status))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let cumulativeProfit = 0;
        let resolvedStaked = 0;
        let resolvedReturned = 0;

        const chartData = resolvedBets.map(bet => {
            const { totalStake, totalReturn, profit } = calculateBetStats(bet);

            resolvedStaked += totalStake;
            resolvedReturned += totalReturn;
            cumulativeProfit += profit;

            return {
                date: new Date(bet.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
                profit: cumulativeProfit,
                value: profit
            };
        });

        const totalProfit = resolvedBets.reduce((acc, bet) => acc + calculateBetStats(bet).profit, 0);
        const roi = resolvedStaked > 0 ? (totalProfit / resolvedStaked) * 100 : 0;

        const betPromotionsCount = filteredBets.filter(b => b.promotionType && b.promotionType !== 'Nenhuma').length;

        const totalPromotionsCount = betPromotionsCount;
        const doubleGreenBets = filteredBets.filter(b => calculateBetStats(b).isDoubleGreen);

        // --- Best Stats Calculation ---
        const bookmakerProfits: Record<string, { total: number, promos: Record<string, number> }> = {};

        // 1. Process Resolved Bets
        resolvedBets.forEach(bet => {
            const stats = calculateBetStats(bet);

            // HYBRID LOGIC:
            // 1. If it's a Double Green (Win-Win), we distribute the profit to each bookmaker involved.
            //    This ensures secondary bookmakers get credit for their wins.
            // 2. If it's a Standard Bet (Arb/Hedge/Bonus) where one side likely lost, 
            //    we attribute the NET Profit of the entire bet to the MAIN Bookmaker.
            //    This forces the "Cost" of the hedge to be subtracted from the Main Bookmaker's gain,
            //    showing the true "Strategy Profit" for that bookmaker.

            // ROBUST HYBRID LOGIC:
            // Identify if the bet is a "Win-Win" (all coverages profitable) or "Win-Loss" (hedge/arb).
            // Logic: If ANY coverage has negative profit (loss), it means there was a cost. 
            // We must aggregate everything to the Main Bookmaker (Net Profit).
            // If ALL coverages have >= 0 profit, it's a Double Green / Bonus. Distribute profit evenly.

            let hasLoss = false;
            if (stats.coverageProfits) {
                hasLoss = stats.coverageProfits.some(cp => cp.profit < 0);
            }

            if (!hasLoss && stats.coverageProfits && stats.coverageProfits.length > 0) {
                // DOUBLE GREEN / ALL WIN SCENARIO
                stats.coverageProfits.forEach(cp => {
                    const bmId = cp.bookmakerId || 'unknown';

                    let promo = 'Nenhuma';
                    if (bmId === bet.mainBookmakerId) {
                        promo = bet.promotionType || 'Nenhuma';
                    }

                    if (!bookmakerProfits[bmId]) bookmakerProfits[bmId] = { total: 0, promos: {} };

                    bookmakerProfits[bmId].total += cp.profit;

                    if (!bookmakerProfits[bmId].promos[promo]) bookmakerProfits[bmId].promos[promo] = 0;
                    bookmakerProfits[bmId].promos[promo] += cp.profit;
                });
            } else {
                // STANDARD SCENARIO (Net Profit to Main Bookie)
                const bmId = bet.mainBookmakerId || 'unknown';
                const promo = bet.promotionType || 'Nenhuma';

                if (!bookmakerProfits[bmId]) bookmakerProfits[bmId] = { total: 0, promos: {} };

                bookmakerProfits[bmId].total += stats.profit;

                if (!bookmakerProfits[bmId].promos[promo]) bookmakerProfits[bmId].promos[promo] = 0;
                bookmakerProfits[bmId].promos[promo] += stats.profit;
            }

            // Add Extra Gain (Single Value) to Main Bookmaker
            if (bet.extraGain) {
                const bmId = bet.mainBookmakerId || 'unknown';
                const promo = bet.promotionType || 'Nenhuma';
                if (!bookmakerProfits[bmId]) bookmakerProfits[bmId] = { total: 0, promos: {} };
                bookmakerProfits[bmId].total += bet.extraGain;
                if (!bookmakerProfits[bmId].promos[promo]) bookmakerProfits[bmId].promos[promo] = 0;
                bookmakerProfits[bmId].promos[promo] += bet.extraGain;
            }
        });

        // 2. Extra Gains from "Gains" tab are EXCLUDED per user request.
        // We only use the extraGain field within the Bet itself (above).

        // 3. Find Top 3 Bookmakers
        const top3Bookmakers = Object.entries(bookmakerProfits)
            .map(([id, data]) => {
                const topPromos = Object.entries(data.promos)
                    .map(([name, profit]) => ({ name, profit }))
                    .sort((a, b) => b.profit - a.profit)
                    .slice(0, 3);

                return {
                    bookmakerId: id,
                    totalProfit: data.total,
                    topPromos
                };
            })
            .sort((a, b) => b.totalProfit - a.totalProfit)
            .slice(0, 3);

        // Legacy support (optional, but cleaner to just use array)
        const bestStats = top3Bookmakers.length > 0 ? top3Bookmakers[0] : null;

        // --- Best Months Calculation (Global - All Time) ---
        const monthlyProfits: Record<string, number> = {};

        // Use all bets for global ranking, not just filtered ones
        const allResolvedBets = bets.filter(b => !['Pendente', 'Rascunho'].includes(b.status));

        // Group bets by month
        allResolvedBets.forEach(bet => {
            const date = new Date(bet.date);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const { profit } = calculateBetStats(bet);
            monthlyProfits[key] = (monthlyProfits[key] || 0) + profit;
        });

        const bestMonths = Object.entries(monthlyProfits)
            .map(([month, profit]) => ({ month, profit }))
            .sort((a, b) => b.profit - a.profit)
            .slice(0, 3); // Top 3

        return {
            totalStaked: resolvedStaked,
            totalReturned: resolvedReturned,
            netProfit: totalProfit,
            roi,
            chartData,
            totalPromotionsCount,
            doubleGreenBets,
            bestStats, // Main winner (for compat)
            top3Bookmakers, // New array
            bestMonths
        };
    };



    const { totalStaked, totalReturned, netProfit, roi, chartData, totalPromotionsCount, doubleGreenBets, bestStats, top3Bookmakers, bestMonths } = calculateMetrics();

    const isProfitPositive = netProfit >= 0;

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Filters */}
            <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4 pb-2">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Resumo Financeiro</h2>
                    <p className="text-textMuted text-sm mt-1">Acompanhe o desempenho da sua banca.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full lg:w-auto">
                    {period === 'custom' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 w-full sm:w-auto bg-[#151b2e] p-1.5 rounded-lg border border-white/10">
                            <div className="w-full sm:w-32">
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="py-1.5 text-xs bg-transparent border-none"
                                />
                            </div>
                            <span className="text-gray-500">-</span>
                            <div className="w-full sm:w-32">
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="py-1.5 text-xs bg-transparent border-none"
                                />
                            </div>
                        </div>
                    )}

                    {period === 'specific-month' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 w-full sm:w-auto bg-[#151b2e] p-1.5 rounded-lg border border-white/10">
                            <div className="w-full sm:w-40">
                                <Input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="py-1.5 text-xs bg-transparent border-none"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button className="p-2.5 rounded-lg bg-[#0d1121] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors hidden sm:block shadow-sm hover:shadow-md hover:-translate-y-0.5 transform duration-200 group">
                            <Filter size={18} className="group-hover:text-primary transition-colors" />
                        </button>
                        <div className="w-full sm:w-48 z-20">
                            <Dropdown
                                options={periodOptions}
                                value={period}
                                onChange={setPeriod}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Hero Card - Net Profit - 3D Effect with Responsive Padding */}
                <div className={`
                col-span-1 md:col-span-3 rounded-2xl p-5 sm:p-6 lg:p-8 text-[#090c19] 
                transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275) relative overflow-hidden group
                hover:-translate-y-2 hover:scale-[1.01]
                ${netProfit >= 0
                        ? 'bg-gradient-to-br from-[#17baa4] to-[#129683] shadow-[0_10px_30px_-5px_rgba(23,186,164,0.4)] hover:shadow-[0_25px_60px_-10px_rgba(23,186,164,0.6)]'
                        : 'bg-gradient-to-br from-[#FF5252] to-[#E04040] shadow-[0_10px_30px_-5px_rgba(255,82,82,0.4)] hover:shadow-[0_25px_60px_-10px_rgba(255,82,82,0.6)]'
                    }
            `}>
                    {/* Sheen Effect */}
                    <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-15deg] animate-sheen pointer-events-none" />

                    <div className="relative z-10 flex flex-col h-full justify-between min-h-[160px] sm:min-h-[180px]">
                        <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 opacity-80">
                                    <Wallet size={16} className="animate-pulse-scale" />
                                    <span className="font-bold text-[10px] sm:text-xs uppercase tracking-wider text-[#090c19]">Lucro Líquido</span>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                                    <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tighter py-1 sm:py-2 text-[#090c19] drop-shadow-sm truncate">
                                        <MoneyDisplay
                                            value={Math.abs(netProfit)}
                                            privacyMode={settings.privacyMode}
                                            prefix="R$"
                                        />
                                    </h2>
                                    {/* Privacy Toggle */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSettings(prev => ({ ...prev, privacyMode: !prev.privacyMode })); }}
                                        className="p-1.5 rounded-full hover:bg-[#090c19]/10 text-[#090c19] transition-all cursor-pointer z-20 relative shrink-0"
                                        title={settings.privacyMode ? "Mostrar Valores" : "Ocultar Valores"}
                                    >
                                        {settings.privacyMode ? <EyeOff size={18} className="sm:w-6 sm:h-6" /> : <Eye size={18} className="sm:w-6 sm:h-6" />}
                                    </button>
                                </div>
                            </div>
                            <div className="bg-[#090c19]/10 px-3 py-1 rounded-full backdrop-blur-sm border border-[#090c19]/5 shadow-sm hover:bg-[#090c19]/20 transition-colors whitespace-nowrap">
                                <p className="text-xs font-bold opacity-80 flex items-center gap-1">
                                    <Calendar size={10} />
                                    {periodOptions.find(o => o.value === period)?.label}
                                </p>
                            </div>
                        </div>

                        <div className="bg-[#090c19]/20 rounded-xl p-4 backdrop-blur-md mt-4 border border-[#090c19]/5 shadow-inner transition-transform duration-300 group-hover:translate-y-[-2px]">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold opacity-75 uppercase tracking-wide">Eficiência (ROI)</span>
                                <span className="font-bold font-mono text-lg">
                                    {settings.privacyMode ? '•••%' : `${roi.toFixed(2)}%`}
                                </span>
                            </div>
                            {/* Custom Progress Bar */}
                            <div className="h-1.5 w-full bg-[#090c19]/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full shadow-sm transition-all duration-1000 ease-out"
                                    style={{ width: `${Math.min(Math.abs(roi) * 5, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Staked */}
                <Card className="p-6 flex flex-col justify-between min-h-[120px] group bg-[#151b2e]">
                    <div>
                        <p className="text-textMuted text-[11px] font-bold uppercase tracking-wider mb-2 group-hover:text-white transition-colors">Total Apostado</p>
                        <div className="flex items-center justify-between">
                            <h4 className="text-2xl font-bold text-white tracking-tight">
                                <MoneyDisplay value={totalStaked} privacyMode={settings.privacyMode} />
                            </h4>
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-textMuted group-hover:text-primary transition-all duration-500 group-hover:bg-primary/10 group-hover:rotate-12 group-hover:scale-110 shadow-inner">
                                <DollarSign size={20} />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Returned */}
                <Card className="p-6 flex flex-col justify-between min-h-[120px] group bg-[#151b2e]">
                    <div>
                        <p className="text-textMuted text-[11px] font-bold uppercase tracking-wider mb-2 group-hover:text-white transition-colors">Total Retornado</p>
                        <div className="flex items-center justify-between">
                            <h4 className="text-2xl font-bold text-white tracking-tight">
                                <MoneyDisplay value={totalReturned} privacyMode={settings.privacyMode} />
                            </h4>
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-textMuted group-hover:text-primary transition-all duration-500 group-hover:bg-primary/10 group-hover:rotate-[-12deg] group-hover:scale-110 shadow-inner">
                                <Target size={20} />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Promotions */}
                <Card className="p-6 flex flex-col justify-between min-h-[120px] group bg-[#151b2e]">
                    <div>
                        <p className="text-textMuted text-[11px] font-bold uppercase tracking-wider mb-2 group-hover:text-white transition-colors">Apostas com Promoções</p>
                        <div className="flex items-center justify-between">
                            <h4 className="text-2xl font-bold text-white tracking-tight">
                                {settings.privacyMode ? '••' : totalPromotionsCount}
                            </h4>
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-textMuted group-hover:text-secondary transition-all duration-500 group-hover:bg-secondary/10 group-hover:rotate-[-6deg] group-hover:scale-110 shadow-inner">
                                <StickyNote size={20} />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Double Green Bets List */}
            {/* Double Green Bets List - Always Visible */}
            <Card className="p-6 bg-[#151b2e] border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <Copy size={16} />
                    </div>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wide">Apostas com Duplo Green ({doubleGreenBets.length})</h3>
                </div>

                {doubleGreenBets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {doubleGreenBets.map(bet => {
                            const stats = calculateBetStats(bet);
                            return (
                                <div key={bet.id} className="bg-[#090c19]/40 p-3 rounded-lg border border-primary/10 hover:border-primary/30 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs text-textMuted">{new Date(bet.date).toLocaleDateString()}</span>
                                        <span className="text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/20">2X</span>
                                    </div>
                                    <h4 className="font-bold text-white text-sm mb-1 truncate">{bet.event}</h4>
                                    <div className="flex justify-between items-end">
                                        <span className="text-xs text-textMuted">Lucro:</span>
                                        <span className="font-bold text-sm text-[#6ee7b7]">
                                            <MoneyDisplay value={stats.profit} privacyMode={settings.privacyMode} />
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="border border-dashed border-white/10 rounded-xl h-[120px] flex flex-col items-center justify-center bg-white/[0.02] gap-2 hover:bg-white/[0.04] transition-colors cursor-default">
                        <Copy className="text-white/10" size={24} />
                        <span className="text-gray-500 text-xs font-medium">Nenhuma aposta Duplo Green no período</span>
                    </div>
                )}
            </Card>



            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Best Months */}
                <Card className="p-6 bg-[#151b2e] group">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-1.5 rounded-md bg-secondary/10 text-secondary group-hover:bg-secondary/20 transition-colors">
                            <Trophy size={16} className="animate-pulse-slow" />
                        </div>
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide">Meses Mais Lucrativos</h3>
                    </div>

                    {bestMonths && bestMonths.length > 0 ? (
                        <div className="space-y-3">
                            {bestMonths.map((item, index) => {
                                const [year, month] = item.month.split('-');
                                const date = new Date(Number(year), Number(month) - 1, 1);
                                const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

                                return (
                                    <div key={item.month} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`
                                                w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                                                ${index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                                                    index === 1 ? 'bg-gray-400/20 text-gray-400 border border-gray-400/30' :
                                                        'bg-orange-700/20 text-orange-700 border border-orange-700/30'}
                                            `}>
                                                {index + 1}º
                                            </div>
                                            <span className="text-sm text-gray-300 capitalize">{monthName}</span>
                                        </div>
                                        <span className={`text-sm font-bold ${item.profit >= 0 ? 'text-[#6ee7b7]' : 'text-red-400'}`}>
                                            <MoneyDisplay value={item.profit} privacyMode={settings.privacyMode} />
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="border border-dashed border-white/10 rounded-xl h-[200px] flex flex-col items-center justify-center bg-white/[0.02] gap-2 hover:bg-white/[0.04] transition-colors cursor-default group/empty">
                            <Trophy className="text-white/10 group-hover/empty:text-white/20 transition-colors animate-float" size={32} />
                            <span className="text-gray-500 text-xs font-medium">Sem histórico suficiente para análise</span>
                        </div>
                    )}
                </Card>

                {/* Best Stats / Top 3 Bookmakers */}
                <Card className="p-6 bg-[#151b2e] group relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                        <div className="p-1.5 rounded-md bg-yellow-500/10 text-yellow-500 group-hover:text-yellow-400 transition-colors">
                            <Trophy size={16} />
                        </div>
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide">TOP 3 CASAS</h3>
                    </div>

                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <Trophy size={120} />
                    </div>

                    {top3Bookmakers && top3Bookmakers.length > 0 ? (
                        <div className="space-y-4 relative z-10">
                            {top3Bookmakers.map((stats, index) => {
                                const isWinner = index === 0;
                                const rankColors = [
                                    'text-yellow-400', // Gold
                                    'text-gray-300',   // Silver
                                    'text-amber-700'   // Bronze
                                ];
                                const rankColor = rankColors[index] || 'text-gray-500';

                                const bookmaker = bookmakers.find(b => b.id === stats.bookmakerId) || { name: 'Desconhecida', logo: '' };
                                const isExpanded = expandedBookmaker === stats.bookmakerId;

                                return (
                                    <div key={stats.bookmakerId} className={`relative flex flex-col gap-2 ${!isWinner ? 'pt-2 border-t border-white/5' : ''}`}>
                                        <div
                                            className="flex items-center justify-between cursor-pointer hover:bg-white/5 rounded-lg p-2 -m-2 transition-colors group/item"
                                            onClick={() => setExpandedBookmaker(isExpanded ? null : stats.bookmakerId)}
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Rank Indicator */}
                                                <div className={`font-bold text-lg w-4 text-center ${rankColor}`}>
                                                    {index + 1}º
                                                </div>

                                                {/* Logo & Name */}
                                                <div className="flex items-center gap-2">
                                                    {bookmaker.logo ? (
                                                        <div className="w-6 h-6 rounded-full overflow-hidden bg-white/10 shrink-0">
                                                            <img src={bookmaker.logo} alt={bookmaker.name} className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                                            <Trophy size={12} className="text-white/50" />
                                                        </div>
                                                    )}
                                                    <span className={`font-bold ${isWinner ? 'text-white text-base' : 'text-gray-300 text-sm'}`}>{bookmaker.name}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Profit */}
                                                <span className={`font-bold ${isWinner ? 'text-[#6ee7b7] text-base' : 'text-[#6ee7b7]/80 text-sm'}`}>
                                                    <MoneyDisplay value={stats.totalProfit} privacyMode={settings.privacyMode} />
                                                </span>

                                                {/* Chevron Indicator */}
                                                {stats.topPromos.length > 0 && (
                                                    <ChevronDown
                                                        size={16}
                                                        className={`text-gray-500 group-hover/item:text-gray-400 transition-all ${isExpanded ? 'rotate-180' : ''}`}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Promos Breakdown - Expandable */}
                                        {isExpanded && stats.topPromos.length > 0 && (
                                            <div className="ml-9 pl-2 border-l-2 border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="flex flex-col gap-1">
                                                    {stats.topPromos.map((promo, idx) => (
                                                        <div key={idx} className="flex items-center justify-between text-[11px] text-gray-400">
                                                            <span>{promo.name}</span>
                                                            <MoneyDisplay value={promo.profit} privacyMode={settings.privacyMode} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="border border-dashed border-white/10 rounded-xl h-[120px] flex flex-col items-center justify-center bg-white/[0.02] gap-2 hover:bg-white/[0.04] transition-colors cursor-default group/empty">
                            <Trophy className="text-white/10 group-hover/empty:text-white/20 transition-colors animate-float" size={32} />
                            <span className="text-gray-500 text-xs font-medium">Sem lucro suficiente</span>
                        </div>
                    )}
                </Card>

                {/* Evolution Chart */}
                <Card className="p-6 bg-[#151b2e] group">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                            <TrendingUp size={16} className="animate-pulse-slow" />
                        </div>
                        <h3 className="font-bold text-white text-sm uppercase tracking-wide">Evolução da Banca</h3>
                    </div>

                    <div className="w-full">
                        <div className="w-full">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" aspect={2.5}>
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#17baa4" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#17baa4" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#475569"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="#475569"
                                            fontSize={10}
                                            tickFormatter={(value) => settings.privacyMode ? '•••' : `R$${value}`}
                                            tickLine={false}
                                            axisLine={false}
                                            width={60}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#151b2e', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                                            itemStyle={{ color: '#17baa4', fontWeight: 'bold' }}
                                            formatter={(value: number) => [settings.privacyMode ? 'R$ ••••' : formatCurrency(value), 'Lucro']}
                                            cursor={{ stroke: '#334155', strokeWidth: 1 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="profit"
                                            stroke="#17baa4"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#colorProfit)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[200px] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center bg-white/[0.02] gap-2 hover:bg-white/[0.04] transition-colors group/empty">
                                    <Activity className="text-white/10 group-hover/empty:text-white/20 transition-colors animate-float" size={32} />
                                    <span className="text-gray-500 text-xs font-medium">Sem dados no período selecionado</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div >
        </div >
    );
};

export default Overview;